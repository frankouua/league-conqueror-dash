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
  profession?: string;
  city?: string;
  mainObjective?: string;
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

    const systemPrompt = `Você é um especialista em estratégias de relacionamento e vendas para clínicas de estética e cirurgia plástica da Unique Clinic.

IMPORTANTE: Suas respostas devem ser CLARAS, PRÁTICAS e PRONTAS PARA USO.

Contexto da clínica Unique:
- Clínica premium de cirurgia plástica e estética em Uberlândia-MG
- Serviços: cirurgias plásticas, harmonização facial, soroterapia, spa day, protocolos estéticos
- Diferencial: atendimento humanizado, acompanhamento pós-operatório, experiência VIP
- Campanhas mensais com ofertas especiais

Responda SEMPRE em português brasileiro.`;

    const additionalInfo = [
      customer.profession ? `Profissão: ${customer.profession}` : null,
      customer.city ? `Cidade: ${customer.city}` : null,
      customer.mainObjective ? `Objetivo principal: ${customer.mainObjective}` : null,
    ].filter(Boolean).join('\n');

    const userPrompt = `Analise este cliente e crie uma estratégia PRÁTICA e ACIONÁVEL:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DADOS DO CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nome: ${customer.name}
Segmento: ${customer.segmentName}
${additionalInfo ? `\n${additionalInfo}\n` : ''}
📈 Scores RFV: R:${customer.recencyScore} | F:${customer.frequencyScore} | V:${customer.valueScore}
💰 Valor total: R$ ${customer.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
🛒 Procedimentos: ${customer.totalPurchases}
💎 Ticket médio: R$ ${customer.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📅 Dias sem comprar: ${customer.daysSinceLastPurchase} dias

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Crie a estratégia EXATAMENTE neste formato:

**🎯 DIAGNÓSTICO**
(2 frases sobre o perfil e momento do cliente)

**⚡ AÇÃO IMEDIATA**
(O que fazer AGORA - seja específico: ligar, WhatsApp, etc)

**🎁 OFERTA RECOMENDADA**
(Produto/serviço específico com valor estimado se aplicável)

**💬 SCRIPT DE WHATSAPP**
(Mensagem pronta para copiar e enviar - 2-3 linhas, tom acolhedor)

**📋 PRÓXIMOS 30 DIAS**
1. (Ação 1 com prazo)
2. (Ação 2 com prazo)
3. (Ação 3 com prazo)

IMPORTANTE: O script de WhatsApp deve ser uma mensagem real e personalizada que a vendedora pode copiar e enviar diretamente.`;

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
