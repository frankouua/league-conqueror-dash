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

    console.log(`Creating checklist items for lead ${lead_id} in stage ${stage_id}`);

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

    // 2. Check for existing items in lead_checklist_items to avoid duplicates
    const { data: existingItems } = await supabase
      .from('lead_checklist_items')
      .select('template_id')
      .eq('lead_id', lead_id)
      .eq('stage_id', stage_id);

    const existingTemplateIds = new Set(existingItems?.map(t => t.template_id) || []);

    // 3. Create checklist items for each template
    const itemsToCreate = [];
    const now = new Date();

    for (const template of templates) {
      // Skip if item already exists for this template
      if (existingTemplateIds.has(template.id)) {
        console.log(`Checklist item for template ${template.task_code} already exists, skipping`);
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

      itemsToCreate.push({
        lead_id,
        template_id: template.id,
        stage_id: stage_id,
        title: template.title,
        description: template.description,
        is_custom: false,
        is_completed: false,
        due_at: dueAt.toISOString(),
        is_overdue: false,
        order_index: template.order_index,
      });
    }

    if (itemsToCreate.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All checklist items already exist', tasks_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Insert into lead_checklist_items (used by CRMLeadChecklistPanel)
    const { data: createdItems, error: insertError } = await supabase
      .from('lead_checklist_items')
      .insert(itemsToCreate)
      .select();

    if (insertError) {
      console.error('Error creating checklist items:', insertError);
      throw insertError;
    }

    console.log(`Created ${createdItems?.length || 0} checklist items for lead ${lead_id}`);

    // 5. Also create in crm_lead_tasks for task tracking compatibility
    const tasksToCreate = templates
      .filter(t => !existingTemplateIds.has(t.id))
      .map((template, idx) => {
        let dueAt = new Date(now);
        
        if (template.trigger_timing && surgery_date) {
          const match = template.trigger_timing.match(/D([+-]?)(\d*)/);
          if (match) {
            const surgeryDateObj = new Date(surgery_date);
            const sign = match[1] === '-' ? -1 : 1;
            const days = parseInt(match[2] || '0');
            dueAt = new Date(surgeryDateObj);
            dueAt.setDate(dueAt.getDate() + (sign * days));
            if (template.deadline_hours) {
              dueAt.setHours(dueAt.getHours() + template.deadline_hours);
            }
          }
        } else if (template.deadline_hours) {
          dueAt.setHours(dueAt.getHours() + template.deadline_hours);
        }

        return {
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
        };
      });

    if (tasksToCreate.length > 0) {
      // Check existing tasks to avoid duplicates
      const { data: existingTasks } = await supabase
        .from('crm_lead_tasks')
        .select('task_code')
        .eq('lead_id', lead_id)
        .in('task_code', tasksToCreate.map(t => t.task_code));

      const existingCodes = new Set(existingTasks?.map(t => t.task_code) || []);
      const newTasks = tasksToCreate.filter(t => !existingCodes.has(t.task_code));

      if (newTasks.length > 0) {
        const { error: taskInsertError } = await supabase
          .from('crm_lead_tasks')
          .insert(newTasks);

        if (taskInsertError) {
          console.error('Error creating tasks (non-critical):', taskInsertError);
          // Don't throw - the main checklist items were created successfully
        }
      }
    }

    // 6. Update lead with checklist counts
    await supabase
      .from('crm_leads')
      .update({
        checklist_total: (createdItems?.length || 0),
        checklist_completed: 0,
        checklist_overdue: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasks_created: createdItems?.length || 0,
        items: createdItems 
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
