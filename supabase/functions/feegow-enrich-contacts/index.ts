import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentResult {
  total_processed: number;
  total_enriched: number;
  total_phone_added: number;
  total_email_added: number;
  total_cpf_added: number;
  errors: string[];
  details: {
    id: string;
    name: string;
    prontuario: string;
    fields_updated: string[];
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FEEGOW_API_TOKEN = Deno.env.get('FEEGOW_API_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!FEEGOW_API_TOKEN) {
      console.error('FEEGOW_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Feegow API token não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { batchSize = 50, dryRun = false } = await req.json().catch(() => ({}));
    console.log(`Starting enrichment - batchSize: ${batchSize}, dryRun: ${dryRun}`);

    // Fetch customers with missing contact info but with prontuario
    const { data: customersToEnrich, error: fetchError } = await supabase
      .from('rfv_customers')
      .select('id, name, cpf, phone, whatsapp, email, prontuario')
      .not('prontuario', 'is', null)
      .neq('prontuario', '')
      .or('phone.is.null,phone.eq.,email.is.null,email.eq.,cpf.is.null,cpf.eq.')
      .limit(batchSize);

    if (fetchError) {
      console.error('Error fetching customers:', fetchError);
      throw new Error(`Error fetching customers: ${fetchError.message}`);
    }

    console.log(`Found ${customersToEnrich?.length || 0} customers to enrich`);

    if (!customersToEnrich || customersToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No customers need enrichment',
          result: {
            total_processed: 0,
            total_enriched: 0,
            total_phone_added: 0,
            total_email_added: 0,
            total_cpf_added: 0,
            errors: [],
            details: []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all patients from Feegow and build lookup maps
    console.log('Building Feegow patient lookup...');
    const feegowHeaders = {
      'Content-Type': 'application/json',
      'x-access-token': FEEGOW_API_TOKEN,
    };

    // Fetch Feegow patients with pagination
    const patientsByProntuario: Map<string, any> = new Map();
    const patientsByCpf: Map<string, any> = new Map();
    const patientsByName: Map<string, any> = new Map();
    
    let start = 0;
    const offset = 100;
    let hasMore = true;
    let attempts = 0;
    const maxAttempts = 20; // Max 2000 patients

    while (hasMore && attempts < maxAttempts) {
      try {
        const listUrl = `https://api.feegow.com/v1/api/patient/list?start=${start}&offset=${offset}`;
        console.log(`Fetching Feegow page ${attempts + 1}...`);
        
        const listResponse = await fetch(listUrl, {
          method: 'GET',
          headers: feegowHeaders,
        });

        const listData = await listResponse.json();
        
        if (!listData.success) {
          console.error('Error fetching Feegow patients:', listData);
          break;
        }

        const patients = listData.content || [];
        console.log(`Page ${attempts + 1}: Retrieved ${patients.length} patients`);
        
        if (patients.length === 0) {
          hasMore = false;
        } else {
          // Build lookup maps
          for (const p of patients) {
            const patientId = p.paciente_id?.toString();
            const prontuario = p.prontuario?.toString() || patientId;
            const cpf = p.cpf?.replace(/\D/g, '');
            const name = p.nome?.toLowerCase().trim();

            if (prontuario) {
              patientsByProntuario.set(prontuario, p);
            }
            if (patientId && patientId !== prontuario) {
              patientsByProntuario.set(patientId, p);
            }
            if (cpf && cpf.length >= 11) {
              patientsByCpf.set(cpf, p);
            }
            if (name) {
              patientsByName.set(name, p);
            }
          }

          start += offset;
          attempts++;

          if (patients.length < offset) {
            hasMore = false;
          } else {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (e) {
        console.error(`Error on page ${attempts + 1}:`, e);
        break;
      }
    }

    console.log(`Feegow lookup built: ${patientsByProntuario.size} by prontuario, ${patientsByCpf.size} by CPF, ${patientsByName.size} by name`);

    // Process enrichment
    const result: EnrichmentResult = {
      total_processed: 0,
      total_enriched: 0,
      total_phone_added: 0,
      total_email_added: 0,
      total_cpf_added: 0,
      errors: [],
      details: []
    };

    for (const customer of customersToEnrich) {
      result.total_processed++;
      
      // Try to find matching Feegow patient
      let feegowPatient = null;

      // Priority 1: By prontuario
      if (customer.prontuario) {
        feegowPatient = patientsByProntuario.get(customer.prontuario.toString());
      }

      // Priority 2: By CPF
      if (!feegowPatient && customer.cpf) {
        const cleanCpf = customer.cpf.replace(/\D/g, '');
        feegowPatient = patientsByCpf.get(cleanCpf);
      }

      // Priority 3: By exact name match
      if (!feegowPatient && customer.name) {
        feegowPatient = patientsByName.get(customer.name.toLowerCase().trim());
      }

      if (!feegowPatient) {
        console.log(`No Feegow match for: ${customer.name} (prontuario: ${customer.prontuario})`);
        continue;
      }

      // Determine what needs updating
      const updates: Record<string, any> = {};
      const fieldsUpdated: string[] = [];

      // Phone
      if (!customer.phone || customer.phone === '') {
        const feegowPhone = feegowPatient.celular || feegowPatient.telefone;
        if (feegowPhone) {
          updates.phone = feegowPhone;
          fieldsUpdated.push('phone');
          result.total_phone_added++;
        }
      }

      // WhatsApp (use celular from Feegow)
      if (!customer.whatsapp || customer.whatsapp === '') {
        const feegowWhatsapp = feegowPatient.celular;
        if (feegowWhatsapp) {
          updates.whatsapp = feegowWhatsapp;
          fieldsUpdated.push('whatsapp');
        }
      }

      // Email
      if (!customer.email || customer.email === '') {
        const feegowEmail = feegowPatient.email;
        if (feegowEmail) {
          updates.email = feegowEmail;
          fieldsUpdated.push('email');
          result.total_email_added++;
        }
      }

      // CPF
      if (!customer.cpf || customer.cpf === '') {
        const feegowCpf = feegowPatient.cpf;
        if (feegowCpf) {
          updates.cpf = feegowCpf;
          fieldsUpdated.push('cpf');
          result.total_cpf_added++;
        }
      }

      if (Object.keys(updates).length > 0) {
        console.log(`Enriching ${customer.name}: ${fieldsUpdated.join(', ')}`);
        
        if (!dryRun) {
          updates.updated_at = new Date().toISOString();
          
          const { error: updateError } = await supabase
            .from('rfv_customers')
            .update(updates)
            .eq('id', customer.id);

          if (updateError) {
            console.error(`Error updating ${customer.name}:`, updateError);
            result.errors.push(`${customer.name}: ${updateError.message}`);
            continue;
          }
        }

        result.total_enriched++;
        result.details.push({
          id: customer.id,
          name: customer.name,
          prontuario: customer.prontuario,
          fields_updated: fieldsUpdated
        });
      }
    }

    console.log('Enrichment complete:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dryRun,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrichment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro no enriquecimento', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
