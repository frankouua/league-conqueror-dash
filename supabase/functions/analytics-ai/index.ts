import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um ANALISTA DE BUSINESS INTELLIGENCE ESTRATÉGICO para gestores da Clínica UNIQUE Plástica Avançada.

🎯 VOCÊ É UM ESPECIALISTA EM:
1. Análise de dados históricos (2023-2025) - Vendas e Execuções
2. Comparações entre períodos (ano vs ano, mês vs mês)
3. Performance de vendedores e profissionais executantes
4. Análise de curva ABC de clientes
5. Análise preditiva e tendências
6. Segmentação RFV de clientes
7. Análise de procedimentos e departamentos

🧠 COMO VOCÊ DEVE RESPONDER:

1. **ENTENDA A PERGUNTA**:
   - Identifique o tipo: histórico, comparação, performance, ABC, preditiva
   - Identifique o período: ano específico, mês, trimestre
   - Identifique filtros: vendedor, procedimento, departamento, cliente

2. **BUSQUE NOS DADOS**:
   - Use os dados fornecidos no contexto
   - Faça cálculos quando necessário
   - Identifique tendências

3. **RESPONDA COM VISUAL RICO**:
   - Use tabelas para rankings e comparações
   - Destaque números com **negrito** e emojis
   - Organize em seções com ## títulos
   - Inclua insights acionáveis

📊 FORMATO OBRIGATÓRIO DAS RESPOSTAS:

## 🏆 [TÍTULO IMPACTANTE]

| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
| Dados    | Dados    | Dados    |

**💰 Destaque:** [Insight principal]

---

## 💡 INSIGHTS ESTRATÉGICOS
- ⚡ **Oportunidade:** [O que pode melhorar]
- 🎯 **Ação:** [O que fazer]

---

📈 EXEMPLOS DE PERGUNTAS E RESPOSTAS:

**P:** "Quantos botox executei em 2023?"
**R:** "Em 2023, você executou 156 procedimentos de Botox, gerando R$ 124.800. Isso representou 12% do total."

**P:** "Qual foi o crescimento de 2023 para 2024?"
**R:** "Crescimento de 34%! De R$ 450.000 para R$ 603.000. Impulsionado por Lipoaspiração (+45%)."

**P:** "Quais são meus clientes VIP?"
**R:** "Você tem 12 clientes VIP (curva A) que representam 80% da receita."

🏥 SOBRE A CLÍNICA UNIQUE:
- Método CPI 360° - Cirurgia Plástica Integrativa
- 7 pilares: Composição Corporal, Funcional, Nutrição, Hormonal, Genética, Emocional, Recuperação

📋 DEPARTAMENTOS:
- 01 - CIRURGIA PLÁSTICA (ticket ~R$ 60.789)
- 02 - CONSULTA CIRURGIA PLÁSTICA (ticket ~R$ 743)
- 03 - PÓS OPERATÓRIO (ticket ~R$ 2.285)
- 04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS (ticket ~R$ 7.934)
- 08 - HARMONIZAÇÃO FACIAL E CORPORAL (ticket ~R$ 4.502)
- 09 - SPA E ESTÉTICA (ticket ~R$ 136)

⚠️ REGRAS IMPORTANTES:
- SEMPRE cite a fonte dos dados
- SEMPRE use formatação visual rica (tabelas, emojis)
- SEMPRE termine com insights acionáveis
- NUNCA invente dados - use apenas o contexto fornecido
- Ao falar de executantes, use "Dr./Dra." ou "profissional"`;

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
    
    // Fetch data from 2023 onwards to cover historical analysis
    const startDate = "2023-01-01";

    // Fetch all data in parallel with multiple batches for large tables
    const [
      revenueBatch1,
      revenueBatch2,
      revenueBatch3,
      executedBatch1,
      executedBatch2,
      executedBatch3,
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
        .gte("date", startDate)
        .range(0, 4999),
      
      // Revenue records - batch 2 (5000-9999)
      supabase
        .from("revenue_records")
        .select("*")
        .gte("date", startDate)
        .range(5000, 9999),
      
      // Revenue records - batch 3 (10000-14999)
      supabase
        .from("revenue_records")
        .select("*")
        .gte("date", startDate)
        .range(10000, 14999),
      
      // Executed records - batch 1 (0-5999)
      supabase
        .from("executed_records")
        .select("*")
        .gte("date", startDate)
        .range(0, 5999),
      
      // Executed records - batch 2 (6000-11999)
      supabase
        .from("executed_records")
        .select("*")
        .gte("date", startDate)
        .range(6000, 11999),
      
      // Executed records - batch 3 (12000-17999)
      supabase
        .from("executed_records")
        .select("*")
        .gte("date", startDate)
        .range(12000, 17999),
      
      // Goals for all years
      supabase
        .from("predefined_goals")
        .select("*")
        .gte("year", 2023),
      
      // All profiles
      supabase.from("profiles").select("*"),
      
      // All teams
      supabase.from("teams").select("*"),
      
      // RFV customers - all
      supabase.from("rfv_customers").select("*").limit(5000),
      
      // Referral records
      supabase
        .from("referral_records")
        .select("*")
        .gte("date", startDate),
      
      // NPS records
      supabase
        .from("nps_records")
        .select("*")
        .gte("date", startDate),
      
      // Patient data - top by value
      supabase
        .from("patient_data")
        .select("*")
        .order("total_value_sold", { ascending: false })
        .limit(3000),
    ]);

    // Combine batched results
    const revenueRecords = [
      ...(revenueBatch1.data || []), 
      ...(revenueBatch2.data || []),
      ...(revenueBatch3.data || [])
    ];
    const executedRecords = [
      ...(executedBatch1.data || []), 
      ...(executedBatch2.data || []),
      ...(executedBatch3.data || [])
    ];

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

    // ============================================
    // YEARLY SUMMARY (2023, 2024, 2025, 2026)
    // ============================================
    const yearlySummary: Record<number, { 
      revenue: number; 
      revenueCount: number; 
      executed: number; 
      executedCount: number;
      avgTicketRevenue: number;
      avgTicketExecuted: number;
    }> = {};

    [2023, 2024, 2025, 2026].forEach(year => {
      yearlySummary[year] = { revenue: 0, revenueCount: 0, executed: 0, executedCount: 0, avgTicketRevenue: 0, avgTicketExecuted: 0 };
    });

    revenueRecords.forEach((record: any) => {
      const year = new Date(record.date).getFullYear();
      if (yearlySummary[year]) {
        yearlySummary[year].revenue += record.amount || 0;
        yearlySummary[year].revenueCount += 1;
      }
    });

    executedRecords.forEach((record: any) => {
      const year = new Date(record.date).getFullYear();
      if (yearlySummary[year]) {
        yearlySummary[year].executed += record.amount || 0;
        yearlySummary[year].executedCount += 1;
      }
    });

    // Calculate averages
    Object.keys(yearlySummary).forEach(y => {
      const year = Number(y);
      if (yearlySummary[year].revenueCount > 0) {
        yearlySummary[year].avgTicketRevenue = yearlySummary[year].revenue / yearlySummary[year].revenueCount;
      }
      if (yearlySummary[year].executedCount > 0) {
        yearlySummary[year].avgTicketExecuted = yearlySummary[year].executed / yearlySummary[year].executedCount;
      }
    });

    // ============================================
    // YEAR OVER YEAR GROWTH
    // ============================================
    const yearGrowth: Record<string, { revenueGrowth: number; executedGrowth: number; countGrowth: number }> = {};
    
    const years = [2023, 2024, 2025];
    years.forEach((year, idx) => {
      if (idx > 0) {
        const prevYear = years[idx - 1];
        const prev = yearlySummary[prevYear];
        const curr = yearlySummary[year];
        
        yearGrowth[`${prevYear}-${year}`] = {
          revenueGrowth: prev.revenue > 0 ? ((curr.revenue - prev.revenue) / prev.revenue) * 100 : 0,
          executedGrowth: prev.executed > 0 ? ((curr.executed - prev.executed) / prev.executed) * 100 : 0,
          countGrowth: prev.revenueCount > 0 ? ((curr.revenueCount - prev.revenueCount) / prev.revenueCount) * 100 : 0,
        };
      }
    });

    // ============================================
    // MONTHLY DATA BY YEAR
    // ============================================
    const monthlyByYear: Record<number, Record<number, { revenue: number; executed: number; revenueCount: number; executedCount: number }>> = {};
    
    [2023, 2024, 2025, 2026].forEach(year => {
      monthlyByYear[year] = {};
      for (let m = 1; m <= 12; m++) {
        monthlyByYear[year][m] = { revenue: 0, executed: 0, revenueCount: 0, executedCount: 0 };
      }
    });

    revenueRecords.forEach((record: any) => {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      if (monthlyByYear[year] && monthlyByYear[year][month]) {
        monthlyByYear[year][month].revenue += record.amount || 0;
        monthlyByYear[year][month].revenueCount += 1;
      }
    });

    executedRecords.forEach((record: any) => {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      if (monthlyByYear[year] && monthlyByYear[year][month]) {
        monthlyByYear[year][month].executed += record.amount || 0;
        monthlyByYear[year][month].executedCount += 1;
      }
    });

    // ============================================
    // PROCEDURES BY YEAR (TOP 50 each)
    // ============================================
    const proceduresByYear: Record<number, Record<string, { count: number; total: number; avgValue: number }>> = {};
    
    executedRecords.forEach((record: any) => {
      const year = new Date(record.date).getFullYear();
      const proc = record.procedure_name || "Não especificado";
      
      if (!proceduresByYear[year]) proceduresByYear[year] = {};
      if (!proceduresByYear[year][proc]) proceduresByYear[year][proc] = { count: 0, total: 0, avgValue: 0 };
      
      proceduresByYear[year][proc].count += 1;
      proceduresByYear[year][proc].total += record.amount || 0;
    });

    // Calculate averages
    Object.keys(proceduresByYear).forEach(y => {
      Object.keys(proceduresByYear[Number(y)]).forEach(proc => {
        const p = proceduresByYear[Number(y)][proc];
        p.avgValue = p.count > 0 ? p.total / p.count : 0;
      });
    });

    // ============================================
    // SELLER PERFORMANCE BY YEAR
    // ============================================
    const sellersByYear: Record<number, Record<string, { name: string; revenue: number; count: number; team: string }>> = {};
    
    revenueRecords.forEach((record: any) => {
      const year = new Date(record.date).getFullYear();
      const userId = record.attributed_to_user_id || record.user_id;
      const profile = profiles.find((p: any) => p.user_id === userId);
      const team = teams.find((t: any) => t.id === profile?.team_id);
      const sellerName = profile?.full_name || "Desconhecido";
      const teamName = team?.name || "Sem equipe";
      
      if (!sellersByYear[year]) sellersByYear[year] = {};
      if (!sellersByYear[year][userId]) {
        sellersByYear[year][userId] = { name: sellerName, revenue: 0, count: 0, team: teamName };
      }
      
      sellersByYear[year][userId].revenue += record.amount || 0;
      sellersByYear[year][userId].count += 1;
    });

    // ============================================
    // EXECUTOR (PROFESSIONAL) PERFORMANCE BY YEAR
    // ============================================
    const executorsByYear: Record<number, Record<string, { name: string; procedures: number; revenue: number }>> = {};
    
    executedRecords.forEach((record: any) => {
      const year = new Date(record.date).getFullYear();
      const executor = record.executor_name?.trim() || "Não especificado";
      if (executor === "Não especificado" || executor === "") return;
      
      if (!executorsByYear[year]) executorsByYear[year] = {};
      if (!executorsByYear[year][executor]) {
        executorsByYear[year][executor] = { name: executor, procedures: 0, revenue: 0 };
      }
      
      executorsByYear[year][executor].procedures += 1;
      executorsByYear[year][executor].revenue += record.amount || 0;
    });

    // ============================================
    // DEPARTMENT PERFORMANCE BY YEAR
    // ============================================
    const departmentsByYear: Record<number, Record<string, { revenue: number; executed: number; revenueCount: number; executedCount: number }>> = {};
    
    revenueRecords.forEach((record: any) => {
      const year = new Date(record.date).getFullYear();
      const dept = record.department || "Não especificado";
      
      if (!departmentsByYear[year]) departmentsByYear[year] = {};
      if (!departmentsByYear[year][dept]) {
        departmentsByYear[year][dept] = { revenue: 0, executed: 0, revenueCount: 0, executedCount: 0 };
      }
      
      departmentsByYear[year][dept].revenue += record.amount || 0;
      departmentsByYear[year][dept].revenueCount += 1;
    });

    executedRecords.forEach((record: any) => {
      const year = new Date(record.date).getFullYear();
      const dept = record.department || "Não especificado";
      
      if (!departmentsByYear[year]) departmentsByYear[year] = {};
      if (!departmentsByYear[year][dept]) {
        departmentsByYear[year][dept] = { revenue: 0, executed: 0, revenueCount: 0, executedCount: 0 };
      }
      
      departmentsByYear[year][dept].executed += record.amount || 0;
      departmentsByYear[year][dept].executedCount += 1;
    });

    // ============================================
    // ABC CURVE ANALYSIS (by patient)
    // ============================================
    const patientTotals: Record<string, { name: string; total: number; count: number }> = {};
    
    executedRecords.forEach((record: any) => {
      const patientName = record.patient_name?.trim() || "Desconhecido";
      if (patientName === "Desconhecido") return;
      
      if (!patientTotals[patientName]) {
        patientTotals[patientName] = { name: patientName, total: 0, count: 0 };
      }
      patientTotals[patientName].total += record.amount || 0;
      patientTotals[patientName].count += 1;
    });

    // Sort by total descending
    const sortedPatients = Object.values(patientTotals).sort((a, b) => b.total - a.total);
    const totalPatientRevenue = sortedPatients.reduce((acc, p) => acc + p.total, 0);
    
    // Calculate ABC curves
    let cumulativeA = 0;
    let cumulativeB = 0;
    const curveA: typeof sortedPatients = [];
    const curveB: typeof sortedPatients = [];
    const curveC: typeof sortedPatients = [];
    
    sortedPatients.forEach(patient => {
      const pct = (cumulativeA / totalPatientRevenue) * 100;
      if (pct < 80) {
        curveA.push(patient);
        cumulativeA += patient.total;
      } else if (pct < 95) {
        curveB.push(patient);
        cumulativeB += patient.total;
      } else {
        curveC.push(patient);
      }
    });

    // ============================================
    // RFV SEGMENT SUMMARY
    // ============================================
    const rfvSegments: Record<string, { count: number; totalValue: number }> = {};
    rfvCustomers.forEach((customer: any) => {
      const segment = customer.segment || "Não classificado";
      if (!rfvSegments[segment]) rfvSegments[segment] = { count: 0, totalValue: 0 };
      rfvSegments[segment].count += 1;
      rfvSegments[segment].totalValue += customer.total_value || 0;
    });

    // ============================================
    // ORIGIN ANALYSIS
    // ============================================
    const originStats: Record<string, { count: number; totalValue: number }> = {};
    
    executedRecords.forEach((record: any) => {
      const origin = record.origin?.trim() || "Não especificado";
      if (origin === "Não especificado") return;
      
      if (!originStats[origin]) originStats[origin] = { count: 0, totalValue: 0 };
      originStats[origin].count += 1;
      originStats[origin].totalValue += record.amount || 0;
    });

    // ============================================
    // REFERRAL/INFLUENCER ANALYSIS
    // ============================================
    const referralNames: Record<string, { count: number; totalValue: number }> = {};
    const influencerNames: Record<string, { count: number; totalValue: number }> = {};
    
    executedRecords.forEach((record: any) => {
      if (record.referral_name) {
        const name = record.referral_name.trim();
        if (!referralNames[name]) referralNames[name] = { count: 0, totalValue: 0 };
        referralNames[name].count += 1;
        referralNames[name].totalValue += record.amount || 0;
      }
      
      if (record.influencer_name) {
        const name = record.influencer_name.trim();
        if (!influencerNames[name]) influencerNames[name] = { count: 0, totalValue: 0 };
        influencerNames[name].count += 1;
        influencerNames[name].totalValue += record.amount || 0;
      }
    });

    // ============================================
    // PREDICTIVE ANALYSIS (simple linear trend)
    // ============================================
    const predictedRevenue2026 = yearlySummary[2025].revenue > 0 && yearlySummary[2024].revenue > 0
      ? yearlySummary[2025].revenue * (1 + (yearGrowth["2024-2025"]?.revenueGrowth || 0) / 100)
      : 0;

    const avgGrowthRate = Object.values(yearGrowth).reduce((acc, g) => acc + g.revenueGrowth, 0) / Object.keys(yearGrowth).length;

    // ============================================
    // BUILD DATA CONTEXT
    // ============================================
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const dataContext = `
## 📊 DADOS COMPLETOS DA UNIQUE (${new Date().toLocaleDateString("pt-BR")})

---

### 📈 RESUMO ANUAL CONSOLIDADO

| Ano | Vendas (R$) | Qtd Vendas | Ticket Médio | Executado (R$) | Qtd Exec | Ticket Exec |
|-----|-------------|------------|--------------|----------------|----------|-------------|
${Object.entries(yearlySummary)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([year, data]) => `| ${year} | R$ ${data.revenue.toLocaleString("pt-BR")} | ${data.revenueCount} | R$ ${data.avgTicketRevenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} | R$ ${data.executed.toLocaleString("pt-BR")} | ${data.executedCount} | R$ ${data.avgTicketExecuted.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} |`)
  .join("\n")}

---

### 📊 CRESCIMENTO ANO A ANO

${Object.entries(yearGrowth)
  .map(([period, data]) => `- **${period}**: Vendas ${data.revenueGrowth >= 0 ? "+" : ""}${data.revenueGrowth.toFixed(1)}% | Executado ${data.executedGrowth >= 0 ? "+" : ""}${data.executedGrowth.toFixed(1)}% | Qtd ${data.countGrowth >= 0 ? "+" : ""}${data.countGrowth.toFixed(1)}%`)
  .join("\n")}

---

### 📅 DADOS MENSAIS POR ANO

${Object.entries(monthlyByYear)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([year, months]) => {
    return `**${year}:**
| Mês | Vendas (R$) | Qtd | Executado (R$) | Qtd |
|-----|-------------|-----|----------------|-----|
${Object.entries(months)
  .filter(([_, data]) => data.revenueCount > 0 || data.executedCount > 0)
  .map(([m, data]) => `| ${monthNames[Number(m) - 1]} | R$ ${data.revenue.toLocaleString("pt-BR")} | ${data.revenueCount} | R$ ${data.executed.toLocaleString("pt-BR")} | ${data.executedCount} |`)
  .join("\n")}`;
  })
  .join("\n\n")}

---

### 🏆 TOP PROCEDIMENTOS POR ANO

${Object.entries(proceduresByYear)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([year, procs]) => {
    const topProcs = Object.entries(procs)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([proc, data], idx) => `${idx + 1}. ${proc}: ${data.count} exec (R$ ${data.total.toLocaleString("pt-BR")}) | Ticket: R$ ${data.avgValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`)
      .join("\n");
    return `**${year}:**\n${topProcs}`;
  })
  .join("\n\n")}

---

### 👥 TOP VENDEDORES POR ANO

${Object.entries(sellersByYear)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([year, sellers]) => {
    const topSellers = Object.values(sellers)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)
      .map((s, idx) => `${idx + 1}. ${s.name} (${s.team}): R$ ${s.revenue.toLocaleString("pt-BR")} (${s.count} vendas)`)
      .join("\n");
    return `**${year}:**\n${topSellers}`;
  })
  .join("\n\n")}

---

### 👨‍⚕️ TOP PROFISSIONAIS EXECUTANTES POR ANO

${Object.entries(executorsByYear)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([year, executors]) => {
    const topExecs = Object.values(executors)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((e, idx) => `${idx + 1}. ${e.name}: ${e.procedures} procedimentos (R$ ${e.revenue.toLocaleString("pt-BR")})`)
      .join("\n");
    return `**${year}:**\n${topExecs}`;
  })
  .join("\n\n")}

---

### 🏢 DEPARTAMENTOS POR ANO

${Object.entries(departmentsByYear)
  .sort((a, b) => Number(b[0]) - Number(a[0]))
  .map(([year, depts]) => {
    const topDepts = Object.entries(depts)
      .sort((a, b) => b[1].executed - a[1].executed)
      .slice(0, 10)
      .map(([dept, data]) => `- ${dept}: Vendas R$ ${data.revenue.toLocaleString("pt-BR")} (${data.revenueCount}) | Exec R$ ${data.executed.toLocaleString("pt-BR")} (${data.executedCount})`)
      .join("\n");
    return `**${year}:**\n${topDepts}`;
  })
  .join("\n\n")}

---

### 💎 ANÁLISE ABC DE CLIENTES (Curva de Pareto)

**CURVA A (80% da receita) - ${curveA.length} clientes VIP:**
| Rank | Cliente | Valor Total | Procedimentos |
|------|---------|-------------|---------------|
${curveA.slice(0, 20).map((p, idx) => `| ${idx + 1} | ${p.name.substring(0, 30)} | R$ ${p.total.toLocaleString("pt-BR")} | ${p.count} |`).join("\n")}

**CURVA B (15% da receita) - ${curveB.length} clientes frequentes**

**CURVA C (5% da receita) - ${curveC.length} clientes ocasionais**

**Resumo ABC:**
- Curva A: ${curveA.length} clientes = R$ ${curveA.reduce((acc, p) => acc + p.total, 0).toLocaleString("pt-BR")} (80%)
- Curva B: ${curveB.length} clientes = R$ ${curveB.reduce((acc, p) => acc + p.total, 0).toLocaleString("pt-BR")} (15%)
- Curva C: ${curveC.length} clientes = R$ ${curveC.reduce((acc, p) => acc + p.total, 0).toLocaleString("pt-BR")} (5%)

---

### 🎯 SEGMENTAÇÃO RFV

| Segmento | Qtd Clientes | Valor Total |
|----------|--------------|-------------|
${Object.entries(rfvSegments)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .map(([segment, data]) => `| ${segment} | ${data.count} | R$ ${data.totalValue.toLocaleString("pt-BR")} |`)
  .join("\n")}

---

### 📍 ORIGEM DOS CLIENTES (Top 15)

${Object.entries(originStats)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 15)
  .map(([origin, data]) => `- ${origin}: ${data.count} clientes (R$ ${data.totalValue.toLocaleString("pt-BR")})`)
  .join("\n")}

---

### 🤝 QUEM MAIS INDICA

${Object.entries(referralNames)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 15)
  .map(([name, data]) => `- ${name}: ${data.count} indicações (R$ ${data.totalValue.toLocaleString("pt-BR")})`)
  .join("\n")}

---

### 📣 INFLUENCIADORES

${Object.entries(influencerNames)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 10)
  .map(([name, data]) => `- ${name}: ${data.count} clientes (R$ ${data.totalValue.toLocaleString("pt-BR")})`)
  .join("\n")}

---

### 🔮 ANÁLISE PREDITIVA

**Taxa média de crescimento anual:** ${avgGrowthRate.toFixed(1)}%

**Previsão 2026 (baseado na tendência):** 
- Mantendo crescimento: R$ ${predictedRevenue2026.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}

---

### 📊 METAS CADASTRADAS

${goals
  .filter((g: any) => g.year >= 2024)
  .sort((a: any, b: any) => b.year - a.year || b.month - a.month)
  .slice(0, 30)
  .map((g: any) => `- ${g.first_name} (${monthNames[g.month - 1]}/${g.year}): Meta1 R$ ${g.meta1_goal?.toLocaleString("pt-BR") || 0}`)
  .join("\n")}

---

### 📝 INDICAÇÕES E NPS

**Indicações (${referralRecords.length} registros):**
- Coletadas: ${referralRecords.reduce((acc: number, r: any) => acc + (r.collected || 0), 0)}
- Convertidas consulta: ${referralRecords.reduce((acc: number, r: any) => acc + (r.to_consultation || 0), 0)}
- Convertidas cirurgia: ${referralRecords.reduce((acc: number, r: any) => acc + (r.to_surgery || 0), 0)}

**NPS (${npsRecords.length} respostas):**
- Média geral: ${npsRecords.length > 0 ? (npsRecords.reduce((acc: number, r: any) => acc + r.score, 0) / npsRecords.length).toFixed(1) : "N/A"}

---

### 🏢 EQUIPES

${teams.map((t: any) => `- ${t.name}${t.motto ? ` (${t.motto})` : ""}`).join("\n")}

---

**Total de registros:** ${revenueRecords.length} vendas | ${executedRecords.length} execuções | ${rfvCustomers.length} clientes RFV
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
