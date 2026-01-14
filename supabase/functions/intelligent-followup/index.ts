import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Follow-up Inteligente baseado em comportamento do lead
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🎯 Iniciando follow-up inteligente...");

    // Buscar leads ativos sem interação recente
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: leads, error: leadsError } = await supabase
      .from('crm_leads')
      .select(`
        id, name, phone, email, assigned_to, temperature, 
        last_activity_at, created_at, estimated_value,
        stage_id, pipeline_id
      `)
      .is('lost_at', null)
      .is('won_at', null)
      .lt('last_activity_at', threeDaysAgo)
      .order('estimated_value', { ascending: false })
      .limit(200);

    if (leadsError) throw leadsError;

    console.log(`📊 ${leads?.length || 0} leads precisam de follow-up`);

    let followUpsCreated = 0;
    let urgentFollowUps = 0;
    let notifications = 0;

    for (const lead of leads || []) {
      try {
        const daysSinceActivity = lead.last_activity_at 
          ? Math.floor((Date.now() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Determinar prioridade baseado em temperatura e tempo
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
        let followUpType = 'standard';

        if (lead.temperature === 'hot') {
          if (daysSinceActivity >= 3) {
            priority = 'urgent';
            followUpType = 'rescue';
            urgentFollowUps++;
          } else {
            priority = 'high';
          }
        } else if (lead.temperature === 'warm') {
          if (daysSinceActivity >= 5) {
            priority = 'high';
            followUpType = 'reengagement';
          }
        } else {
          if (daysSinceActivity >= 7) {
            priority = 'medium';
            followUpType = 'nurturing';
          }
        }

        // Verificar se já existe tarefa pendente para este lead
        const { data: existingTask } = await supabase
          .from('crm_lead_tasks')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (!existingTask && lead.assigned_to) {
          // Criar tarefa de follow-up
          const taskTitle = followUpType === 'rescue' 
            ? `🚨 URGENTE: Resgatar ${lead.name}`
            : followUpType === 'reengagement'
            ? `🔄 Reengajar ${lead.name}`
            : `📞 Follow-up com ${lead.name}`;

          const taskDescription = `Lead ${lead.temperature} sem contato há ${daysSinceActivity} dias. ` +
            (lead.estimated_value ? `Valor estimado: R$ ${lead.estimated_value.toLocaleString('pt-BR')}` : '');

          await supabase.from('crm_lead_tasks').insert({
            lead_id: lead.id,
            assigned_to: lead.assigned_to,
            title: taskTitle,
            description: taskDescription,
            priority,
            task_type: 'follow_up',
            due_date: new Date(Date.now() + (priority === 'urgent' ? 4 : 24) * 60 * 60 * 1000).toISOString()
          });

          followUpsCreated++;

          // Notificar vendedor para casos urgentes
          if (priority === 'urgent') {
            await supabase.from('notifications').insert({
              user_id: lead.assigned_to,
              title: `🚨 Lead quente esfriando: ${lead.name}`,
              message: `${daysSinceActivity} dias sem contato. Valor: R$ ${(lead.estimated_value || 0).toLocaleString('pt-BR')}`,
              type: 'urgent_followup'
            });
            notifications++;
          }
        }
      } catch (e) {
        console.error(`Erro ao processar lead ${lead.id}:`, e);
      }
    }

    // Atualizar leads muito antigos como stale
    const { error: staleError } = await supabase
      .from('crm_leads')
      .update({ is_stale: true, updated_at: new Date().toISOString() })
      .is('lost_at', null)
      .is('won_at', null)
      .lt('last_activity_at', sevenDaysAgo)
      .eq('is_stale', false);

    if (staleError) console.error("Erro ao marcar leads stale:", staleError);

    console.log("✅ Follow-up inteligente concluído!", {
      followUpsCreated,
      urgentFollowUps,
      notifications
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Intelligent follow-up completed",
        follow_ups_created: followUpsCreated,
        urgent_follow_ups: urgentFollowUps,
        notifications_sent: notifications,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error("❌ Erro no follow-up inteligente:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
