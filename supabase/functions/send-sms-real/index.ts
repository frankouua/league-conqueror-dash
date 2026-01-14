import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSPayload {
  action: 'send' | 'test_connection' | 'process_queue';
  phone?: string;
  message?: string;
  lead_id?: string;
  template_id?: string;
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

    const payload: SMSPayload = await req.json();

    // Buscar configuração de SMS
    const { data: config } = await supabase
      .from('sms_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMS não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Testar conexão
    if (payload.action === 'test_connection') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          valid: !!config.api_key,
          provider: config.provider 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar SMS
    if (payload.action === 'send') {
      if (!payload.phone || !payload.message) {
        return new Response(
          JSON.stringify({ success: false, error: 'phone e message são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Normalizar telefone
      let phone = payload.phone.replace(/\D/g, '');
      if (!phone.startsWith('55')) phone = '55' + phone;

      let success = false;
      let result: any = {};

      if (config.provider === 'zenvia') {
        const response = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
          method: 'POST',
          headers: {
            'X-API-TOKEN': config.api_key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.sender_id,
            to: phone,
            contents: [{
              type: 'text',
              text: payload.message
            }]
          })
        });

        success = response.ok;
        result = await response.json();
      } else if (config.provider === 'twilio') {
        const accountSid = config.api_key;
        const authToken = config.api_secret;

        const formData = new URLSearchParams();
        formData.append('To', `+${phone}`);
        formData.append('From', config.sender_id);
        formData.append('Body', payload.message);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
          }
        );

        success = response.ok;
        result = await response.json();
      } else if (config.provider === 'vonage') {
        const response = await fetch('https://rest.nexmo.com/sms/json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: config.api_key,
            api_secret: config.api_secret,
            from: config.sender_id,
            to: phone,
            text: payload.message
          })
        });

        result = await response.json();
        success = result.messages?.[0]?.status === '0';
      }

      // Registrar na fila
      await supabase
        .from('sms_dispatch_queue')
        .insert({
          lead_id: payload.lead_id,
          to_phone: phone,
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
            action: 'sms_sent',
            description: `SMS enviado: ${payload.message.substring(0, 50)}...`,
            metadata: { phone, success, provider: config.provider }
          });
      }

      return new Response(
        JSON.stringify({ success, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar fila
    if (payload.action === 'process_queue') {
      const { data: pendingSMS } = await supabase
        .from('sms_dispatch_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(50);

      let sent = 0;
      let failed = 0;

      for (const sms of pendingSMS || []) {
        const sendResult = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            phone: sms.to_phone,
            message: sms.message,
            lead_id: sms.lead_id,
            template_id: sms.template_id
          })
        });

        const result = await sendResult.json();
        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return new Response(
        JSON.stringify({ success: true, sent, failed, total: pendingSMS?.length || 0 }),
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
