import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadContext {
  leadName: string;
  stage: string;
  procedures: string;
  sentiment: string;
  daysInStage: number;
  isStale: boolean;
  source: string | null;
  estimatedValue: number | null;
  lastActivity: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context } = await req.json() as { context: LeadContext };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em vendas de procedimentos estéticos da clínica Unique. 
Sua tarefa é gerar scripts de mensagens personalizadas para WhatsApp baseado no contexto do lead.

REGRAS:
- Mensagens devem ser naturais, amigáveis e profissionais
- Use emojis com moderação
- Foque em criar conexão e avançar o lead no funil
- Personalize com o nome do lead quando apropriado
- Considere a etapa atual do funil para adequar o tom
- Se o lead está parado (stale), priorize reengajamento
- Mensagens curtas e diretas são mais efetivas no WhatsApp

ETAPAS DO FUNIL:
- Novo Lead: Primeiro contato, acolhimento
- Qualificação: Descobrir necessidades, budget, timing
- Agendamento: Converter para consulta presencial
- Proposta: Apresentar valores e condições
- Negociação: Superar objeções, fechar
- Fechamento: Confirmar e orientar próximos passos
- Pós-Venda: Satisfação, indicações, fidelização`;

    const userPrompt = `Gere 3 scripts de mensagem para o seguinte lead:

CONTEXTO:
- Nome: ${context.leadName}
- Etapa atual: ${context.stage}
- Procedimentos de interesse: ${context.procedures}
- Sentimento detectado: ${context.sentiment}
- Dias na etapa atual: ${context.daysInStage}
- Lead parado: ${context.isStale ? 'Sim (precisa de reengajamento urgente)' : 'Não'}
- Origem: ${context.source || 'Não informada'}
- Valor estimado: ${context.estimatedValue ? `R$ ${context.estimatedValue}` : 'Não definido'}

Retorne os scripts usando a função suggest_scripts.`;

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
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_scripts",
              description: "Retorna 3 scripts de mensagem personalizados para o lead",
              parameters: {
                type: "object",
                properties: {
                  scripts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { 
                          type: "string",
                          description: "Título curto do script (ex: 'Primeiro Contato', 'Reengajamento')"
                        },
                        content: { 
                          type: "string",
                          description: "A mensagem completa para enviar via WhatsApp"
                        },
                        reasoning: { 
                          type: "string",
                          description: "Breve explicação do por quê essa mensagem é adequada"
                        }
                      },
                      required: ["title", "content", "reasoning"],
                      additionalProperties: false
                    },
                    minItems: 3,
                    maxItems: 3
                  }
                },
                required: ["scripts"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_scripts" } }
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
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract scripts from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify({ scripts: parsed.scripts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback if no tool call
    throw new Error("No scripts generated");

  } catch (error) {
    console.error("Error generating scripts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
