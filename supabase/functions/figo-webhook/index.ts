import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Figo webhook received:', JSON.stringify(payload).slice(0, 500));

    const { event, data } = payload;

    // Get Feegow pipeline for new leads
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

    let result: any = { processed: false };

    switch (event) {
      case 'patient.created':
      case 'patient.updated': {
        const patient = data.patient || data;
        
        const { data: existingLead } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('feegow_id', patient.id?.toString())
          .single();

        if (existingLead) {
          await supabase
            .from('crm_leads')
            .update({
              name: patient.nome,
              email: patient.email,
              phone: patient.celular || patient.telefone,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingLead.id);
          result = { processed: true, action: 'updated', leadId: existingLead.id };
        } else if (feegowPipeline && initialStage) {
          const { data: newLead } = await supabase
            .from('crm_leads')
            .insert({
              name: patient.nome || 'Novo Paciente',
              email: patient.email,
              phone: patient.celular || patient.telefone,
              feegow_id: patient.id?.toString(),
              pipeline_id: feegowPipeline.id,
              stage_id: initialStage.id,
              source: 'feegow_webhook',
              status: 'active'
            })
            .select('id')
            .single();
          
          result = { processed: true, action: 'created', leadId: newLead?.id };
        }
        break;
      }

      case 'appointment.created':
      case 'appointment.scheduled': {
        const appointment = data.appointment || data;
        
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id, assigned_to')
          .eq('feegow_id', appointment.paciente_id?.toString())
          .single();

        if (lead) {
          // Create task
          await supabase
            .from('crm_tasks')
            .insert({
              lead_id: lead.id,
              title: `Consulta Agendada: ${appointment.procedimento || 'Consulta'}`,
              description: `Data: ${appointment.data}\nHora: ${appointment.hora}\nProfissional: ${appointment.profissional}`,
              due_date: `${appointment.data}T${appointment.hora || '09:00'}:00`,
              priority: 'high',
              status: 'pending',
              assigned_to: lead.assigned_to
            });

          // Update lead
          await supabase
            .from('crm_leads')
            .update({
              next_action_date: `${appointment.data}T${appointment.hora || '09:00'}:00`,
              temperature: 'hot'
            })
            .eq('id', lead.id);

          // Create notification
          if (lead.assigned_to) {
            await supabase
              .from('notifications')
              .insert({
                user_id: lead.assigned_to,
                title: '📅 Nova Consulta Agendada',
                message: `Consulta agendada para ${appointment.data} às ${appointment.hora}`,
                type: 'info',
                action_url: `/crm?leadId=${lead.id}`
              });
          }

          result = { processed: true, action: 'appointment_created', leadId: lead.id };
        }
        break;
      }

      case 'appointment.cancelled': {
        const appointment = data.appointment || data;
        
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id, assigned_to')
          .eq('feegow_id', appointment.paciente_id?.toString())
          .single();

        if (lead) {
          // Update lead temperature
          await supabase
            .from('crm_leads')
            .update({
              temperature: 'warm',
              tags: ['consulta_cancelada']
            })
            .eq('id', lead.id);

          // Create task for follow-up
          await supabase
            .from('crm_tasks')
            .insert({
              lead_id: lead.id,
              title: '⚠️ Follow-up: Consulta Cancelada',
              description: 'Entrar em contato para reagendar consulta cancelada',
              due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              priority: 'high',
              status: 'pending',
              assigned_to: lead.assigned_to
            });

          // Notify
          if (lead.assigned_to) {
            await supabase
              .from('notifications')
              .insert({
                user_id: lead.assigned_to,
                title: '❌ Consulta Cancelada',
                message: `Paciente cancelou consulta. Realizar follow-up.`,
                type: 'warning',
                action_url: `/crm?leadId=${lead.id}`
              });
          }

          result = { processed: true, action: 'cancellation_handled', leadId: lead.id };
        }
        break;
      }

      case 'payment.received': {
        const payment = data.payment || data;
        
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id, assigned_to')
          .eq('feegow_id', payment.paciente_id?.toString())
          .single();

        if (lead) {
          // Update lead
          await supabase
            .from('crm_leads')
            .update({
              estimated_value: payment.valor,
              tags: ['pagamento_recebido']
            })
            .eq('id', lead.id);

          // Log history
          await supabase
            .from('crm_lead_history')
            .insert({
              lead_id: lead.id,
              action: 'payment_received',
              description: `Pagamento de R$ ${payment.valor} recebido`,
              performed_by: 'system'
            });

          result = { processed: true, action: 'payment_logged', leadId: lead.id };
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', event);
        result = { processed: false, reason: 'unhandled_event' };
    }

    // Log webhook
    await supabase
      .from('automation_logs')
      .insert({
        automation_type: 'figo-webhook',
        status: result.processed ? 'completed' : 'skipped',
        results: { event, ...result }
      });

    return new Response(JSON.stringify({
      success: true,
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Figo webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
