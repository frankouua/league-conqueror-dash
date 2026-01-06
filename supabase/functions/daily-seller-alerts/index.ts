import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertResult {
  type: string;
  count: number;
  details: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Starting daily seller alerts check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const dayOfMonth = now.getDate();
    const endOfMonth = new Date(year, month, 0);
    const daysInMonth = endOfMonth.getDate();
    const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
    const daysPassed = dayOfMonth;

    console.log(`📅 Checking ${month}/${year}, day ${dayOfMonth}, ${daysRemaining} days remaining`);

    const formatCurrency = (v: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const alerts: AlertResult[] = [];
    const notifications: Array<{
      user_id?: string;
      team_id?: string;
      type: string;
      title: string;
      message: string;
    }> = [];

    // ========================================
    // 1. VENDEDORAS ABAIXO DO RITMO (20%)
    // ========================================
    console.log("📊 Checking sellers below pace...");

    const { data: goals } = await supabase
      .from("predefined_goals")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .not("matched_user_id", "is", null);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, team_id, whatsapp")
      .eq("department", "comercial");

    const { data: teams } = await supabase.from("teams").select("id, name");
    const teamMap = new Map(teams?.map((t) => [t.id, t.name]) || []);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const { data: revenueRecords } = await supabase
      .from("revenue_records")
      .select("user_id, amount, date")
      .gte("date", startDate)
      .lte("date", endDate);

    // Revenue by user
    const revenueByUser = new Map<string, number>();
    revenueRecords?.forEach((r) => {
      const current = revenueByUser.get(r.user_id) || 0;
      revenueByUser.set(r.user_id, current + Number(r.amount));
    });

    // Today's revenue by user
    const todayRevenue = new Map<string, number>();
    revenueRecords?.filter(r => r.date === today).forEach((r) => {
      const current = todayRevenue.get(r.user_id) || 0;
      todayRevenue.set(r.user_id, current + Number(r.amount));
    });

    const belowPaceSellers: string[] = [];
    const noDailySaleSellers: string[] = [];

    // Check for existing notifications today
    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("message, type")
      .in("type", ["seller_below_pace", "seller_no_daily_sale", "seller_critical", "seller_warning"])
      .gte("created_at", `${today}T00:00:00`);

    const notifiedToday = new Set(
      existingNotifications?.map((n) => {
        const match = n.message.match(/\[UID:(.*?)\]/);
        return match ? `${n.type}:${match[1]}` : null;
      }).filter(Boolean) || []
    );

    for (const goal of goals || []) {
      const userId = goal.matched_user_id;
      const profile = profileMap.get(userId);
      if (!profile) continue;

      const meta1Goal = Number(goal.meta1_goal);
      const actual = revenueByUser.get(userId) || 0;
      const expectedPace = (meta1Goal / daysInMonth) * daysPassed;
      const pacePercent = expectedPace > 0 ? (actual / expectedPace) * 100 : 0;
      const goalPercent = meta1Goal > 0 ? (actual / meta1Goal) * 100 : 0;

      // Check if 20%+ below expected pace
      if (pacePercent < 80 && goalPercent < 100) {
        if (!notifiedToday.has(`seller_below_pace:${userId}`)) {
          belowPaceSellers.push(profile.full_name);
          
          const remaining = meta1Goal - actual;
          const dailyNeeded = daysRemaining > 0 ? remaining / daysRemaining : remaining;

          // Notify the seller
          notifications.push({
            user_id: userId,
            type: "seller_below_pace",
            title: "⚠️ Você está abaixo do ritmo esperado",
            message: `Você está em ${Math.round(pacePercent)}% do ritmo esperado para o mês. Atual: ${formatCurrency(actual)} | Meta: ${formatCurrency(meta1Goal)}. Precisa de ${formatCurrency(dailyNeeded)}/dia nos próximos ${daysRemaining} dias. [UID:${userId}]`,
          });
        }
      }

      // Check if no sale today (after 14h)
      const hour = now.getHours();
      if (hour >= 14) {
        const todaySale = todayRevenue.get(userId) || 0;
        if (todaySale === 0 && goalPercent < 100) {
          if (!notifiedToday.has(`seller_no_daily_sale:${userId}`)) {
            noDailySaleSellers.push(profile.full_name);
            
            notifications.push({
              user_id: userId,
              type: "seller_no_daily_sale",
              title: "📊 Nenhuma venda registrada hoje",
              message: `Ainda não há vendas registradas para hoje. Faltam ${daysRemaining} dias para o fim do mês. Sua meta: ${formatCurrency(goal.meta1_goal)}. [UID:${userId}]`,
            });
          }
        }
      }
    }

    alerts.push({
      type: "below_pace",
      count: belowPaceSellers.length,
      details: belowPaceSellers,
    });

    alerts.push({
      type: "no_daily_sale",
      count: noDailySaleSellers.length,
      details: noDailySaleSellers,
    });

    // ========================================
    // 2. INDICAÇÕES PARADAS HÁ MAIS DE 48H
    // ========================================
    console.log("📋 Checking stale referral leads...");

    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const { data: staleLeads } = await supabase
      .from("referral_leads")
      .select("id, referred_name, referrer_name, team_id, assigned_to, status, last_contact_at, created_at")
      .in("status", ["nova", "em_contato", "agendou"])
      .or(`last_contact_at.is.null,last_contact_at.lt.${fortyEightHoursAgo}`);

    const staleLeadDetails: string[] = [];

    for (const lead of staleLeads || []) {
      const lastContact = lead.last_contact_at || lead.created_at;
      const hoursSinceContact = (now.getTime() - new Date(lastContact).getTime()) / (1000 * 60 * 60);

      if (hoursSinceContact >= 48) {
        // Check if already notified
        const { data: recentNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", "lead_stale_48h")
          .ilike("message", `%${lead.id}%`)
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!recentNotif || recentNotif.length === 0) {
          staleLeadDetails.push(`${lead.referred_name} (${Math.floor(hoursSinceContact)}h)`);

          if (lead.assigned_to) {
            notifications.push({
              user_id: lead.assigned_to,
              type: "lead_stale_48h",
              title: "🚨 Indicação parada há mais de 48h!",
              message: `${lead.referred_name} (indicado por ${lead.referrer_name}) está sem contato há ${Math.floor(hoursSinceContact)} horas. Entre em contato URGENTE! [LEAD_ID:${lead.id}]`,
            });
          } else if (lead.team_id) {
            notifications.push({
              team_id: lead.team_id,
              type: "lead_stale_48h",
              title: "🚨 Indicação SEM RESPONSÁVEL há 48h+",
              message: `${lead.referred_name} (indicado por ${lead.referrer_name}) está sem contato e sem responsável há ${Math.floor(hoursSinceContact)} horas! [LEAD_ID:${lead.id}]`,
            });
          }
        }
      }
    }

    alerts.push({
      type: "stale_leads_48h",
      count: staleLeadDetails.length,
      details: staleLeadDetails,
    });

    // ========================================
    // 3. CANCELAMENTOS PENDENTES DE RETENÇÃO
    // ========================================
    console.log("🔄 Checking pending cancellation retentions...");

    const { data: pendingCancellations } = await supabase
      .from("cancellations")
      .select("id, patient_name, contract_value, status, retention_attempts, user_id, team_id")
      .in("status", ["pending", "in_review"])
      .lt("retention_attempts", 3);

    const pendingRetentionDetails: string[] = [];

    for (const cancel of pendingCancellations || []) {
      // Check if notified in last 24h
      const { data: recentNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "cancellation_retention")
        .ilike("message", `%${cancel.id}%`)
        .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!recentNotif || recentNotif.length === 0) {
        pendingRetentionDetails.push(`${cancel.patient_name} (${formatCurrency(cancel.contract_value)})`);

        if (cancel.user_id) {
          notifications.push({
            user_id: cancel.user_id,
            type: "cancellation_retention",
            title: "⚠️ Cancelamento pendente de retenção",
            message: `${cancel.patient_name} tem um cancelamento de ${formatCurrency(cancel.contract_value)} pendente. Tentativas: ${cancel.retention_attempts}/3. Tente reter o cliente! [CANCEL_ID:${cancel.id}]`,
          });
        }
      }
    }

    alerts.push({
      type: "pending_retentions",
      count: pendingRetentionDetails.length,
      details: pendingRetentionDetails,
    });

    // ========================================
    // 4. META DIÁRIA NÃO BATIDA (verificar ontem)
    // ========================================
    console.log("📉 Checking yesterday's daily goal...");

    if (dayOfMonth > 1) {
      const yesterday = new Date(year, month - 1, dayOfMonth - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const { data: yesterdayRevenue } = await supabase
        .from("revenue_records")
        .select("user_id, amount")
        .eq("date", yesterdayStr);

      const yesterdayByUser = new Map<string, number>();
      yesterdayRevenue?.forEach((r) => {
        const current = yesterdayByUser.get(r.user_id) || 0;
        yesterdayByUser.set(r.user_id, current + Number(r.amount));
      });

      const missedDailyGoal: string[] = [];

      for (const goal of goals || []) {
        const userId = goal.matched_user_id;
        const profile = profileMap.get(userId);
        if (!profile) continue;

        const dailyGoal = Number(goal.meta1_goal) / daysInMonth;
        const yesterdaySale = yesterdayByUser.get(userId) || 0;

        // If yesterday was below 50% of daily goal
        if (yesterdaySale < dailyGoal * 0.5) {
          const key = `daily_goal_missed:${userId}:${yesterdayStr}`;
          
          if (!notifiedToday.has(key)) {
            missedDailyGoal.push(profile.full_name);

            notifications.push({
              user_id: userId,
              type: "daily_goal_missed",
              title: "📊 Meta diária de ontem não atingida",
              message: `Ontem você vendeu ${formatCurrency(yesterdaySale)}, abaixo da meta diária de ${formatCurrency(dailyGoal)}. Hoje é dia de recuperar! [UID:${userId}]`,
            });
          }
        }
      }

      alerts.push({
        type: "missed_daily_goal",
        count: missedDailyGoal.length,
        details: missedDailyGoal,
      });
    }

    // ========================================
    // INSERT ALL NOTIFICATIONS
    // ========================================
    console.log(`📬 Creating ${notifications.length} notifications...`);

    let createdCount = 0;
    for (const notif of notifications) {
      const { error } = await supabase.from("notifications").insert(notif);
      if (error) {
        console.error("Error creating notification:", error);
      } else {
        createdCount++;
      }
    }

    console.log(`✅ Created ${createdCount} notifications`);

    // Summary
    const summary = {
      success: true,
      timestamp: now.toISOString(),
      month: `${month}/${year}`,
      daysRemaining,
      alerts,
      notificationsCreated: createdCount,
    };

    console.log("📊 Alert Summary:", JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error in daily-seller-alerts:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
