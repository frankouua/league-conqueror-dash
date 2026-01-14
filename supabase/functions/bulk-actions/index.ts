import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkActionPayload {
  action: 'send_nps' | 'send_campaign' | 'request_referrals' | 'invite_ambassador' | 
          'send_form' | 'move_stage' | 'assign_to' | 'add_tag';
  lead_ids: string[];
  parameters?: any;
  created_by?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: BulkActionPayload = await req.json();

    if (!payload.lead_ids?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'lead_ids é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Criar log da ação em massa
    const { data: actionLog } = await supabase
      .from('bulk_action_logs')
      .insert({
        action_type: payload.action,
        lead_ids: payload.lead_ids,
        total_leads: payload.lead_ids.length,
        parameters: payload.parameters,
        status: 'processing',
        started_at: new Date().toISOString(),
        created_by: payload.created_by
      })
      .select()
      .single();

    // Buscar dados dos leads
    const { data: leads } = await supabase
      .from('crm_leads')
      .select('*')
      .in('id', payload.lead_ids);

    let successCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    // Processar ação
    switch (payload.action) {
      case 'send_nps':
        // Enviar pesquisa NPS para leads
        for (const lead of leads || []) {
          try {
            // Adicionar à fila de WhatsApp com template NPS
            await supabase.from('whatsapp_dispatch_queue').insert({
              lead_id: lead.id,
              phone: lead.whatsapp || lead.phone,
              message: `Olá ${lead.name}! Como foi sua experiência conosco? Responda de 0 a 10, sendo 10 excelente.`,
              status: 'pending',
              scheduled_for: new Date().toISOString()
            });
            successCount++;
            results.push({ lead_id: lead.id, status: 'queued' });
          } catch (e: any) {
            errorCount++;
            results.push({ lead_id: lead.id, status: 'error', error: e?.message || 'Unknown error' });
          }
        }
        break;

      case 'send_campaign':
        const campaignMessage = payload.parameters?.message || 'Confira nossas novidades!';
        for (const lead of leads || []) {
          try {
            await supabase.from('whatsapp_dispatch_queue').insert({
              lead_id: lead.id,
              phone: lead.whatsapp || lead.phone,
              message: campaignMessage.replace('{nome}', lead.name),
              status: 'pending',
              scheduled_for: new Date().toISOString()
            });
            successCount++;
          } catch (e) {
            errorCount++;
          }
        }
        break;

      case 'request_referrals':
        for (const lead of leads || []) {
          try {
            const message = `Olá ${lead.name}! Você conhece alguém que poderia se beneficiar dos nossos procedimentos? Indique e ganhe benefícios exclusivos! 🎁`;
            await supabase.from('whatsapp_dispatch_queue').insert({
              lead_id: lead.id,
              phone: lead.whatsapp || lead.phone,
              message,
              status: 'pending',
              scheduled_for: new Date().toISOString()
            });
            
            // Marcar lead como solicitado indicação
            await supabase.from('crm_lead_history').insert({
              lead_id: lead.id,
              action: 'referral_requested',
              description: 'Solicitação de indicação enviada via ação em massa'
            });
            
            successCount++;
          } catch (e) {
            errorCount++;
          }
        }
        break;

      case 'invite_ambassador':
        for (const lead of leads || []) {
          try {
            const message = `Olá ${lead.name}! Você gostaria de ser nossa Embaixadora Unique? 👑 Entre em contato para saber mais sobre esse programa exclusivo!`;
            await supabase.from('whatsapp_dispatch_queue').insert({
              lead_id: lead.id,
              phone: lead.whatsapp || lead.phone,
              message,
              status: 'pending',
              scheduled_for: new Date().toISOString()
            });
            
            // Adicionar tag
            await supabase
              .from('crm_leads')
              .update({ 
                tags: supabase.rpc('array_append_unique', { 
                  arr: lead.tags || [], 
                  elem: 'convite_embaixadora' 
                })
              })
              .eq('id', lead.id);
              
            successCount++;
          } catch (e) {
            errorCount++;
          }
        }
        break;

      case 'move_stage':
        const newStageId = payload.parameters?.stage_id;
        if (!newStageId) {
          return new Response(
            JSON.stringify({ success: false, error: 'stage_id é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        for (const lead of leads || []) {
          try {
            await supabase
              .from('crm_leads')
              .update({ 
                stage_id: newStageId,
                stage_changed_at: new Date().toISOString()
              })
              .eq('id', lead.id);
              
            await supabase.from('crm_lead_history').insert({
              lead_id: lead.id,
              action: 'stage_changed',
              description: 'Movido via ação em massa',
              metadata: { new_stage_id: newStageId }
            });
            
            successCount++;
          } catch (e) {
            errorCount++;
          }
        }
        break;

      case 'assign_to':
        const newAssignee = payload.parameters?.assigned_to;
        if (!newAssignee) {
          return new Response(
            JSON.stringify({ success: false, error: 'assigned_to é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        for (const lead of leads || []) {
          try {
            await supabase
              .from('crm_leads')
              .update({ assigned_to: newAssignee })
              .eq('id', lead.id);
              
            await supabase.from('crm_lead_history').insert({
              lead_id: lead.id,
              action: 'assigned',
              description: 'Atribuído via ação em massa',
              metadata: { new_assignee: newAssignee }
            });
            
            successCount++;
          } catch (e) {
            errorCount++;
          }
        }
        break;

      case 'add_tag':
        const newTag = payload.parameters?.tag;
        if (!newTag) {
          return new Response(
            JSON.stringify({ success: false, error: 'tag é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        for (const lead of leads || []) {
          try {
            const currentTags = lead.tags || [];
            if (!currentTags.includes(newTag)) {
              await supabase
                .from('crm_leads')
                .update({ tags: [...currentTags, newTag] })
                .eq('id', lead.id);
            }
            successCount++;
          } catch (e) {
            errorCount++;
          }
        }
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    // Atualizar log
    await supabase
      .from('bulk_action_logs')
      .update({
        success_count: successCount,
        error_count: errorCount,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', actionLog?.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        action: payload.action,
        total: payload.lead_ids.length,
        success_count: successCount,
        error_count: errorCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
