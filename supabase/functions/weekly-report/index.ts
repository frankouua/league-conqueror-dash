import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Calculate week dates (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Previous week for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];
    const prevWeekStartStr = prevWeekStart.toISOString().split("T")[0];
    const prevWeekEndStr = prevWeekEnd.toISOString().split("T")[0];

    console.log(`[Weekly Report] Generating for week ${weekStartStr} to ${weekEndStr}`);

    // Fetch all sellers
    const { data: sellers } = await supabase
      .from("profiles")
      .select("user_id, full_name, team_id")
      .not("team_id", "is", null);

    // Fetch teams
    const { data: teams } = await supabase.from("teams").select("id, name");

    // Fetch this week's revenue
    const { data: weekRevenue } = await supabase
      .from("revenue_records")
      .select("amount, user_id, attributed_to_user_id, team_id")
      .gte("date", weekStartStr)
      .lte("date", weekEndStr);

    // Fetch previous week's revenue
    const { data: prevWeekRevenue } = await supabase
      .from("revenue_records")
      .select("amount, user_id, attributed_to_user_id, team_id")
      .gte("date", prevWeekStartStr)
      .lte("date", prevWeekEndStr);

    // Fetch referral leads created this week
    const { data: weekLeads } = await supabase
      .from("referral_leads")
      .select("id, status, assigned_to, team_id")
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    // Fetch individual goals
    const { data: goals } = await supabase
      .from("individual_goals")
      .select("user_id, revenue_goal")
      .eq("month", currentMonth)
      .eq("year", currentYear);

    // Fetch month-to-date revenue
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const { data: monthRevenue } = await supabase
      .from("revenue_records")
      .select("amount, user_id, attributed_to_user_id")
      .gte("date", monthStart)
      .lte("date", now.toISOString().split("T")[0]);

    // Calculate team totals
    const teamWeekTotals: Record<string, number> = {};
    const teamPrevWeekTotals: Record<string, number> = {};
    
    for (const team of teams || []) {
      teamWeekTotals[team.id] = (weekRevenue || [])
        .filter(r => r.team_id === team.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      teamPrevWeekTotals[team.id] = (prevWeekRevenue || [])
        .filter(r => r.team_id === team.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);
    }

    // Sort teams by week revenue
    const rankedTeams = (teams || [])
      .map(t => ({
        ...t,
        weekRevenue: teamWeekTotals[t.id] || 0,
        prevWeekRevenue: teamPrevWeekTotals[t.id] || 0,
        growth: teamPrevWeekTotals[t.id] > 0 
          ? ((teamWeekTotals[t.id] - teamPrevWeekTotals[t.id]) / teamPrevWeekTotals[t.id] * 100)
          : 0
      }))
      .sort((a, b) => b.weekRevenue - a.weekRevenue);

    const notifications: {
      user_id: string;
      team_id: string | null;
      title: string;
      message: string;
      type: string;
    }[] = [];

    // Generate individual reports
    for (const seller of sellers || []) {
      const sellerWeekRevenue = (weekRevenue || [])
        .filter(r => r.user_id === seller.user_id || r.attributed_to_user_id === seller.user_id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const sellerPrevWeekRevenue = (prevWeekRevenue || [])
        .filter(r => r.user_id === seller.user_id || r.attributed_to_user_id === seller.user_id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const sellerMonthRevenue = (monthRevenue || [])
        .filter(r => r.user_id === seller.user_id || r.attributed_to_user_id === seller.user_id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const sellerGoal = goals?.find(g => g.user_id === seller.user_id);
      const monthlyGoal = Number(sellerGoal?.revenue_goal) || 0;
      const goalProgress = monthlyGoal > 0 ? (sellerMonthRevenue / monthlyGoal * 100) : 0;

      const sellerLeads = (weekLeads || []).filter(l => l.assigned_to === seller.user_id);
      const convertedLeads = sellerLeads.filter(l => ["agendou", "consultou", "operou", "ganho"].includes(l.status));

      const weekGrowth = sellerPrevWeekRevenue > 0 
        ? ((sellerWeekRevenue - sellerPrevWeekRevenue) / sellerPrevWeekRevenue * 100)
        : 0;

      const team = teams?.find(t => t.id === seller.team_id);
      const teamRank = rankedTeams.findIndex(t => t.id === seller.team_id) + 1;

      const firstName = seller.full_name.split(" ")[0];

      let message = `📊 **Resumo Semanal - ${firstName}**\n\n`;
      
      message += `💰 **Vendas da Semana:**\n`;
      message += `• Esta semana: R$ ${sellerWeekRevenue.toLocaleString("pt-BR")}\n`;
      message += `• Semana anterior: R$ ${sellerPrevWeekRevenue.toLocaleString("pt-BR")}\n`;
      message += weekGrowth >= 0 
        ? `• 📈 Crescimento: +${weekGrowth.toFixed(1)}%\n\n`
        : `• 📉 Variação: ${weekGrowth.toFixed(1)}%\n\n`;

      if (monthlyGoal > 0) {
        message += `🎯 **Progresso da Meta:**\n`;
        message += `• Mês: R$ ${sellerMonthRevenue.toLocaleString("pt-BR")} / R$ ${monthlyGoal.toLocaleString("pt-BR")}\n`;
        message += `• Progresso: ${goalProgress.toFixed(0)}%\n\n`;
      }

      message += `👥 **Leads:**\n`;
      message += `• Novos leads: ${sellerLeads.length}\n`;
      message += `• Convertidos: ${convertedLeads.length}\n\n`;

      message += `🏆 **Ranking:**\n`;
      message += `• ${team?.name || "Sua equipe"} está em ${teamRank}º lugar\n`;
      message += `• Faturamento da equipe: R$ ${(teamWeekTotals[seller.team_id!] || 0).toLocaleString("pt-BR")}\n\n`;

      // Motivational message based on performance
      if (weekGrowth >= 20) {
        message += `🔥 Semana excepcional! Continue nesse ritmo!`;
      } else if (weekGrowth >= 0) {
        message += `💪 Bom trabalho! Mantenha a consistência!`;
      } else if (weekGrowth >= -20) {
        message += `⚡ Vamos recuperar o ritmo na próxima semana!`;
      } else {
        message += `🚀 Nova semana, novas oportunidades! Foco total!`;
      }

      notifications.push({
        user_id: seller.user_id,
        team_id: seller.team_id,
        title: "📊 Relatório Semanal",
        message,
        type: "weekly_report"
      });
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("[Weekly Report] Error inserting notifications:", insertError);
        throw insertError;
      }

      console.log(`[Weekly Report] Created ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        weekRange: `${weekStartStr} - ${weekEndStr}`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Weekly Report] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
