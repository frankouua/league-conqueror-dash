import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um analista de business intelligence especializado em clínicas de cirurgia plástica e estética.
Você tem acesso aos dados reais da clínica Unique Plástica Avançada e deve responder perguntas com precisão.

SOBRE A CLÍNICA UNIQUE:
A Unique Plástica Avançada trabalha com o Método CPI 360° - Cirurgia Plástica Integrativa de Alta Performance.
Este método é composto por 7 pilares essenciais que preparam o corpo de forma completa, minimizam riscos e aceleram a recuperação:

1. COMPOSIÇÃO CORPORAL - Avaliação de massa magra, gordura visceral, gordura subcutânea e retenção hídrica
   - Bioimpedância Avançada
   - Análise Muscular e de Diástase pelo Ultrassom
   - Plano Personalizado de Ajustes Físicos e Nutricionais

2. FUNCIONAL - Corpo preparado para se recuperar
   - Avaliação do Nível de Inflamação
   - Soroterapia Funcional (Intravenosa e Intramuscular)
   - Fortalecimento antes do procedimento

3. NUTRIÇÃO - Alimentação estratégica para cirurgia
   - Plano Alimentar Anti-Inflamatório
   - Avaliação da Saúde Intestinal
   - Hidratação e Suplementação Personalizada
   - Terapia Nutricional com Soroterapia

4. HORMONAL - Equilíbrio hormonal para potencializar recuperação
   - Consulta com Cirurgião Integrativo
   - Exames Laboratoriais Personalizados
   - Reposição Hormonal Estratégica (se necessário)

5. GENÉTICA - Personalização baseada no DNA
   - Mapeamento Genético Personalizado
   - Personalização do Plano Pré e Pós-Cirúrgico
   - Acompanhamento Funcional Baseado na Genética

6. EMOCIONAL - Preparação mental para transformação
   - Pré-Cirurgia (reduzir ansiedade)
   - Terapia Integrativa (Mindfulness e Técnicas de Relaxamento)
   - Sessões de Spa Terapêutico
   - Grupo de Apoio e Acompanhamento Pós-Cirúrgico

7. RECUPERAÇÃO PÓS-OPERATÓRIO - Fase mais importante
   - Drenagem Linfática do Método 3R
   - Fisioterapia Pós-Operatória Personalizada
   - Monitoramento Contínuo com Equipe Médica
   - Tecnologias Avançadas (ozonioterapia, câmara Hiperbárica)
   - Terapias Complementares para Longevidade dos Resultados

SUAS CAPACIDADES:
- Analisar vendas, receitas e tickets médios por procedimento
- Comparar performance entre períodos (mês a mês, ano a ano)
- Identificar tendências e oportunidades
- Analisar performance de vendedores e equipes
- Avaliar metas vs realizado
- Sugerir estratégias baseadas em dados
- Explicar o Método CPI e seus benefícios
- Orientar sobre os pilares da cirurgia integrativa

GRUPOS DE PROCEDIMENTOS (use para categorizar):
- 01 - CIRURGIA PLÁSTICA (ticket médio ~R$ 60.789)
- 02 - CONSULTA CIRURGIA PLÁSTICA (ticket médio ~R$ 743)
- 03 - PÓS OPERATÓRIO (ticket médio ~R$ 2.285)
- 04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS (ticket médio ~R$ 7.934)
- 08 - HARMONIZAÇÃO FACIAL E CORPORAL (ticket médio ~R$ 4.502)
- 09 - SPA E ESTÉTICA (ticket médio ~R$ 136)
- UNIQUE TRAVEL EXPERIENCE (ticket médio ~R$ 2.500)
- LUXSKIN (ticket médio ~R$ 2.499)

REGRAS:
- Sempre baseie suas respostas nos dados fornecidos
- Se não houver dados suficientes, informe claramente
- Formate valores monetários em R$ com separador de milhar
- Use tabelas markdown quando apropriado
- Seja objetivo e direto nas respostas
- Sugira insights adicionais quando relevante
- Ao falar sobre o Método CPI, destaque os diferenciais integradores`;

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

    // Parallel data fetching for efficiency
    const [
      revenueResult,
      executedResult,
      goalsResult,
      profilesResult,
      teamsResult,
      rfvResult,
      referralResult,
      npsResult,
    ] = await Promise.all([
      // Revenue records - last 12 months
      supabase
        .from("revenue_records")
        .select("*")
        .gte("date", new Date(currentYear - 1, currentMonth - 1, 1).toISOString().split("T")[0])
        .order("date", { ascending: false }),
      
      // Executed records - last 12 months
      supabase
        .from("executed_records")
        .select("*")
        .gte("date", new Date(currentYear - 1, currentMonth - 1, 1).toISOString().split("T")[0])
        .order("date", { ascending: false }),
      
      // Goals for current and previous year
      supabase
        .from("predefined_goals")
        .select("*")
        .gte("year", currentYear - 1),
      
      // All profiles
      supabase.from("profiles").select("*"),
      
      // All teams
      supabase.from("teams").select("*"),
      
      // RFV customers
      supabase.from("rfv_customers").select("*"),
      
      // Referral records - last 12 months
      supabase
        .from("referral_records")
        .select("*")
        .gte("date", new Date(currentYear - 1, currentMonth - 1, 1).toISOString().split("T")[0]),
      
      // NPS records - last 12 months
      supabase
        .from("nps_records")
        .select("*")
        .gte("date", new Date(currentYear - 1, currentMonth - 1, 1).toISOString().split("T")[0]),
    ]);

    // Build context with all data
    const revenueRecords = revenueResult.data || [];
    const executedRecords = executedResult.data || [];
    const goals = goalsResult.data || [];
    const profiles = profilesResult.data || [];
    const teams = teamsResult.data || [];
    const rfvCustomers = rfvResult.data || [];
    const referralRecords = referralResult.data || [];
    const npsRecords = npsResult.data || [];

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

    // Monthly executed
    const monthlyExecuted: Record<string, { total: number; count: number; byDepartment: Record<string, { total: number; count: number }> }> = {};
    
    executedRecords.forEach((record: any) => {
      const date = new Date(record.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const dept = record.department || "Não especificado";
      
      if (!monthlyExecuted[key]) {
        monthlyExecuted[key] = { total: 0, count: 0, byDepartment: {} };
      }
      monthlyExecuted[key].total += record.amount;
      monthlyExecuted[key].count += 1;
      
      if (!monthlyExecuted[key].byDepartment[dept]) {
        monthlyExecuted[key].byDepartment[dept] = { total: 0, count: 0 };
      }
      monthlyExecuted[key].byDepartment[dept].total += record.amount;
      monthlyExecuted[key].byDepartment[dept].count += 1;
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

### PROCEDIMENTOS EXECUTADOS (últimos 12 meses)
${Object.entries(monthlyExecuted)
  .sort((a, b) => b[0].localeCompare(a[0]))
  .slice(0, 12)
  .map(([month, data]) => `- ${month}: R$ ${data.total.toLocaleString("pt-BR")} (${data.count} execuções)`)
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
