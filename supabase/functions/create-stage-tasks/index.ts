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

    const { lead_id, stage_id, pipeline_id, surgery_date, assigned_to } = await req.json();

    if (!lead_id || !stage_id) {
      return new Response(
        JSON.stringify({ error: 'lead_id and stage_id are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Creating tasks for lead ${lead_id} in stage ${stage_id}`);

    // 1. Get task templates for this stage
    const { data: templates, error: templatesError } = await supabase
      .from('stage_checklist_templates')
      .select('*')
      .eq('stage_id', stage_id)
      .order('order_index');

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      throw templatesError;
    }

    if (!templates || templates.length === 0) {
      console.log('No task templates found for this stage');
      return new Response(
        JSON.stringify({ message: 'No templates found', tasks_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check for existing tasks to avoid duplicates
    const { data: existingTasks } = await supabase
      .from('crm_lead_tasks')
      .select('task_code')
      .eq('lead_id', lead_id)
      .in('task_code', templates.map(t => t.task_code));

    const existingCodes = new Set(existingTasks?.map(t => t.task_code) || []);

    // 3. Create tasks for each template
    const tasksToCreate = [];
    const now = new Date();

    for (const template of templates) {
      // Skip if task already exists
      if (existingCodes.has(template.task_code)) {
        console.log(`Task ${template.task_code} already exists, skipping`);
        continue;
      }

      // Calculate due_at based on deadline_hours and trigger_timing
      let dueAt = new Date(now);
      
      if (template.trigger_timing && surgery_date) {
        // Parse trigger_timing like "D-30", "D+7", "D0"
        const match = template.trigger_timing.match(/D([+-]?)(\d*)/);
        if (match) {
          const surgeryDateObj = new Date(surgery_date);
          const sign = match[1] === '-' ? -1 : 1;
          const days = parseInt(match[2] || '0');
          dueAt = new Date(surgeryDateObj);
          dueAt.setDate(dueAt.getDate() + (sign * days));
          
          // Add deadline hours to the calculated date
          if (template.deadline_hours) {
            dueAt.setHours(dueAt.getHours() + template.deadline_hours);
          }
        }
      } else if (template.deadline_hours) {
        // Just add deadline hours from now
        dueAt.setHours(dueAt.getHours() + template.deadline_hours);
      }

      tasksToCreate.push({
        lead_id,
        template_id: template.id,
        task_code: template.task_code,
        task_name: template.title,
        task_description: template.description,
        responsible_role: template.responsible_role,
        assigned_to: assigned_to || null,
        due_at: dueAt.toISOString(),
        requires_coordinator_validation: template.requires_coordinator_validation,
        status: 'pending'
      });
    }

    if (tasksToCreate.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All tasks already exist', tasks_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Insert tasks
    const { data: createdTasks, error: insertError } = await supabase
      .from('crm_lead_tasks')
      .insert(tasksToCreate)
      .select();

    if (insertError) {
      console.error('Error creating tasks:', insertError);
      throw insertError;
    }

    console.log(`Created ${createdTasks?.length || 0} tasks for lead ${lead_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasks_created: createdTasks?.length || 0,
        tasks: createdTasks 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-stage-tasks:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});