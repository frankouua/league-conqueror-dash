import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-migrate-key',
}

// Chave secreta para proteger a função
const MIGRATE_SECRET = 'unique-migration-2025-secure-key'

// Ordem de migração (respeitando foreign keys)
const MIGRATION_ORDER = [
  'teams',
  'profiles',
  'user_roles',
  'crm_pipelines',
  'crm_stages',
  'crm_lost_reasons',
  'crm_automations',
  'crm_cadences',
  'crm_surgery_checklist',
  'predefined_goals',
  'department_goals',
  'individual_goals',
  'campaigns',
  'campaign_actions',
  'campaign_materials',
  'announcements',
  'rfv_customers',
  'patient_data',
  'contacts',
  'crm_leads',
  'crm_lead_history',
  'crm_lead_interactions',
  'crm_tasks',
  'crm_lead_tasks',
  'crm_notifications',
  'notifications',
  'revenue_records',
  'executed_records',
  'nps_records',
  'testimonial_records',
  'referral_records',
  'referral_leads',
  'cancellations',
  'user_achievements',
  'protocol_suggestions',
  'protocols',
  'recurrent_procedures',
  'lead_recurrence_history',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verificar chave de segurança
    const migrateKey = req.headers.get('x-migrate-key')
    if (migrateKey !== MIGRATE_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid migrate key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const tableName = url.searchParams.get('table')
    const allTables = url.searchParams.get('all') === 'true'
    const limit = parseInt(url.searchParams.get('limit') || '1000')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const dryRun = url.searchParams.get('dry_run') === 'true'

    // Cliente SOURCE (Lovable Cloud)
    const sourceUrl = Deno.env.get('SUPABASE_URL')!
    const sourceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sourceClient = createClient(sourceUrl, sourceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Cliente DESTINATION (Supabase externo)
    const destUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const destKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')

    if (!destUrl || !destKey) {
      return new Response(
        JSON.stringify({ 
          error: 'External Supabase credentials not configured',
          required: ['EXTERNAL_SUPABASE_URL', 'EXTERNAL_SUPABASE_SERVICE_KEY']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const destClient = createClient(destUrl, destKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const results: Record<string, any> = {}
    const errors: string[] = []
    const tablesToMigrate = allTables ? MIGRATION_ORDER : (tableName ? [tableName] : [])

    if (tablesToMigrate.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No table specified',
          usage: '?table=TABLE_NAME or ?all=true',
          available_tables: MIGRATION_ORDER
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const table of tablesToMigrate) {
      console.log(`Migrating table: ${table}`)
      
      try {
        // Buscar dados da origem
        const { data: sourceData, error: sourceError, count } = await sourceClient
          .from(table)
          .select('*', { count: 'exact' })
          .range(offset, offset + limit - 1)

        if (sourceError) {
          errors.push(`${table}: Error reading - ${sourceError.message}`)
          results[table] = { status: 'error', error: sourceError.message }
          continue
        }

        if (!sourceData || sourceData.length === 0) {
          results[table] = { status: 'empty', count: 0 }
          continue
        }

        if (dryRun) {
          results[table] = { 
            status: 'dry_run', 
            would_migrate: sourceData.length,
            total: count,
            sample: sourceData.slice(0, 2)
          }
          continue
        }

        // Inserir no destino usando upsert
        const { data: insertedData, error: insertError } = await destClient
          .from(table)
          .upsert(sourceData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select()

        if (insertError) {
          errors.push(`${table}: Error inserting - ${insertError.message}`)
          results[table] = { 
            status: 'partial_error', 
            error: insertError.message,
            source_count: sourceData.length
          }
        } else {
          results[table] = { 
            status: 'success', 
            migrated: sourceData.length,
            total: count,
            has_more: (offset + limit) < (count || 0)
          }
        }

      } catch (tableError) {
        const errorMsg = tableError instanceof Error ? tableError.message : String(tableError)
        errors.push(`${table}: ${errorMsg}`)
        results[table] = { status: 'error', error: errorMsg }
      }
    }

    const successCount = Object.values(results).filter((r: any) => r.status === 'success').length
    const errorCount = Object.values(results).filter((r: any) => r.status === 'error' || r.status === 'partial_error').length

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        summary: {
          tables_processed: tablesToMigrate.length,
          successful: successCount,
          errors: errorCount,
          dry_run: dryRun
        },
        results,
        errors: errors.length > 0 ? errors : undefined,
        migrated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
