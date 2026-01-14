import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de WhatsApp
// Prepara e gerencia envio de mensagens automatizadas

interface WhatsAppPayload {
  action: 'send_template' | 'prepare_cadence' | 'check_pending';
  lead_id?: string;
  template_key?: string;
  variables?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WhatsAppPayload = await req.json().catch(() => ({ action: 'check_pending' }));

    console.log("📱 Automação WhatsApp:", payload.action);

    const results: any = {};

    // ======== ENVIAR TEMPLATE ========
    if (payload.action === 'send_template' && payload.lead_id && payload.template_key) {
      // Buscar lead
      const { data: lead } = await supabase
        .from('crm_leads')
        .select('id, name, phone, whatsapp, email, assigned_to')
        .eq('id', payload.lead_id)
        .single();

      if (!lead) {
        throw new Error("Lead não encontrado");
      }

      // Buscar template
      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('key', payload.template_key)
        .eq('is_active', true)
        .single();

      if (!template) {
        throw new Error(`Template ${payload.template_key} não encontrado`);
      }

      // Substituir variáveis
      let message = template.content;
      const variables = {
        nome: lead.name?.split(' ')[0] || 'Cliente',
        nome_completo: lead.name || 'Cliente',
        ...payload.variables,
      };

      for (const [key, value] of Object.entries(variables)) {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      // Registrar na fila de envio
      const { data: dispatch, error: dispatchError } = await supabase
        .from('whatsapp_dispatch_queue')
        .insert({
          lead_id: lead.id,
          phone: lead.whatsapp || lead.phone,
          template_id: template.id,
          message_content: message,
          status: 'pending',
          scheduled_for: new Date().toISOString(),
        })
        .select()
        .single();

      if (dispatchError) throw dispatchError;

      // Registrar no histórico
      await supabase.from('crm_lead_history').insert({
        lead_id: lead.id,
        action: 'whatsapp_queued',
        details: {
          template_key: payload.template_key,
          template_name: template.name,
          message_preview: message.substring(0, 100),
        },
        performed_by: '00000000-0000-0000-0000-000000000000',
      });

      results.dispatch = {
        id: dispatch.id,
        lead_name: lead.name,
        phone: lead.whatsapp || lead.phone,
        template: template.name,
        message_preview: message.substring(0, 100),
      };
    }

    // ======== PREPARAR CADÊNCIA ========
    if (payload.action === 'prepare_cadence') {
      // Buscar cadências de WhatsApp ativas que precisam ser executadas
      const { data: pendingCadences } = await supabase
        .from('crm_cadences')
        .select(`
          id, name, message_template, day_offset, time_of_day,
          pipeline:crm_pipelines(id, name),
          stage:crm_stages(id, name)
        `)
        .eq('channel', 'whatsapp')
        .eq('is_active', true);

      const preparedMessages: any[] = [];

      for (const cadence of pendingCadences || []) {
        const stageId = Array.isArray(cadence.stage) ? cadence.stage[0]?.id : (cadence.stage as any)?.id;
        if (!stageId) continue;
        
        const { data: eligibleLeads } = await supabase
          .from('crm_leads')
          .select('id, name, phone, whatsapp, stage_changed_at')
          .eq('stage_id', stageId)
          .is('won_at', null)
          .is('lost_at', null);

        for (const lead of eligibleLeads || []) {
          // Verificar se está no dia correto da cadência
          const daysSinceStageChange = Math.floor(
            (Date.now() - new Date(lead.stage_changed_at).getTime()) / (24 * 60 * 60 * 1000)
          );

          if (daysSinceStageChange === cadence.day_offset) {
            // Verificar se já foi enviado
            const { data: alreadySent } = await supabase
              .from('whatsapp_dispatch_queue')
              .select('id')
              .eq('lead_id', lead.id)
              .eq('cadence_id', cadence.id)
              .limit(1);

            if (!alreadySent || alreadySent.length === 0) {
              // Preparar mensagem
              let message = cadence.message_template || '';
              message = message.replace(/{{nome}}/g, lead.name?.split(' ')[0] || 'Cliente');

              // Adicionar à fila
              await supabase.from('whatsapp_dispatch_queue').insert({
                lead_id: lead.id,
                phone: lead.whatsapp || lead.phone,
                cadence_id: cadence.id,
                message_content: message,
                status: 'pending',
                scheduled_for: new Date().toISOString(),
              });

              preparedMessages.push({
                lead_name: lead.name,
                cadence_name: cadence.name,
                day: cadence.day_offset,
              });
            }
          }
        }
      }

      results.prepared_messages = preparedMessages.length;
      results.messages = preparedMessages;
    }

    // ======== VERIFICAR PENDENTES ========
    if (payload.action === 'check_pending') {
      // Buscar mensagens pendentes
      const { data: pendingMessages, count } = await supabase
        .from('whatsapp_dispatch_queue')
        .select('id, lead_id, phone, message_content, scheduled_for', { count: 'exact' })
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50);

      results.pending_count = count || 0;
      results.pending_messages = pendingMessages?.map(m => ({
        id: m.id,
        phone: m.phone,
        preview: m.message_content?.substring(0, 50),
      }));

      // Marcar como "ready" para envio manual ou integração externa
      if (pendingMessages && pendingMessages.length > 0) {
        await supabase
          .from('whatsapp_dispatch_queue')
          .update({ status: 'ready' })
          .in('id', pendingMessages.map(m => m.id));
      }
    }

    console.log("✅ Automação WhatsApp concluída:", results);

    return new Response(
      JSON.stringify({
        success: true,
        action: payload.action,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na automação WhatsApp:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
