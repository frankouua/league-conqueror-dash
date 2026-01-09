import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertConfig {
  type: string;
  priority: "urgent" | "high" | "medium" | "low";
  emoji: string;
  title: string;
}

const ALERT_CONFIGS: Record<string, AlertConfig> = {
  stale_5d: { 
    type: "stale_lead_5d", 
    priority: "high", 
    emoji: "⏰", 
    title: "Lead sem resposta há 5+ dias" 
  },
  stale_7d: { 
    type: "stale_lead_7d", 
    priority: "urgent", 
    emoji: "🔴", 
    title: "CRÍTICO: Lead parado há 7+ dias" 
  },
  negative_sentiment: { 
    type: "negative_sentiment", 
    priority: "urgent", 
    emoji: "😤", 
    title: "Sentimento negativo detectado" 
  },
  ready_conversion: { 
    type: "ready_conversion", 
    priority: "high", 
    emoji: "🎯", 
    title: "Lead pronto para conversão" 
  },
  high_value_pending: { 
    type: "high_value_pending", 
    priority: "high", 
    emoji: "💰", 
    title: "Lead de alto valor pendente" 
  },
  surgery_reminder: { 
    type: "surgery_reminder", 
    priority: "urgent", 
    emoji: "🏥", 
    title: "Cirurgia próxima" 
  },
  new_lead_no_contact: { 
    type: "new_lead_no_contact", 
    priority: "urgent", 
    emoji: "🆕", 
    title: "Novo lead sem primeiro contato" 
  },
  hot_lead_stale: { 
    type: "hot_lead_stale", 
    priority: "urgent", 
    emoji: "🔥", 
    title: "Lead quente esfriando!" 
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Starting CRM alerts check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const results: Record<string, { found: number; notified: number }> = {};
    let totalNotifications = 0;

    // Helper function to create notification avoiding duplicates
    async function createAlert(
      leadId: string,
      userId: string | null,
      teamId: string | null,
      alertKey: keyof typeof ALERT_CONFIGS,
      customMessage: string,
      metadata?: Record<string, any>
    ) {
      const config = ALERT_CONFIGS[alertKey];
      
      // Check for existing notification in last 24 hours
      const { data: existing } = await supabase
        .from("crm_notifications")
        .select("id")
        .eq("lead_id", leadId)
        .eq("notification_type", config.type)
        .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existing) {
        console.log(`⏭️ Skipping duplicate alert ${config.type} for lead ${leadId}`);
        return false;
      }

      const { error } = await supabase
        .from("crm_notifications")
        .insert({
          lead_id: leadId,
          user_id: userId,
          team_id: teamId,
          notification_type: config.type,
          title: `${config.emoji} ${config.title}`,
          message: customMessage,
          metadata: { priority: config.priority, ...metadata },
          is_read: false,
        });

      if (error) {
        console.error(`❌ Error creating alert:`, error);
        return false;
      }

      console.log(`✅ Created alert: ${config.type} for lead ${leadId}`);
      return true;
    }

    // ============================================
    // ALERT 1: Lead sem resposta há 5+ dias
    // ============================================
    console.log("📍 Checking: Leads without response 5+ days...");
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleLeads5d } = await supabase
      .from("crm_leads")
      .select("id, name, assigned_to, team_id, last_activity_at, created_at, estimated_value")
      .is("lost_at", null)
      .is("won_at", null)
      .or(`last_activity_at.lt.${fiveDaysAgo},last_activity_at.is.null`)
      .gte("created_at", sevenDaysAgo);

    results.stale_5d = { found: staleLeads5d?.length || 0, notified: 0 };

    for (const lead of staleLeads5d || []) {
      const lastActivity = lead.last_activity_at || lead.created_at;
      const daysSince = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      
      const created = await createAlert(
        lead.id,
        lead.assigned_to,
        lead.team_id,
        "stale_5d",
        `${lead.name} não responde há ${daysSince} dias. Entre em contato para não perder a oportunidade!`,
        { days_since_contact: daysSince, estimated_value: lead.estimated_value }
      );
      if (created) {
        results.stale_5d.notified++;
        totalNotifications++;
      }
    }

    // ============================================
    // ALERT 1b: Lead sem resposta há 7+ dias (crítico)
    // ============================================
    console.log("📍 Checking: Leads without response 7+ days (critical)...");
    const { data: staleLeads7d } = await supabase
      .from("crm_leads")
      .select("id, name, assigned_to, team_id, last_activity_at, created_at, estimated_value")
      .is("lost_at", null)
      .is("won_at", null)
      .or(`last_activity_at.lt.${sevenDaysAgo},last_activity_at.is.null`)
      .lt("created_at", sevenDaysAgo);

    results.stale_7d = { found: staleLeads7d?.length || 0, notified: 0 };

    for (const lead of staleLeads7d || []) {
      const lastActivity = lead.last_activity_at || lead.created_at;
      const daysSince = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      
      const created = await createAlert(
        lead.id,
        lead.assigned_to,
        lead.team_id,
        "stale_7d",
        `🚨 CRÍTICO: ${lead.name} está parado há ${daysSince} dias! Risco alto de perder o lead.`,
        { days_since_contact: daysSince, estimated_value: lead.estimated_value }
      );
      if (created) {
        results.stale_7d.notified++;
        totalNotifications++;
      }
    }

    // ============================================
    // ALERT 2: Lead com sentimento negativo nas últimas 24h
    // ============================================
    console.log("📍 Checking: Leads with negative sentiment...");
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: negativeInteractions } = await supabase
      .from("crm_lead_interactions")
      .select(`
        id, 
        lead_id, 
        description,
        created_at,
        crm_leads!inner(id, name, assigned_to, team_id, estimated_value)
      `)
      .eq("sentiment", "negative")
      .gte("created_at", oneDayAgo);

    results.negative_sentiment = { found: negativeInteractions?.length || 0, notified: 0 };

    const processedNegativeLeads = new Set<string>();
    for (const interaction of negativeInteractions || []) {
      const lead = (interaction as any).crm_leads;
      if (processedNegativeLeads.has(lead.id)) continue;
      processedNegativeLeads.add(lead.id);

      const created = await createAlert(
        lead.id,
        lead.assigned_to,
        lead.team_id,
        "negative_sentiment",
        `${lead.name} demonstrou sentimento negativo recentemente. Ação imediata necessária para reverter a situação!`,
        { interaction_id: interaction.id, interaction_description: interaction.description }
      );
      if (created) {
        results.negative_sentiment.notified++;
        totalNotifications++;
      }
    }

    // ============================================
    // ALERT 3: Lead pronto para conversão (score alto + estágio qualificado)
    // ============================================
    console.log("📍 Checking: Leads ready for conversion...");
    
    // Get qualificado stages
    const { data: qualifiedStages } = await supabase
      .from("crm_stages")
      .select("id")
      .ilike("name", "%qualificad%");

    const qualifiedStageIds = qualifiedStages?.map(s => s.id) || [];

    if (qualifiedStageIds.length > 0) {
      const { data: readyLeads } = await supabase
        .from("crm_leads")
        .select("id, name, assigned_to, team_id, lead_score, estimated_value, temperature")
        .is("lost_at", null)
        .is("won_at", null)
        .in("stage_id", qualifiedStageIds)
        .or("lead_score.gte.80,temperature.eq.hot");

      results.ready_conversion = { found: readyLeads?.length || 0, notified: 0 };

      for (const lead of readyLeads || []) {
        const created = await createAlert(
          lead.id,
          lead.assigned_to,
          lead.team_id,
          "ready_conversion",
          `🎯 ${lead.name} está PRONTO para fechar! Score: ${lead.lead_score || 'Alto'} | Temperatura: ${lead.temperature || 'Quente'}. Não perca essa oportunidade!`,
          { lead_score: lead.lead_score, temperature: lead.temperature, estimated_value: lead.estimated_value }
        );
        if (created) {
          results.ready_conversion.notified++;
          totalNotifications++;
        }
      }
    }

    // ============================================
    // ALERT 4: Lead com valor pendente > R$ 5.000
    // ============================================
    console.log("📍 Checking: High value pending leads...");
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: highValueLeads } = await supabase
      .from("crm_leads")
      .select("id, name, assigned_to, team_id, estimated_value, last_activity_at, created_at")
      .is("lost_at", null)
      .is("won_at", null)
      .gte("estimated_value", 5000)
      .or(`last_activity_at.lt.${threeDaysAgo},last_activity_at.is.null`);

    results.high_value_pending = { found: highValueLeads?.length || 0, notified: 0 };

    for (const lead of highValueLeads || []) {
      const valueFormatted = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(lead.estimated_value || 0);
      
      const created = await createAlert(
        lead.id,
        lead.assigned_to,
        lead.team_id,
        "high_value_pending",
        `💰 ${lead.name} tem valor estimado de ${valueFormatted} e está parado. Priorize este lead!`,
        { estimated_value: lead.estimated_value }
      );
      if (created) {
        results.high_value_pending.notified++;
        totalNotifications++;
      }
    }

    // ============================================
    // ALERT 5: Cirurgia próxima (3 dias)
    // ============================================
    console.log("📍 Checking: Upcoming surgeries...");
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: upcomingSurgeries } = await supabase
      .from("crm_leads")
      .select("id, name, assigned_to, team_id, surgery_date, pre_surgery_checklist_completed")
      .is("lost_at", null)
      .gte("surgery_date", now.toISOString())
      .lte("surgery_date", threeDaysFromNow);

    results.surgery_reminder = { found: upcomingSurgeries?.length || 0, notified: 0 };

    for (const lead of upcomingSurgeries || []) {
      const surgeryDate = new Date(lead.surgery_date);
      const daysUntil = Math.ceil((surgeryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgency = "";
      if (daysUntil === 0) urgency = "🚨 HOJE";
      else if (daysUntil === 1) urgency = "⚠️ AMANHÃ";
      else urgency = `em ${daysUntil} dias`;
      
      const checklistStatus = lead.pre_surgery_checklist_completed 
        ? "✅ Checklist OK" 
        : "❌ CHECKLIST PENDENTE";

      const created = await createAlert(
        lead.id,
        lead.assigned_to,
        lead.team_id,
        "surgery_reminder",
        `🏥 Cirurgia de ${lead.name} ${urgency}! ${checklistStatus}`,
        { surgery_date: lead.surgery_date, days_until: daysUntil, checklist_completed: lead.pre_surgery_checklist_completed }
      );
      if (created) {
        results.surgery_reminder.notified++;
        totalNotifications++;
      }
    }

    // ============================================
    // ALERT 6: Novo lead sem primeiro contato (30+ min)
    // ============================================
    console.log("📍 Checking: New leads without first contact...");
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const { data: noContactLeads } = await supabase
      .from("crm_leads")
      .select("id, name, assigned_to, team_id, created_at, source, estimated_value")
      .is("lost_at", null)
      .is("won_at", null)
      .is("first_contact_at", null)
      .lt("created_at", thirtyMinAgo)
      .gte("created_at", twoHoursAgo);

    results.new_lead_no_contact = { found: noContactLeads?.length || 0, notified: 0 };

    for (const lead of noContactLeads || []) {
      const minutesSince = Math.floor((now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60));
      
      const created = await createAlert(
        lead.id,
        lead.assigned_to,
        lead.team_id,
        "new_lead_no_contact",
        `🆕 ${lead.name} chegou há ${minutesSince} minutos e ainda não foi contatado! Fonte: ${lead.source || 'Desconhecida'}`,
        { minutes_waiting: minutesSince, source: lead.source }
      );
      if (created) {
        results.new_lead_no_contact.notified++;
        totalNotifications++;
      }
    }

    // ============================================
    // ALERT 7: Lead quente esfriando (hot + sem atividade 48h)
    // ============================================
    console.log("📍 Checking: Hot leads going cold...");
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data: hotLeadsStale } = await supabase
      .from("crm_leads")
      .select("id, name, assigned_to, team_id, estimated_value, last_activity_at, created_at")
      .is("lost_at", null)
      .is("won_at", null)
      .eq("temperature", "hot")
      .or(`last_activity_at.lt.${twoDaysAgo},last_activity_at.is.null`);

    results.hot_lead_stale = { found: hotLeadsStale?.length || 0, notified: 0 };

    for (const lead of hotLeadsStale || []) {
      const lastActivity = lead.last_activity_at || lead.created_at;
      const hoursSince = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60));
      
      const created = await createAlert(
        lead.id,
        lead.assigned_to,
        lead.team_id,
        "hot_lead_stale",
        `🔥➡️❄️ ${lead.name} era um lead QUENTE e está esfriando! ${hoursSince}h sem atividade. Aja agora!`,
        { hours_since_activity: hoursSince, estimated_value: lead.estimated_value }
      );
      if (created) {
        results.hot_lead_stale.notified++;
        totalNotifications++;
      }
    }

    console.log(`✅ CRM Alerts check complete. Created ${totalNotifications} notifications.`);
    console.log("📊 Results:", JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: "CRM alerts check complete",
        timestamp: now.toISOString(),
        results,
        totalNotifications,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("❌ Error in check-crm-alerts:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
