import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCENARIO_PROMPTS: Record<string, string> = {
  lead_qualification: `Você é uma potencial paciente interessada em procedimentos estéticos.
Você está entrando em contato pela primeira vez e tem dúvidas.
Responda de forma realista, com hesitações naturais, perguntas sobre preços e procedimentos.
NÃO seja muito fácil - faça perguntas difíceis, mostre algumas objeções.`,

  objection_handling: `Você é uma potencial paciente que já fez uma consulta mas ainda não decidiu.
Você tem objeções reais: preço alto, medo do procedimento, precisa consultar a família.
Apresente essas objeções de forma natural e veja como o vendedor lida com elas.
Seja resistente mas não impossível de convencer.`,

  closing: `Você é uma paciente interessada que já passou por todo o processo de qualificação.
Você está quase decidida mas precisa de um último empurrão.
Faça perguntas sobre garantias, formas de pagamento, tempo de recuperação.
Se o vendedor for convincente, demonstre interesse em fechar.`,

  follow_up: `Você é uma paciente que fez uma consulta há 2 semanas mas não retornou contato.
Você estava ocupada e esqueceu, mas ainda tem interesse.
Responda de forma um pouco distante no início, mas aqueça conforme a conversa.
Teste se o vendedor consegue resgatar seu interesse.`,

  referral: `Você é uma paciente satisfeita que fez um procedimento na clínica.
O vendedor está entrando em contato para pedir indicações ou agradecer uma indicação.
Seja receptiva mas não exageradamente entusiasmada. Faça perguntas sobre benefícios de indicar.`,

  reactivation: `Você é uma paciente antiga que fez procedimento há mais de 1 ano e não voltou.
O vendedor está tentando reativar você. Você tem interesse mas está distante.
Mostre um pouco de resistência inicial, pergunte sobre novidades.`,

  upsell: `Você é uma paciente que já fez um procedimento e está satisfeita.
O vendedor está sugerindo procedimentos complementares.
Mostre interesse mas questione se realmente precisa e o custo-benefício.`,

  consultoria: `Você é um profissional da área de saúde ou estética interessado em parceria.
Você quer entender como funciona a parceria, comissões, e processo de indicação.
Seja profissional e faça perguntas técnicas sobre a colaboração.`,

  partnership: `Você é um potencial parceiro de negócios (influenciador, clínica, profissional).
Você está avaliando uma proposta de parceria comercial.
Seja crítico, pergunte sobre resultados, exclusividade e contrapartidas.`,

  crisis: `Você é uma paciente insatisfeita ou com uma reclamação séria.
O vendedor precisa gerenciar a crise e resolver seu problema.
Esteja chateada mas seja razoável se a solução for genuína.`,

  retention: `Você é uma paciente que quer cancelar um procedimento ou contrato.
O vendedor precisa entender suas razões e tentar reter você.
Tenha uma razão real mas esteja aberta a soluções se forem boas.`,
};

// Regras para mensagens curtas e naturais
const CONVERSATION_RULES = `
REGRAS DE CONVERSA (OBRIGATÓRIAS):
1. Escreva mensagens CURTAS como um chat real de WhatsApp/Instagram
2. Máximo de 1-2 frases por mensagem (nunca parágrafos longos!)
3. Use linguagem informal e natural de chat
4. Inclua emojis ocasionalmente mas com moderação
5. Faça pausas naturais - não despeje toda informação de uma vez
6. Exemplo de tamanho ideal: "Oi! Vi que vocês fazem lipo, né? Quanto custa mais ou menos?"
7. PROIBIDO: Textos longos, explicações extensas, múltiplos parágrafos
8. A conversa deve fluir naturalmente em várias trocas de mensagens
9. Pergunte UMA coisa por vez, nunca várias perguntas juntas
10. Seja realista - pacientes reais mandam mensagens curtas e objetivas`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, simulation, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const scenarioPrompt = SCENARIO_PROMPTS[simulation.scenario_type] || SCENARIO_PROMPTS.lead_qualification;

    if (action === "start") {
      // Generate initial message as the patient
      const systemPrompt = `${scenarioPrompt}

${CONVERSATION_RULES}

CONTEXTO DO CENÁRIO:
${simulation.context.situation}

PERFIL DA PACIENTE:
${simulation.context.patient_profile}

Inicie a conversa como se você estivesse entrando em contato com a clínica.
LEMBRE-SE: Mensagem CURTA, 1-2 frases no máximo! Como um chat real.`;

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
            { role: "user", content: "Inicie a conversa como a paciente. Mensagem CURTA de 1-2 frases apenas." },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Failed to generate initial message");
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ message: data.choices[0].message.content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "continue") {
      // Continue the conversation
      const systemPrompt = `${scenarioPrompt}

${CONVERSATION_RULES}

CONTEXTO DO CENÁRIO:
${simulation.context.situation}

PERFIL DA PACIENTE:
${simulation.context.patient_profile}

Continue a conversa como a paciente.
Responda de forma natural às mensagens do vendedor.
CRÍTICO: Sua resposta deve ser CURTA (1-2 frases no máximo!)
Mantenha consistência com suas respostas anteriores.
Se o vendedor estiver indo bem, demonstre mais interesse gradualmente.
Se estiver fraco, mantenha suas objeções.`;

      const aiMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
        { role: "user", content: "Responda como a paciente. MÁXIMO 1-2 frases curtas!" },
      ];

      // Remove the duplicate last message if the user just sent one
      if (aiMessages.length > 2 && aiMessages[aiMessages.length - 2].role === "user") {
        aiMessages.pop();
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Failed to continue conversation");
      }

      const data = await response.json();
      const messageContent = data.choices[0].message.content;

      // Check if conversation should end naturally
      const shouldEnd = 
        messageContent.toLowerCase().includes("vou agendar") ||
        messageContent.toLowerCase().includes("fechado") ||
        messageContent.toLowerCase().includes("combinado então") ||
        messageContent.toLowerCase().includes("não tenho interesse") ||
        messageContent.toLowerCase().includes("não quero mais") ||
        messageContent.toLowerCase().includes("pode agendar") ||
        messageContent.toLowerCase().includes("quero marcar") ||
        messages.length >= 18; // 9 exchanges

      return new Response(
        JSON.stringify({ message: messageContent, shouldEnd }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "evaluate") {
      // Evaluate the conversation
      const evaluationPrompt = `Você é um avaliador de vendas especializado em clínicas de cirurgia plástica.

Analise a seguinte conversa entre um vendedor e uma potencial paciente.

CRITÉRIOS DE AVALIAÇÃO:
${simulation.context.evaluation_criteria?.join('\n') || `
- Rapport e conexão inicial
- Escuta ativa e entendimento das necessidades
- Apresentação clara de benefícios
- Tratamento de objeções
- Técnicas de fechamento
- Profissionalismo e cordialidade
`}

OBJETIVO DO VENDEDOR:
${simulation.context.goal}

CONVERSA:
${messages.map((m: { role: string; content: string }) => 
  `${m.role === "user" ? "VENDEDOR" : "PACIENTE"}: ${m.content}`
).join('\n\n')}

Avalie o desempenho do vendedor e retorne um JSON com:
{
  "score": (número de 0 a 100),
  "strengths": ["ponto forte 1", "ponto forte 2", ...],
  "improvements": ["melhoria 1", "melhoria 2", ...],
  "detailed_analysis": "análise detalhada em 2-3 parágrafos"
}

Seja justo mas exigente. Um vendedor médio deve ficar entre 50-70.
Apenas os melhores passam de 80.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é um avaliador de vendas. Retorne APENAS JSON válido, sem markdown." },
            { role: "user", content: evaluationPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Failed to evaluate conversation");
      }

      const data = await response.json();
      let feedback;
      
      try {
        // Try to parse the JSON response
        const content = data.choices[0].message.content;
        // Remove markdown code blocks if present
        const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
        feedback = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Error parsing feedback:", parseError);
        // Fallback feedback
        feedback = {
          score: 60,
          strengths: ["Manteve a conversa ativa"],
          improvements: ["Trabalhar técnicas de fechamento"],
          detailed_analysis: "A conversa foi conduzida de forma razoável. Continue praticando para melhorar suas habilidades.",
        };
      }

      return new Response(
        JSON.stringify({ feedback }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Training simulation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
