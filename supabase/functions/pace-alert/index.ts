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
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    console.log(`[Pace Alert] Checking pace on day ${currentDay} of ${daysInMonth}`);

    // Only run on specific days (10th, 15th, 20th)
    const alertDays = [10, 15, 20];
    if (!alertDays.includes(currentDay)) {
      console.log("[Pace Alert] Not an alert day, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Not an alert day" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const todayStr = now.toISOString().split("T")[0];

    // Fetch all sellers with goals
    const { data: goals } = await supabase
      .from("individual_goals")
      .select("user_id, revenue_goal, team_id, profiles!individual_goals_user_id_fkey(full_name)")
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .gt("revenue_goal", 0);

    if (!goals || goals.length === 0) {
      console.log("[Pace Alert] No goals found");
      return new Response(
        JSON.stringify({ success: true, message: "No goals found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch month revenue
    const { data: monthRevenue } = await supabase
      .from("revenue_records")
      .select("amount, user_id, attributed_to_user_id")
      .gte("date", monthStart)
      .lte("date", todayStr);

    // Calculate expected progress percentage
    const expectedProgress = (currentDay / daysInMonth) * 100;
    const criticalThreshold = expectedProgress * 0.6; // 60% of expected = critical
    const warningThreshold = expectedProgress * 0.8; // 80% of expected = warning

    console.log(`[Pace Alert] Expected progress: ${expectedProgress.toFixed(1)}%`);
    console.log(`[Pace Alert] Critical threshold: ${criticalThreshold.toFixed(1)}%`);
    console.log(`[Pace Alert] Warning threshold: ${warningThreshold.toFixed(1)}%`);

    const notifications: {
      user_id: string;
      team_id: string | null;
      title: string;
      message: string;
      type: string;
    }[] = [];

    // Calculate business days remaining
    let businessDaysRemaining = 0;
    const tempDate = new Date(now);
    while (tempDate.getMonth() + 1 === currentMonth) {
      const dayOfWeek = tempDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysRemaining++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    for (const goal of goals) {
      const monthlyGoal = Number(goal.revenue_goal);
      const sellerRevenue = (monthRevenue || [])
        .filter(r => r.user_id === goal.user_id || r.attributed_to_user_id === goal.user_id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const actualProgress = (sellerRevenue / monthlyGoal) * 100;
      const remaining = Math.max(0, monthlyGoal - sellerRevenue);
      const dailyNeeded = businessDaysRemaining > 0 ? remaining / businessDaysRemaining : remaining;

      const profile = (goal as any).profiles;
      const firstName = profile?.full_name?.split(" ")[0] || "Vendedora";

      // Determine alert level
      let alertType: "critical" | "warning" | null = null;
      if (actualProgress < criticalThreshold) {
        alertType = "critical";
      } else if (actualProgress < warningThreshold) {
        alertType = "warning";
      }

      if (!alertType) continue;

      const progressDiff = expectedProgress - actualProgress;
      const behindAmount = (progressDiff / 100) * monthlyGoal;

      let message = "";
      let title = "";

      if (alertType === "critical") {
        title = "🚨 Alerta Crítico de Meta";
        message = `⚠️ ${firstName}, você está significativamente atrás da meta!\n\n`;
        message += `📊 **Situação Atual:**\n`;
        message += `• Progresso: ${actualProgress.toFixed(0)}% (esperado: ${expectedProgress.toFixed(0)}%)\n`;
        message += `• Faturado: R$ ${sellerRevenue.toLocaleString("pt-BR")}\n`;
        message += `• Meta: R$ ${monthlyGoal.toLocaleString("pt-BR")}\n`;
        message += `• Déficit: R$ ${behindAmount.toLocaleString("pt-BR")}\n\n`;
        
        message += `🎯 **Plano de Recuperação:**\n`;
        message += `• Dias úteis restantes: ${businessDaysRemaining}\n`;
        message += `• Meta diária necessária: R$ ${dailyNeeded.toLocaleString("pt-BR")}\n\n`;
        
        message += `💡 **Ações Recomendadas:**\n`;
        message += `1. Revisar leads pendentes imediatamente\n`;
        message += `2. Fazer follow-up em propostas abertas\n`;
        message += `3. Pedir indicações para clientes recentes\n\n`;
        
        message += `⚡ Cada venda conta! Foco total para virar o jogo!`;
      } else {
        title = "⚠️ Alerta de Ritmo";
        message = `📢 ${firstName}, atenção ao seu ritmo de vendas!\n\n`;
        message += `📊 **Situação:**\n`;
        message += `• Progresso: ${actualProgress.toFixed(0)}% (esperado: ${expectedProgress.toFixed(0)}%)\n`;
        message += `• Faturado: R$ ${sellerRevenue.toLocaleString("pt-BR")}\n`;
        message += `• Falta: R$ ${remaining.toLocaleString("pt-BR")}\n\n`;
        
        message += `🎯 **Para bater a meta:**\n`;
        message += `• Feche R$ ${dailyNeeded.toLocaleString("pt-BR")}/dia nos próximos ${businessDaysRemaining} dias úteis\n\n`;
        
        message += `💪 Você consegue! Vamos acelerar!`;
      }

      notifications.push({
        user_id: goal.user_id,
        team_id: goal.team_id,
        title,
        message,
        type: alertType === "critical" ? "seller_critical" : "seller_warning"
      });

      console.log(`[Pace Alert] ${alertType.toUpperCase()} alert for ${firstName}: ${actualProgress.toFixed(1)}%`);
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("[Pace Alert] Error inserting notifications:", insertError);
        throw insertError;
      }

      console.log(`[Pace Alert] Created ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsCreated: notifications.length,
        day: currentDay,
        expectedProgress: expectedProgress.toFixed(1)
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Pace Alert] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
