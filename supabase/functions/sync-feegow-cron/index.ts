import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// Webhook for external CRON services (cron-job.org, etc)
// URL: https://mbnjjwatnqjjqxogmaju.supabase.co/functions/v1/sync-feegow-cron
// Header: x-cron-secret: <your-secret>
// Recommended schedule: Every 6 hours (0 */6 * * *)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const CRON_SECRET = Deno.env.get("CRON_SECRET")
  const FEEGOW_API_TOKEN = Deno.env.get("FEEGOW_API_TOKEN")
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")

  // Validate cron secret (optional but recommended for security)
  const cronSecretHeader = req.headers.get("x-cron-secret")
  if (CRON_SECRET && cronSecretHeader !== CRON_SECRET) {
    console.log("❌ Invalid cron secret")
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  if (!FEEGOW_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Configurações faltando" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const FEEGOW_BASE_URL = "https://api.feegow.com/v1/api"
  const feegowHeaders = { "x-access-token": FEEGOW_API_TOKEN, "Content-Type": "application/json" }

  // Check if we should run AI classification after sync
  const { runAiClassification = true } = await req.json().catch(() => ({}))

  // Read sync state from database to continue where we left off
  const { data: syncState } = await supabase
    .from('feegow_sync_logs')
    .select('*')
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  const startPage = syncState?.paid_accounts || 0 // Reusing paid_accounts as page tracker
  const maxPages = 5 // Process 5 pages per cron call (2500 patients)
  const pageSize = 500
  const batchSize = 50

  const results = {
    pagesProcessed: 0,
    patients: { fetched: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
    aiClassification: { classified: 0, errors: 0 },
    nextStartPage: 0,
    hasMore: false,
    status: 'running',
  }

  // Log sync start
  const { data: logEntry } = await supabase
    .from('feegow_sync_logs')
    .insert({
      status: 'in_progress',
      triggered_by: 'cron',
      date_start: new Date().toISOString(),
      paid_accounts: startPage,
    })
    .select()
    .single()

  try {
    console.log(`🚀 CRON: Starting Feegow sync from page ${startPage}...`)

    // Get FEEGOW pipeline and first stage
    const { data: feegowPipeline } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('name', 'FEEGOW')
      .single()

    if (!feegowPipeline) {
      throw new Error("Pipeline FEEGOW não encontrada")
    }

    const { data: novoStage } = await supabase
      .from('crm_stages')
      .select('id')
      .eq('pipeline_id', feegowPipeline.id)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    if (!novoStage) {
      throw new Error("Estágio inicial não encontrado")
    }

    // Process pages incrementally
    let currentPage = startPage
    let pagesProcessed = 0
    const newLeadIds: string[] = []

    while (pagesProcessed < maxPages) {
      const start = currentPage * pageSize
      const url = `${FEEGOW_BASE_URL}/patient/list?start=${start}&offset=${pageSize}`
      
      console.log(`📥 Fetching page ${currentPage + 1} (start=${start})...`)
      
      const response = await fetch(url, { method: "GET", headers: feegowHeaders })
      const data = await response.json()

      if (!data.success || !Array.isArray(data.content)) {
        console.error("Error fetching page:", data)
        break
      }

      const patients = data.content

      if (patients.length === 0) {
        console.log("✅ No more patients - sync complete!")
        results.hasMore = false
        break
      }

      results.patients.fetched += patients.length

      // Process patients
      const toCreate: any[] = []
      const toUpdate: { id: string; data: any }[] = []
      
      const feegowIds = patients
        .filter((p: any) => p.patient_id)
        .map((p: any) => String(p.patient_id))
      
      const { data: existingLeads } = await supabase
        .from('crm_leads')
        .select('id, feegow_id')
        .in('feegow_id', feegowIds)
      
      const existingMap = new Map((existingLeads || []).map(l => [l.feegow_id, l.id]))

      for (const p of patients) {
        if (!p.patient_id) {
          results.patients.skipped++
          continue
        }

        const feegowId = String(p.patient_id)
        const leadData = {
          name: p.nome || 'Sem nome',
          email: p.email || null,
          phone: p.celular || null,
          whatsapp: p.celular || null,
          cpf: null,
          prontuario: feegowId,
          feegow_id: feegowId,
          feegow_data: {
            patient_id: p.patient_id,
            nascimento: p.nascimento,
            sexo_id: p.sexo_id,
            bairro: p.bairro,
            nome_social: p.nome_social,
          },
          last_feegow_sync: new Date().toISOString(),
          source: 'feegow',
          source_detail: 'Sync Automático',
        }

        if (existingMap.has(feegowId)) {
          toUpdate.push({ id: existingMap.get(feegowId)!, data: leadData })
        } else {
          toCreate.push({
            ...leadData,
            pipeline_id: feegowPipeline.id,
            stage_id: novoStage.id,
            created_by: '00000000-0000-0000-0000-000000000000',
          })
        }
      }

      // Insert/update
      for (let i = 0; i < toCreate.length; i += batchSize) {
        const batch = toCreate.slice(i, i + batchSize)
        const { data: inserted, error } = await supabase
          .from('crm_leads')
          .insert(batch)
          .select('id')
        
        if (!error && inserted) {
          results.patients.created += batch.length
          newLeadIds.push(...inserted.map((l: any) => l.id))
        } else {
          results.patients.errors += batch.length
        }
      }

      for (const { id, data } of toUpdate) {
        const { error } = await supabase.from('crm_leads').update(data).eq('id', id)
        if (!error) results.patients.updated++
        else results.patients.errors++
      }

      currentPage++
      pagesProcessed++
      results.pagesProcessed++

      if (patients.length < pageSize) {
        results.hasMore = false
        break
      } else {
        results.hasMore = true
        results.nextStartPage = currentPage
      }

      await new Promise(r => setTimeout(r, 100))
    }

    // Link with RFV customers
    console.log("🔗 Linking leads with RFV customers...")
    try {
      await supabase.rpc('link_leads_rfv')
    } catch {
      // Fallback manual linking
      console.log("RPC failed, trying manual link...")
    }

    // Run AI classification for new leads if enabled
    if (runAiClassification && LOVABLE_API_KEY && newLeadIds.length > 0) {
      console.log(`🤖 Running AI classification for ${newLeadIds.length} new leads...`)
      
      try {
        const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-lead-classifier`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ mode: 'batch', batchSize: Math.min(newLeadIds.length, 20) })
        })

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json()
          results.aiClassification.classified = aiResult.classified || 0
          results.aiClassification.errors = aiResult.errors || 0
          console.log(`✅ AI classified ${results.aiClassification.classified} leads`)
        }
      } catch (aiError) {
        console.error("AI classification error:", aiError)
        results.aiClassification.errors = 1
      }
    }

    // Update log entry
    await supabase
      .from('feegow_sync_logs')
      .update({
        status: results.hasMore ? 'in_progress' : 'completed',
        completed_at: results.hasMore ? null : new Date().toISOString(),
        inserted: results.patients.created,
        skipped: results.patients.skipped,
        errors: results.patients.errors,
        paid_accounts: results.hasMore ? results.nextStartPage : null,
        total_accounts: results.patients.fetched,
      })
      .eq('id', logEntry?.id)

    const message = results.hasMore 
      ? `CRON: ${results.patients.created} criados, ${results.patients.updated} atualizados. Próxima página: ${results.nextStartPage}`
      : `CRON: Sincronização completa! ${results.patients.created} criados, ${results.patients.updated} atualizados`

    console.log(`🎉 ${message}`)
    if (results.aiClassification.classified > 0) {
      console.log(`🤖 IA classificou ${results.aiClassification.classified} leads automaticamente`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: results,
        message,
        nextRun: results.hasMore ? "Continue no próximo agendamento" : "Aguardando novos pacientes",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("❌ CRON Sync error:", msg)
    
    // Update log with error
    if (logEntry?.id) {
      await supabase
        .from('feegow_sync_logs')
        .update({
          status: 'error',
          error_message: msg,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id)
    }

    return new Response(
      JSON.stringify({ success: false, error: msg, partial: results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
