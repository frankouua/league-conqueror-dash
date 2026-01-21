import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-export-key',
}

// Lista de tabelas permitidas para exportação
const ALLOWED_TABLES = [
  'teams',
  'profiles',
  'user_roles',
  'predefined_goals',
  'revenue_records',
  'executed_records',
  'nps_records',
  'testimonial_records',
  'referral_records',
  'other_indicators',
  'campaigns',
  'campaign_actions',
  'campaign_materials',
  'announcements',
  'announcement_reads',
  'rfv_customers',
  'referral_leads',
  'cancellations',
  'contestations',
  'automation_logs',
  'user_achievements',
  'department_goals',
  'individual_goals',
  'crm_pipelines',
  'crm_stages',
  'crm_leads',
  'crm_lead_history',
  'crm_lead_interactions',
  'crm_tasks',
  'crm_lead_tasks',
  'notifications',
  'crm_notifications',
  'crm_automations',
  'crm_cadences',
  'crm_cadence_steps',
  'crm_lead_cadences',
  'crm_lost_reasons',
  'crm_surgery_checklists',
  'crm_lead_surgery_checklist',
  'crm_whatsapp_connections',
  'crm_whatsapp_messages',
  'patient_data',
  'protocol_templates',
  'protocol_suggestions',
  'training_materials',
  'training_tracks',
  'training_quizzes',
  'training_progress',
  'calendar_events',
  'calendar_event_invitations',
  'gamification_points',
  'gamification_levels',
  'gamification_badges',
  'user_badges',
  'streak_records',
  'special_events',
  'prizes',
  'prize_history',
  'import_logs',
  'import_backups',
  'action_templates',
  'action_batches',
  'action_dispatches',
  'action_responses',
  'audit_log',
  'ai_conversations',
  'ai_messages',
]

// Chave secreta para proteger a função
const EXPORT_SECRET = 'unique-migration-2025-secure-key'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verificar chave de segurança
    const exportKey = req.headers.get('x-export-key')
    if (exportKey !== EXPORT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid export key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obter parâmetros da URL
    const url = new URL(req.url)
    const tableName = url.searchParams.get('table')
    const listTables = url.searchParams.get('list') === 'true'
    const limit = parseInt(url.searchParams.get('limit') || '10000')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Se pediu lista de tabelas
    if (listTables) {
      return new Response(
        JSON.stringify({ 
          tables: ALLOWED_TABLES,
          total: ALLOWED_TABLES.length 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar nome da tabela
    if (!tableName) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing table parameter',
          usage: '?table=TABLE_NAME or ?list=true to see available tables',
          example: '?table=profiles'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!ALLOWED_TABLES.includes(tableName)) {
      return new Response(
        JSON.stringify({ 
          error: `Table '${tableName}' not allowed`,
          allowed_tables: ALLOWED_TABLES
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log(`Exporting table: ${tableName}, limit: ${limit}, offset: ${offset}`)

    // Buscar dados da tabela
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error(`Error fetching ${tableName}:`, error)
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch data from ${tableName}`,
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Exported ${data?.length || 0} rows from ${tableName}`)

    return new Response(
      JSON.stringify({
        table: tableName,
        data: data || [],
        count: data?.length || 0,
        total: count,
        offset,
        limit,
        has_more: (offset + limit) < (count || 0),
        exported_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
