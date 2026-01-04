import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerData {
  name: string;
  segment: string;
  segmentName: string;
  totalPurchases: number;
  totalValue: number;
  averageTicket: number;
  daysSinceLastPurchase: number;
  recencyScore: number;
  frequencyScore: number;
  valueScore: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer } = await req.json() as { customer: CustomerData };
    
    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Customer data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating AI strategy for customer:", customer.name, "Segment:", customer.segmentName);

    const systemPrompt = `Você é um especialista em estratégias de relacionamento e vendas para clínicas de estética e cirurgia plástica. 
    
Sua missão é analisar dados de clientes e criar estratégias personalizadas de reativação, upsell, cross-sell e fidelização.

Responda SEMPRE em português brasileiro. Seja específico, prático e acionável.

Contexto da clínica:
- Clínica de cirurgia plástica e estética premium
- Serviços: cirurgias plásticas, harmonização facial, soroterapia, spa/estética
- Foco em experiência do cliente e relacionamento de longo prazo`;

    const userPrompt = `Analise este cliente e crie uma estratégia personalizada de relacionamento:

**Cliente:** ${customer.name}
**Segmento RFV:** ${customer.segmentName}
**Scores:** Recência: ${customer.recencyScore}/5 | Frequência: ${customer.frequencyScore}/5 | Valor: ${customer.valueScore}/5

**Dados Financeiros:**
- Total de compras: ${customer.totalPurchases} procedimentos
- Valor total gasto: R$ ${customer.totalValue.toLocaleString('pt-BR')}
- Ticket médio: R$ ${customer.averageTicket.toLocaleString('pt-BR')}
- Dias desde última compra: ${customer.daysSinceLastPurchase} dias

Crie uma estratégia com:
1. **Diagnóstico** (2-3 linhas sobre o perfil do cliente)
2. **Ação Imediata** (o que fazer AGORA para engajar)
3. **Oferta Recomendada** (produto/serviço específico para oferecer)
4. **Script de Abordagem** (mensagem de WhatsApp personalizada de 2-3 linhas)
5. **Próximos Passos** (3 ações sequenciais para os próximos 30 dias)

Seja específico ao segmento ${customer.segmentName}.`;

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
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar estratégia com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const strategy = aiResponse.choices?.[0]?.message?.content || "Não foi possível gerar a estratégia.";

    console.log("Strategy generated successfully for:", customer.name);

    return new Response(
      JSON.stringify({ strategy }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in rfv-ai-strategy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
