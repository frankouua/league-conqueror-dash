import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Mapping of intentions to relevant tags/keywords
const INTENTION_TAG_MAP: Record<string, string[]> = {
  'Interesse em procedimento': ['procedimento', 'tratamento', 'cirurgia', 'interesse', 'resultado'],
  'Dúvidas sobre preços': ['preco', 'valor', 'custo', 'pagamento', 'financiamento', 'parcelamento'],
  'Agendamento de consulta': ['agendamento', 'consulta', 'horario', 'disponibilidade', 'marcar'],
  'Reclamação': ['reclamacao', 'problema', 'insatisfacao', 'resolver', 'suporte'],
  'Solicitação de informações': ['informacao', 'duvida', 'como funciona', 'explicacao'],
  'Follow-up': ['followup', 'retorno', 'acompanhamento', 'lembrete'],
  'Confirmação': ['confirmacao', 'confirmar', 'presenca', 'comparecer'],
  'Cancelamento': ['cancelamento', 'cancelar', 'desistir', 'remarcar'],
  'Reagendamento': ['reagendamento', 'remarcar', 'mudar data', 'alterar horario'],
  'Objeção de preço': ['objecao', 'caro', 'desconto', 'negociacao', 'valor alto'],
  'Objeção de tempo': ['tempo', 'agenda', 'ocupado', 'depois', 'pensar'],
  'Fechamento': ['fechamento', 'fechar', 'contrato', 'assinar', 'decisao'],
}

// Map funnel stages to script categories
const STAGE_SCRIPT_MAP: Record<string, string[]> = {
  'novo': ['apresentacao', 'primeiro contato', 'qualificacao'],
  'qualificado': ['qualificacao', 'descoberta', 'necessidades'],
  'proposta': ['proposta', 'apresentacao', 'beneficios', 'valor'],
  'negociacao': ['negociacao', 'objecao', 'fechamento', 'desconto'],
  'fechamento': ['fechamento', 'contrato', 'proximo passo'],
}

interface RequestBody {
  leadId?: string
  intencao?: string
  stageKey?: string
  temperature?: string
  searchQuery?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()
    const { leadId, intencao, stageKey, temperature, searchQuery } = body

    console.log("Script suggestion request:", { leadId, intencao, stageKey, temperature, searchQuery })

    let scripts: any[] = []
    
    // Strategy 1: Search by intention tags
    if (intencao) {
      const relevantTags = INTENTION_TAG_MAP[intencao] || [intencao.toLowerCase()]
      
      // Search in knowledge_base for scripts matching tags
      const { data: taggedScripts, error: tagError } = await supabase
        .from('knowledge_base')
        .select('id, titulo, conteudo, tags, categoria, etapa_funil, prioridade')
        .eq('tipo', 'script')
        .eq('ativo', true)
        .order('prioridade', { ascending: false })
        .limit(10)

      if (!tagError && taggedScripts) {
        // Filter scripts that match any of the relevant tags
        scripts = taggedScripts.filter(script => {
          const scriptTags = (script.tags || []).map((t: string) => t.toLowerCase())
          const scriptContent = (script.conteudo || '').toLowerCase()
          const scriptTitle = (script.titulo || '').toLowerCase()
          
          return relevantTags.some(tag => 
            scriptTags.includes(tag) || 
            scriptContent.includes(tag) ||
            scriptTitle.includes(tag)
          )
        }).slice(0, 3)
      }
    }

    // Strategy 2: If no results from intention, try stage-based search
    if (scripts.length === 0 && stageKey) {
      const stageKeywords = STAGE_SCRIPT_MAP[stageKey] || []
      
      const { data: stageScripts, error: stageError } = await supabase
        .from('knowledge_base')
        .select('id, titulo, conteudo, tags, categoria, etapa_funil, prioridade')
        .eq('tipo', 'script')
        .eq('ativo', true)
        .order('prioridade', { ascending: false })
        .limit(10)

      if (!stageError && stageScripts) {
        scripts = stageScripts.filter(script => {
          const scriptContent = (script.conteudo || '').toLowerCase()
          const scriptTitle = (script.titulo || '').toLowerCase()
          const scriptEtapa = (script.etapa_funil || '').toLowerCase()
          
          return stageKeywords.some(keyword => 
            scriptContent.includes(keyword) ||
            scriptTitle.includes(keyword) ||
            scriptEtapa.includes(keyword)
          ) || scriptEtapa === stageKey
        }).slice(0, 3)
      }
    }

    // Strategy 3: Search by query text
    if (scripts.length === 0 && searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(' ').filter(t => t.length > 2)
      
      const { data: queryScripts, error: queryError } = await supabase
        .from('knowledge_base')
        .select('id, titulo, conteudo, tags, categoria, etapa_funil, prioridade')
        .eq('tipo', 'script')
        .eq('ativo', true)
        .order('prioridade', { ascending: false })
        .limit(10)

      if (!queryError && queryScripts) {
        scripts = queryScripts.filter(script => {
          const scriptContent = (script.conteudo || '').toLowerCase()
          const scriptTitle = (script.titulo || '').toLowerCase()
          
          return searchTerms.some(term => 
            scriptContent.includes(term) ||
            scriptTitle.includes(term)
          )
        }).slice(0, 3)
      }
    }

    // Strategy 4: Fallback to most popular/priority scripts
    if (scripts.length === 0) {
      const { data: fallbackScripts, error: fallbackError } = await supabase
        .from('knowledge_base')
        .select('id, titulo, conteudo, tags, categoria, etapa_funil, prioridade')
        .eq('tipo', 'script')
        .eq('ativo', true)
        .order('prioridade', { ascending: false })
        .order('visualizacoes', { ascending: false })
        .limit(3)

      if (!fallbackError && fallbackScripts) {
        scripts = fallbackScripts
      }
    }

    // Add temperature-specific tips if available
    let temperatureTip = null
    if (temperature) {
      const tips: Record<string, string> = {
        'hot': '🔥 Lead quente! Foque em fechamento e urgência. Evite prolongar a negociação.',
        'warm': '☀️ Lead morno. Trabalhe objeções com calma e reforce benefícios.',
        'cold': '❄️ Lead frio. Foque em reaquecimento e identificação de necessidades.',
      }
      temperatureTip = tips[temperature] || null
    }

    // Log the request for analytics (fire and forget)
    if (leadId) {
      try {
        await supabase.from('crm_lead_history').insert({
          lead_id: leadId,
          action_type: 'script_suggestion',
          title: 'Scripts sugeridos',
          description: `Intenção: ${intencao || 'não detectada'}. ${scripts.length} scripts sugeridos.`,
          performed_by: '00000000-0000-0000-0000-000000000000', // System
          metadata: { intencao, stageKey, scriptsFound: scripts.length }
        })
      } catch (logError) {
        console.log('Failed to log script suggestion:', logError)
      }
    }

    return new Response(
      JSON.stringify({ 
        scripts,
        temperatureTip,
        meta: {
          intention: intencao,
          stage: stageKey,
          resultsCount: scripts.length
        }
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error("Script suggestion error:", error)
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        scripts: [],
        temperatureTip: null
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})
