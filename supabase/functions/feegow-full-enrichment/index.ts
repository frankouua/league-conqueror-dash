import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeegowPatient {
  paciente_id: number;
  nome: string;
  cpf?: string;
  rg?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  data_nascimento?: string;
  sexo?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  origem_id?: number;
  origem?: string;
  responsavel?: string;
  nome_mae?: string;
  nome_pai?: string;
  observacoes?: string;
  foto_url?: string;
  data_cadastro?: string;
  profissao?: string;
}

interface FeegowAppointment {
  agendamento_id: number;
  paciente_id: number;
  data: string;
  horario: string;
  status_id: number;
  procedimento_id?: number;
}

interface EnrichmentResult {
  total_processed: number;
  total_enriched: number;
  fields_summary: Record<string, number>;
  errors: string[];
  details: {
    id: string;
    name: string;
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
    const { batchSize = 50, dryRun = false, includeAppointments = true, includeFinancial = false } = await req.json().catch(() => ({}));
    
    console.log(`Starting full enrichment - batchSize: ${batchSize}, dryRun: ${dryRun}, includeAppointments: ${includeAppointments}`);

    const feegowHeaders = {
      'Content-Type': 'application/json',
      'x-access-token': FEEGOW_API_TOKEN,
    };

    // Fetch customers that need enrichment (have prontuario)
    const { data: customersToEnrich, error: fetchError } = await supabase
      .from('rfv_customers')
      .select('id, name, cpf, prontuario, phone, email, origem_nome, total_agendamentos')
      .not('prontuario', 'is', null)
      .neq('prontuario', '')
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Error fetching customers: ${fetchError.message}`);
    }

    console.log(`Found ${customersToEnrich?.length || 0} customers to process`);

    if (!customersToEnrich || customersToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No customers to process',
          result: { total_processed: 0, total_enriched: 0, fields_summary: {}, errors: [], details: [] }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all patients from Feegow
    console.log('Fetching Feegow patients...');
    const patientsByProntuario: Map<string, FeegowPatient> = new Map();
    
    let start = 0;
    const offset = 500; // Increased for faster loading
    let hasMore = true;
    let attempts = 0;
    const maxAttempts = 100; // Increased to handle larger patient bases

    while (hasMore && attempts < maxAttempts) {
      try {
        const listUrl = `https://api.feegow.com/v1/api/patient/list?start=${start}&offset=${offset}`;
        console.log(`Fetching page ${attempts + 1}...`);
        
        const listResponse = await fetch(listUrl, { method: 'GET', headers: feegowHeaders });
        const listData = await listResponse.json();
        
        if (!listData.success) {
          console.error('Error from Feegow:', listData);
          break;
        }

        const patients = listData.content || [];
        console.log(`Page ${attempts + 1}: ${patients.length} patients`);
        
        // Debug: log first patient structure on first page
        if (attempts === 0 && patients.length > 0) {
          console.log('Sample patient structure:', JSON.stringify(patients[0]));
        }
        
        if (patients.length === 0) {
          hasMore = false;
        } else {
          for (const p of patients) {
            // Try all possible ID fields from Feegow
            const patientId = (p.id || p.paciente_id || p.local_id || p.prontuario)?.toString();
            if (patientId) {
              patientsByProntuario.set(patientId, { ...p, paciente_id: parseInt(patientId) });
            }
          }
          start += offset;
          attempts++;
          if (patients.length < offset) hasMore = false;
          else await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (e) {
        console.error(`Error on page ${attempts + 1}:`, e);
        break;
      }
    }

    console.log(`Loaded ${patientsByProntuario.size} patients from Feegow`);

    // Fetch appointments if enabled
    let appointmentsByPatient: Map<number, FeegowAppointment[]> = new Map();
    
    if (includeAppointments) {
      console.log('Fetching appointments from Feegow...');
      try {
        // Get appointments from last 2 years
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const today = new Date();
        
        const dateStart = `${twoYearsAgo.getDate().toString().padStart(2, '0')}-${(twoYearsAgo.getMonth() + 1).toString().padStart(2, '0')}-${twoYearsAgo.getFullYear()}`;
        const dateEnd = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
        
        const appointsUrl = `https://api.feegow.com/v1/api/appoints/search?data_start=${dateStart}&data_end=${dateEnd}`;
        console.log(`Fetching appointments: ${appointsUrl}`);
        
        const appointsResponse = await fetch(appointsUrl, { method: 'GET', headers: feegowHeaders });
        const appointsData = await appointsResponse.json();
        
        if (appointsData.success && appointsData.content) {
          const appoints = Array.isArray(appointsData.content) ? appointsData.content : [];
          console.log(`Loaded ${appoints.length} appointments`);
          
          for (const apt of appoints) {
            const patientId = apt.paciente_id;
            if (!appointmentsByPatient.has(patientId)) {
              appointmentsByPatient.set(patientId, []);
            }
            appointmentsByPatient.get(patientId)!.push(apt);
          }
        }
      } catch (e) {
        console.error('Error fetching appointments:', e);
      }
    }

    // Process enrichment
    const result: EnrichmentResult = {
      total_processed: 0,
      total_enriched: 0,
      fields_summary: {},
      errors: [],
      details: []
    };

    for (const customer of customersToEnrich) {
      result.total_processed++;
      
      const feegowPatient = patientsByProntuario.get(customer.prontuario?.toString() || '');
      
      if (!feegowPatient) {
        console.log(`No Feegow match for: ${customer.name} (prontuario: ${customer.prontuario})`);
        continue;
      }

      const updates: Record<string, any> = {};
      const fieldsUpdated: string[] = [];

      // Basic contact info (only if empty)
      if (!customer.phone && (feegowPatient.celular || feegowPatient.telefone)) {
        updates.phone = feegowPatient.celular || feegowPatient.telefone;
        fieldsUpdated.push('phone');
      }
      if (!customer.email && feegowPatient.email) {
        updates.email = feegowPatient.email;
        fieldsUpdated.push('email');
      }

      // Extended patient data (always update if available)
      if (feegowPatient.rg) {
        updates.rg = feegowPatient.rg;
        fieldsUpdated.push('rg');
      }
      if (feegowPatient.origem_id) {
        updates.origem_id = feegowPatient.origem_id;
        fieldsUpdated.push('origem_id');
      }
      if (feegowPatient.origem && !customer.origem_nome) {
        updates.origem_nome = feegowPatient.origem;
        fieldsUpdated.push('origem_nome');
      }
      if (feegowPatient.responsavel) {
        updates.responsavel_legal = feegowPatient.responsavel;
        fieldsUpdated.push('responsavel_legal');
      }
      if (feegowPatient.nome_mae) {
        updates.nome_mae = feegowPatient.nome_mae;
        fieldsUpdated.push('nome_mae');
      }
      if (feegowPatient.nome_pai) {
        updates.nome_pai = feegowPatient.nome_pai;
        fieldsUpdated.push('nome_pai');
      }
      if (feegowPatient.observacoes) {
        updates.observacoes_feegow = feegowPatient.observacoes;
        fieldsUpdated.push('observacoes_feegow');
      }
      if (feegowPatient.foto_url) {
        updates.foto_url = feegowPatient.foto_url;
        fieldsUpdated.push('foto_url');
      }
      if (feegowPatient.data_cadastro) {
        updates.data_cadastro_feegow = feegowPatient.data_cadastro;
        fieldsUpdated.push('data_cadastro_feegow');
      }

      // Appointment stats
      const patientAppts = appointmentsByPatient.get(feegowPatient.paciente_id) || [];
      if (patientAppts.length > 0) {
        updates.total_agendamentos = patientAppts.length;
        fieldsUpdated.push('total_agendamentos');
        
        // Count no-shows (status_id 6 = Não compareceu)
        const noShows = patientAppts.filter(a => a.status_id === 6).length;
        if (noShows > 0) {
          updates.no_show_count = noShows;
          fieldsUpdated.push('no_show_count');
        }

        // Find last appointment date
        const sortedAppts = patientAppts
          .filter(a => a.data)
          .sort((a, b) => {
            const dateA = a.data.split('-').reverse().join('-');
            const dateB = b.data.split('-').reverse().join('-');
            return dateB.localeCompare(dateA);
          });
        
        if (sortedAppts.length > 0) {
          const lastApptDate = sortedAppts[0].data;
          const [day, month, year] = lastApptDate.split('-');
          updates.ultimo_atendimento = `${year}-${month}-${day}`;
          fieldsUpdated.push('ultimo_atendimento');
        }
      }

      if (fieldsUpdated.length > 0) {
        console.log(`Enriching ${customer.name}: ${fieldsUpdated.join(', ')}`);
        
        // Track field counts
        for (const field of fieldsUpdated) {
          result.fields_summary[field] = (result.fields_summary[field] || 0) + 1;
        }

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
          fields_updated: fieldsUpdated
        });
      }
    }

    console.log('Full enrichment complete:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dryRun,
        patientsLoaded: patientsByProntuario.size,
        appointmentsLoaded: includeAppointments ? Array.from(appointmentsByPatient.values()).flat().length : 0,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in full enrichment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro no enriquecimento completo', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
