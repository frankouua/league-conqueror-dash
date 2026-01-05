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
    const today = now.toISOString().split("T")[0];

    console.log(`[Morning Summary] Starting for ${today}`);

    // Get all active sellers (members with team_id)
    const { data: sellers, error: sellersError } = await supabase
      .from("profiles")
      .select("user_id, full_name, team_id, department")
      .not("team_id", "is", null);

    if (sellersError) {
      console.error("[Morning Summary] Error fetching sellers:", sellersError);
      throw sellersError;
    }

    console.log(`[Morning Summary] Found ${sellers?.length || 0} sellers`);

    // Get team scores for ranking
    const { data: teams } = await supabase.from("teams").select("id, name");

    // Calculate team points for current month
    const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0];
    const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];

    const [
      { data: revenueData },
      { data: referralLeads },
      { data: individualGoals }
    ] = await Promise.all([
      supabase
        .from("revenue_records")
        .select("team_id, amount, user_id")
        .gte("date", monthStart)
        .lte("date", monthEnd),
      supabase
        .from("referral_leads")
        .select("id, status, assigned_to, last_contact_at")
        .in("status", ["nova", "em_contato"]),
      supabase
        .from("individual_goals")
        .select("user_id, meta2_goal, revenue_goal")
        .eq("month", currentMonth)
        .eq("year", currentYear)
    ]);

    // Calculate team rankings
    const teamPoints: Record<string, number> = {};
    for (const team of teams || []) {
      const teamRevenue = (revenueData || [])
        .filter((r) => r.team_id === team.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      teamPoints[team.id] = Math.floor(teamRevenue / 1000);
    }

    const rankedTeams = Object.entries(teamPoints)
      .sort((a, b) => b[1] - a[1])
      .map(([id], index) => ({ id, position: index + 1 }));

    // Calculate working days remaining in month
    const endOfMonth = new Date(currentYear, currentMonth, 0);
    let workingDaysRemaining = 0;
    const tempDate = new Date(now);
    while (tempDate <= endOfMonth) {
      const dayOfWeek = tempDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysRemaining++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const notifications: {
      user_id: string;
      team_id: string | null;
      title: string;
      message: string;
      type: string;
    }[] = [];

    for (const seller of sellers || []) {
      // Calculate seller's revenue this month
      const sellerRevenue = (revenueData || [])
        .filter((r) => r.user_id === seller.user_id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      // Get seller's goal
      const sellerGoal = (individualGoals || []).find(
        (g) => g.user_id === seller.user_id
      );
      const monthlyGoal = sellerGoal?.revenue_goal || sellerGoal?.meta2_goal || 0;

      // Calculate daily goal
      const remainingGoal = Math.max(0, monthlyGoal - sellerRevenue);
      const dailyGoal = workingDaysRemaining > 0 
        ? Math.ceil(remainingGoal / workingDaysRemaining) 
        : remainingGoal;

      // Get pending leads for this seller
      const pendingLeads = (referralLeads || []).filter(
        (lead) => lead.assigned_to === seller.user_id
      );
      
      // Count stale leads (no contact in 24h+)
      const staleLeads = pendingLeads.filter((lead) => {
        if (!lead.last_contact_at) return true;
        const lastContact = new Date(lead.last_contact_at);
        const hoursSince = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);
        return hoursSince > 24;
      });

      // Get team position
      const teamRank = rankedTeams.find((t) => t.id === seller.team_id);
      const teamName = teams?.find((t) => t.id === seller.team_id)?.name || "Sua equipe";
      const position = teamRank?.position || "-";

      // Calculate progress percentage
      const progressPercent = monthlyGoal > 0 
        ? Math.round((sellerRevenue / monthlyGoal) * 100) 
        : 0;

      // Build message
      const firstName = seller.full_name.split(" ")[0];
      let message = `☀️ Bom dia, ${firstName}!\n\n`;
      
      message += `📊 **Resumo do Dia:**\n`;
      message += `• Meta diária: R$ ${dailyGoal.toLocaleString("pt-BR")}\n`;
      message += `• Progresso mensal: ${progressPercent}% (R$ ${sellerRevenue.toLocaleString("pt-BR")} / R$ ${monthlyGoal.toLocaleString("pt-BR")})\n`;
      message += `• Dias úteis restantes: ${workingDaysRemaining}\n\n`;

      if (pendingLeads.length > 0) {
        message += `👥 **Leads Pendentes:** ${pendingLeads.length}\n`;
        if (staleLeads.length > 0) {
          message += `⚠️ ${staleLeads.length} lead(s) aguardando contato há +24h\n\n`;
        } else {
          message += `✅ Todos os leads contatados recentemente\n\n`;
        }
      } else {
        message += `👥 **Leads:** Nenhum lead pendente\n\n`;
      }

      message += `🏆 **Ranking:** ${teamName} está em ${position}º lugar\n`;

      // Add motivational message based on progress
      if (progressPercent >= 100) {
        message += `\n🎉 Parabéns! Você já bateu a meta! Continue assim!`;
      } else if (progressPercent >= 80) {
        message += `\n🔥 Você está quase lá! Falta pouco para bater a meta!`;
      } else if (progressPercent >= 50) {
        message += `\n💪 Metade do caminho percorrido. Vamos acelerar!`;
      } else {
        message += `\n🚀 Novo dia, novas oportunidades. Bora vender!`;
      }

      notifications.push({
        user_id: seller.user_id,
        team_id: seller.team_id,
        title: "☀️ Resumo Matinal",
        message,
        type: "morning_summary"
      });
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("[Morning Summary] Error inserting notifications:", insertError);
        throw insertError;
      }

      console.log(`[Morning Summary] Created ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        timestamp: now.toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Morning Summary] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
