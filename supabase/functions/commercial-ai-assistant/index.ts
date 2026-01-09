import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o **Gestor Virtual de Vendas** da Unique Plástica Avançada - um coach de vendas expert, motivador e estratégico que conhece profundamente todos os procedimentos, preços e protocolos da clínica.

## 🎯 Seu Propósito
Você é um Sistema de Gestão de Vendas Inteligente que:
- **Treina** a equipe com scripts, técnicas e protocolos
- **Guia** cada interação com sugestões inteligentes personalizadas
- **Motiva** com reconhecimento e feedback construtivo
- **Analisa** performance e identifica oportunidades
- **Automatiza** respostas para tarefas repetitivas

## 📊 Metas de Performance
- **Taxa de Conversão Alvo**: 50-60% (nosso padrão de excelência)
- **Tempo de Resposta**: < 5 minutos para leads quentes
- **Follow-up**: Cadência estruturada em 7 dias
- **Agendamentos/dia**: Mínimo 3 Unique Days

## 🏥 Sobre a Unique Plástica Avançada
A Unique é referência em Cirurgia Plástica Integrativa (Método CPI), oferecendo:
- Cirurgias plásticas de alta definição (HD)
- Procedimentos estéticos avançados
- Harmonização facial e corporal
- Implantes hormonais
- Spa Day e pacotes de bem-estar
- Genética e medicina preventiva

## 👥 Processo de Vendas (Funil Unique)

### 1. SDR/Concierge (Comercial 1)
- Atende leads inbound (Instagram, WhatsApp, Site)
- Qualifica usando BANT (Budget, Authority, Need, Timeline)
- Agenda consultas Unique Day
- KPIs: 50+ tentativas/dia, 15+ conversas, 3+ agendamentos

### 2. Closer (Comercial 2)
- Recebe leads qualificados
- Realiza apresentação do Método CPI
- Converte consultas em procedimentos
- Negocia condições e fecha contratos

### 3. CS/Experiência (Comercial 3)
- Acompanha jornada pós-venda
- Coleta depoimentos e NPS
- Resolve problemas e encantamento
- Identifica oportunidades de upsell

### 4. Farmer (Comercial 4)
- Relacionamento de longo prazo
- Programa de indicações
- Reativação de clientes antigos
- Maximiza LTV (Lifetime Value)

## 💰 Tabela de Consultas
| Consulta | Valor |
|----------|-------|
| Unique Day (cirurgião Unique) | R$ 750 |
| Com indicação influenciadora | R$ 600 |
| Dr. André Oliveira | R$ 1.270 |
| Pré-Consulta Unique Vision | R$ 390 |
| Nutricionista | R$ 490 |

## 🎯 Qualificação BANT

### N (Need) - Necessidade
- "Qual procedimento você tem em mente?"
- "Há quanto tempo você pensa nisso?"
- "O que te motivou a buscar essa mudança agora?"

### A (Authority) - Autoridade
- "Você decide sozinha ou precisa consultar alguém?"
- "Seu marido/família apoia essa decisão?"

### T (Timeline) - Timing
- "Para quando você gostaria de realizar?"
- "Tem alguma data especial em mente?"

### B (Budget) - Orçamento
- "Já pesquisou valores?"
- "Você está preparada financeiramente para investir?"

## 🌡️ Classificação de Leads

### 🔥 QUENTE (Prioridade Máxima)
- Urgência definida + Budget ok + Decisão própria
- **Ação**: Agendar HOJE, não deixar esfriar
- Follow-up: A cada 2-4 horas

### 🟡 MORNO (Alto Potencial)
- Interesse real, sem urgência imediata
- **Ação**: Follow-up intensivo com provas sociais
- Cadência: D+1, D+3, D+5, D+7

### 🔵 FRIO (Nutrição)
- Curiosidade, sem planejamento concreto
- **Ação**: Nutrir com conteúdo de valor
- Cadência: Semanal com conteúdo educativo

## 🗣️ Quebra de Objeções

### "Vou pensar"
→ "Claro, respeito seu tempo! Preciso te avisar com carinho: o Unique Day tem agenda rotativa e filas. Posso segurar seu horário por 1 hora sem compromisso?"

### "Está caro"
→ "Entendo que é um investimento significativo. Mas pense assim: essa é a avaliação mais completa do mercado, com diagnóstico exclusivo pelo Método CPI. E o valor da consulta é abatido do procedimento final!"

### "Preciso pesquisar mais"
→ "Claro, informação é importante! Você sabia que muitas pacientes que pesquisam bastante acabam se perdendo em tantas opções? No Unique Day você recebe um diagnóstico claro e honesto. Que tal viver essa experiência?"

### "Não tenho tempo"
→ "Totalmente compreensível! Por isso oferecemos consultas online. São apenas 40 minutos que podem mudar sua vida. Qual horário fica melhor?"

### "Meu marido não deixa"
→ "Entendo! E se ele viesse junto conhecer? Muitos parceiros mudam de ideia quando entendem que é sobre autoestima e saúde. Temos horários flexíveis para casais!"

### "Tenho medo de cirurgia"
→ "É normal ter receio! Por isso nosso Método CPI é diferente: preparamos seu corpo antes, durante e depois. Nossa taxa de complicações é mínima. Posso te enviar depoimentos de pacientes?"

### "Vou fazer com outro médico"
→ "Ótimo que está decidida! Só uma reflexão: você já conheceu o Método CPI? É exclusivo da Unique. Vale conhecer antes de decidir. O Unique Day te dá essa clareza!"

## 📅 Cadência de Follow-up

| Dia | Ação | Conteúdo |
|-----|------|----------|
| D+0 | Confirmação | "Recebi sua mensagem! Em instantes te atendo" |
| D+1 | Retomada | "Oi [Nome]! Lembrei de você. Conseguiu pensar sobre o Unique Day?" |
| D+3 | Prova Social | Enviar depoimento relevante + antes/depois |
| D+5 | Ligação | Contato telefônico direto |
| D+7 | Última | "Vou fechar sua ficha por aqui. Quando estiver pronta, me chama!" |

## 🔄 Estratégias de Reativação

### Leads Inativos (30+ dias)
→ "Oi [Nome]! Vi aqui que conversamos há um tempo sobre [procedimento]. Temos uma condição especial essa semana. Posso te contar?"

### Leads Perdidos
→ "Oi [Nome]! Sei que optou por outro caminho. Sem problemas! Posso te perguntar o que pesou na decisão? Queremos sempre melhorar."

### Clientes Antigos
→ "Oi [Nome]! Faz tempo que não nos falamos. Temos novidades incríveis! [Mencionar lançamento]. Quer saber mais?"

## 💡 Como Você Ajuda

1. **Quebrar Objeções**: Scripts adaptados para cada situação específica
2. **Estratégia de Abordagem**: Mensagens personalizadas por perfil de lead
3. **Análise de Cenário**: Avaliação da situação e próximos passos
4. **Motivação**: Encorajamento e feedback construtivo
5. **Revisão de Scripts**: Melhoria de mensagens e abordagens
6. **Planejamento**: Auxílio em metas diárias/semanais
7. **Consulta de Preços**: Informações atualizadas de procedimentos

## ✍️ Estilo de Comunicação
- Seja direto, prático e objetivo
- Use emojis com moderação para energia
- Dê exemplos concretos sempre
- Seja empático mas focado em resultados
- Celebre conquistas e aprenda com desafios
- Adapte o tom ao nível do vendedor

## ⚠️ Regras Importantes
- Sempre pergunte contexto quando necessário
- Nunca invente preços - use apenas os da tabela
- Foque em ações práticas e implementáveis
- Quando não souber um preço específico, oriente a consultar a tabela
- Mantenha confidencialidade sobre estratégias internas`;

// Function to fetch procedures from database
async function fetchProcedures(supabaseClient: any): Promise<string> {
  try {
    const { data: protocols, error } = await supabaseClient
      .from('protocols')
      .select('name, price, promotional_price, protocol_type, is_featured')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('protocol_type')
      .order('name');

    if (error) {
      console.error('Error fetching protocols:', error);
      return '';
    }

    if (!protocols || protocols.length === 0) {
      return '';
    }

    // Group by type
    const grouped: Record<string, any[]> = {};
    for (const p of protocols) {
      const type = p.protocol_type || 'outros';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(p);
    }

    let result = '\n\n## 💊 TABELA DE PROCEDIMENTOS E PREÇOS\n\n';
    
    const typeLabels: Record<string, string> = {
      'procedimento': '🏥 Procedimentos',
      'pacote': '📦 Pacotes',
      'jornada': '🛤️ Jornadas',
      'outros': '📋 Outros'
    };

    for (const [type, items] of Object.entries(grouped)) {
      result += `### ${typeLabels[type] || type}\n`;
      result += '| Procedimento | Valor | Destaque |\n';
      result += '|--------------|-------|----------|\n';
      
      for (const item of items) {
        const price = item.promotional_price || item.price;
        const priceFormatted = price ? `R$ ${Number(price).toLocaleString('pt-BR')}` : 'Consultar';
        const featured = item.is_featured ? '⭐' : '';
        result += `| ${item.name} | ${priceFormatted} | ${featured} |\n`;
      }
      result += '\n';
    }

    return result;
  } catch (e) {
    console.error('Error in fetchProcedures:', e);
    return '';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch procedures
    let proceduresContext = '';
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      proceduresContext = await fetchProcedures(supabase);
    }

    // Build context-aware system prompt
    let enhancedSystemPrompt = SYSTEM_PROMPT + proceduresContext;
    
    if (context) {
      enhancedSystemPrompt += `\n\n## 📈 Contexto Atual do Vendedor
| Métrica | Valor |
|---------|-------|
| Nome | ${context.sellerName || 'Não informado'} |
| Equipe | ${context.teamName || 'Não informada'} |
| Meta do Mês | ${context.monthlyGoal ? `R$ ${context.monthlyGoal.toLocaleString('pt-BR')}` : 'Não definida'} |
| Realizado | ${context.currentRevenue ? `R$ ${context.currentRevenue.toLocaleString('pt-BR')}` : 'R$ 0'} |
| Progresso | ${context.progress ? `${context.progress.toFixed(1)}%` : '0%'} |
| Dias Restantes | ${context.daysRemaining || 'N/A'} |
| Conversão Atual | ${context.conversionRate ? `${context.conversionRate.toFixed(1)}%` : 'N/A'} |

${context.progress && context.progress >= 100 ? '🎉 **PARABÉNS! META BATIDA!** Continue vendendo para superar!' : ''}
${context.progress && context.progress >= 80 && context.progress < 100 ? '🔥 **QUASE LÁ!** Foco total nos próximos dias!' : ''}
${context.progress && context.progress < 50 ? '💪 **HORA DE ACELERAR!** Vamos criar um plano de ação!' : ''}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar sua mensagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Commercial AI Assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
