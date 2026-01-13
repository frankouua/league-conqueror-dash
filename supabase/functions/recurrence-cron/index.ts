import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cron job for automatic recurrence identification
 * Run daily to identify and process recurrence opportunities
 * 
 * This function:
 * 1. Identifies patients with overdue procedures
 * 2. Creates/updates leads in the CRM
 * 3. Sends notifications to assigned team members
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🕐 Starting recurrence cron job...');

    // Get configuration (or use defaults)
    const { autoAssign = true, notifyTeam = true, yearFrom = 2024 } = await req.json().catch(() => ({}));

    // Call identify-recurrences function logic inline to avoid extra HTTP call
    const { data: farmerPipeline } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('pipeline_type', 'farmer')
      .single();

    if (!farmerPipeline) {
      throw new Error('Pipeline Farmer não encontrado');
    }

    // Get recurrence stages
    const { data: recurrenceStages } = await supabase
      .from('crm_stages')
      .select('id, name')
      .eq('pipeline_id', farmerPipeline.id)
      .ilike('name', '%Recorrência%');

    const stageMap = {
      upcoming: recurrenceStages?.find(s => s.name.includes('Por Vencer'))?.id,
      overdue: recurrenceStages?.find(s => s.name.includes('Vencido Recente'))?.id,
      critical: recurrenceStages?.find(s => s.name.includes('Vencido Crítico'))?.id,
    };

    // Get opportunities
    const { data: opportunities, error: oppError } = await supabase
      .rpc('get_recurrence_opportunities', {
        p_days_before: 30,
        p_limit: 2000,
        p_year_from: yearFrom
      });

    if (oppError) {
      console.error('Error fetching opportunities:', oppError);
      throw oppError;
    }

    console.log(`📋 Found ${opportunities?.length || 0} recurrence opportunities`);

    const stats = {
      total: opportunities?.length || 0,
      upcoming: 0,
      overdue: 0,
      critical: 0,
      leadsCreated: 0,
      leadsUpdated: 0,
      notificationsSent: 0,
      errors: 0
    };

    if (!opportunities?.length) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhuma recorrência pendente encontrada',
        stats
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get team members for auto-assignment
    let teamMembers: { id: string; full_name: string; team_id: string }[] = [];
    if (autoAssign) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, team_id')
        .eq('role', 'seller')
        .eq('is_approved', true);
      teamMembers = users || [];
    }

    // Process opportunities
    const updates: { id: string; data: Record<string, unknown> }[] = [];
    const inserts: Record<string, unknown>[] = [];
    let memberIndex = 0;

    for (const opp of opportunities) {
      let stageId = stageMap.upcoming;
      if (opp.out_urgency_level === 'critical') {
        stageId = stageMap.critical;
        stats.critical++;
      } else if (opp.out_urgency_level === 'overdue') {
        stageId = stageMap.overdue;
        stats.overdue++;
      } else {
        stats.upcoming++;
      }

      if (!stageId) continue;

      // Round-robin assignment
      const assignedTo = autoAssign && teamMembers.length > 0 
        ? teamMembers[memberIndex % teamMembers.length].id 
        : null;
      
      if (autoAssign && teamMembers.length > 0) {
        memberIndex++;
      }

      const leadData = {
        pipeline_id: farmerPipeline.id,
        stage_id: stageId,
        is_recurrence_lead: true,
        last_procedure_date: opp.out_last_procedure_date,
        last_procedure_name: opp.out_procedure_name,
        recurrence_due_date: opp.out_due_date,
        recurrence_days_overdue: opp.out_days_overdue,
        recurrence_group: opp.out_procedure_group,
        assigned_to: assignedTo,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (opp.out_existing_lead_id) {
        updates.push({ id: opp.out_existing_lead_id, data: leadData });
      } else {
        inserts.push({
          name: opp.out_patient_name || 'Paciente Recorrência',
          phone: opp.out_patient_phone,
          email: opp.out_patient_email,
          cpf: opp.out_patient_cpf,
          prontuario: opp.out_patient_prontuario,
          source: 'recurrence_cron',
          source_detail: `Recorrência: ${opp.out_procedure_name}`,
          temperature: opp.out_urgency_level === 'critical' ? 'hot' : 
                       opp.out_urgency_level === 'overdue' ? 'warm' : 'cold',
          notes: `📅 Último: ${opp.out_procedure_name} em ${opp.out_last_procedure_date}\n⏰ Venc: ${opp.out_due_date}\n${opp.out_days_overdue > 0 ? `⚠️ Atrasado: ${opp.out_days_overdue}d` : `📌 Faltam: ${Math.abs(opp.out_days_overdue)}d`}`,
          created_by: '00000000-0000-0000-0000-000000000000',
          ...leadData
        });
      }
    }

    // Execute batch updates
    for (const update of updates) {
      const { error } = await supabase
        .from('crm_leads')
        .update(update.data)
        .eq('id', update.id);
      
      if (error) {
        stats.errors++;
      } else {
        stats.leadsUpdated++;
      }
    }

    // Execute batch inserts
    const CHUNK_SIZE = 50;
    for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
      const chunk = inserts.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase.from('crm_leads').insert(chunk);
      
      if (error) {
        console.error('Insert error:', error);
        stats.errors += chunk.length;
      } else {
        stats.leadsCreated += chunk.length;
      }
    }

    // Send team notifications if enabled
    if (notifyTeam && (stats.leadsCreated > 0 || stats.critical > 0)) {
      // Create notification for admin users
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      const notifications = (admins || []).map(admin => ({
        user_id: admin.id,
        notification_type: 'recurrence_alert',
        title: '🔄 Recorrências Identificadas',
        message: `${stats.leadsCreated} novos leads criados, ${stats.critical} em estado crítico`,
        is_read: false
      }));

      if (notifications.length > 0) {
        await supabase.from('crm_notifications').insert(notifications);
        stats.notificationsSent = notifications.length;
      }
    }

    console.log('✅ Cron job complete:', stats);

    return new Response(JSON.stringify({
      success: true,
      message: `Cron: ${stats.leadsCreated} criados, ${stats.leadsUpdated} atualizados, ${stats.critical} críticos`,
      stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in recurrence-cron:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
