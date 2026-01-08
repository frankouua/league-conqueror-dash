import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, signaturecertchainurl',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse Alexa request body if present
    let alexaRequest = null
    try {
      alexaRequest = await req.json()
      console.log('Alexa request:', JSON.stringify(alexaRequest))
    } catch {
      // Not a JSON request, that's ok for direct API calls
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

    // Fetch today's revenue
    const { data: todayRevenue, error: todayError } = await supabase
      .from('revenue_records')
      .select('amount')
      .eq('date', today)

    if (todayError) throw todayError

    // Fetch month's revenue
    const { data: monthRevenue, error: monthError } = await supabase
      .from('revenue_records')
      .select('amount')
      .gte('date', firstDayOfMonth)
      .lte('date', today)

    if (monthError) throw monthError

    // Fetch monthly goal (meta1_goal is used as the revenue goal)
    const { data: goals, error: goalsError } = await supabase
      .from('predefined_goals')
      .select('meta1_goal')
      .eq('month', currentMonth)
      .eq('year', currentYear)

    if (goalsError) throw goalsError

    const todayTotal = todayRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    const monthTotal = monthRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    const monthGoal = goals?.reduce((sum, g) => sum + (g.meta1_goal || 0), 0) || 0
    const progress = monthGoal > 0 ? ((monthTotal / monthGoal) * 100).toFixed(1) : 0

    const formatCurrency = (value: number) => {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    const speechText = `Hoje foram vendidos ${formatCurrency(todayTotal)} reais. No mês, o total é de ${formatCurrency(monthTotal)} reais, representando ${progress} por cento da meta.`

    // If this is an Alexa request, return Alexa format directly
    if (alexaRequest && alexaRequest.request) {
      const alexaResponse = {
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: speechText
          },
          shouldEndSession: true
        }
      }

      return new Response(JSON.stringify(alexaResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // For regular API calls, return raw data
    const rawData = {
      today: {
        date: today,
        total: todayTotal,
        formatted: `R$ ${formatCurrency(todayTotal)}`
      },
      month: {
        total: monthTotal,
        goal: monthGoal,
        progress: parseFloat(progress as string),
        formatted: `R$ ${formatCurrency(monthTotal)}`
      },
      speech: speechText
    }

    return new Response(JSON.stringify(rawData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    
    const errorResponse = {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Desculpe, não foi possível obter os resultados no momento."
        },
        shouldEndSession: true
      }
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Alexa expects 200 even for errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
