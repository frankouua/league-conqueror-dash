// Edge Function: process-sales-upload
// Purpose: Process sales spreadsheet data in background (job pattern)
// This runs asynchronously so the frontend can return immediately

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.88.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface ParsedSale {
  date: string;
  department: string;
  procedure: string;
  clientName: string;
  clientCpf: string;
  clientEmail: string;
  clientPhone: string;
  clientProntuario: string;
  sellerName: string;
  amountSold: number;
  amountPaid: number;
  matchedUserId: string | null;
  matchedTeamId: string | null;
  matchedTeamName: string | null;
  status: 'matched' | 'unmatched' | 'error';
  paymentStatus?: string;
}

interface JobPayload {
  jobId: string;
  uploadType: 'vendas' | 'executado';
  importMode: 'replace' | 'add_new';
  sales: ParsedSale[];
  fileName: string;
  sheetName: string;
  uploadedBy: string;
  uploadedByName: string;
}

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function updateJobStatus(
  supabase: AnySupabaseClient,
  jobId: string,
  status: string,
  progress: number,
  details?: Record<string, unknown>
) {
  await supabase
    .from('upload_jobs')
    .update({
      status,
      progress,
      updated_at: new Date().toISOString(),
      ...details,
    })
    .eq('id', jobId)
}

async function processJob(payload: JobPayload) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { jobId, uploadType, importMode, sales, fileName, sheetName, uploadedBy, uploadedByName } = payload

  console.log(`[process-sales-upload] Starting job ${jobId} with ${sales.length} records`)

  try {
    await updateJobStatus(supabase, jobId, 'processing', 5)

    const tableName = uploadType === 'vendas' ? 'revenue_records' : 'executed_records'

    // Get a fallback admin profile for unmatched sales
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('user_id, team_id')
      .not('team_id', 'is', null)
      .limit(1)
      .maybeSingle()

    const defaultUserId = adminProfile?.user_id || uploadedBy
    const defaultTeamId = adminProfile?.team_id

    if (!defaultUserId || !defaultTeamId) {
      await updateJobStatus(supabase, jobId, 'failed', 0, {
        error_message: 'Não foi possível determinar usuário/time padrão',
      })
      return
    }

    // Prepare sales with fallback mappings
    const validSales = sales
      .filter(s => s.date)
      .map(sale => ({
        ...sale,
        matchedUserId: sale.matchedUserId || defaultUserId,
        matchedTeamId: sale.matchedTeamId || defaultTeamId,
      }))

    if (validSales.length === 0) {
      await updateJobStatus(supabase, jobId, 'failed', 0, {
        error_message: 'Nenhuma venda com data válida',
      })
      return
    }

    await updateJobStatus(supabase, jobId, 'processing', 10)

    // Fetch locked periods
    const { data: lockedPeriods } = await supabase
      .from('period_locks')
      .select('month, year, record_type')
      .eq('locked', true)

    // Filter out locked periods
    let lockedSkipped = 0
    const unlockedSales = validSales.filter(sale => {
      if (!sale.date) return true
      const saleDate = new Date(sale.date)
      const saleMonth = saleDate.getMonth() + 1
      const saleYear = saleDate.getFullYear()

      // deno-lint-ignore no-explicit-any
      const isLocked = lockedPeriods?.some((lock: any) =>
        lock.month === saleMonth &&
        lock.year === saleYear &&
        (lock.record_type === 'all' || lock.record_type === uploadType)
      )

      if (isLocked) {
        lockedSkipped++
        return false
      }
      return true
    })

    if (unlockedSales.length === 0) {
      await updateJobStatus(supabase, jobId, 'failed', 0, {
        error_message: 'Todos os registros estão em períodos travados',
        locked_skipped: lockedSkipped,
      })
      return
    }

    // Calculate date range
    const dates = unlockedSales.map(s => s.date).filter(Boolean).sort()
    const dateRangeStart = dates[0]
    const dateRangeEnd = dates[dates.length - 1]

    await updateJobStatus(supabase, jobId, 'processing', 15)

    // Handle replace mode - delete existing records
    let deleted = 0
    if (importMode === 'replace' && dateRangeStart && dateRangeEnd) {
      const userIds = [...new Set(unlockedSales.map(s => s.matchedUserId).filter(Boolean))]

      const { data: deletedData } = await supabase
        .from(tableName)
        .delete()
        .gte('date', dateRangeStart)
        .lte('date', dateRangeEnd)
        .in('attributed_to_user_id', userIds)
        .select('id')

      deleted = deletedData?.length || 0
      console.log(`[process-sales-upload] Deleted ${deleted} existing records`)
    }

    await updateJobStatus(supabase, jobId, 'processing', 20)

    // Calculate totals
    const totalRevenueSold = unlockedSales.reduce((sum, s) => sum + s.amountSold, 0)
    const totalRevenuePaid = unlockedSales.reduce((sum, s) => sum + s.amountPaid, 0)

    // Create upload log
    const { data: uploadLogData, error: uploadLogError } = await supabase
      .from('sales_upload_logs')
      .insert({
        uploaded_by: uploadedBy,
        uploaded_by_name: uploadedByName,
        file_name: fileName,
        sheet_name: sheetName,
        total_rows: sales.length,
        imported_rows: 0,
        skipped_rows: 0,
        error_rows: 0,
        total_revenue_sold: totalRevenueSold,
        total_revenue_paid: totalRevenuePaid,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
        status: 'processing',
        upload_type: uploadType,
      })
      .select('id')
      .single()

    if (uploadLogError || !uploadLogData) {
      throw new Error('Falha ao criar log de upload')
    }

    const uploadId = uploadLogData.id

    await updateJobStatus(supabase, jobId, 'processing', 25, { upload_id: uploadId })

    // Prepare records for batch insert
    // deno-lint-ignore no-explicit-any
    const recordsToInsert: any[] = []
    let skipped = 0

    if (importMode === 'add_new') {
      // Check for duplicates
      const userIds = [...new Set(unlockedSales.map(s => s.matchedUserId).filter(Boolean))]

      const { data: existingRecords } = await supabase
        .from(tableName)
        .select('date, attributed_to_user_id, amount')
        .gte('date', dateRangeStart)
        .lte('date', dateRangeEnd)
        .in('attributed_to_user_id', userIds)

      const existingKeys = new Set(
        // deno-lint-ignore no-explicit-any
        (existingRecords || []).map((r: any) => `${r.date}|${r.attributed_to_user_id}|${r.amount}`)
      )

      for (const sale of unlockedSales) {
        const primaryAmount = sale.amountSold > 0 ? sale.amountSold : sale.amountPaid
        const key = `${sale.date}|${sale.matchedUserId}|${primaryAmount}`

        if (existingKeys.has(key)) {
          skipped++
          continue
        }

        recordsToInsert.push(buildRecord(sale, uploadId))
      }
    } else {
      // Replace mode - insert all
      for (const sale of unlockedSales) {
        recordsToInsert.push(buildRecord(sale, uploadId))
      }
    }

    await updateJobStatus(supabase, jobId, 'processing', 35)

    // Batch insert with progress updates
    const BATCH_SIZE = 500
    let success = 0
    let failed = 0

    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE)

      const { data: insertedData, error } = await supabase.from(tableName).insert(batch).select('id')

      if (error) {
        console.error(`[process-sales-upload] Batch error:`, error)
        failed += batch.length
      } else {
        success += insertedData?.length || batch.length
      }

      // Update progress (35% to 85%)
      const progressPercent = 35 + Math.round(((i + batch.length) / recordsToInsert.length) * 50)
      await updateJobStatus(supabase, jobId, 'processing', progressPercent, {
        imported_rows: success,
        failed_rows: failed,
      })
    }

    console.log(`[process-sales-upload] Inserted ${success} records, ${failed} failed, ${skipped} skipped`)

    // Update upload log
    await supabase
      .from('sales_upload_logs')
      .update({
        imported_rows: success,
        skipped_rows: skipped + lockedSkipped,
        error_rows: failed,
        status: 'completed',
      })
      .eq('id', uploadId)

    await updateJobStatus(supabase, jobId, 'processing', 90)

    // Update RFV customers (only for vendas)
    if (uploadType === 'vendas') {
      console.log(`[process-sales-upload] Starting RFV update...`)
      await updateRFVCustomers(supabase, unlockedSales, uploadedBy)
    }

    // Complete
    await updateJobStatus(supabase, jobId, 'completed', 100, {
      imported_rows: success,
      failed_rows: failed,
      skipped_rows: skipped + lockedSkipped,
      deleted_rows: deleted,
      completed_at: new Date().toISOString(),
    })

    console.log(`[process-sales-upload] Job ${jobId} completed successfully`)
  } catch (error) {
    console.error(`[process-sales-upload] Job ${jobId} failed:`, error)
    await updateJobStatus(supabase, jobId, 'failed', 0, {
      error_message: error instanceof Error ? error.message : 'Erro desconhecido',
    })
  }
}

// deno-lint-ignore no-explicit-any
function buildRecord(sale: ParsedSale, uploadId: string): any {
  const primaryAmount = sale.amountSold > 0 ? sale.amountSold : sale.amountPaid

  const noteParts: string[] = []
  if (sale.clientName) noteParts.push(`Cliente: ${sale.clientName}`)
  if (sale.procedure) noteParts.push(`Procedimento: ${sale.procedure}`)
  if (sale.amountPaid > 0 && sale.amountSold !== sale.amountPaid) {
    noteParts.push(`Recebido: R$ ${sale.amountPaid.toLocaleString('pt-BR')}`)
  }
  const notes = noteParts.length > 0 ? noteParts.join(' | ') : null

  return {
    date: sale.date,
    amount: primaryAmount,
    notes,
    department: sale.department || null,
    procedure_name: sale.procedure || null,
    patient_name: sale.clientName || null,
    patient_cpf: sale.clientCpf?.replace(/\D/g, '') || null,
    patient_prontuario: sale.clientProntuario || null,
    patient_email: sale.clientEmail || null,
    patient_phone: sale.clientPhone || null,
    user_id: sale.matchedUserId!,
    team_id: sale.matchedTeamId!,
    attributed_to_user_id: sale.matchedUserId,
    counts_for_individual: true,
    registered_by_admin: !sale.sellerName || sale.status === 'unmatched',
    upload_id: uploadId,
  }
}

async function updateRFVCustomers(
  supabase: AnySupabaseClient,
  sales: ParsedSale[],
  createdBy: string
) {
  // Group by client
  const clientSales: Record<
    string,
    {
      dates: string[]
      amounts: number[]
      name: string
      cpf: string
      email: string
      phone: string
      prontuario: string
    }
  > = {}

  for (const sale of sales) {
    if (!sale.clientName && !sale.clientCpf && !sale.clientProntuario) continue

    const key = sale.clientProntuario
      ? `pront_${sale.clientProntuario.trim()}`
      : sale.clientCpf
        ? sale.clientCpf.replace(/\D/g, '')
        : sale.clientName.toLowerCase().trim()

    if (!clientSales[key]) {
      clientSales[key] = {
        dates: [],
        amounts: [],
        name: sale.clientName,
        cpf: sale.clientCpf,
        email: sale.clientEmail,
        phone: sale.clientPhone,
        prontuario: sale.clientProntuario,
      }
    }
    clientSales[key].dates.push(sale.date)
    const amount = sale.amountSold > 0 ? sale.amountSold : sale.amountPaid
    clientSales[key].amounts.push(amount)

    // Update contact info
    if (sale.clientCpf && !clientSales[key].cpf) clientSales[key].cpf = sale.clientCpf
    if (sale.clientEmail && !clientSales[key].email) clientSales[key].email = sale.clientEmail
    if (sale.clientPhone && !clientSales[key].phone) clientSales[key].phone = sale.clientPhone
    if (sale.clientName && !clientSales[key].name) clientSales[key].name = sale.clientName
    if (sale.clientProntuario && !clientSales[key].prontuario)
      clientSales[key].prontuario = sale.clientProntuario
  }

  const entries = Object.entries(clientSales)
  if (entries.length === 0) return

  const now = new Date()

  try {
    // Fetch all existing customers in ONE query
    const prontuarios = entries.filter(([_, d]) => d.prontuario).map(([_, d]) => d.prontuario.trim())
    const cpfs = entries.filter(([_, d]) => d.cpf).map(([_, d]) => d.cpf.replace(/\D/g, ''))
    const names = entries.filter(([_, d]) => d.name).map(([_, d]) => d.name.toLowerCase().trim())

    const orConditions: string[] = []
    if (prontuarios.length > 0) orConditions.push(`prontuario.in.(${prontuarios.map(p => `"${p}"`).join(',')})`)
    if (cpfs.length > 0) orConditions.push(`cpf.in.(${cpfs.map(c => `"${c}"`).join(',')})`)
    if (names.length > 0) orConditions.push(`name.in.(${names.map(n => `"${n}"`).join(',')})`)

    const { data: existingCustomers } = await supabase
      .from('rfv_customers')
      .select('*')
      .or(orConditions.join(','))

    // Build lookup maps
    // deno-lint-ignore no-explicit-any
    const byProntuario = new Map<string, any>()
    // deno-lint-ignore no-explicit-any
    const byCpf = new Map<string, any>()
    // deno-lint-ignore no-explicit-any
    const byName = new Map<string, any>()

    // deno-lint-ignore no-explicit-any
    for (const cust of (existingCustomers || []) as any[]) {
      if (cust.prontuario) byProntuario.set(cust.prontuario, cust)
      if (cust.cpf) byCpf.set(cust.cpf, cust)
      if (cust.name) byName.set(cust.name.toLowerCase().trim(), cust)
    }

    // deno-lint-ignore no-explicit-any
    const toInsert: any[] = []
    // deno-lint-ignore no-explicit-any
    const toUpdate: { id: string; data: any }[] = []

    for (const [clientKey, data] of entries) {
      // deno-lint-ignore no-explicit-any
      let existing: any = null

      if (data.prontuario) existing = byProntuario.get(data.prontuario.trim())
      if (!existing && data.cpf) existing = byCpf.get(data.cpf.replace(/\D/g, ''))
      if (!existing && data.name) existing = byName.get(data.name.toLowerCase().trim())

      const sortedDates = data.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      const latestDate = sortedDates[0]
      const earliestDate = sortedDates[sortedDates.length - 1]
      const totalNewAmount = data.amounts.reduce((sum, a) => sum + a, 0)
      const newPurchaseCount = data.dates.length

      if (existing) {
        const newLastPurchase =
          new Date(latestDate) > new Date(existing.last_purchase_date)
            ? latestDate
            : existing.last_purchase_date
        const newFirstPurchase =
          new Date(earliestDate) < new Date(existing.first_purchase_date)
            ? earliestDate
            : existing.first_purchase_date
        const newTotalPurchases = existing.total_purchases + newPurchaseCount
        const newTotalValue = Number(existing.total_value) + totalNewAmount
        const newAvgTicket = newTotalValue / newTotalPurchases
        const daysSince = Math.floor((now.getTime() - new Date(newLastPurchase).getTime()) / (1000 * 60 * 60 * 24))

        // deno-lint-ignore no-explicit-any
        const updateData: any = {
          last_purchase_date: newLastPurchase,
          first_purchase_date: newFirstPurchase,
          total_purchases: newTotalPurchases,
          total_value: newTotalValue,
          average_ticket: newAvgTicket,
          days_since_last_purchase: daysSince,
        }

        if (data.cpf && !existing.cpf) updateData.cpf = data.cpf.replace(/\D/g, '')
        if (data.email && !existing.email) updateData.email = data.email.toLowerCase().trim()
        if (data.phone && !existing.phone) updateData.phone = data.phone.replace(/\D/g, '')
        if (data.prontuario && !existing.prontuario) updateData.prontuario = data.prontuario.trim()

        toUpdate.push({ id: existing.id, data: updateData })
      } else {
        const daysSince = Math.floor((now.getTime() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24))
        const avgTicket = totalNewAmount / newPurchaseCount

        toInsert.push({
          name: data.name?.toLowerCase().trim() || clientKey,
          cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
          email: data.email ? data.email.toLowerCase().trim() : null,
          phone: data.phone ? data.phone.replace(/\D/g, '') : null,
          prontuario: data.prontuario ? data.prontuario.trim() : null,
          first_purchase_date: earliestDate,
          last_purchase_date: latestDate,
          total_purchases: newPurchaseCount,
          total_value: totalNewAmount,
          average_ticket: avgTicket,
          recency_score: 3,
          frequency_score: 1,
          value_score: 1,
          segment: 'potential',
          days_since_last_purchase: daysSince,
          created_by: createdBy,
        })
      }
    }

    // Batch insert
    if (toInsert.length > 0) {
      const BATCH = 200
      for (let i = 0; i < toInsert.length; i += BATCH) {
        await supabase.from('rfv_customers').insert(toInsert.slice(i, i + BATCH))
      }
      console.log(`[RFV] Inserted ${toInsert.length} new customers`)
    }

    // Batch update with parallelism
    if (toUpdate.length > 0) {
      const PARALLEL = 50
      for (let i = 0; i < toUpdate.length; i += PARALLEL) {
        const batch = toUpdate.slice(i, i + PARALLEL)
        await Promise.allSettled(
          batch.map(({ id, data }) => supabase.from('rfv_customers').update(data).eq('id', id))
        )
      }
      console.log(`[RFV] Updated ${toUpdate.length} customers`)
    }

    // Recalculate RFV scores
    await recalculateRFVScores(supabase)
  } catch (error) {
    console.error('[RFV] Error updating customers:', error)
  }
}

async function recalculateRFVScores(supabase: AnySupabaseClient) {
  const { data: allCustomers, error } = await supabase.from('rfv_customers').select('*')

  if (error || !allCustomers || allCustomers.length === 0) return

  const now = new Date()

  // deno-lint-ignore no-explicit-any
  const customersWithDays = (allCustomers as any[]).map(c => ({
    ...c,
    days_since_last_purchase: Math.floor(
      (now.getTime() - new Date(c.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }))

  const recencyValues = customersWithDays.map(c => c.days_since_last_purchase).sort((a, b) => a - b)
  const frequencyValues = customersWithDays.map(c => c.total_purchases).sort((a, b) => a - b)
  const valueValues = customersWithDays.map(c => Number(c.total_value)).sort((a, b) => a - b)

  const getQuintile = (value: number, sortedValues: number[], inverse = false): number => {
    const index = sortedValues.findIndex(v => v >= value)
    const percentile = index === -1 ? 1 : index / sortedValues.length
    const score = Math.ceil((inverse ? 1 - percentile : percentile) * 5)
    return Math.max(1, Math.min(5, score || 1))
  }

  const calculateSegment = (r: number, f: number, v: number): string => {
    if (r >= 4 && f >= 4 && v >= 4) return 'champions'
    if (r >= 3 && f >= 3 && v >= 3) return 'loyal'
    if (r >= 4 && f <= 3 && v <= 3) return 'potential'
    if (r <= 2 && f >= 3 && v >= 3) return 'at_risk'
    if (r <= 2 && f <= 2 && v >= 2 && v <= 4) return 'hibernating'
    return 'lost'
  }

  // deno-lint-ignore no-explicit-any
  const updates: { id: string; data: any }[] = []

  for (const customer of customersWithDays) {
    const recencyScore = getQuintile(customer.days_since_last_purchase, recencyValues, true)
    const frequencyScore = getQuintile(customer.total_purchases, frequencyValues)
    const valueScore = getQuintile(Number(customer.total_value), valueValues)
    const segment = calculateSegment(recencyScore, frequencyScore, valueScore)

    updates.push({
      id: customer.id,
      data: {
        days_since_last_purchase: customer.days_since_last_purchase,
        recency_score: recencyScore,
        frequency_score: frequencyScore,
        value_score: valueScore,
        segment: segment,
      },
    })
  }

  // Parallel updates
  const PARALLEL = 50
  for (let i = 0; i < updates.length; i += PARALLEL) {
    const batch = updates.slice(i, i + PARALLEL)
    await Promise.allSettled(
      batch.map(({ id, data }) => supabase.from('rfv_customers').update(data).eq('id', id))
    )
  }

  console.log(`[RFV] Recalculated scores for ${allCustomers.length} customers`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Validate JWT
    const authHeader = req.headers.get('authorization') || ''
    const jwt = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

    if (!jwt) {
      return jsonResponse(401, { error: 'Unauthorized' })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse(401, { error: 'Unauthorized' })
    }

    const body = await req.json()
    const { uploadType, importMode, sales, fileName, sheetName, uploadedByName } = body

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return jsonResponse(400, { error: 'No sales data provided' })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Create job record
    const { data: jobData, error: jobError } = await adminClient
      .from('upload_jobs')
      .insert({
        user_id: userData.user.id,
        upload_type: uploadType,
        import_mode: importMode,
        file_name: fileName,
        total_rows: sales.length,
        status: 'queued',
        progress: 0,
      })
      .select('id')
      .single()

    if (jobError || !jobData) {
      console.error('[process-sales-upload] Failed to create job:', jobError)
      return jsonResponse(500, { error: 'Failed to create job' })
    }

    const jobId = jobData.id

    console.log(`[process-sales-upload] Created job ${jobId} for ${sales.length} records`)

    // Start processing in background using waitUntil
    const payload: JobPayload = {
      jobId,
      uploadType,
      importMode,
      sales,
      fileName,
      sheetName: sheetName || '',
      uploadedBy: userData.user.id,
      uploadedByName: uploadedByName || userData.user.email || 'Desconhecido',
    }

    // Use EdgeRuntime.waitUntil for background processing
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processJob(payload))
    } else {
      // Fallback: process inline (but don't await - fire and forget)
      processJob(payload).catch(err => console.error('[process-sales-upload] Background error:', err))
    }

    // Return immediately with job ID
    return jsonResponse(200, {
      success: true,
      jobId,
      message: 'Upload iniciado em background',
    })
  } catch (error) {
    console.error('[process-sales-upload] Error:', error)
    return jsonResponse(500, { error: 'Internal server error' })
  }
})
