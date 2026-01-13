import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pipelines disponíveis com descrições para a IA
const PIPELINES = {
  prospecao: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Prospecção (SDR)',
    criteria: 'Lead novo, nunca comprou, precisa ser qualificado'
  },
  vendas: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Vendas (Closer)',
    criteria: 'Lead qualificado, demonstrou interesse, pronto para negociação'
  },
  posVenda: {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Pós-Venda (CS)',
    criteria: 'Cliente recente (< 90 dias), acompanhamento pós-procedimento'
  },
  fidelizacao: {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Fidelização (Farmer)',
    criteria: 'Cliente ativo com histórico de compras, potencial de recorrência'
  },
  socialSelling: {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Social Selling',
    criteria: 'Lead de redes sociais, engajamento digital'
  },
  rfvMatrix: {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Matriz RFV',
    criteria: 'Cliente com análise RFV definida, segmentação por valor'
  }
}

// Estratégias comerciais
const STRATEGIES = {
  REATIVACAO: {
    name: 'Reativação',
    description: 'Cliente inativo há mais de 6 meses, precisa ser reativado',
    script: 'Olá [NOME]! Sentimos sua falta aqui na clínica. Temos novidades incríveis que podem te interessar...'
  },
  RECORRENCIA: {
    name: 'Ativação de Recorrência',
    description: 'Cliente com procedimento que requer manutenção/retorno',
    script: 'Oi [NOME]! Está na hora de renovar seu [PROCEDIMENTO]. Que tal agendarmos?'
  },
  UPSELL: {
    name: 'Upsell',
    description: 'Cliente satisfeito com potencial para procedimentos complementares',
    script: 'Olá [NOME]! Você que já fez [PROCEDIMENTO], temos um tratamento complementar perfeito para você...'
  },
  RELACIONAMENTO: {
    name: 'Relacionamento',
    description: 'Cliente VIP que precisa de atenção especial e exclusividade',
    script: 'Olá [NOME]! Como cliente especial, você tem acesso antecipado às nossas novidades...'
  },
  RESGATE: {
    name: 'Resgate',
    description: 'Cliente insatisfeito ou que desistiu, precisa ser reconquistado',
    script: 'Olá [NOME], sabemos que sua última experiência pode não ter sido ideal. Gostaríamos de uma nova chance...'
  },
  INDICACAO: {
    name: 'Programa de Indicação',
    description: 'Cliente promotor (NPS alto), ideal para indicar amigos',
    script: 'Olá [NOME]! Você é um cliente especial e queremos te recompensar. Indique amigos e ganhe benefícios!'
  },
  PRIMEIRO_CONTATO: {
    name: 'Primeiro Contato',
    description: 'Lead novo, precisa conhecer a clínica',
    script: 'Olá [NOME]! Bem-vindo(a)! Sou [VENDEDOR] e estou aqui para te ajudar a encontrar o melhor tratamento...'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Configurações faltando" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { leadId, batchSize = 50, mode = 'single' } = await req.json()

    // Modo batch: classifica múltiplos leads não classificados
    if (mode === 'batch') {
      return await classifyBatch(supabase, LOVABLE_API_KEY, batchSize)
    }

    // Modo single: classifica um lead específico
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "leadId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const result = await classifyLead(supabase, LOVABLE_API_KEY, leadId)

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("❌ AI Classifier error:", msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

async function classifyBatch(supabase: any, apiKey: string, batchSize: number) {
  // Busca leads não classificados (no pipeline FEEGOW ou sem ai_next_action)
  const { data: leads, error } = await supabase
    .from('crm_leads')
    .select(`
      id, name, phone, email, cpf, prontuario,
      estimated_value, last_activity_at, created_at,
      feegow_data, source, tags,
      rfv_customer:rfv_customer_id (
        id, name, total_value, total_purchases, 
        recency_score, frequency_score, value_score,
        segment, last_purchase_date, days_since_last_purchase
      )
    `)
    .or('pipeline_id.eq.585b706c-6805-41db-832b-6b3bd1a2afc8,ai_next_action.is.null')
    .is('ai_analyzed_at', null)
    .limit(batchSize)

  if (error) {
    throw new Error(`Erro ao buscar leads: ${error.message}`)
  }

  if (!leads || leads.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "Nenhum lead para classificar", classified: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  console.log(`📊 Classificando ${leads.length} leads em batch...`)

  const results = {
    classified: 0,
    errors: 0,
    details: [] as any[]
  }

  for (const lead of leads) {
    try {
      const result = await classifyLeadWithAI(supabase, apiKey, lead)
      results.classified++
      results.details.push({ id: lead.id, name: lead.name, ...result })
    } catch (e) {
      console.error(`Erro ao classificar lead ${lead.id}:`, e)
      results.errors++
    }
    
    // Pequeno delay para não sobrecarregar a API
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`✅ Batch concluído: ${results.classified} classificados, ${results.errors} erros`)

  return new Response(
    JSON.stringify({ success: true, ...results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
}

async function classifyLead(supabase: any, apiKey: string, leadId: string) {
  // Busca lead com dados RFV
  const { data: lead, error } = await supabase
    .from('crm_leads')
    .select(`
      id, name, phone, email, cpf, prontuario,
      estimated_value, last_activity_at, created_at,
      feegow_data, source, tags, notes,
      rfv_customer:rfv_customer_id (
        id, name, total_value, total_purchases, 
        recency_score, frequency_score, value_score,
        segment, last_purchase_date, days_since_last_purchase,
        average_ticket
      )
    `)
    .eq('id', leadId)
    .single()

  if (error || !lead) {
    throw new Error(`Lead não encontrado: ${error?.message}`)
  }

  return await classifyLeadWithAI(supabase, apiKey, lead)
}

async function classifyLeadWithAI(supabase: any, apiKey: string, lead: any) {
  const rfv = lead.rfv_customer
  
  // Monta contexto para a IA
  const leadContext = {
    nome: lead.name,
    telefone: lead.phone,
    email: lead.email,
    fonte: lead.source,
    valorEstimado: lead.estimated_value,
    ultimaAtividade: lead.last_activity_at,
    dataCadastro: lead.created_at,
    dadosFeegow: lead.feegow_data,
    tags: lead.tags,
    notas: lead.notes,
    rfv: rfv ? {
      segmento: rfv.segment,
      valorTotal: rfv.total_value,
      quantidadeCompras: rfv.total_purchases,
      ticketMedio: rfv.average_ticket,
      ultimaCompra: rfv.last_purchase_date,
      diasSemComprar: rfv.days_since_last_purchase,
      scoreRecencia: rfv.recency_score,
      scoreFrequencia: rfv.frequency_score,
      scoreValor: rfv.value_score
    } : null
  }

  const systemPrompt = `Você é um Gerente Comercial de IA especializado em clínicas de estética. 
Sua função é analisar clientes e sugerir a melhor estratégia comercial para cada um.

PIPELINES DISPONÍVEIS:
${Object.entries(PIPELINES).map(([key, p]) => `- ${p.name}: ${p.criteria}`).join('\n')}

ESTRATÉGIAS COMERCIAIS:
${Object.entries(STRATEGIES).map(([key, s]) => `- ${s.name}: ${s.description}`).join('\n')}

REGRAS DE CLASSIFICAÇÃO:
1. Se RFV segment é "Campeões" ou "Leais" → Fidelização + Upsell/Relacionamento
2. Se RFV segment é "Em Risco" ou "Hibernando" → Prospecção + Reativação
3. Se RFV segment é "Promissores" → Vendas + Recorrência
4. Se dias sem comprar > 180 → Prospecção + Reativação
5. Se dias sem comprar < 90 e tem histórico → Pós-Venda
6. Se nunca comprou → Prospecção + Primeiro Contato
7. Se valor total > R$10.000 → Cliente VIP, Fidelização + Relacionamento
8. Se procedimento requer manutenção → Recorrência

Analise os dados e retorne sua recomendação.`

  const userPrompt = `Analise este cliente e sugira o melhor pipeline e estratégia comercial:

${JSON.stringify(leadContext, null, 2)}

Baseado nos dados acima, qual é a melhor abordagem para este cliente?`

  // Chamada à IA com tool calling para resposta estruturada
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools: [{
        type: "function",
        function: {
          name: "classify_lead",
          description: "Classifica o lead e sugere estratégia comercial",
          parameters: {
            type: "object",
            properties: {
              pipeline_sugerido: {
                type: "string",
                enum: ["prospecao", "vendas", "posVenda", "fidelizacao", "socialSelling", "rfvMatrix"],
                description: "Pipeline mais adequado para este lead"
              },
              estrategia: {
                type: "string",
                enum: ["REATIVACAO", "RECORRENCIA", "UPSELL", "RELACIONAMENTO", "RESGATE", "INDICACAO", "PRIMEIRO_CONTATO"],
                description: "Estratégia comercial recomendada"
              },
              prioridade: {
                type: "string",
                enum: ["alta", "media", "baixa"],
                description: "Prioridade de atendimento"
              },
              temperatura: {
                type: "string",
                enum: ["quente", "morno", "frio"],
                description: "Temperatura do lead"
              },
              resumo: {
                type: "string",
                description: "Resumo de 1-2 frases sobre o cliente e porque esta estratégia"
              },
              proxima_acao: {
                type: "string",
                description: "Próxima ação específica que o vendedor deve tomar"
              },
              script_sugerido: {
                type: "string",
                description: "Script de abordagem personalizado para este cliente"
              }
            },
            required: ["pipeline_sugerido", "estrategia", "prioridade", "temperatura", "resumo", "proxima_acao", "script_sugerido"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "classify_lead" } }
    })
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit excedido, tente novamente mais tarde")
    }
    if (response.status === 402) {
      throw new Error("Créditos insuficientes para IA")
    }
    const errorText = await response.text()
    throw new Error(`Erro na IA: ${response.status} - ${errorText}`)
  }

  const aiResult = await response.json()
  
  // Extrai os argumentos do tool call
  const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall) {
    throw new Error("IA não retornou classificação")
  }

  const classification = JSON.parse(toolCall.function.arguments)
  const pipeline = PIPELINES[classification.pipeline_sugerido as keyof typeof PIPELINES]
  const strategy = STRATEGIES[classification.estrategia as keyof typeof STRATEGIES]

  // Atualiza o lead com a classificação
  const { error: updateError } = await supabase
    .from('crm_leads')
    .update({
      pipeline_id: pipeline.id,
      ai_summary: classification.resumo,
      ai_next_action: classification.proxima_acao,
      ai_intent: classification.estrategia,
      ai_sentiment: classification.prioridade,
      temperature: classification.temperatura,
      is_priority: classification.prioridade === 'alta',
      ai_analyzed_at: new Date().toISOString(),
      tags: [...(lead.tags || []), strategy.name, classification.prioridade]
    })
    .eq('id', lead.id)

  if (updateError) {
    console.error("Erro ao atualizar lead:", updateError)
  }

  // Registra no histórico
  await supabase
    .from('crm_lead_history')
    .insert({
      lead_id: lead.id,
      action_type: 'ai_classification',
      title: `IA: ${strategy.name}`,
      description: classification.resumo,
      performed_by: '00000000-0000-0000-0000-000000000000',
      ai_analysis: {
        pipeline: pipeline.name,
        strategy: strategy.name,
        priority: classification.prioridade,
        temperature: classification.temperatura,
        next_action: classification.proxima_acao,
        script: classification.script_sugerido
      }
    })

  return {
    leadId: lead.id,
    leadName: lead.name,
    pipeline: pipeline.name,
    strategy: strategy.name,
    priority: classification.prioridade,
    temperature: classification.temperatura,
    summary: classification.resumo,
    nextAction: classification.proxima_acao,
    script: classification.script_sugerido
  }
}
