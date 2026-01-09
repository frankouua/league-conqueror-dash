import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FEEGOW_BASE_URL = "https://api.feegow.com/v1/api"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const FEEGOW_API_TOKEN = Deno.env.get("FEEGOW_API_TOKEN")
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!FEEGOW_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Configurações faltando" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const feegowHeaders = { "x-access-token": FEEGOW_API_TOKEN, "Content-Type": "application/json" }

  // Parse request body
  let body: { startPage?: number; maxPages?: number; batchSize?: number } = {}
  try { body = await req.json() } catch { body = {} }
  
  // INCREMENTAL SYNC: Process limited pages per call to avoid timeout
  const startPage = body.startPage || 0
  const maxPages = body.maxPages || 10 // Process 10 pages (5000 patients) per call
  const pageSize = 500
  const batchSize = body.batchSize || 50

  const results = {
    pagesProcessed: 0,
    patients: { fetched: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
    nextStartPage: 0,
    hasMore: false,
    status: 'running',
    errorDetails: [] as string[]
  }

  try {
    console.log(`🚀 Starting Feegow incremental sync from page ${startPage}...`)

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

    console.log(`📍 Pipeline: ${feegowPipeline.id}, Stage: ${novoStage.id}`)

    // Process pages incrementally
    let currentPage = startPage
    let pagesProcessed = 0

    while (pagesProcessed < maxPages) {
      const start = currentPage * pageSize
      const url = `${FEEGOW_BASE_URL}/patient/list?start=${start}&offset=${pageSize}`
      
      console.log(`📥 Fetching page ${currentPage + 1} (start=${start})...`)
      
      const response = await fetch(url, { method: "GET", headers: feegowHeaders })
      const data = await response.json()

      if (!data.success || !Array.isArray(data.content)) {
        console.error("Error fetching page:", data)
        results.errorDetails.push(`Page ${currentPage + 1}: ${data.message || 'Unknown error'}`)
        break
      }

      const patients = data.content
      console.log(`   Page ${currentPage + 1}: ${patients.length} patients`)

      if (patients.length === 0) {
        console.log("✅ No more patients - sync complete!")
        results.hasMore = false
        break
      }

      results.patients.fetched += patients.length

      // Process this page's patients immediately
      const toCreate: any[] = []
      const toUpdate: { id: string; data: any }[] = []
      
      // Get existing leads for this batch - use patient_id (correct field name)
      const feegowIds = patients
        .filter((p: any) => p.patient_id)
        .map((p: any) => String(p.patient_id))
      
      const { data: existingLeads } = await supabase
        .from('crm_leads')
        .select('id, feegow_id')
        .in('feegow_id', feegowIds)
      
      const existingMap = new Map((existingLeads || []).map(l => [l.feegow_id, l.id]))

      for (const p of patients) {
        // Use patient_id instead of paciente_id
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
          cpf: null, // CPF not in list endpoint
          prontuario: feegowId,
          feegow_id: feegowId,
          feegow_data: {
            patient_id: p.patient_id,
            nascimento: p.nascimento,
            sexo_id: p.sexo_id,
            bairro: p.bairro,
            nome_social: p.nome_social,
            criado_em: p.criado_em,
            alterado_em: p.alterado_em,
          },
          last_feegow_sync: new Date().toISOString(),
          source: 'feegow',
          source_detail: 'Importação Feegow',
        }

        if (existingMap.has(feegowId)) {
          toUpdate.push({ id: existingMap.get(feegowId)!, data: leadData })
        } else {
          toCreate.push({
            ...leadData,
            pipeline_id: feegowPipeline.id,
            stage_id: novoStage.id,
            created_by: '00000000-0000-0000-0000-000000000000', // System user
          })
        }
      }

      // Insert new leads in batches
      for (let i = 0; i < toCreate.length; i += batchSize) {
        const batch = toCreate.slice(i, i + batchSize)
        const { error } = await supabase.from('crm_leads').insert(batch)
        
        if (error) {
          console.error(`❌ Insert batch error:`, error.message)
          results.patients.errors += batch.length
          results.errorDetails.push(`Insert: ${error.message}`)
        } else {
          results.patients.created += batch.length
        }
      }

      // Update existing leads
      for (const { id, data } of toUpdate) {
        const { error } = await supabase.from('crm_leads').update(data).eq('id', id)
        if (error) {
          results.patients.errors++
        } else {
          results.patients.updated++
        }
      }

      console.log(`✅ Page ${currentPage + 1} done: ${toCreate.length} created, ${toUpdate.length} updated`)

      currentPage++
      pagesProcessed++
      results.pagesProcessed++

      // Check if more pages exist
      if (patients.length < pageSize) {
        results.hasMore = false
        break
      } else {
        results.hasMore = true
        results.nextStartPage = currentPage
      }

      // Small delay for rate limiting
      await new Promise(r => setTimeout(r, 100))
    }

    results.status = results.patients.errors > 0 ? 'completed_with_errors' : 'completed'

    const message = results.hasMore 
      ? `Progresso: ${results.patients.created} criados, ${results.patients.updated} atualizados. Continue com startPage=${results.nextStartPage}`
      : `Sincronização completa: ${results.patients.created} criados, ${results.patients.updated} atualizados`

    console.log(`🎉 ${message}`)

    return new Response(
      JSON.stringify({
        success: true,
        summary: results,
        message,
        continueWith: results.hasMore ? { startPage: results.nextStartPage, maxPages } : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("❌ Sync error:", msg)
    
    return new Response(
      JSON.stringify({ success: false, error: msg, partial: results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
