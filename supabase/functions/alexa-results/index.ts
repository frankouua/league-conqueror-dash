import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature, signaturecertchainurl',
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    let alexaRequest = null
    try {
      alexaRequest = await req.json()
      console.log('Alexa request:', JSON.stringify(alexaRequest))
    } catch {
      // Not a JSON request
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

    // Determine intent type
    let intentName = 'LaunchRequest'
    if (alexaRequest?.request?.type === 'IntentRequest') {
      intentName = alexaRequest.request.intent?.name || 'LaunchRequest'
    }

    let speechText = ''

    switch (intentName) {
      case 'VendasOntemIntent': {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        const { data: yesterdayRevenue } = await supabase
          .from('revenue_records')
          .select('amount')
          .eq('date', yesterdayStr)

        const total = yesterdayRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
        speechText = `Ontem foram vendidos ${formatCurrency(total)} reais.`
        break
      }

      case 'MetaSemanaIntent': {
        // Get start of week (Monday)
        const dayOfWeek = now.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(now)
        monday.setDate(now.getDate() + mondayOffset)
        const mondayStr = monday.toISOString().split('T')[0]

        const { data: weekRevenue } = await supabase
          .from('revenue_records')
          .select('amount')
          .gte('date', mondayStr)
          .lte('date', today)

        const { data: goals } = await supabase
          .from('predefined_goals')
          .select('meta1_goal')
          .eq('month', currentMonth)
          .eq('year', currentYear)

        const weekTotal = weekRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
        const monthGoal = goals?.reduce((sum, g) => sum + (g.meta1_goal || 0), 0) || 0
        const weeklyGoal = monthGoal / 4 // Approximate weekly goal

        const progress = weeklyGoal > 0 ? ((weekTotal / weeklyGoal) * 100).toFixed(1) : 0
        speechText = `Esta semana foram vendidos ${formatCurrency(weekTotal)} reais, representando ${progress} por cento da meta semanal estimada.`
        break
      }

      case 'TopVendedorIntent': {
        const { data: salesByUser } = await supabase
          .from('revenue_records')
          .select('user_id, amount')
          .gte('date', firstDayOfMonth)
          .lte('date', today)

        // Aggregate by user
        const userTotals: Record<string, number> = {}
        salesByUser?.forEach(sale => {
          if (sale.user_id) {
            userTotals[sale.user_id] = (userTotals[sale.user_id] || 0) + (sale.amount || 0)
          }
        })

        // Find top seller
        let topUserId = ''
        let topAmount = 0
        Object.entries(userTotals).forEach(([userId, amount]) => {
          if (amount > topAmount) {
            topAmount = amount
            topUserId = userId
          }
        })

        if (topUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', topUserId)
            .single()

          const name = profile?.full_name || 'Usuário desconhecido'
          speechText = `O top vendedor do mês é ${name}, com ${formatCurrency(topAmount)} reais em vendas.`
        } else {
          speechText = 'Ainda não há vendas registradas este mês.'
        }
        break
      }

      case 'LeadsPendentesIntent': {
        // Count leads not in won or lost stages
        const { data: stages } = await supabase
          .from('crm_stages')
          .select('id')
          .eq('is_win_stage', false)
          .eq('is_lost_stage', false)

        const stageIds = stages?.map(s => s.id) || []
        
        if (stageIds.length > 0) {
          const { count } = await supabase
            .from('crm_leads')
            .select('*', { count: 'exact', head: true })
            .in('stage_id', stageIds)

          speechText = `Você tem ${count || 0} leads pendentes no CRM.`
        } else {
          const { count } = await supabase
            .from('crm_leads')
            .select('*', { count: 'exact', head: true })

          speechText = `Você tem ${count || 0} leads no CRM.`
        }
        break
      }

      case 'ComparacaoMesIntent': {
        // Current month revenue
        const { data: currentMonthRevenue } = await supabase
          .from('revenue_records')
          .select('amount')
          .gte('date', firstDayOfMonth)
          .lte('date', today)

        // Previous month (same day range)
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
        const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
        const dayOfMonth = now.getDate()
        const prevMonthEnd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`

        const { data: prevMonthRevenue } = await supabase
          .from('revenue_records')
          .select('amount')
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd)

        const currentTotal = currentMonthRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
        const prevTotal = prevMonthRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

        if (prevTotal > 0) {
          const variation = ((currentTotal - prevTotal) / prevTotal * 100).toFixed(1)
          const direction = currentTotal >= prevTotal ? 'acima' : 'abaixo'
          speechText = `Este mês você está com ${formatCurrency(currentTotal)} reais, ${Math.abs(parseFloat(variation))} por cento ${direction} do mesmo período do mês anterior, que foi ${formatCurrency(prevTotal)} reais.`
        } else {
          speechText = `Este mês você está com ${formatCurrency(currentTotal)} reais. Não há dados do mês anterior para comparação.`
        }
        break
      }

      case 'AMAZON.HelpIntent': {
        speechText = 'Você pode me perguntar: qual foi a venda de hoje, qual foi a venda de ontem, como está a meta da semana, quem é o top vendedor, quantos leads pendentes, ou compare com o mês passado.'
        break
      }

      case 'AMAZON.StopIntent':
      case 'AMAZON.CancelIntent': {
        speechText = 'Até mais! Boas vendas!'
        break
      }

      default: {
        // LaunchRequest or unknown - show today and month summary
        const { data: todayRevenue } = await supabase
          .from('revenue_records')
          .select('amount')
          .eq('date', today)

        const { data: monthRevenue } = await supabase
          .from('revenue_records')
          .select('amount')
          .gte('date', firstDayOfMonth)
          .lte('date', today)

        const { data: goals } = await supabase
          .from('predefined_goals')
          .select('meta1_goal')
          .eq('month', currentMonth)
          .eq('year', currentYear)

        const todayTotal = todayRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
        const monthTotal = monthRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
        const monthGoal = goals?.reduce((sum, g) => sum + (g.meta1_goal || 0), 0) || 0
        const progress = monthGoal > 0 ? ((monthTotal / monthGoal) * 100).toFixed(1) : 0

        speechText = `Hoje foram vendidos ${formatCurrency(todayTotal)} reais. No mês, o total é de ${formatCurrency(monthTotal)} reais, representando ${progress} por cento da meta.`
      }
    }

    // Alexa response format
    if (alexaRequest?.request) {
      const shouldEndSession = !['AMAZON.HelpIntent'].includes(intentName)
      
      const alexaResponse = {
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: speechText
          },
          shouldEndSession
        }
      }

      return new Response(JSON.stringify(alexaResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Regular API response
    return new Response(JSON.stringify({ speech: speechText }), {
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
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
