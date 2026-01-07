import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  // Campos de formulário customizados
  [key: string]: unknown;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const webhookKey = url.searchParams.get('key');

    if (!webhookKey) {
      console.error('Missing webhook key');
      return new Response(
        JSON.stringify({ error: 'Missing webhook key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validar webhook key
    const { data: webhook, error: webhookError } = await supabase
      .from('crm_webhooks')
      .select('*')
      .eq('webhook_key', webhookKey)
      .eq('is_active', true)
      .single();

    if (webhookError || !webhook) {
      console.error('Invalid or inactive webhook key:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive webhook' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook found:', webhook.name);

    // Parse payload
    let payload: WebhookPayload;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries()) as WebhookPayload;
    } else {
      // Tentar como JSON mesmo assim
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }
    }

    console.log('Received payload:', JSON.stringify(payload));

    // Extrair UTM parameters da URL
    const utmSource = url.searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium');
    const utmCampaign = url.searchParams.get('utm_campaign');
    const utmContent = url.searchParams.get('utm_content');
    const utmTerm = url.searchParams.get('utm_term');

    // Aplicar field mapping se configurado
    const fieldMapping = webhook.field_mapping || {};
    const mappedData: Record<string, unknown> = {};
    
    for (const [formField, leadField] of Object.entries(fieldMapping)) {
      if (payload[formField] !== undefined) {
        mappedData[leadField as string] = payload[formField];
      }
    }

    // Dados do lead
    const leadName = (mappedData.name || payload.name || payload.nome || payload.full_name || 'Lead sem nome') as string;
    const leadEmail = (mappedData.email || payload.email || payload.e_mail) as string;
    const leadPhone = (mappedData.phone || payload.phone || payload.telefone || payload.celular) as string;
    const leadWhatsapp = (mappedData.whatsapp || payload.whatsapp || payload.whats || leadPhone) as string;

    // Verificar se lead já existe por email ou telefone
    let existingLead = null;
    
    if (leadEmail) {
      const { data } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('email', leadEmail)
        .single();
      existingLead = data;
    }
    
    if (!existingLead && leadPhone) {
      const { data } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('phone', leadPhone)
        .single();
      existingLead = data;
    }

    let leadId: string;

    if (existingLead) {
      // Lead já existe - atualizar last_activity
      leadId = existingLead.id;
      
      await supabase
        .from('crm_leads')
        .update({ 
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      console.log('Existing lead updated:', leadId);
    } else {
      // Criar novo lead
      const { data: newLead, error: leadError } = await supabase
        .from('crm_leads')
        .insert({
          name: leadName,
          email: leadEmail || null,
          phone: leadPhone || null,
          whatsapp: leadWhatsapp || null,
          pipeline_id: webhook.default_pipeline_id,
          stage_id: webhook.default_stage_id,
          assigned_to: webhook.default_assigned_to || null,
          source: webhook.form_source || 'webhook',
          source_detail: webhook.name,
          created_by: webhook.created_by,
          temperature: 'hot', // Leads de formulário são quentes
          first_contact_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        throw new Error(`Failed to create lead: ${leadError.message}`);
      }

      leadId = newLead.id;
      console.log('New lead created:', leadId);
    }

    // Salvar resposta do formulário
    const { error: responseError } = await supabase
      .from('crm_form_responses')
      .insert({
        lead_id: leadId,
        form_name: webhook.name,
        form_source: webhook.form_source,
        campaign_name: utmCampaign || payload.campaign || null,
        utm_source: utmSource || payload.utm_source || null,
        utm_medium: utmMedium || payload.utm_medium || null,
        utm_campaign: utmCampaign || payload.utm_campaign || null,
        utm_content: utmContent || payload.utm_content || null,
        utm_term: utmTerm || payload.utm_term || null,
        responses: payload,
        raw_payload: payload,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
        processed_at: new Date().toISOString(),
      });

    if (responseError) {
      console.error('Error saving form response:', responseError);
    }

    // Criar notificação para o comercial
    const notificationTargets: { user_id?: string; team_id?: string }[] = [];

    // Se tem assigned_to, notificar esse usuário
    if (webhook.default_assigned_to) {
      notificationTargets.push({ user_id: webhook.default_assigned_to });
    }

    // Buscar usuários do time comercial (se configurado)
    const { data: commercialUsers } = await supabase
      .from('profiles')
      .select('user_id, team_id')
      .in('position', ['Closer', 'SDR', 'Vendedor'])
      .eq('is_approved', true);

    if (commercialUsers && commercialUsers.length > 0) {
      for (const user of commercialUsers) {
        if (!notificationTargets.find(t => t.user_id === user.user_id)) {
          notificationTargets.push({ user_id: user.user_id, team_id: user.team_id });
        }
      }
    }

    // Criar notificações
    const notificationType = existingLead ? 'form_response' : 'new_lead';
    const notificationTitle = existingLead 
      ? `Nova resposta de ${leadName}` 
      : `🔥 Novo lead: ${leadName}`;
    const notificationMessage = existingLead
      ? `${leadName} respondeu o formulário "${webhook.name}"`
      : `${leadName} entrou via "${webhook.name}"${leadPhone ? ` - ${leadPhone}` : ''}`;

    for (const target of notificationTargets) {
      await supabase
        .from('crm_notifications')
        .insert({
          user_id: target.user_id,
          team_id: target.team_id,
          lead_id: leadId,
          notification_type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          metadata: {
            form_name: webhook.name,
            source: webhook.form_source,
            has_phone: !!leadPhone,
            has_email: !!leadEmail,
          }
        });
    }

    console.log(`Created ${notificationTargets.length} notifications`);

    // Registrar no histórico do lead
    await supabase
      .from('crm_lead_history')
      .insert({
        lead_id: leadId,
        action_type: existingLead ? 'form_response' : 'created',
        title: existingLead ? 'Nova resposta de formulário' : 'Lead criado via formulário',
        description: `Formulário: ${webhook.name}`,
        performed_by: webhook.created_by,
        metadata: {
          form_name: webhook.name,
          source: webhook.form_source,
          utm_campaign: utmCampaign,
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: leadId,
        is_new: !existingLead,
        message: existingLead ? 'Form response added to existing lead' : 'New lead created'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
