import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  // Dados básicos do lead
  name?: string;
  nome?: string;
  full_name?: string;
  email?: string;
  e_mail?: string;
  phone?: string;
  telefone?: string;
  celular?: string;
  whatsapp?: string;
  whats?: string;
  
  // Dados de interesse
  procedure?: string;
  procedimento?: string;
  interesse?: string;
  interest?: string;
  
  // UTM Parameters (podem vir no body também)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  
  // Dados adicionais para scoring
  budget?: string;
  orcamento?: string;
  timeline?: string;
  prazo?: string;
  urgency?: string;
  urgencia?: string;
  
  // Campo de origem específica
  source?: string;
  origem?: string;
  form_name?: string;
  campaign?: string;
  
  // Tags
  tags?: string[] | string;
  
  // Campos customizados
  [key: string]: unknown;
}

// Fontes conhecidas e seus pesos para lead scoring
const SOURCE_WEIGHTS: Record<string, number> = {
  'facebook_lead_ads': 15,
  'google_ads': 20,
  'instagram': 12,
  'trafego_pago': 18,
  'typeform': 15,
  'landing_page': 15,
  'isca_gratuita': 10,
  'whatsapp': 25,
  'indicacao': 30,
  'organico': 12,
  'other': 8,
};

// Calcula o Lead Score (MQL) baseado em diversos fatores
function calculateLeadScore(payload: WebhookPayload, source: string): number {
  let score = 0;
  
  // 1. Pontuação pela origem (0-30 pontos)
  score += SOURCE_WEIGHTS[source] || SOURCE_WEIGHTS['other'];
  
  // 2. Completude dos dados (0-25 pontos)
  const hasEmail = !!(payload.email || payload.e_mail);
  const hasPhone = !!(payload.phone || payload.telefone || payload.celular);
  const hasWhatsapp = !!(payload.whatsapp || payload.whats);
  const hasProcedure = !!(payload.procedure || payload.procedimento || payload.interesse || payload.interest);
  
  if (hasEmail) score += 5;
  if (hasPhone) score += 8;
  if (hasWhatsapp) score += 7;
  if (hasProcedure) score += 5;
  
  // 3. Indicadores de intenção de compra (0-25 pontos)
  const budgetKeywords = ['sim', 'yes', 'alto', 'high', 'disponível', 'tenho', 'pronto'];
  const urgencyKeywords = ['urgente', 'agora', 'imediato', 'hoje', 'essa semana', 'próximo mês'];
  
  const budgetValue = String(payload.budget || payload.orcamento || '').toLowerCase();
  const timelineValue = String(payload.timeline || payload.prazo || payload.urgency || payload.urgencia || '').toLowerCase();
  
  if (budgetKeywords.some(kw => budgetValue.includes(kw))) score += 15;
  if (urgencyKeywords.some(kw => timelineValue.includes(kw))) score += 10;
  
  // 4. UTM Campaign indica campanha ativa (0-10 pontos)
  if (payload.utm_campaign) score += 5;
  if (payload.utm_source === 'google' || payload.utm_medium === 'cpc') score += 5;
  
  // 5. Procedimentos de alto valor (0-10 pontos)
  const procedureValue = String(payload.procedure || payload.procedimento || payload.interesse || '').toLowerCase();
  const highValueProcedures = ['cirurgia', 'rinoplastia', 'lipo', 'abdominoplastia', 'mamoplastia', 'facelift', 'blefaroplastia'];
  
  if (highValueProcedures.some(p => procedureValue.includes(p))) score += 10;
  
  // Garantir que o score está entre 0 e 100
  return Math.min(Math.max(Math.round(score), 0), 100);
}

// Determina a temperatura do lead baseado no score
function getTemperature(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 60) return 'hot';
  if (score >= 35) return 'warm';
  return 'cold';
}

// Normaliza o telefone para formato brasileiro
function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '');
  
  // Se tem 10 ou 11 dígitos, é um telefone brasileiro válido
  if (numbers.length >= 10 && numbers.length <= 13) {
    // Remove o 55 do início se presente
    const cleaned = numbers.startsWith('55') ? numbers.slice(2) : numbers;
    return cleaned;
  }
  
  return numbers || null;
}

// Extrai procedimentos de interesse do payload
function extractProcedures(payload: WebhookPayload): string[] {
  const procedures: string[] = [];
  
  const rawProcedure = payload.procedure || payload.procedimento || payload.interesse || payload.interest;
  
  if (rawProcedure) {
    if (Array.isArray(rawProcedure)) {
      procedures.push(...rawProcedure.map(p => String(p)));
    } else if (typeof rawProcedure === 'string') {
      // Pode vir separado por vírgula ou ponto e vírgula
      procedures.push(...rawProcedure.split(/[,;]/).map(p => p.trim()).filter(Boolean));
    }
  }
  
  return procedures;
}

// Extrai tags do payload
function extractTags(payload: WebhookPayload, source: string): string[] {
  const tags: string[] = [];
  
  // Tag da origem
  tags.push(`origem:${source}`);
  
  // Tags customizadas
  if (payload.tags) {
    if (Array.isArray(payload.tags)) {
      tags.push(...payload.tags);
    } else if (typeof payload.tags === 'string') {
      tags.push(...payload.tags.split(',').map(t => t.trim()).filter(Boolean));
    }
  }
  
  // Tag da campanha
  if (payload.utm_campaign) {
    tags.push(`campanha:${payload.utm_campaign}`);
  }
  
  return [...new Set(tags)]; // Remove duplicatas
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

    // Parse payload - suporta múltiplos formatos
    let payload: WebhookPayload;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries()) as WebhookPayload;
    } else if (contentType.includes('multipart/form-data')) {
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

    // Extrair UTM parameters da URL (prioridade sobre o body)
    const utmSource = url.searchParams.get('utm_source') || payload.utm_source || null;
    const utmMedium = url.searchParams.get('utm_medium') || payload.utm_medium || null;
    const utmCampaign = url.searchParams.get('utm_campaign') || payload.utm_campaign || null;
    const utmContent = url.searchParams.get('utm_content') || payload.utm_content || null;
    const utmTerm = url.searchParams.get('utm_term') || payload.utm_term || null;

    // Aplicar field mapping se configurado
    const fieldMapping = webhook.field_mapping || {};
    const mappedData: Record<string, unknown> = {};
    
    for (const [formField, leadField] of Object.entries(fieldMapping)) {
      if (payload[formField] !== undefined) {
        mappedData[leadField as string] = payload[formField];
      }
    }

    // Dados do lead (com fallbacks múltiplos)
    const leadName = (mappedData.name || payload.name || payload.nome || payload.full_name || 'Lead sem nome') as string;
    const leadEmail = (mappedData.email || payload.email || payload.e_mail) as string;
    const leadPhone = normalizePhone(mappedData.phone as string || payload.phone || payload.telefone || payload.celular);
    const leadWhatsapp = normalizePhone(mappedData.whatsapp as string || payload.whatsapp || payload.whats || leadPhone || undefined);

    // Fonte do lead
    const leadSource = webhook.form_source || payload.source || payload.origem || 'webhook';
    
    // Calcular Lead Score (MQL)
    const leadScore = calculateLeadScore(payload, leadSource);
    const temperature = getTemperature(leadScore);
    
    // Extrair procedimentos e tags
    const interestedProcedures = extractProcedures(payload);
    const tags = extractTags(payload, leadSource);

    console.log(`Lead Score: ${leadScore}, Temperature: ${temperature}`);

    // Verificar se lead já existe por email ou telefone
    let existingLead = null;
    
    if (leadEmail) {
      const { data } = await supabase
        .from('crm_leads')
        .select('id, lead_score, tags, interested_procedures')
        .eq('email', leadEmail)
        .single();
      existingLead = data;
    }
    
    if (!existingLead && leadPhone) {
      const { data } = await supabase
        .from('crm_leads')
        .select('id, lead_score, tags, interested_procedures')
        .eq('phone', leadPhone)
        .single();
      existingLead = data;
    }

    let leadId: string;
    let isNewLead = false;

    if (existingLead) {
      // Lead já existe - atualizar com novos dados
      leadId = existingLead.id;
      
      // Merge tags existentes com novas
      const existingTags = existingLead.tags || [];
      const mergedTags = [...new Set([...existingTags, ...tags])];
      
      // Merge procedimentos
      const existingProcedures = existingLead.interested_procedures || [];
      const mergedProcedures = [...new Set([...existingProcedures, ...interestedProcedures])];
      
      // Manter o maior score
      const newScore = Math.max(existingLead.lead_score || 0, leadScore);
      
      await supabase
        .from('crm_leads')
        .update({ 
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lead_score: newScore,
          temperature: getTemperature(newScore),
          tags: mergedTags,
          interested_procedures: mergedProcedures,
          is_stale: false,
          stale_since: null,
        })
        .eq('id', leadId);

      console.log('Existing lead updated:', leadId);
    } else {
      // Criar novo lead
      isNewLead = true;
      
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
          source: leadSource,
          source_detail: webhook.name,
          created_by: webhook.created_by,
          temperature: temperature,
          lead_score: leadScore,
          tags: tags,
          interested_procedures: interestedProcedures.length > 0 ? interestedProcedures : null,
          first_contact_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        throw new Error(`Failed to create lead: ${leadError.message}`);
      }

      leadId = newLead.id;
      console.log('New lead created:', leadId, 'Score:', leadScore);
    }

    // Salvar resposta do formulário com todos os dados
    const { error: responseError } = await supabase
      .from('crm_form_responses')
      .insert({
        lead_id: leadId,
        form_name: webhook.name,
        form_source: leadSource,
        campaign_name: utmCampaign || payload.campaign || null,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
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

    // Criar notificações com score
    const scoreEmoji = leadScore >= 60 ? '🔥' : leadScore >= 35 ? '⭐' : '📋';
    const notificationType = isNewLead ? 'new_lead' : 'form_response';
    const notificationTitle = isNewLead 
      ? `${scoreEmoji} Novo lead (Score: ${leadScore}): ${leadName}` 
      : `Nova resposta de ${leadName}`;
    const notificationMessage = isNewLead
      ? `${leadName} entrou via "${webhook.name}"${leadPhone ? ` - ${leadPhone}` : ''} | Score: ${leadScore}/100`
      : `${leadName} respondeu o formulário "${webhook.name}"`;

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
            source: leadSource,
            lead_score: leadScore,
            temperature: temperature,
            has_phone: !!leadPhone,
            has_email: !!leadEmail,
            utm_campaign: utmCampaign,
            procedures: interestedProcedures,
          }
        });
    }

    console.log(`Created ${notificationTargets.length} notifications`);

    // Registrar no histórico do lead
    await supabase
      .from('crm_lead_history')
      .insert({
        lead_id: leadId,
        action_type: isNewLead ? 'created' : 'form_response',
        title: isNewLead ? 'Lead criado via formulário' : 'Nova resposta de formulário',
        description: `Formulário: ${webhook.name} | Score: ${leadScore} | Temperatura: ${temperature}`,
        performed_by: webhook.created_by,
        metadata: {
          form_name: webhook.name,
          source: leadSource,
          lead_score: leadScore,
          temperature: temperature,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          procedures: interestedProcedures,
        }
      });

    // Se lead é HOT (score >= 60), criar tarefa de follow-up imediato
    if (isNewLead && leadScore >= 60 && webhook.default_assigned_to) {
      await supabase
        .from('crm_tasks')
        .insert({
          lead_id: leadId,
          title: `🔥 Follow-up URGENTE - ${leadName}`,
          description: `Lead com score ${leadScore}/100 entrou via ${webhook.name}. Contatar imediatamente!`,
          task_type: 'follow_up',
          priority: 'urgent',
          due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
          assigned_to: webhook.default_assigned_to,
          created_by: webhook.created_by,
        });
      
      console.log('Urgent follow-up task created for hot lead');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: leadId,
        is_new: isNewLead,
        lead_score: leadScore,
        temperature: temperature,
        message: isNewLead ? `New lead created with score ${leadScore}` : 'Form response added to existing lead'
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