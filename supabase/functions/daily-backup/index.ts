import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando backup diário automático...');

    const backupDate = new Date().toISOString().split('T')[0];
    const backupName = `backup_diario_${backupDate}`;

    // Verificar se já existe backup do dia
    const { data: existingBackup } = await supabase
      .from('system_backups')
      .select('id')
      .eq('backup_name', backupName)
      .single();

    if (existingBackup) {
      console.log('Backup do dia já existe:', backupName);
      return new Response(
        JSON.stringify({ success: true, message: 'Backup do dia já existe', backup_name: backupName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Coletar dados para backup
    const backupData: Record<string, unknown> = {};
    const tablesStats: Record<string, number> = {};

    // Backup de tabelas críticas (últimos 30 dias de dados)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Revenue Records
    const { data: revenueRecords, error: revenueError } = await supabase
      .from('revenue_records')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    if (!revenueError && revenueRecords) {
      backupData.revenue_records = revenueRecords;
      tablesStats.revenue_records = revenueRecords.length;
    }

    // Executed Records
    const { data: executedRecords, error: executedError } = await supabase
      .from('executed_records')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    if (!executedError && executedRecords) {
      backupData.executed_records = executedRecords;
      tablesStats.executed_records = executedRecords.length;
    }

    // CRM Leads (ativos)
    const { data: crmLeads, error: leadsError } = await supabase
      .from('crm_leads')
      .select('*')
      .not('stage_id', 'is', null);
    
    if (!leadsError && crmLeads) {
      backupData.crm_leads = crmLeads;
      tablesStats.crm_leads = crmLeads.length;
    }

    // CRM Lead History (últimos 30 dias)
    const { data: leadHistory, error: historyError } = await supabase
      .from('crm_lead_history')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    if (!historyError && leadHistory) {
      backupData.crm_lead_history = leadHistory;
      tablesStats.crm_lead_history = leadHistory.length;
    }

    // Goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*');
    
    if (!goalsError && goals) {
      backupData.goals = goals;
      tablesStats.goals = goals.length;
    }

    // Team Scores (mês atual)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const { data: teamScores, error: scoresError } = await supabase
      .from('team_scores')
      .select('*')
      .eq('month', currentMonth)
      .eq('year', currentYear);
    
    if (!scoresError && teamScores) {
      backupData.team_scores = teamScores;
      tablesStats.team_scores = teamScores.length;
    }

    // Profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (!profilesError && profiles) {
      backupData.profiles = profiles;
      tablesStats.profiles = profiles.length;
    }

    // Teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*');
    
    if (!teamsError && teams) {
      backupData.teams = teams;
      tablesStats.teams = teams.length;
    }

    // Cancellations
    const { data: cancellations, error: cancellationsError } = await supabase
      .from('cancellations')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    if (!cancellationsError && cancellations) {
      backupData.cancellations = cancellations;
      tablesStats.cancellations = cancellations.length;
    }

    // RFV Matrix
    const { data: rfvMatrix, error: rfvError } = await supabase
      .from('rfv_matrix')
      .select('*');
    
    if (!rfvError && rfvMatrix) {
      backupData.rfv_matrix = rfvMatrix;
      tablesStats.rfv_matrix = rfvMatrix.length;
    }

    // Calcular tamanho aproximado do backup
    const backupSize = JSON.stringify(backupData).length;
    const sizeInMB = (backupSize / (1024 * 1024)).toFixed(2);

    // Salvar backup
    const { data: newBackup, error: backupError } = await supabase
      .from('system_backups')
      .insert({
        backup_name: backupName,
        backup_type: 'automatic_daily',
        backup_data: backupData,
        tables_included: Object.keys(tablesStats),
        records_count: Object.values(tablesStats).reduce((a, b) => a + b, 0),
        size_bytes: backupSize,
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          tables_stats: tablesStats,
          size_mb: sizeInMB,
          backup_period: {
            start: thirtyDaysAgo.toISOString(),
            end: new Date().toISOString()
          }
        }
      })
      .select()
      .single();

    if (backupError) {
      console.error('Erro ao salvar backup:', backupError);
      throw backupError;
    }

    // Limpar backups antigos (manter últimos 30 dias)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    const { error: deleteError } = await supabase
      .from('system_backups')
      .delete()
      .lt('created_at', thirtyDaysAgoStr)
      .eq('backup_type', 'automatic_daily');

    if (deleteError) {
      console.warn('Erro ao limpar backups antigos:', deleteError);
    }

    console.log('Backup concluído:', {
      name: backupName,
      records: Object.values(tablesStats).reduce((a, b) => a + b, 0),
      size: sizeInMB + ' MB',
      tables: Object.keys(tablesStats)
    });

    return new Response(
      JSON.stringify({
        success: true,
        backup: {
          id: newBackup.id,
          name: backupName,
          records_count: Object.values(tablesStats).reduce((a, b) => a + b, 0),
          size_mb: sizeInMB,
          tables: tablesStats
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro no backup diário:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
