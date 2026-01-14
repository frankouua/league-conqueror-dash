import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  action: 'send' | 'test_connection' | 'process_queue';
  to?: string;
  subject?: string;
  body?: string;
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

    const payload: EmailPayload = await req.json();

    // Buscar configuração de email
    const { data: config } = await supabase
      .from('email_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Testar conexão
    if (payload.action === 'test_connection') {
      // Para SMTP seria necessário uma biblioteca específica
      // Aqui vamos apenas validar a configuração
      const isValid = config.provider === 'smtp' 
        ? !!(config.smtp_host && config.smtp_port && config.smtp_user)
        : !!config.api_key;

      return new Response(
        JSON.stringify({ 
          success: true, 
          valid: isValid,
          provider: config.provider 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar email
    if (payload.action === 'send') {
      if (!payload.to || !payload.subject || !payload.body) {
        return new Response(
          JSON.stringify({ success: false, error: 'to, subject e body são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      let success = false;
      let result: any = {};

      if (config.provider === 'sendgrid') {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: payload.to }] }],
            from: { 
              email: config.from_email, 
              name: config.from_name 
            },
            subject: payload.subject,
            content: [{ 
              type: 'text/html', 
              value: payload.body 
            }]
          })
        });

        success = response.ok;
        if (!success) {
          result = await response.json();
        }
      } else if (config.provider === 'mailgun') {
        const formData = new FormData();
        formData.append('from', `${config.from_name} <${config.from_email}>`);
        formData.append('to', payload.to);
        formData.append('subject', payload.subject);
        formData.append('html', payload.body);

        // Extrair domínio do from_email
        const domain = config.from_email.split('@')[1];

        const response = await fetch(
          `https://api.mailgun.net/v3/${domain}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`api:${config.api_key}`)}`
            },
            body: formData
          }
        );

        success = response.ok;
        result = await response.json();
      } else if (config.provider === 'ses') {
        // AWS SES requer SDK específico, aqui usamos API direta simplificada
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'AWS SES requer configuração adicional' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      } else {
        // SMTP tradicional requer biblioteca específica no Deno
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'SMTP requer configuração adicional. Use SendGrid ou Mailgun.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Registrar na fila
      await supabase
        .from('email_dispatch_queue')
        .insert({
          lead_id: payload.lead_id,
          to_email: payload.to,
          subject: payload.subject,
          body: payload.body,
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
            action: 'email_sent',
            description: `Email enviado: ${payload.subject}`,
            metadata: { to: payload.to, success, provider: config.provider }
          });
      }

      return new Response(
        JSON.stringify({ success, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar fila
    if (payload.action === 'process_queue') {
      const { data: pendingEmails } = await supabase
        .from('email_dispatch_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(50);

      let sent = 0;
      let failed = 0;

      for (const email of pendingEmails || []) {
        const sendResult = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            to: email.to_email,
            subject: email.subject,
            body: email.body,
            lead_id: email.lead_id,
            template_id: email.template_id
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
        JSON.stringify({ success: true, sent, failed, total: pendingEmails?.length || 0 }),
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
