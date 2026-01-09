import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface TaskCreationResult {
  followUpTasks: number
  urgentTasks: number
  notifications: number
}

async function generateDailyTasks(): Promise<TaskCreationResult> {
  const result: TaskCreationResult = {
    followUpTasks: 0,
    urgentTasks: 0,
    notifications: 0
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const today = new Date().toISOString()

  // 1. Buscar leads sem contato há 3+ dias (que não estão ganhos ou perdidos)
  const { data: staleLeads, error: staleError } = await supabase
    .from("crm_leads")
    .select("id, name, assigned_to, temperature, last_activity_at")
    .lt("last_activity_at", threeDaysAgo)
    .is("won_at", null)
    .is("lost_at", null)

  if (staleError) {
    console.error("Error fetching stale leads:", staleError)
  }

  // Agrupar por vendedor para consolidar notificações
  const vendorTasks: Record<string, { followUp: string[], urgent: string[] }> = {}

  // Criar tarefas de follow-up para leads parados
  for (const lead of staleLeads || []) {
    if (!lead.assigned_to) continue

    // Verificar se já existe tarefa pendente para este lead
    const { data: existingTask } = await supabase
      .from("crm_tasks")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("is_completed", false)
      .eq("task_type", "follow_up")
      .single()

    if (existingTask) continue // Já tem tarefa pendente

    const daysSinceContact = Math.floor(
      (Date.now() - new Date(lead.last_activity_at || 0).getTime()) / (24 * 60 * 60 * 1000)
    )

    const { error: insertError } = await supabase.from("crm_tasks").insert({
      lead_id: lead.id,
      title: `Follow-up: ${lead.name}`,
      description: `Sem contato há ${daysSinceContact} dias. Temperatura: ${lead.temperature || 'não definida'}. Retomar contato imediatamente.`,
      task_type: "follow_up",
      priority: daysSinceContact > 7 ? "high" : "medium",
      assigned_to: lead.assigned_to,
      created_by: lead.assigned_to,
      due_date: today,
    })

    if (!insertError) {
      result.followUpTasks++
      
      if (!vendorTasks[lead.assigned_to]) {
        vendorTasks[lead.assigned_to] = { followUp: [], urgent: [] }
      }
      vendorTasks[lead.assigned_to].followUp.push(lead.name)
    }
  }

  // 2. Buscar interações com sentimento negativo nas últimas 24h
  const { data: negativeInteractions, error: negError } = await supabase
    .from("crm_lead_interactions")
    .select(`
      id,
      lead_id,
      sentiment,
      description,
      created_by
    `)
    .eq("sentiment", "negative")
    .gte("created_at", oneDayAgo)

  if (negError) {
    console.error("Error fetching negative interactions:", negError)
  }

  // Processar leads com sentimento negativo
  const processedLeadIds = new Set<string>()
  
  for (const interaction of negativeInteractions || []) {
    // Evitar duplicatas para o mesmo lead
    if (processedLeadIds.has(interaction.lead_id)) continue
    processedLeadIds.add(interaction.lead_id)

    // Buscar dados do lead
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("id, name, assigned_to, temperature")
      .eq("id", interaction.lead_id)
      .is("won_at", null)
      .is("lost_at", null)
      .single()

    if (!lead || !lead.assigned_to) continue

    // Verificar se já existe tarefa urgente para este lead
    const { data: existingUrgent } = await supabase
      .from("crm_tasks")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("is_completed", false)
      .eq("priority", "high")
      .gte("created_at", oneDayAgo)
      .single()

    if (existingUrgent) continue

    const { error: insertError } = await supabase.from("crm_tasks").insert({
      lead_id: lead.id,
      title: `⚠️ URGENTE: Resolver problema com ${lead.name}`,
      description: `Lead com sentimento negativo detectado. Última interação: "${interaction.description?.substring(0, 100) || 'Não disponível'}". Ação imediata necessária para reverter situação.`,
      task_type: "follow_up",
      priority: "high",
      assigned_to: lead.assigned_to,
      created_by: lead.assigned_to,
      due_date: today,
    })

    if (!insertError) {
      result.urgentTasks++
      
      if (!vendorTasks[lead.assigned_to]) {
        vendorTasks[lead.assigned_to] = { followUp: [], urgent: [] }
      }
      vendorTasks[lead.assigned_to].urgent.push(lead.name)
    }
  }

  // 3. Criar notificações consolidadas para cada vendedor
  for (const [vendorId, tasks] of Object.entries(vendorTasks)) {
    const totalTasks = tasks.followUp.length + tasks.urgent.length
    
    let message = `📋 Gestor IA criou ${totalTasks} tarefa(s) para você hoje:\n`
    
    if (tasks.urgent.length > 0) {
      message += `\n🚨 URGENTES (${tasks.urgent.length}): ${tasks.urgent.slice(0, 3).join(', ')}${tasks.urgent.length > 3 ? '...' : ''}`
    }
    
    if (tasks.followUp.length > 0) {
      message += `\n📞 Follow-ups (${tasks.followUp.length}): ${tasks.followUp.slice(0, 3).join(', ')}${tasks.followUp.length > 3 ? '...' : ''}`
    }

    const { error: notifError } = await supabase.from("crm_notifications").insert({
      user_id: vendorId,
      title: `🤖 Gestor IA - ${totalTasks} novas tarefas`,
      message: message,
      notification_type: "ai_task",
      metadata: {
        follow_up_count: tasks.followUp.length,
        urgent_count: tasks.urgent.length,
        generated_at: today
      }
    })

    if (!notifError) {
      result.notifications++
    }
  }

  // 4. Log da execução
  console.log(`Daily AI Manager executed:`, {
    staleLeadsFound: staleLeads?.length || 0,
    negativeInteractionsFound: negativeInteractions?.length || 0,
    ...result
  })

  return result
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Starting Daily AI Manager...")
    
    const result = await generateDailyTasks()
    
    return new Response(
      JSON.stringify({ 
        status: "success", 
        message: "Daily tasks generated successfully",
        data: result,
        executedAt: new Date().toISOString()
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error("Daily AI Manager error:", error)
    
    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})
