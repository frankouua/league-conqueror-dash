import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um analista de business intelligence ESTRATÉGICO e VISUAL especializado em clínicas de cirurgia plástica e estética.
Você tem acesso aos dados reais da clínica Unique Plástica Avançada.

🎯 FORMATO DAS SUAS RESPOSTAS (OBRIGATÓRIO):

1. **SEMPRE** comece com um emoji relevante e um título impactante
2. **USE TABELAS** sempre que listar rankings, comparações ou múltiplos dados
3. **DESTAQUE números importantes** com **negrito** e emojis (💰 💎 🏆 📈 ⚡ 🎯)
4. **ORGANIZE em seções** com títulos claros usando ##
5. **INCLUA insights estratégicos** ao final com 💡
6. **SUGIRA ações práticas** baseadas nos dados
7. **SEJA VISUAL** - use separadores, bullets e formatação rica

📊 EXEMPLO DE RESPOSTA IDEAL:

## 🏆 TOP VENDEDORES DO MÊS

| Pos | Vendedor | Vendas | Valor | Ticket |
|-----|----------|--------|-------|--------|
| 🥇 | Maria | 45 | R$ 890.000 | R$ 19.777 |
| 🥈 | João | 38 | R$ 720.000 | R$ 18.947 |

**💰 Destaque:** Maria superou a meta em 23%!

---

## 💡 INSIGHTS ESTRATÉGICOS

- ⚡ **Oportunidade:** Aumentar cross-sell de soroterapia
- 🎯 **Ação:** Focar captação em SP capital

---

SOBRE A CLÍNICA UNIQUE:
A Unique trabalha com o Método CPI 360° - Cirurgia Plástica Integrativa de Alta Performance.
7 pilares: Composição Corporal, Funcional, Nutrição, Hormonal, Genética, Emocional, Recuperação.

DEPARTAMENTOS:
- 01 - CIRURGIA PLÁSTICA (ticket ~R$ 60.789)
- 02 - CONSULTA CIRURGIA PLÁSTICA (ticket ~R$ 743)
- 03 - PÓS OPERATÓRIO (ticket ~R$ 2.285)
- 04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS (ticket ~R$ 7.934)
- 08 - HARMONIZAÇÃO FACIAL E CORPORAL (ticket ~R$ 4.502)
- 09 - SPA E ESTÉTICA (ticket ~R$ 136)

SUAS CAPACIDADES ESTRATÉGICAS:
- Analisar vendas, receitas e tickets médios
- Performance por EXECUTANTE (médico/profissional que realizou o procedimento)
- Performance por VENDEDOR (quem vendeu)
- Identificar oportunidades de cross-sell e upsell
- Sugerir protocolos e campanhas baseadas em dados
- Analisar LTV (Lifetime Value) de clientes
- Identificar padrões geográficos e demográficos
- Recomendar estratégias de captação e retenção

REGRAS DE FORMATAÇÃO:
- SEMPRE use tabelas para listas e rankings
- SEMPRE destaque valores em reais com R$
- SEMPRE inclua emojis relevantes
- SEMPRE termine com insights acionáveis
- NUNCA seja monótono ou apenas textual
- Ao falar de executantes, refere-se como "Dr./Dra." ou "profissional"`;


interface QueryParams {
  message: string;
  conversationHistory?: { role: string; content: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] }: QueryParams = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Collect comprehensive data from the database
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Fetch data from 3 years ago to cover historical analysis
    const threeYearsAgo = new Date(currentYear - 3, 0, 1).toISOString().split("T")[0];

    // Fetch all data in parallel with multiple batches for large tables
    const [
      revenueBatch1,
      revenueBatch2,
      executedBatch1,
      executedBatch2,
      goalsResult,
      profilesResult,
      teamsResult,
      rfvResult,
      referralResult,
      npsResult,
      patientDataResult,
    ] = await Promise.all([
      // Revenue records - batch 1 (0-4999)
      supabase
        .from("revenue_records")
        .select("*")
        .gte("date", threeYearsAgo)
        .range(0, 4999),
      
      // Revenue records - batch 2 (5000-9999)
      supabase
        .from("revenue_records")
        .select("*")
        .gte("date", threeYearsAgo)
        .range(5000, 9999),
      
      // Executed records - batch 1 (0-5999)
      supabase
        .from("executed_records")
        .select("*")
        .gte("date", threeYearsAgo)
        .range(0, 5999),
      
      // Executed records - batch 2 (6000-11999)
      supabase
        .from("executed_records")
        .select("*")
        .gte("date", threeYearsAgo)
        .range(6000, 11999),
      
      // Goals for current and previous years
      supabase
        .from("predefined_goals")
        .select("*")
        .gte("year", currentYear - 2),
      
      // All profiles
      supabase.from("profiles").select("*"),
      
      // All teams
      supabase.from("teams").select("*"),
      
      // RFV customers
      supabase.from("rfv_customers").select("*"),
      
      // Referral records
      supabase
        .from("referral_records")
        .select("*")
        .gte("date", threeYearsAgo),
      
      // NPS records
      supabase
        .from("nps_records")
        .select("*")
        .gte("date", threeYearsAgo),
      
      // Patient data
      supabase
        .from("patient_data")
        .select("*")
        .order("total_value_sold", { ascending: false })
        .limit(2000),
    ]);

    // Combine batched results
    const revenueRecords = [...(revenueBatch1.data || []), ...(revenueBatch2.data || [])];
    const executedRecords = [...(executedBatch1.data || []), ...(executedBatch2.data || [])];

    console.log(`Fetched ${revenueRecords.length} revenue records`);
    console.log(`Fetched ${executedRecords.length} executed records`);

    // Build context with all data
    const goals = goalsResult.data || [];
    const profiles = profilesResult.data || [];
    const teams = teamsResult.data || [];
    const rfvCustomers = rfvResult.data || [];
    const referralRecords = referralResult.data || [];
    const npsRecords = npsResult.data || [];
    const patientData = patientDataResult.data || [];

    // Calculate aggregated metrics
    const monthlyRevenue: Record<string, { total: number; count: number; byDepartment: Record<string, { total: number; count: number }> }> = {};
    
    revenueRecords.forEach((record: any) => {
      const date = new Date(record.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const dept = record.department || "Não especificado";
      
      if (!monthlyRevenue[key]) {
        monthlyRevenue[key] = { total: 0, count: 0, byDepartment: {} };
      }
      monthlyRevenue[key].total += record.amount;
      monthlyRevenue[key].count += 1;
      
      if (!monthlyRevenue[key].byDepartment[dept]) {
        monthlyRevenue[key].byDepartment[dept] = { total: 0, count: 0 };
      }
      monthlyRevenue[key].byDepartment[dept].total += record.amount;
      monthlyRevenue[key].byDepartment[dept].count += 1;
    });

    // Monthly executed with procedure details
    const monthlyExecuted: Record<string, { total: number; count: number; byDepartment: Record<string, { total: number; count: number }>; byProcedure: Record<string, { total: number; count: number }> }> = {};
    
    // ANNUAL procedure totals for quick lookups
    const yearlyProcedures: Record<number, Record<string, { count: number; total: number }>> = {};
    
    executedRecords.forEach((record: any) => {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const key = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const dept = record.department || "Não especificado";
      const proc = record.procedure_name || "Não especificado";
      
      if (!monthlyExecuted[key]) {
        monthlyExecuted[key] = { total: 0, count: 0, byDepartment: {}, byProcedure: {} };
      }
      monthlyExecuted[key].total += record.amount;
      monthlyExecuted[key].count += 1;
      
      if (!monthlyExecuted[key].byDepartment[dept]) {
        monthlyExecuted[key].byDepartment[dept] = { total: 0, count: 0 };
      }
      monthlyExecuted[key].byDepartment[dept].total += record.amount;
      monthlyExecuted[key].byDepartment[dept].count += 1;
      
      // Track by procedure name
      if (!monthlyExecuted[key].byProcedure[proc]) {
        monthlyExecuted[key].byProcedure[proc] = { total: 0, count: 0 };
      }
      monthlyExecuted[key].byProcedure[proc].total += record.amount;
      monthlyExecuted[key].byProcedure[proc].count += 1;
      
      // ANNUAL totals by procedure name
      if (!yearlyProcedures[year]) {
        yearlyProcedures[year] = {};
      }
      if (!yearlyProcedures[year][proc]) {
        yearlyProcedures[year][proc] = { count: 0, total: 0 };
      }
      yearlyProcedures[year][proc].count += 1;
      yearlyProcedures[year][proc].total += record.amount;
    });

    // EXECUTOR (professional who performed the procedure) analysis
    const executorPerformance: Record<string, { name: string; procedures: number; revenue: number; byYear: Record<number, { procedures: number; revenue: number }> }> = {};
    const executorByYear: Record<number, Record<string, { name: string; procedures: number; revenue: number }>> = {};
    
    executedRecords.forEach((record: any) => {
      const executor = record.executor_name?.trim() || "Não especificado";
      if (executor === "Não especificado" || executor === "") return;
      
      const date = new Date(record.date);
      const year = date.getFullYear();
      
      // Overall executor performance
      if (!executorPerformance[executor]) {
        executorPerformance[executor] = { name: executor, procedures: 0, revenue: 0, byYear: {} };
      }
      executorPerformance[executor].procedures += 1;
      executorPerformance[executor].revenue += record.amount || 0;
      
      // By year
      if (!executorPerformance[executor].byYear[year]) {
        executorPerformance[executor].byYear[year] = { procedures: 0, revenue: 0 };
      }
      executorPerformance[executor].byYear[year].procedures += 1;
      executorPerformance[executor].byYear[year].revenue += record.amount || 0;
      
      // Yearly breakdown
      if (!executorByYear[year]) {
        executorByYear[year] = {};
      }
      if (!executorByYear[year][executor]) {
        executorByYear[year][executor] = { name: executor, procedures: 0, revenue: 0 };
      }
      executorByYear[year][executor].procedures += 1;
      executorByYear[year][executor].revenue += record.amount || 0;
    });

    // Seller performance - overall
    const sellerPerformance: Record<string, { name: string; revenue: number; count: number; team: string }> = {};
    
    // Seller performance - by month
    const sellerMonthlyPerformance: Record<string, Record<string, { name: string; revenue: number; count: number; team: string }>> = {};
    
    revenueRecords.forEach((record: any) => {
      const userId = record.attributed_to_user_id || record.user_id;
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const profile = profiles.find((p: any) => p.user_id === userId);
      const team = teams.find((t: any) => t.id === profile?.team_id);
      const sellerName = profile?.full_name || "Desconhecido";
      const teamName = team?.name || "Sem equipe";
      
      // Overall performance
      if (!sellerPerformance[userId]) {
        sellerPerformance[userId] = {
          name: sellerName,
          revenue: 0,
          count: 0,
          team: teamName,
        };
      }
      sellerPerformance[userId].revenue += record.amount;
      sellerPerformance[userId].count += 1;
      
      // Monthly performance
      if (!sellerMonthlyPerformance[monthKey]) {
        sellerMonthlyPerformance[monthKey] = {};
      }
      if (!sellerMonthlyPerformance[monthKey][userId]) {
        sellerMonthlyPerformance[monthKey][userId] = {
          name: sellerName,
          revenue: 0,
          count: 0,
          team: teamName,
        };
      }
      sellerMonthlyPerformance[monthKey][userId].revenue += record.amount;
      sellerMonthlyPerformance[monthKey][userId].count += 1;
    });

    // RFV segment summary
    const rfvSegments: Record<string, number> = {};
    rfvCustomers.forEach((customer: any) => {
      rfvSegments[customer.segment] = (rfvSegments[customer.segment] || 0) + 1;
    });

    // Patient data analytics - Origin analysis
    const originStats: Record<string, { count: number; totalValue: number }> = {};
    const cityStats: Record<string, { count: number; totalValue: number }> = {};
    const stateStats: Record<string, { count: number; totalValue: number }> = {};
    const professionStats: Record<string, number> = {};
    const objectiveStats: Record<string, number> = {};
    const referralStats: Record<string, { count: number; totalValue: number }> = {};
    const influencerStats: Record<string, { count: number; totalValue: number }> = {};
    
    patientData.forEach((patient: any) => {
      const value = patient.total_value_sold || 0;
      
      // Origin analysis
      if (patient.origin) {
        const origin = patient.origin.trim();
        if (!originStats[origin]) originStats[origin] = { count: 0, totalValue: 0 };
        originStats[origin].count += 1;
        originStats[origin].totalValue += value;
      }
      
      // City analysis
      if (patient.city) {
        const city = patient.city.trim();
        if (!cityStats[city]) cityStats[city] = { count: 0, totalValue: 0 };
        cityStats[city].count += 1;
        cityStats[city].totalValue += value;
      }
      
      // State analysis
      if (patient.state) {
        const state = patient.state.trim();
        if (!stateStats[state]) stateStats[state] = { count: 0, totalValue: 0 };
        stateStats[state].count += 1;
        stateStats[state].totalValue += value;
      }
      
      // Profession analysis
      if (patient.profession) {
        const profession = patient.profession.trim();
        professionStats[profession] = (professionStats[profession] || 0) + 1;
      }
      
      // Objective analysis
      if (patient.main_objective) {
        const objective = patient.main_objective.trim().substring(0, 50);
        objectiveStats[objective] = (objectiveStats[objective] || 0) + 1;
      }
      
      // Referral name analysis
      if (patient.referral_name && patient.referral_name.toLowerCase() !== 'google' && patient.referral_name.toLowerCase() !== 'instagram') {
        const referrer = patient.referral_name.trim();
        if (!referralStats[referrer]) referralStats[referrer] = { count: 0, totalValue: 0 };
        referralStats[referrer].count += 1;
        referralStats[referrer].totalValue += value;
      }
      
      // Influencer analysis
      if (patient.influencer_name) {
        const influencer = patient.influencer_name.trim();
        if (!influencerStats[influencer]) influencerStats[influencer] = { count: 0, totalValue: 0 };
        influencerStats[influencer].count += 1;
        influencerStats[influencer].totalValue += value;
      }
    });

    // Origin analysis from revenue/executed records
    const revenueOriginStats: Record<string, { count: number; totalValue: number }> = {};
    revenueRecords.forEach((record: any) => {
      if (record.origin) {
        const origin = record.origin.trim();
        if (!revenueOriginStats[origin]) revenueOriginStats[origin] = { count: 0, totalValue: 0 };
        revenueOriginStats[origin].count += 1;
        revenueOriginStats[origin].totalValue += record.amount || 0;
      }
    });

    const executedOriginStats: Record<string, { count: number; totalValue: number }> = {};
    executedRecords.forEach((record: any) => {
      if (record.origin) {
        const origin = record.origin.trim();
        if (!executedOriginStats[origin]) executedOriginStats[origin] = { count: 0, totalValue: 0 };
        executedOriginStats[origin].count += 1;
        executedOriginStats[origin].totalValue += record.amount || 0;
      }
    });

    // Build data context for AI
    const dataContext = `
## DADOS DISPONÍVEIS (${new Date().toLocaleDateString("pt-BR")})

### RESUMO DE VENDAS (últimos 12 meses)
${Object.entries(monthlyRevenue)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 12)
  .map(([month, data]) => {
    const avgTicket = data.count > 0 ? data.total / data.count : 0;
    return `- ${month}: R$ ${data.total.toLocaleString("pt-BR")} (${data.count} vendas, ticket médio R$ ${avgTicket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })})`;
  })
  .join("\n")}

### VENDAS POR DEPARTAMENTO/PROCEDIMENTO (últimos 12 meses)
${Object.entries(monthlyRevenue)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 6)
  .map(([month, data]) => {
    const depts = Object.entries(data.byDepartment)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([dept, info]) => `  • ${dept}: R$ ${info.total.toLocaleString("pt-BR")} (${info.count} vendas, ticket R$ ${(info.total / info.count).toLocaleString("pt-BR", { maximumFractionDigits: 0 })})`)
      .join("\n");
    return `${month}:\n${depts}`;
  })
  .join("\n\n")}

### PROCEDIMENTOS EXECUTADOS POR ANO (TOTAIS ANUAIS)
${Object.entries(yearlyProcedures)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([year, procs]) => {
    const topProcs = Object.entries(procs)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([proc, info]) => `  • ${proc}: ${info.count} execuções (R$ ${info.total.toLocaleString("pt-BR")})`)
      .join("\n");
    return `**${year}:**\n${topProcs}`;
  })
  .join("\n\n")}

### PROCEDIMENTOS EXECUTADOS POR MÊS (últimos 6 meses)
${Object.entries(monthlyExecuted)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 6)
  .map(([month, data]) => {
    const procs = Object.entries(data.byProcedure)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([proc, info]) => `  • ${proc}: ${info.count} execuções (R$ ${info.total.toLocaleString("pt-BR")})`)
      .join("\n");
    return `${month}:\n${procs}`;
  })
  .join("\n\n")}

### RESUMO EXECUTADO POR DEPARTAMENTO (últimos 6 meses)
${Object.entries(monthlyExecuted)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 6)
  .map(([month, data]) => {
    const depts = Object.entries(data.byDepartment)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([dept, info]) => `  • ${dept}: R$ ${info.total.toLocaleString("pt-BR")} (${info.count} execuções)`)
      .join("\n");
    return `${month}:\n${depts}`;
  })
  .join("\n\n")}

### PERFORMANCE DE VENDEDORES (acumulado últimos 12 meses)
${Object.values(sellerPerformance)
  .sort((a: any, b: any) => b.revenue - a.revenue)
  .slice(0, 10)
  .map((seller: any, idx) => `${idx + 1}. ${seller.name} (${seller.team}): R$ ${seller.revenue.toLocaleString("pt-BR")} (${seller.count} vendas)`)
  .join("\n")}

### PERFORMANCE DE VENDEDORES (acumulado últimos 12 meses)
${Object.values(sellerPerformance)
  .sort((a: any, b: any) => b.revenue - a.revenue)
  .slice(0, 10)
  .map((seller: any, idx) => `${idx + 1}. ${seller.name} (${seller.team}): R$ ${seller.revenue.toLocaleString("pt-BR")} (${seller.count} vendas)`)
  .join("\n")}

### RANKING DE VENDEDORES POR MÊS (top 5 de cada mês)
${Object.entries(sellerMonthlyPerformance)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 6)
  .map(([month, sellers]) => {
    const topSellers = Object.values(sellers)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((s: any, idx) => `  ${idx + 1}. ${s.name}: R$ ${s.revenue.toLocaleString("pt-BR")} (${s.count} vendas)`)
      .join("\n");
    return `${month}:\n${topSellers}`;
  })
  .join("\n\n")}

### EXECUTANTES/PROFISSIONAIS (quem realizou os procedimentos)
${Object.entries(executorPerformance)
  .sort((a, b) => b[1].revenue - a[1].revenue)
  .slice(0, 20)
  .map(([_, exec]: [string, any], idx) => {
    const yearBreakdown = Object.entries(exec.byYear)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([year, data]: [string, any]) => `${year}: ${data.procedures} proc (R$ ${data.revenue.toLocaleString("pt-BR")})`)
      .join(" | ");
    return `${idx + 1}. ${exec.name}: ${exec.procedures} procedimentos totais (R$ ${exec.revenue.toLocaleString("pt-BR")}) - ${yearBreakdown}`;
  })
  .join("\n")}

### TOP EXECUTANTES POR ANO
${Object.entries(executorByYear)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([year, executors]) => {
    const topExecs = Object.values(executors)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((e: any, idx) => `  ${idx + 1}. ${e.name}: ${e.procedures} procedimentos (R$ ${e.revenue.toLocaleString("pt-BR")})`)
      .join("\n");
    return `**${year}:**\n${topExecs}`;
  })
  .join("\n\n")}

### METAS (${currentYear})
${goals
  .filter((g: any) => g.year === currentYear)
  .sort((a: any, b: any) => a.month - b.month)
  .map((g: any) => `- ${g.first_name} (${g.month}/${g.year}): Meta1 R$ ${g.meta1_goal?.toLocaleString("pt-BR") || 0}, Meta2 R$ ${g.meta2_goal?.toLocaleString("pt-BR") || 0}, Meta3 R$ ${g.meta3_goal?.toLocaleString("pt-BR") || 0}`)
  .slice(0, 20)
  .join("\n")}

### CLIENTES RFV
Total: ${rfvCustomers.length} clientes
Segmentação:
${Object.entries(rfvSegments)
  .sort((a, b) => b[1] - a[1])
  .map(([segment, count]) => `- ${segment}: ${count} clientes`)
  .join("\n")}

### INDICAÇÕES (últimos 12 meses)
Total coletadas: ${referralRecords.reduce((acc: number, r: any) => acc + (r.collected || 0), 0)}
Convertidas para consulta: ${referralRecords.reduce((acc: number, r: any) => acc + (r.to_consultation || 0), 0)}
Convertidas para cirurgia: ${referralRecords.reduce((acc: number, r: any) => acc + (r.to_surgery || 0), 0)}

### NPS (últimos 12 meses)
Total de respostas: ${npsRecords.length}
Média geral: ${npsRecords.length > 0 ? (npsRecords.reduce((acc: number, r: any) => acc + r.score, 0) / npsRecords.length).toFixed(1) : "N/A"}

### ANÁLISE DE ORIGEM (de onde vêm os pacientes)
Total de pacientes com dados: ${patientData.length}
${Object.entries(originStats)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15)
  .map(([origin, stats]) => `- ${origin}: ${stats.count} pacientes (R$ ${stats.totalValue.toLocaleString("pt-BR")})`)
  .join("\n")}

### TOP CIDADES (por número de pacientes)
${Object.entries(cityStats)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15)
  .map(([city, stats]) => `- ${city}: ${stats.count} pacientes (R$ ${stats.totalValue.toLocaleString("pt-BR")})`)
  .join("\n")}

### TOP ESTADOS
${Object.entries(stateStats)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 10)
  .map(([state, stats]) => `- ${state}: ${stats.count} pacientes (R$ ${stats.totalValue.toLocaleString("pt-BR")})`)
  .join("\n")}

### PRINCIPAIS PROFISSÕES DOS PACIENTES
${Object.entries(professionStats)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .map(([profession, count]) => `- ${profession}: ${count} pacientes`)
  .join("\n")}

### QUEM INDICA (pessoas que indicaram pacientes)
${Object.entries(referralStats)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 15)
  .map(([referrer, stats]) => `- ${referrer}: ${stats.count} indicações (R$ ${stats.totalValue.toLocaleString("pt-BR")} gerados)`)
  .join("\n")}

### INFLUENCIADORES QUE TROUXERAM PACIENTES
${Object.entries(influencerStats)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 10)
  .map(([influencer, stats]) => `- ${influencer}: ${stats.count} pacientes (R$ ${stats.totalValue.toLocaleString("pt-BR")})`)
  .join("\n")}

### OBJETIVOS DOS PACIENTES (por que buscam cirurgia)
${Object.entries(objectiveStats)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([objective, count]) => `- "${objective}...": ${count} pacientes`)
  .join("\n")}

### ORIGEM NAS VENDAS (com valores)
${Object.entries(revenueOriginStats)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 10)
  .map(([origin, stats]) => `- ${origin}: ${stats.count} vendas (R$ ${stats.totalValue.toLocaleString("pt-BR")})`)
  .join("\n")}

### EQUIPES
${teams.map((t: any) => `- ${t.name}${t.motto ? ` (${t.motto})` : ""}`).join("\n")}
`;

    // Prepare messages for AI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT + "\n\n" + dataContext },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Call AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua pergunta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Analytics AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
