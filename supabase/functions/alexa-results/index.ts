import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    // Fetch monthly goal
    const { data: goals, error: goalsError } = await supabase
      .from('predefined_goals')
      .select('monthly_goal')
      .eq('month', currentMonth)
      .eq('year', currentYear)

    if (goalsError) throw goalsError

    const todayTotal = todayRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    const monthTotal = monthRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    const monthGoal = goals?.reduce((sum, g) => sum + (g.monthly_goal || 0), 0) || 0
    const progress = monthGoal > 0 ? ((monthTotal / monthGoal) * 100).toFixed(1) : 0

    const formatCurrency = (value: number) => {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    // Alexa response format
    const alexaResponse = {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: `Hoje foram vendidos ${formatCurrency(todayTotal)} reais. No mês, o total é de ${formatCurrency(monthTotal)} reais, representando ${progress} por cento da meta.`
        },
        shouldEndSession: true
      }
    }

    // Also return raw data for other uses
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
      alexa: alexaResponse
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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage, alexa: errorResponse }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
