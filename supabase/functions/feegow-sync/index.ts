import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FEEGOW_BASE_URL = 'https://api.feegow.com.br/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const feegowToken = Deno.env.get('FEEGOW_API_TOKEN');
    
    if (!feegowToken) {
      return new Response(JSON.stringify({ 
        error: 'FEEGOW_API_TOKEN not configured',
        message: 'Configure o token da API Feegow nas variáveis de ambiente'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { syncType = 'full', limit = 100 } = await req.json().catch(() => ({}));

    console.log(`Starting Feegow sync: ${syncType}, limit: ${limit}`);

    const results = {
      patients: { synced: 0, errors: 0 },
      appointments: { synced: 0, errors: 0 },
      professionals: { synced: 0, errors: 0 }
    };

    // Get Feegow pipeline
    const { data: feegowPipeline } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('name', 'FEEGOW')
      .single();

    const { data: initialStage } = await supabase
      .from('crm_stages')
      .select('id')
      .eq('pipeline_id', feegowPipeline?.id)
      .order('order_index')
      .limit(1)
      .single();

    // Sync Patients
    try {
      const patientsResponse = await fetch(`${FEEGOW_BASE_URL}/patient/list`, {
        headers: {
          'x-access-token': feegowToken,
          'Content-Type': 'application/json'
        }
      });

      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        const patients = patientsData.content?.slice(0, limit) || [];

        for (const patient of patients) {
          try {
            // Check if lead exists
            const { data: existingLead } = await supabase
              .from('crm_leads')
              .select('id')
              .eq('feegow_id', patient.id?.toString())
              .single();

            if (existingLead) {
              // Update existing
              await supabase
                .from('crm_leads')
                .update({
                  name: patient.nome,
                  email: patient.email,
                  phone: patient.celular || patient.telefone,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingLead.id);
            } else if (feegowPipeline && initialStage) {
              // Create new lead
              await supabase
                .from('crm_leads')
                .insert({
                  name: patient.nome || 'Paciente Feegow',
                  email: patient.email,
                  phone: patient.celular || patient.telefone,
                  feegow_id: patient.id?.toString(),
                  pipeline_id: feegowPipeline.id,
                  stage_id: initialStage.id,
                  source: 'feegow_sync',
                  status: 'active'
                });
            }
            results.patients.synced++;
          } catch (e) {
            results.patients.errors++;
            console.error('Patient sync error:', e);
          }
        }
      }
    } catch (e) {
      console.error('Patients fetch error:', e);
    }

    // Sync Today's Appointments
    try {
      const today = new Date().toISOString().split('T')[0];
      const appointmentsResponse = await fetch(`${FEEGOW_BASE_URL}/appoints/search`, {
        method: 'POST',
        headers: {
          'x-access-token': feegowToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          DataInicial: today,
          DataFinal: today
        })
      });

      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        const appointments = appointmentsData.content || [];

        for (const appt of appointments) {
          try {
            // Find lead by feegow_id
            const { data: lead } = await supabase
              .from('crm_leads')
              .select('id, assigned_to')
              .eq('feegow_id', appt.paciente_id?.toString())
              .single();

            if (lead) {
              // Create task for appointment
              await supabase
                .from('crm_tasks')
                .upsert({
                  lead_id: lead.id,
                  title: `Consulta: ${appt.procedimento || 'Agendamento'}`,
                  description: `Horário: ${appt.hora}\nProfissional: ${appt.profissional_nome}`,
                  due_date: `${today}T${appt.hora || '09:00'}:00`,
                  priority: 'high',
                  status: 'pending',
                  assigned_to: lead.assigned_to
                }, {
                  onConflict: 'lead_id,title,due_date'
                });

              // Update lead with appointment info
              await supabase
                .from('crm_leads')
                .update({
                  next_action_date: `${today}T${appt.hora || '09:00'}:00`,
                  tags: supabase.rpc('array_append_unique', { 
                    arr: [], 
                    elem: 'consulta_hoje' 
                  })
                })
                .eq('id', lead.id);

              results.appointments.synced++;
            }
          } catch (e) {
            results.appointments.errors++;
            console.error('Appointment sync error:', e);
          }
        }
      }
    } catch (e) {
      console.error('Appointments fetch error:', e);
    }

    // Sync Professionals
    try {
      const professionalsResponse = await fetch(`${FEEGOW_BASE_URL}/professional/list`, {
        headers: {
          'x-access-token': feegowToken,
          'Content-Type': 'application/json'
        }
      });

      if (professionalsResponse.ok) {
        const professionalsData = await professionalsResponse.json();
        const professionals = professionalsData.content || [];

        // Store in a config table or just log
        console.log(`Found ${professionals.length} professionals in Feegow`);
        results.professionals.synced = professionals.length;
      }
    } catch (e) {
      console.error('Professionals fetch error:', e);
    }

    // Log sync
    await supabase
      .from('feegow_sync_logs')
      .insert({
        sync_type: syncType,
        status: 'completed',
        records_processed: results.patients.synced + results.appointments.synced,
        records_created: results.patients.synced,
        records_updated: 0,
        sync_details: results
      });

    console.log('Feegow sync completed:', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Sincronização Feegow concluída',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Feegow sync error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
