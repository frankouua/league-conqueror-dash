import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FEEGOW_BASE_URL = "https://api.feegow.com/v1/api"

interface FeegowPatient {
  paciente_id: number
  nome: string
  email?: string
  telefone?: string
  celular?: string
  cpf?: string
  data_nascimento?: string
  prontuario?: string
  sexo?: string
  endereco?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const FEEGOW_API_TOKEN = Deno.env.get("FEEGOW_API_TOKEN")
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!FEEGOW_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Configurações faltando (FEEGOW_API_TOKEN, SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const headers = {
    "x-access-token": FEEGOW_API_TOKEN,
    "Content-Type": "application/json",
  }

  // Obter parâmetros
  let body: { fullSync?: boolean; limit?: number } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const fullSync = body.fullSync !== false
  const limit = body.limit || 10000 // Limite de segurança

  const syncLog = {
    sync_type: fullSync ? 'full' : 'incremental',
    total_fetched: 0,
    total_created: 0,
    total_updated: 0,
    total_errors: 0,
    error_details: [] as string[],
    status: 'running'
  }

  // Criar log de sincronização
  const { data: logEntry, error: logError } = await supabase
    .from('feegow_sync_logs')
    .insert({ 
      sync_type: syncLog.sync_type,
      status: 'running'
    })
    .select()
    .single()

  if (logError) {
    console.error("Error creating sync log:", logError)
  }

  try {
    console.log("Starting Feegow sync...")

    // Obter pipeline FEEGOW e estágio inicial
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
      .eq('name', 'Novo')
      .single()

    if (!novoStage) {
      throw new Error("Estágio 'Novo' não encontrado na pipeline FEEGOW")
    }

    // Obter leads existentes com feegow_id
    const { data: existingLeads } = await supabase
      .from('crm_leads')
      .select('id, feegow_id')
      .not('feegow_id', 'is', null)

    const existingFeegowIds = new Set(
      (existingLeads || []).map(l => l.feegow_id).filter(Boolean)
    )
    console.log(`Found ${existingFeegowIds.size} existing Feegow leads in CRM`)

    // Buscar TODOS os pacientes do Feegow com paginação
    let allPatients: FeegowPatient[] = []
    let start = 0
    const offset = 500 // Buscar 500 por vez (máximo permitido)
    let hasMore = true
    let pageCount = 0

    console.log("Fetching all patients from Feegow...")

    while (hasMore && allPatients.length < limit) {
      const url = `${FEEGOW_BASE_URL}/patient/list?start=${start}&offset=${offset}`
      console.log(`Fetching page ${pageCount + 1}: start=${start}`)
      
      const response = await fetch(url, { method: "GET", headers })
      const data = await response.json()

      if (!data.success || !Array.isArray(data.content)) {
        console.error("Error fetching patients:", data)
        if (pageCount === 0) {
          throw new Error(`Erro ao buscar pacientes do Feegow: ${data.message || 'Unknown error'}`)
        }
        break
      }

      const patients = data.content as FeegowPatient[]
      console.log(`Page ${pageCount + 1}: Retrieved ${patients.length} patients`)

      if (patients.length === 0) {
        hasMore = false
      } else {
        allPatients = [...allPatients, ...patients]
        start += offset
        pageCount++

        // Se retornou menos que o offset, não há mais páginas
        if (patients.length < offset) {
          hasMore = false
        }

        // Pequeno delay para evitar rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    syncLog.total_fetched = allPatients.length
    console.log(`Total patients fetched from Feegow: ${allPatients.length}`)

    // Processar pacientes em batches
    const batchSize = 50
    const leadsToCreate: any[] = []
    const leadsToUpdate: { id: string; data: any }[] = []

    for (const patient of allPatients) {
      // Skip patients without paciente_id
      if (!patient.paciente_id) {
        console.warn("Skipping patient without paciente_id:", patient.nome)
        continue
      }
      
      const feegowId = patient.paciente_id.toString()
      
      // Dados formatados para o CRM
      const leadData = {
        name: patient.nome || 'Sem nome',
        email: patient.email || null,
        phone: patient.telefone || patient.celular || null,
        whatsapp: patient.celular || patient.telefone || null,
        cpf: patient.cpf || null,
        prontuario: patient.prontuario || feegowId,
        feegow_id: feegowId,
        feegow_data: {
          paciente_id: patient.paciente_id,
          data_nascimento: patient.data_nascimento,
          sexo: patient.sexo,
          endereco: patient.endereco,
          numero: patient.numero,
          bairro: patient.bairro,
          cidade: patient.cidade,
          estado: patient.estado,
          cep: patient.cep,
          observacoes: patient.observacoes,
        },
        last_feegow_sync: new Date().toISOString(),
        source: 'feegow',
        source_detail: 'Importação automática Feegow',
      }

      if (existingFeegowIds.has(feegowId)) {
        // Encontrar o lead existente para atualizar
        const existingLead = existingLeads?.find(l => l.feegow_id === feegowId)
        if (existingLead) {
          leadsToUpdate.push({ id: existingLead.id, data: leadData })
        }
      } else {
        // Novo lead - adicionar pipeline e stage
        leadsToCreate.push({
          ...leadData,
          pipeline_id: feegowPipeline.id,
          stage_id: novoStage.id,
        })
      }
    }

    console.log(`To create: ${leadsToCreate.length}, To update: ${leadsToUpdate.length}`)

    // Inserir novos leads em batches
    for (let i = 0; i < leadsToCreate.length; i += batchSize) {
      const batch = leadsToCreate.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('crm_leads')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError)
        syncLog.total_errors += batch.length
        syncLog.error_details.push(`Batch ${i / batchSize + 1}: ${insertError.message}`)
      } else {
        syncLog.total_created += batch.length
      }
    }

    // Atualizar leads existentes
    for (const { id, data } of leadsToUpdate) {
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update(data)
        .eq('id', id)

      if (updateError) {
        console.error(`Error updating lead ${id}:`, updateError)
        syncLog.total_errors++
        syncLog.error_details.push(`Update ${id}: ${updateError.message}`)
      } else {
        syncLog.total_updated++
      }
    }

    syncLog.status = syncLog.total_errors > 0 ? 'completed_with_errors' : 'completed'

    // Atualizar log de sincronização
    if (logEntry) {
      await supabase
        .from('feegow_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          total_fetched: syncLog.total_fetched,
          total_created: syncLog.total_created,
          total_updated: syncLog.total_updated,
          total_errors: syncLog.total_errors,
          error_details: syncLog.error_details.length > 0 ? { errors: syncLog.error_details } : null,
          status: syncLog.status
        })
        .eq('id', logEntry.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_fetched: syncLog.total_fetched,
          total_created: syncLog.total_created,
          total_updated: syncLog.total_updated,
          total_errors: syncLog.total_errors,
          status: syncLog.status,
        },
        message: `Sincronização concluída: ${syncLog.total_created} novos, ${syncLog.total_updated} atualizados, ${syncLog.total_errors} erros`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Sync error:", error)

    // Atualizar log com erro
    if (logEntry) {
      await supabase
        .from('feegow_sync_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_details: { error: errorMessage }
        })
        .eq('id', logEntry.id)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        partial_results: syncLog
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
