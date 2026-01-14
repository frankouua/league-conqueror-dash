import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Pipeline - Movimentação automática de leads entre estágios
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 Iniciando automação de pipeline...");

    // Buscar regras de automação de pipeline ativas
    const { data: automations, error: autoError } = await supabase
      .from('crm_automations')
      .select('*')
      .eq('is_active', true)
      .in('trigger_type', ['time_in_stage', 'activity_threshold', 'score_threshold']);

    if (autoError) throw autoError;

    console.log(`📊 ${automations?.length || 0} regras de automação ativas`);

    let leadsProcessed = 0;
    let leadsMoved = 0;
    let actionsExecuted = 0;

    for (const automation of automations || []) {
      try {
        const triggerConfig = automation.trigger_config as Record<string, unknown>;
        const actions = automation.actions as Record<string, unknown>[];

        // Buscar leads que atendem aos critérios
        let leadsQuery = supabase
          .from('crm_leads')
          .select('id, name, stage_id, pipeline_id, assigned_to, last_activity_at, ai_score')
          .is('lost_at', null)
          .is('won_at', null);

        if (automation.pipeline_id) {
          leadsQuery = leadsQuery.eq('pipeline_id', automation.pipeline_id);
        }
        if (automation.stage_id) {
          leadsQuery = leadsQuery.eq('stage_id', automation.stage_id);
        }

        const { data: leads } = await leadsQuery.limit(100);

        for (const lead of leads || []) {
          leadsProcessed++;
          let shouldTrigger = false;

          // Verificar condição de trigger
          switch (automation.trigger_type) {
            case 'time_in_stage':
              const maxDays = (triggerConfig.max_days as number) || 7;
              const daysSinceActivity = lead.last_activity_at
                ? Math.floor((Date.now() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
                : 999;
              shouldTrigger = daysSinceActivity >= maxDays;
              break;

            case 'score_threshold':
              const minScore = (triggerConfig.min_score as number) || 50;
              shouldTrigger = (lead.ai_score || 0) >= minScore;
              break;

            case 'activity_threshold':
              // Contar atividades recentes
              const { data: activities } = await supabase
                .from('crm_lead_history')
                .select('id')
                .eq('lead_id', lead.id)
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
              
              const minActivities = (triggerConfig.min_activities as number) || 3;
              shouldTrigger = (activities?.length || 0) >= minActivities;
              break;
          }

          if (shouldTrigger) {
            // Executar ações
            for (const action of actions) {
              const actionType = action.type as string;

              switch (actionType) {
                case 'move_stage':
                  const targetStageId = action.target_stage_id as string;
                  if (targetStageId) {
                    await supabase
                      .from('crm_leads')
                      .update({ 
                        stage_id: targetStageId, 
                        updated_at: new Date().toISOString() 
                      })
                      .eq('id', lead.id);

                    // Registrar histórico
                    await supabase.from('crm_lead_history').insert({
                      lead_id: lead.id,
                      action_type: 'stage_change',
                      title: 'Movido automaticamente',
                      description: `Regra: ${automation.name}`,
                      from_stage_id: lead.stage_id,
                      to_stage_id: targetStageId,
                      performed_by: lead.assigned_to || '00000000-0000-0000-0000-000000000000'
                    });

                    leadsMoved++;
                  }
                  break;

                case 'create_task':
                  if (lead.assigned_to) {
                    await supabase.from('crm_lead_tasks').insert({
                      lead_id: lead.id,
                      assigned_to: lead.assigned_to,
                      title: (action.task_title as string) || `Tarefa automática: ${automation.name}`,
                      description: action.task_description as string,
                      priority: (action.priority as string) || 'medium',
                      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                    });
                  }
                  break;

                case 'send_notification':
                  if (lead.assigned_to) {
                    await supabase.from('notifications').insert({
                      user_id: lead.assigned_to,
                      title: (action.notification_title as string) || `Automação: ${automation.name}`,
                      message: (action.notification_message as string) || `Lead ${lead.name} acionou automação`,
                      type: 'automation'
                    });
                  }
                  break;

                case 'update_temperature':
                  const newTemp = action.temperature as string;
                  if (newTemp) {
                    await supabase
                      .from('crm_leads')
                      .update({ temperature: newTemp, updated_at: new Date().toISOString() })
                      .eq('id', lead.id);
                  }
                  break;
              }

              actionsExecuted++;
            }

            // Registrar execução da automação
            await supabase.from('crm_automation_logs').insert({
              automation_id: automation.id,
              lead_id: lead.id,
              status: 'success',
              actions_executed: actions
            });
          }
        }

        // Atualizar último run da automação
        await supabase
          .from('crm_automations')
          .update({ 
            last_run_at: new Date().toISOString(),
            run_count: (automation.run_count || 0) + 1
          })
          .eq('id', automation.id);

      } catch (e) {
        console.error(`Erro ao processar automação ${automation.id}:`, e);
      }
    }

    console.log("✅ Automação de pipeline concluída!", {
      leadsProcessed,
      leadsMoved,
      actionsExecuted
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pipeline automation completed",
        leads_processed: leadsProcessed,
        leads_moved: leadsMoved,
        actions_executed: actionsExecuted,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error("❌ Erro na automação de pipeline:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
