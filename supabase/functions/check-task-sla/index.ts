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

    const now = new Date();

    // 1. Find overdue tasks that haven't been escalated
    const { data: overdueTasks, error: overdueError } = await supabase
      .from('crm_lead_tasks')
      .select(`
        *,
        lead:crm_leads(id, name, assigned_to),
        template:stage_checklist_templates(escalation_to)
      `)
      .eq('status', 'pending')
      .eq('escalated', false)
      .lt('due_at', now.toISOString());

    if (overdueError) {
      console.error('Error fetching overdue tasks:', overdueError);
      throw overdueError;
    }

    console.log(`Found ${overdueTasks?.length || 0} overdue tasks`);

    const escalatedTasks = [];
    const notifications = [];

    for (const task of overdueTasks || []) {
      // Mark task as overdue and escalated
      const { error: updateError } = await supabase
        .from('crm_lead_tasks')
        .update({
          status: 'overdue',
          escalated: true,
          escalated_at: now.toISOString(),
          escalated_to: task.template?.escalation_to || 'Gestor'
        })
        .eq('id', task.id);

      if (updateError) {
        console.error(`Error updating task ${task.id}:`, updateError);
        continue;
      }

      escalatedTasks.push(task.id);

      // Create notification for escalation
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: task.lead?.assigned_to,
          title: `⚠️ Tarefa Atrasada: ${task.task_name}`,
          message: `A tarefa "${task.task_name}" para o lead ${task.lead?.name} está atrasada e foi escalonada.`,
          type: 'alert',
          is_read: false,
          metadata: {
            task_id: task.id,
            lead_id: task.lead_id,
            task_code: task.task_code,
            escalated_to: task.template?.escalation_to
          }
        });

      if (!notifError) {
        notifications.push(task.id);
      }
    }

    // 2. Find tasks due soon (within 2 hours) that haven't been notified
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const { data: upcomingTasks, error: upcomingError } = await supabase
      .from('crm_lead_tasks')
      .select(`
        *,
        lead:crm_leads(id, name, assigned_to)
      `)
      .eq('status', 'pending')
      .gt('due_at', now.toISOString())
      .lt('due_at', twoHoursFromNow.toISOString());

    if (!upcomingError && upcomingTasks) {
      for (const task of upcomingTasks) {
        // Create reminder notification
        await supabase
          .from('notifications')
          .insert({
            user_id: task.lead?.assigned_to,
            title: `⏰ Tarefa vence em breve: ${task.task_name}`,
            message: `A tarefa "${task.task_name}" para o lead ${task.lead?.name} vence em menos de 2 horas.`,
            type: 'reminder',
            is_read: false,
            metadata: {
              task_id: task.id,
              lead_id: task.lead_id,
              task_code: task.task_code
            }
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        overdue_tasks_escalated: escalatedTasks.length,
        notifications_sent: notifications.length,
        upcoming_reminders: upcomingTasks?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in check-task-sla:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});