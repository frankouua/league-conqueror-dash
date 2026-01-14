import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Reativação de Leads Perdidos
// Conforme documento: Tentar reativar leads perdidos após 30/60/90 dias

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 Iniciando automação de reativação...");

    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Buscar leads perdidos que podem ser reativados
    const { data: lostLeads, error: leadsError } = await supabase
      .from('crm_leads')
      .select(`
        id, name, phone, email, lost_at, lost_reason, assigned_to, team_id,
        estimated_value, interested_procedures, last_recovery_at, recovery_attempts
      `)
      .not('lost_at', 'is', null)
      .lt('lost_at', thirtyDaysAgo)
      .or('last_recovery_at.is.null,last_recovery_at.lt.' + thirtyDaysAgo);

    if (leadsError) throw leadsError;

    console.log(`📋 ${lostLeads?.length || 0} leads perdidos para analisar`);

    // Razões que NÃO devem ser reativadas
    const noReactivateReasons = [
      'sem_interesse_procedimento',
      'optou_concorrente',
      'mudou_cidade',
      'falecimento',
      'duplicado',
    ];

    const reactivations: any[] = [];
    const notifications: any[] = [];
    const messages: any[] = [];

    for (const lead of lostLeads || []) {
      // Verificar se o motivo permite reativação
      if (noReactivateReasons.includes(lead.lost_reason || '')) {
        continue;
      }

      const recoveryAttempts = lead.recovery_attempts || 0;
      const daysSinceLost = Math.floor((now - new Date(lead.lost_at).getTime()) / (24 * 60 * 60 * 1000));

      // Definir nível de reativação baseado no tempo
      let reactivationLevel = 0;
      let template = '';

      if (daysSinceLost >= 90 && recoveryAttempts < 3) {
        reactivationLevel = 3;
        template = `Olá {{nome}}! Faz um tempo que não conversamos. Temos novidades e condições especiais que podem te interessar. Podemos conversar?`;
      } else if (daysSinceLost >= 60 && recoveryAttempts < 2) {
        reactivationLevel = 2;
        template = `Oi {{nome}}, tudo bem? Estamos com uma promoção especial este mês. Gostaria de saber mais?`;
      } else if (daysSinceLost >= 30 && recoveryAttempts < 1) {
        reactivationLevel = 1;
        template = `Olá {{nome}}! Percebi que ficou algo pendente na nossa conversa. Posso ajudar com alguma dúvida?`;
      }

      if (reactivationLevel === 0) continue;

      // Atualizar tentativas de recuperação
      await supabase
        .from('crm_leads')
        .update({
          recovery_attempts: recoveryAttempts + 1,
          last_recovery_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      // Agendar mensagem de reativação
      const message = template.replace('{{nome}}', lead.name.split(' ')[0]);
      
      messages.push({
        lead_id: lead.id,
        phone: lead.phone,
        message_content: message,
        template_type: `reactivation_level_${reactivationLevel}`,
        scheduled_at: new Date(now + 10 * 60 * 1000).toISOString(), // 10 min
        status: 'pending',
      });

      reactivations.push({
        lead_id: lead.id,
        lead_name: lead.name,
        level: reactivationLevel,
        days_since_lost: daysSinceLost,
      });

      // Notificar vendedor original
      if (lead.assigned_to) {
        notifications.push({
          user_id: lead.assigned_to,
          title: '🔄 Reativação Automática',
          message: `Lead ${lead.name} está sendo reativado (tentativa ${recoveryAttempts + 1})`,
          type: 'lead_reactivation',
        });
      }

      // Registrar no histórico
      await supabase.from('crm_lead_history').insert({
        lead_id: lead.id,
        action_type: 'reactivation_attempt',
        title: `Tentativa de reativação #${recoveryAttempts + 1}`,
        description: `Nível ${reactivationLevel} - ${daysSinceLost} dias desde perda`,
        performed_by: '00000000-0000-0000-0000-000000000000',
      });
    }

    // Inserir mensagens na fila
    if (messages.length > 0) {
      await supabase.from('crm_whatsapp_queue').insert(messages);
    }

    // Inserir notificações
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Log da automação
    await supabase.from('automation_logs').insert({
      automation_type: 'reactivation',
      status: 'success',
      results: { 
        analyzed: lostLeads?.length || 0,
        reactivations: reactivations.length,
        messages_queued: messages.length,
      },
    });

    console.log(`✅ Reativação: ${reactivations.length} leads, ${messages.length} mensagens agendadas`);

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: lostLeads?.length || 0,
        reactivations: reactivations.length,
        messages_queued: messages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na reativação:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
