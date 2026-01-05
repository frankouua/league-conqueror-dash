import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForecastRequest {
  month: number;
  year: number;
  teamId?: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { month, year, teamId, userId } = await req.json() as ForecastRequest;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Forecast] Generating forecast for ${month}/${year}`);

    // Fetch historical data (last 12 months)
    const historicalMonths: { month: number; year: number }[] = [];
    for (let i = 0; i < 12; i++) {
      let m = month - i;
      let y = year;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      historicalMonths.push({ month: m, year: y });
    }

    // Build date ranges
    const dateRanges = historicalMonths.map(({ month: m, year: y }) => {
      const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const endDate = new Date(y, m, 0).toISOString().split("T")[0];
      return { month: m, year: y, startDate, endDate };
    });

    // Fetch revenue for each month
    const revenueByMonth: { month: number; year: number; revenue: number; count: number }[] = [];
    
    for (const range of dateRanges) {
      let query = supabase
        .from("revenue_records")
        .select("amount")
        .gte("date", range.startDate)
        .lte("date", range.endDate);
      
      if (teamId) {
        query = query.eq("team_id", teamId);
      }
      if (userId) {
        query = query.or(`user_id.eq.${userId},attributed_to_user_id.eq.${userId}`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching revenue:", error);
        continue;
      }

      const revenue = (data || []).reduce((sum, r) => sum + Number(r.amount), 0);
      revenueByMonth.push({
        month: range.month,
        year: range.year,
        revenue,
        count: data?.length || 0
      });
    }

    // Current month data
    const currentMonthData = revenueByMonth.find(r => r.month === month && r.year === year);
    const currentRevenue = currentMonthData?.revenue || 0;

    // Calculate working days
    const now = new Date();
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(0, daysInMonth - currentDay);
    const daysElapsed = currentDay;

    // Calculate business days
    let businessDaysElapsed = 0;
    let businessDaysRemaining = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (!isWeekend) {
        if (d <= currentDay) businessDaysElapsed++;
        else businessDaysRemaining++;
      }
    }

    // Fetch current month goal
    let monthlyGoal = 0;
    if (userId) {
      const { data: goalData } = await supabase
        .from("individual_goals")
        .select("revenue_goal")
        .eq("user_id", userId)
        .eq("month", month)
        .eq("year", year)
        .single();
      monthlyGoal = Number(goalData?.revenue_goal) || 0;
    }

    // Fetch teams for context
    const { data: teams } = await supabase.from("teams").select("id, name");

    // Prepare historical summary for AI
    const historicalSummary = revenueByMonth
      .filter(r => !(r.month === month && r.year === year))
      .slice(0, 6)
      .map(r => `${r.month}/${r.year}: R$ ${r.revenue.toLocaleString("pt-BR")} (${r.count} vendas)`)
      .join("\n");

    // Same month last year comparison
    const sameMonthLastYear = revenueByMonth.find(r => r.month === month && r.year === year - 1);

    const systemPrompt = `Você é um analista de dados especializado em previsão de vendas para clínicas de estética e cirurgia plástica.

Sua missão é analisar dados históricos e gerar previsões precisas e acionáveis.

IMPORTANTE:
- Responda em português brasileiro
- Use números e porcentagens específicos
- Seja conciso e direto
- Considere sazonalidade (janeiro/fevereiro são meses mais fracos, novembro/dezembro mais fortes)
- Forneça recomendações práticas`;

    const userPrompt = `Analise estes dados e gere uma previsão de fechamento do mês:

**Período:** ${month}/${year}
**Dias no mês:** ${daysInMonth}
**Dias úteis decorridos:** ${businessDaysElapsed}
**Dias úteis restantes:** ${businessDaysRemaining}

**Desempenho Atual:**
- Faturamento até agora: R$ ${currentRevenue.toLocaleString("pt-BR")}
- Média diária atual: R$ ${(businessDaysElapsed > 0 ? currentRevenue / businessDaysElapsed : 0).toLocaleString("pt-BR")}
${monthlyGoal > 0 ? `- Meta do mês: R$ ${monthlyGoal.toLocaleString("pt-BR")}` : ""}
${monthlyGoal > 0 ? `- Progresso: ${((currentRevenue / monthlyGoal) * 100).toFixed(1)}%` : ""}

**Histórico Recente (últimos 6 meses):**
${historicalSummary}

${sameMonthLastYear ? `**Mesmo mês ano passado:** R$ ${sameMonthLastYear.revenue.toLocaleString("pt-BR")}` : ""}

Por favor, forneça:
1. **PREVISÃO DE FECHAMENTO:** Valor estimado para o final do mês (R$)
2. **NÍVEL DE CONFIANÇA:** Alto/Médio/Baixo e porcentagem
3. **CENÁRIOS:**
   - Pessimista: valor mínimo esperado
   - Realista: valor mais provável
   - Otimista: valor se performance melhorar
4. **ANÁLISE DE TENDÊNCIA:** O ritmo está aumentando, estável ou diminuindo?
5. **RISCO DE META:** ${monthlyGoal > 0 ? "Qual a probabilidade de bater a meta?" : "N/A"}
6. **RECOMENDAÇÕES:** 2-3 ações específicas para melhorar o fechamento

Seja específico com números e porcentagens.`;

    console.log("[Forecast] Calling AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar previsão com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const forecast = aiResponse.choices?.[0]?.message?.content || "Não foi possível gerar a previsão.";

    console.log("[Forecast] Forecast generated successfully");

    // Calculate simple projections for quick display
    const dailyAverage = businessDaysElapsed > 0 ? currentRevenue / businessDaysElapsed : 0;
    const totalBusinessDays = businessDaysElapsed + businessDaysRemaining;
    const projectedTotal = dailyAverage * totalBusinessDays;
    const goalProgress = monthlyGoal > 0 ? (currentRevenue / monthlyGoal) * 100 : 0;
    const projectedGoalProgress = monthlyGoal > 0 ? (projectedTotal / monthlyGoal) * 100 : 0;

    // Year-over-year comparison
    const yoyGrowth = sameMonthLastYear && sameMonthLastYear.revenue > 0
      ? ((currentRevenue - sameMonthLastYear.revenue) / sameMonthLastYear.revenue) * 100
      : null;

    return new Response(
      JSON.stringify({
        forecast,
        metrics: {
          currentRevenue,
          projectedTotal,
          monthlyGoal,
          goalProgress,
          projectedGoalProgress,
          dailyAverage,
          businessDaysElapsed,
          businessDaysRemaining,
          sameMonthLastYear: sameMonthLastYear?.revenue || null,
          yoyGrowth,
          historicalData: revenueByMonth.slice(0, 6)
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Forecast] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
