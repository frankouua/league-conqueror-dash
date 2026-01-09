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
  let body: { batchSize?: number } = {}
  try { body = await req.json() } catch { body = {} }
  const batchSize = body.batchSize || 100

  const results = {
    patients: { fetched: 0, created: 0, updated: 0, errors: 0 },
    status: 'running',
    errorDetails: [] as string[]
  }

  try {
    console.log("🚀 Starting Feegow sync...")

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

    console.log(`📍 Pipeline FEEGOW: ${feegowPipeline.id}, Stage: ${novoStage.id}`)

    // Get existing leads with feegow_id
    const { data: existingLeads } = await supabase
      .from('crm_leads')
      .select('id, feegow_id')
      .not('feegow_id', 'is', null)

    const existingMap = new Map((existingLeads || []).map(l => [l.feegow_id, l.id]))
    console.log(`📊 Found ${existingMap.size} existing Feegow leads in CRM`)

    // Fetch ALL patients from Feegow with pagination
    let allPatients: any[] = []
    let start = 0
    const pageSize = 500
    let hasMore = true
    let pageCount = 0

    console.log("📥 Fetching patients from Feegow...")

    while (hasMore) {
      const url = `${FEEGOW_BASE_URL}/patient/list?start=${start}&offset=${pageSize}`
      const response = await fetch(url, { method: "GET", headers: feegowHeaders })
      const data = await response.json()

      if (!data.success || !Array.isArray(data.content)) {
        console.error("Error fetching page:", data)
        break
      }

      const patients = data.content
      console.log(`   Page ${++pageCount}: ${patients.length} patients`)

      if (patients.length === 0) {
        hasMore = false
      } else {
        allPatients.push(...patients)
        start += pageSize
        if (patients.length < pageSize) hasMore = false
        
        // Rate limiting protection
        await new Promise(r => setTimeout(r, 50))
      }
    }

    results.patients.fetched = allPatients.length
    console.log(`✅ Total fetched: ${allPatients.length} patients`)

    // Process patients in batches
    const toCreate: any[] = []
    const toUpdate: { id: string; data: any }[] = []

    for (const p of allPatients) {
      if (!p.paciente_id) continue

      const feegowId = String(p.paciente_id)
      const leadData = {
        name: p.nome || 'Sem nome',
        email: p.email || null,
        phone: p.telefone || p.celular || null,
        whatsapp: p.celular || p.telefone || null,
        cpf: p.cpf || null,
        prontuario: p.prontuario || feegowId,
        feegow_id: feegowId,
        feegow_data: {
          paciente_id: p.paciente_id,
          data_nascimento: p.data_nascimento,
          sexo: p.sexo,
          endereco: p.endereco,
          cidade: p.cidade,
          estado: p.estado,
          cep: p.cep,
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
        })
      }
    }

    console.log(`📝 To create: ${toCreate.length}, To update: ${toUpdate.length}`)

    // Insert new leads in batches
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize)
      const { error } = await supabase.from('crm_leads').insert(batch)
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize)+1} error:`, error.message)
        results.patients.errors += batch.length
        results.errorDetails.push(`Insert batch ${Math.floor(i/batchSize)+1}: ${error.message}`)
      } else {
        results.patients.created += batch.length
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize)+1}: ${batch.length} leads`)
      }
    }

    // Update existing leads in batches
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize)
      let batchUpdated = 0
      
      for (const { id, data } of batch) {
        const { error } = await supabase.from('crm_leads').update(data).eq('id', id)
        if (error) {
          results.patients.errors++
        } else {
          batchUpdated++
        }
      }
      
      results.patients.updated += batchUpdated
      console.log(`✅ Updated batch ${Math.floor(i/batchSize)+1}: ${batchUpdated} leads`)
    }

    results.status = results.patients.errors > 0 ? 'completed_with_errors' : 'completed'

    console.log(`🎉 Sync completed: ${results.patients.created} created, ${results.patients.updated} updated, ${results.patients.errors} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        summary: results,
        message: `Sincronização concluída: ${results.patients.created} novos, ${results.patients.updated} atualizados`
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
