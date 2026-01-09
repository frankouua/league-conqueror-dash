import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface Recommendation {
  id: string
  name: string
  type: 'procedure' | 'protocol' | 'campaign'
  reason: string
  priority: 'high' | 'medium' | 'low'
  estimatedValue?: number
}

interface RecommendationResponse {
  recommendations: Recommendation[]
  crossSellOpportunities: Recommendation[]
  aiInsight: string
}

async function fetchAvailableProducts() {
  // Fetch procedures from knowledge_base
  const { data: procedures } = await supabase
    .from('knowledge_base')
    .select('id, titulo, conteudo, categoria, procedimentos_relacionados, tags')
    .eq('tipo', 'protocolo')
    .eq('ativo', true)
    .limit(50)

  // Fetch active campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, description, goal_description, campaign_type, prize_description')
    .eq('is_active', true)
    .limit(20)

  // Fetch ICP analysis for common procedures
  const { data: icpData } = await supabase
    .from('icp_analysis')
    .select('main_procedures, segment_name, average_ticket')
    .limit(10)

  return {
    procedures: procedures || [],
    campaigns: campaigns || [],
    icpInsights: icpData || []
  }
}

async function getAIRecommendation(
  leadProfile: any, 
  availableProducts: any
): Promise<RecommendationResponse> {
  const systemPrompt = `Você é um consultor especialista em vendas de procedimentos estéticos e cirurgia plástica.
Sua função é analisar o perfil do lead e recomendar procedimentos, protocolos e campanhas que façam sentido.

REGRAS CRÍTICAS:
1. Você SÓ pode recomendar itens que existem na lista fornecida
2. NUNCA invente procedimentos ou campanhas
3. Baseie suas recomendações no interesse demonstrado, histórico e perfil do lead
4. Priorize cross-sell e upsell inteligentes
5. Seja específico nas justificativas

Retorne APENAS um JSON válido no formato:
{
  "recommendations": [
    {
      "id": "id do item",
      "name": "nome do procedimento/protocolo",
      "type": "procedure|protocol|campaign",
      "reason": "justificativa clara e persuasiva",
      "priority": "high|medium|low"
    }
  ],
  "crossSellOpportunities": [
    {
      "id": "id do item",
      "name": "nome",
      "type": "procedure|protocol|campaign",
      "reason": "por que combina com o interesse principal",
      "priority": "high|medium|low"
    }
  ],
  "aiInsight": "insight geral sobre o perfil do lead e potencial de compra"
}`

  const userPrompt = `
PERFIL DO LEAD:
- Nome: ${leadProfile.name}
- Interesse principal: ${leadProfile.interested_procedures?.join(', ') || 'Não especificado'}
- Temperatura: ${leadProfile.temperature || 'Não definida'}
- Valor estimado: R$ ${leadProfile.estimated_value || 'Não informado'}
- Origem: ${leadProfile.source || 'Não informada'}
- Notas: ${leadProfile.notes || 'Sem notas'}
- Sentimento detectado: ${leadProfile.ai_sentiment || 'Não analisado'}
- Intenção: ${leadProfile.ai_intent || 'Não detectada'}

PRODUTOS DISPONÍVEIS PARA RECOMENDAR:

PROTOCOLOS/PROCEDIMENTOS:
${availableProducts.procedures.map((p: any) => 
  `- ID: ${p.id} | Nome: ${p.titulo} | Categoria: ${p.categoria || 'Geral'}`
).join('\n')}

CAMPANHAS ATIVAS:
${availableProducts.campaigns.map((c: any) => 
  `- ID: ${c.id} | Nome: ${c.name} | Tipo: ${c.campaign_type} | Meta: ${c.goal_description || 'N/A'}`
).join('\n')}

INSIGHTS DE PERFIL IDEAL (ICP):
${availableProducts.icpInsights.map((i: any) => 
  `- Segmento: ${i.segment_name} | Procedimentos comuns: ${i.main_procedures?.join(', ') || 'N/A'} | Ticket médio: R$ ${i.average_ticket || 'N/A'}`
).join('\n')}

Com base nessas informações, recomende os melhores procedimentos, protocolos e campanhas para este lead.
Retorne APENAS o JSON, sem texto adicional.`

  try {
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
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("AI Gateway error:", response.status, errorText)
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.")
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your workspace.")
      }
      throw new Error(`AI Gateway error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim()
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim()
    }
    
    const parsed = JSON.parse(jsonStr)
    
    return {
      recommendations: parsed.recommendations || [],
      crossSellOpportunities: parsed.crossSellOpportunities || [],
      aiInsight: parsed.aiInsight || "Análise não disponível"
    }
  } catch (error) {
    console.error("AI recommendation error:", error)
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { leadId } = await req.json()

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "leadId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Fetch lead profile
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select(`
        id, name, email, phone, 
        interested_procedures, estimated_value, contract_value,
        temperature, source, source_detail, notes,
        ai_sentiment, ai_intent, ai_summary,
        tags, custom_fields
      `)
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Fetch lead interactions for more context
    const { data: interactions } = await supabase
      .from("crm_lead_interactions")
      .select("type, intention, sentiment, description")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(5)

    // Add interaction context to lead profile
    const enrichedLead = {
      ...lead,
      recentInteractions: interactions || []
    }

    // Fetch available products from database
    const availableProducts = await fetchAvailableProducts()

    // Get AI recommendations
    const recommendations = await getAIRecommendation(enrichedLead, availableProducts)

    // Log for analytics
    await supabase.from('crm_lead_history').insert({
      lead_id: leadId,
      action_type: 'ai_recommendation',
      title: 'Recomendações de IA geradas',
      description: `${recommendations.recommendations.length} recomendações + ${recommendations.crossSellOpportunities.length} cross-sell`,
      performed_by: '00000000-0000-0000-0000-000000000000',
      metadata: { 
        recommendationsCount: recommendations.recommendations.length,
        crossSellCount: recommendations.crossSellOpportunities.length
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: recommendations,
        leadName: lead.name,
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error("Procedure recommendation error:", error)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
