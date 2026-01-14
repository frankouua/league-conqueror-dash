import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AnalyzeRequest = {
  leadId: string;
  leadData?: Record<string, unknown>;
};

const SYSTEM_PROMPT = `Você é um analista comercial sênior da Unique Plástica Avançada.

Objetivo: analisar os dados do lead e retornar uma avaliação objetiva e acionável.

Regras:
- Responda APENAS com JSON válido (sem markdown).
- Seja conciso (summary até 200 caracteres).
- Se faltar dado, faça inferências conservadoras e deixe claro no nextAction.

Formato obrigatório:
{
  "summary": "string",
  "sentiment": "positive" | "neutral" | "negative" | "hesitant",
  "intent": "high" | "medium" | "low" | "undefined",
  "nextAction": "string",
  "bant": { "budget": number, "authority": number, "need": number, "timing": number }
}`;

function safeJsonExtract(text: string): any {
  // Try full parse first
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract first JSON object
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta de IA sem JSON");
    return JSON.parse(match[0]);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = (await req.json().catch(() => ({}))) as Partial<AnalyzeRequest>;
    const leadId = body.leadId;
    const leadData = body.leadData || {};

    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `LEAD_ID: ${leadId}\n\nDADOS_DO_LEAD (JSON):\n${JSON.stringify(leadData)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("crm-ai-analyze gateway error:", aiResp.status, t);

      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA. Fale com o administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao executar análise de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content as string | undefined;

    if (!content) {
      return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = safeJsonExtract(content);
    } catch (e) {
      console.error("crm-ai-analyze parse error:", e, "content:", content);
      parsed = {
        summary: "Análise indisponível no momento. Avalie manualmente.",
        sentiment: "neutral",
        intent: "undefined",
        nextAction: "Recolher informações (procedimento, orçamento, prazo) e retomar contato.",
        bant: { budget: 50, authority: 50, need: 50, timing: 50 },
      };
    }

    // Normalize minimal defaults to avoid client crashes
    const responsePayload = {
      summary: String(parsed?.summary ?? ""),
      sentiment: parsed?.sentiment ?? "neutral",
      intent: parsed?.intent ?? "undefined",
      nextAction: String(parsed?.nextAction ?? ""),
      bant: {
        budget: Number(parsed?.bant?.budget ?? 50),
        authority: Number(parsed?.bant?.authority ?? 50),
        need: Number(parsed?.bant?.need ?? 50),
        timing: Number(parsed?.bant?.timing ?? 50),
      },
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crm-ai-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
