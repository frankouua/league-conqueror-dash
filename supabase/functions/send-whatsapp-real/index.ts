import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppPayload {
  action: 'send' | 'test_connection' | 'process_queue' | 'receive_webhook';
  phone?: string;
  message?: string;
  lead_id?: string;
  template_id?: string;
  media_url?: string;
  webhook_data?: any;
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

    const payload: WhatsAppPayload = await req.json();

    // Buscar configuração ativa do WhatsApp
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config && payload.action !== 'receive_webhook') {
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Testar conexão
    if (payload.action === 'test_connection') {
      try {
        let testUrl = '';
        let headers: Record<string, string> = {};

        if (config.provider === 'evolution') {
          testUrl = `${config.api_url}/instance/connectionState/${config.instance_id}`;
          headers = { 'apikey': config.api_key };
        } else if (config.provider === 'z-api') {
          testUrl = `${config.api_url}/${config.instance_id}/status`;
          headers = { 'Client-Token': config.api_key };
        } else if (config.provider === 'wppconnect') {
          testUrl = `${config.api_url}/api/${config.instance_id}/status-session`;
          headers = { 'Authorization': `Bearer ${config.api_key}` };
        }

        const response = await fetch(testUrl, { headers });
        const data = await response.json();
        
        const isConnected = response.ok && (
          data.state === 'open' || 
          data.connected === true || 
          data.status === 'CONNECTED'
        );

        // Atualizar status de conexão
        await supabase
          .from('whatsapp_config')
          .update({
            connection_status: isConnected ? 'connected' : 'disconnected',
            last_connection_check: new Date().toISOString()
          })
          .eq('id', config.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            connected: isConnected,
            provider: config.provider,
            raw_response: data
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await supabase
          .from('whatsapp_config')
          .update({
            connection_status: 'error',
            last_connection_check: new Date().toISOString()
          })
          .eq('id', config.id);

        return new Response(
          JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Enviar mensagem
    if (payload.action === 'send') {
      if (!payload.phone || !payload.message) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone e message são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Normalizar telefone
      let phone = payload.phone.replace(/\D/g, '');
      if (!phone.startsWith('55')) phone = '55' + phone;

      let sendUrl = '';
      let sendBody: any = {};
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (config.provider === 'evolution') {
        sendUrl = `${config.api_url}/message/sendText/${config.instance_id}`;
        headers['apikey'] = config.api_key;
        sendBody = {
          number: phone,
          text: payload.message
        };
        if (payload.media_url) {
          sendUrl = `${config.api_url}/message/sendMedia/${config.instance_id}`;
          sendBody = {
            number: phone,
            mediatype: 'image',
            media: payload.media_url,
            caption: payload.message
          };
        }
      } else if (config.provider === 'z-api') {
        sendUrl = `${config.api_url}/${config.instance_id}/send-text`;
        headers['Client-Token'] = config.api_key;
        sendBody = {
          phone: phone,
          message: payload.message
        };
        if (payload.media_url) {
          sendUrl = `${config.api_url}/${config.instance_id}/send-image`;
          sendBody = {
            phone: phone,
            image: payload.media_url,
            caption: payload.message
          };
        }
      } else if (config.provider === 'wppconnect') {
        sendUrl = `${config.api_url}/api/${config.instance_id}/send-message`;
        headers['Authorization'] = `Bearer ${config.api_key}`;
        sendBody = {
          phone: phone,
          message: payload.message
        };
      }

      try {
        const response = await fetch(sendUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(sendBody)
        });

        const result = await response.json();
        const success = response.ok;

        // Registrar na fila
        await supabase
          .from('whatsapp_dispatch_queue')
          .insert({
            lead_id: payload.lead_id,
            phone: phone,
            message: payload.message,
            template_id: payload.template_id,
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null,
            error_message: success ? null : JSON.stringify(result)
          });

        // Registrar no histórico do lead
        if (payload.lead_id) {
          await supabase
            .from('crm_lead_history')
            .insert({
              lead_id: payload.lead_id,
              action: 'whatsapp_sent',
              description: `Mensagem WhatsApp enviada: ${payload.message.substring(0, 100)}...`,
              metadata: { phone, success, provider: config.provider }
            });
        }

        return new Response(
          JSON.stringify({ success, result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Processar fila de mensagens pendentes
    if (payload.action === 'process_queue') {
      const { data: pendingMessages } = await supabase
        .from('whatsapp_dispatch_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(50);

      let sent = 0;
      let failed = 0;

      for (const msg of pendingMessages || []) {
        // Chamar recursivamente para enviar
        const sendResult = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            phone: msg.phone,
            message: msg.message,
            lead_id: msg.lead_id,
            template_id: msg.template_id
          })
        });

        const result = await sendResult.json();
        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        // Delay entre mensagens para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return new Response(
        JSON.stringify({ success: true, sent, failed, total: pendingMessages?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Receber webhook (mensagens recebidas)
    if (payload.action === 'receive_webhook') {
      const webhookData = payload.webhook_data;
      
      if (!webhookData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Dados do webhook não fornecidos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Extrair dados dependendo do provider
      let phone = '';
      let message = '';
      let messageId = '';

      if (webhookData.data?.key?.remoteJid) {
        // Evolution API
        phone = webhookData.data.key.remoteJid.replace('@s.whatsapp.net', '');
        message = webhookData.data.message?.conversation || 
                  webhookData.data.message?.extendedTextMessage?.text || '';
        messageId = webhookData.data.key.id;
      } else if (webhookData.phone) {
        // Z-API ou genérico
        phone = webhookData.phone;
        message = webhookData.text?.message || webhookData.message || '';
        messageId = webhookData.messageId || '';
      }

      if (phone && message) {
        // Buscar lead pelo telefone
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id, name, assigned_to')
          .or(`phone.eq.${phone},whatsapp.eq.${phone}`)
          .single();

        // Registrar mensagem recebida
        await supabase
          .from('crm_chat_messages')
          .insert({
            lead_id: lead?.id,
            content: message,
            sender_id: 'external',
            sender_name: lead?.name || phone,
            message_type: 'received',
            metadata: { phone, messageId, raw: webhookData }
          });

        // Criar tarefa para responder se lead existe
        if (lead) {
          await supabase
            .from('crm_tasks')
            .insert({
              lead_id: lead.id,
              title: `Responder mensagem WhatsApp`,
              description: `Mensagem recebida: ${message.substring(0, 200)}`,
              due_date: new Date().toISOString(),
              assigned_to: lead.assigned_to,
              priority: 'high'
            });

          // Notificar vendedor
          if (lead.assigned_to) {
            await supabase
              .from('notifications')
              .insert({
                user_id: lead.assigned_to,
                title: '📱 Nova mensagem WhatsApp',
                message: `${lead.name}: ${message.substring(0, 100)}...`,
                type: 'whatsapp_received'
              });
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
