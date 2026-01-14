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

    console.log('Starting backfill of lead checklists...');

    // Get stages that have templates
    const { data: stagesWithTemplates } = await supabase
      .from('stage_checklist_templates')
      .select('stage_id')
      .order('stage_id');

    const uniqueStageIds = [...new Set((stagesWithTemplates || []).map(s => s.stage_id))];
    console.log(`Found ${uniqueStageIds.length} stages with templates`);

    if (uniqueStageIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No stages with templates found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get leads in those stages
    const { data: leads, error } = await supabase
      .from('crm_leads')
      .select('id, stage_id, pipeline_id, surgery_date, assigned_to')
      .in('stage_id', uniqueStageIds)
      .limit(1000);

    if (error) throw error;
    console.log(`Found ${leads?.length || 0} leads in stages with templates`);

    // Get leads that already have checklist items
    const leadIds = (leads || []).map(l => l.id);
    const { data: existingItems } = await supabase
      .from('lead_checklist_items')
      .select('lead_id')
      .in('lead_id', leadIds);

    const leadsWithItems = new Set((existingItems || []).map(i => i.lead_id));

    // Filter leads that need items
    const filteredLeads = (leads || []).filter(l => !leadsWithItems.has(l.id));
    console.log(`Found ${filteredLeads.length} leads needing checklists`);

    if (filteredLeads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No leads need checklists', leads_checked: leads?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    {

      console.log(`Found ${filteredLeads.length} leads needing checklists`);

      let successCount = 0;
      let errorCount = 0;

      for (const lead of filteredLeads) {
        try {
          // Get templates for this stage
          const { data: templates, error: templatesError } = await supabase
            .from('stage_checklist_templates')
            .select('*')
            .eq('stage_id', lead.stage_id)
            .order('order_index');

          if (templatesError) {
            console.error(`Error getting templates for lead ${lead.id}:`, templatesError);
            errorCount++;
            continue;
          }

          if (!templates || templates.length === 0) {
            continue;
          }

          const now = new Date();
          const itemsToCreate = [];

          for (const template of templates) {
            let dueAt = new Date(now);
            
            if (template.trigger_timing && lead.surgery_date) {
              const match = template.trigger_timing.match(/D([+-]?)(\d*)/);
              if (match) {
                const surgeryDateObj = new Date(lead.surgery_date);
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

            itemsToCreate.push({
              lead_id: lead.id,
              template_id: template.id,
              stage_id: lead.stage_id,
              title: template.title,
              description: template.description,
              is_custom: false,
              is_completed: false,
              due_at: dueAt.toISOString(),
              is_overdue: false,
              order_index: template.order_index,
            });
          }

          if (itemsToCreate.length > 0) {
            const { error: insertError } = await supabase
              .from('lead_checklist_items')
              .insert(itemsToCreate);

            if (insertError) {
              console.error(`Error creating items for lead ${lead.id}:`, insertError);
              errorCount++;
              continue;
            }

            // Update lead checklist counts
            await supabase
              .from('crm_leads')
              .update({
                checklist_total: itemsToCreate.length,
                checklist_completed: 0,
                checklist_overdue: 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', lead.id);

            successCount++;
            console.log(`Created ${itemsToCreate.length} items for lead ${lead.id}`);
          }
        } catch (err) {
          console.error(`Error processing lead ${lead.id}:`, err);
          errorCount++;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          leads_processed: filteredLeads.length,
          success_count: successCount,
          error_count: errorCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Backfill completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in backfill-lead-checklists:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
