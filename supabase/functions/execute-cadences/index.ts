import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CadenceExecution {
  cadenceId: string;
  leadId: string;
  action: string;
  result: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const executions: CadenceExecution[] = [];

    // Fetch active cadences that should be executed
    const { data: cadences, error: cadencesError } = await supabase
      .from('crm_cadences')
      .select(`
        *,
        pipeline:crm_pipelines(id, name),
        stage:crm_stages(id, name)
      `)
      .eq('is_active', true);

    if (cadencesError) throw cadencesError;

    for (const cadence of cadences || []) {
      // Find leads that match this cadence's trigger conditions
      let query = supabase
        .from('crm_leads')
        .select('*')
        .is('won_at', null)
        .is('lost_at', null);

      if (cadence.pipeline_id) {
        query = query.eq('pipeline_id', cadence.pipeline_id);
      }
      if (cadence.stage_id) {
        query = query.eq('stage_id', cadence.stage_id);
      }

      const { data: leads, error: leadsError } = await query.limit(100);
      if (leadsError) continue;

      for (const lead of leads || []) {
        // Check if cadence was already executed recently for this lead
        const { data: recentExecution } = await supabase
          .from('crm_cadence_executions')
          .select('id')
          .eq('cadence_id', cadence.id)
          .eq('lead_id', lead.id)
          .gte('executed_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (recentExecution) continue;

        // Check trigger conditions
        let shouldExecute = false;
        const triggerConfig = cadence.trigger_config || {};

        switch (cadence.trigger_type) {
          case 'stage_entry':
            // Already filtered by stage_id
            shouldExecute = true;
            break;

          case 'time_in_stage':
            if (lead.stage_entered_at) {
              const hoursInStage = (now.getTime() - new Date(lead.stage_entered_at).getTime()) / (1000 * 60 * 60);
              shouldExecute = hoursInStage >= (triggerConfig.hours || 24);
            }
            break;

          case 'no_contact':
            if (lead.last_contact_at) {
              const hoursSinceContact = (now.getTime() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60);
              shouldExecute = hoursSinceContact >= (triggerConfig.hours || 48);
            } else {
              shouldExecute = true;
            }
            break;

          case 'temperature_change':
            shouldExecute = lead.temperature === triggerConfig.temperature;
            break;

          case 'scheduled':
            // Check if it's the right time of day
            if (cadence.time_of_day) {
              const [hours, minutes] = cadence.time_of_day.split(':').map(Number);
              const scheduledTime = new Date(now);
              scheduledTime.setHours(hours, minutes, 0, 0);
              const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime());
              shouldExecute = timeDiff <= 30 * 60 * 1000; // Within 30 minutes
            }
            break;
        }

        if (!shouldExecute) continue;

        // Execute the cadence action
        let actionResult: any = { success: true };

        switch (cadence.action_type) {
          case 'create_task':
            const { error: taskError } = await supabase
              .from('crm_lead_tasks')
              .insert({
                lead_id: lead.id,
                title: cadence.name,
                description: cadence.description,
                due_date: new Date(now.getTime() + (cadence.day_offset || 1) * 24 * 60 * 60 * 1000).toISOString(),
                assigned_to: lead.assigned_to,
                priority: 'medium',
              });
            actionResult = { success: !taskError, error: taskError?.message };
            break;

          case 'send_notification':
            if (lead.assigned_to) {
              const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                  user_id: lead.assigned_to,
                  title: `Cadência: ${cadence.name}`,
                  message: cadence.message_template?.replace('{{lead_name}}', lead.name) || cadence.description,
                  type: 'cadence_reminder',
                });
              actionResult = { success: !notifError, error: notifError?.message };
            }
            break;

          case 'change_stage':
            if (triggerConfig.target_stage_id) {
              const { error: stageError } = await supabase
                .from('crm_leads')
                .update({
                  stage_id: triggerConfig.target_stage_id,
                  stage_entered_at: now.toISOString(),
                })
                .eq('id', lead.id);
              actionResult = { success: !stageError, error: stageError?.message };
            }
            break;

          case 'add_tag':
            const currentTags = lead.tags || [];
            const newTag = triggerConfig.tag || cadence.name;
            if (!currentTags.includes(newTag)) {
              const { error: tagError } = await supabase
                .from('crm_leads')
                .update({ tags: [...currentTags, newTag] })
                .eq('id', lead.id);
              actionResult = { success: !tagError, error: tagError?.message };
            }
            break;

          case 'log_activity':
            const { error: historyError } = await supabase
              .from('crm_lead_history')
              .insert({
                lead_id: lead.id,
                action: 'cadence_executed',
                details: { cadence_name: cadence.name, cadence_id: cadence.id },
              });
            actionResult = { success: !historyError, error: historyError?.message };
            break;
        }

        // Record the execution
        await supabase
          .from('crm_cadence_executions')
          .insert({
            cadence_id: cadence.id,
            lead_id: lead.id,
            scheduled_at: now.toISOString(),
            executed_at: now.toISOString(),
            status: actionResult.success ? 'completed' : 'failed',
            result: actionResult,
            error_message: actionResult.error,
          });

        executions.push({
          cadenceId: cadence.id,
          leadId: lead.id,
          action: cadence.action_type,
          result: actionResult,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        executedCount: executions.length,
        executions,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error executing cadences:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
