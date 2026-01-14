import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Escalonamento
// Regra: Se Closer não fechar em 14 dias, escalonar para Comercial 3 ou Gestor

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 Iniciando verificação de escalonamento...");

    // Buscar pipelines de Vendas/Closer
    const { data: pipelines } = await supabase
      .from('crm_pipelines')
      .select('id, name')
      .in('type', ['sales', 'closer']);

    const pipelineIds = pipelines?.map(p => p.id) || [];

    // Buscar leads que estão há mais de 14 dias sem fechamento
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleLeads, error: leadsError } = await supabase
      .from('crm_leads')
      .select(`
        id, name, phone, email, assigned_to, team_id, pipeline_id, stage_id,
        stage_changed_at, created_at, estimated_value, contract_value
      `)
      .in('pipeline_id', pipelineIds)
      .is('won_at', null)
      .is('lost_at', null)
      .lt('stage_changed_at', fourteenDaysAgo);

    if (leadsError) throw leadsError;

    console.log(`📊 Encontrados ${staleLeads?.length || 0} leads para escalonamento`);

    const escalations: any[] = [];
    const notifications: any[] = [];

    for (const lead of staleLeads || []) {
      // Verificar se já foi escalonado recentemente
      const { data: recentEscalation } = await supabase
        .from('crm_lead_history')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('action', 'escalation')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentEscalation && recentEscalation.length > 0) {
        console.log(`⏭️ Lead ${lead.name} já foi escalonado recentemente, pulando...`);
        continue;
      }

      // Buscar Comercial 3 ou Gestor da mesma equipe
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id, full_name, position')
        .eq('team_id', lead.team_id)
        .neq('id', lead.assigned_to)
        .in('position', ['Closer', 'Comercial 3', 'Gestor', 'Gestor Comercial', 'Coordenador']);

      let newAssignee = null;

      // Primeiro tentar Comercial 3
      const comercial3 = teamMembers?.find(m => m.position === 'Comercial 3');
      if (comercial3) {
        newAssignee = comercial3;
      } else {
        // Se não tiver, escalonar para Gestor
        const gestor = teamMembers?.find(m => 
          m.position?.includes('Gestor') || m.position?.includes('Coordenador')
        );
        if (gestor) {
          newAssignee = gestor;
        }
      }

      if (!newAssignee) {
        // Se não encontrar na equipe, buscar qualquer gestor disponível
        const { data: anyGestor } = await supabase
          .from('profiles')
          .select('id, full_name, position')
          .in('position', ['Gestor', 'Gestor Comercial', 'Coordenador'])
          .limit(1);

        if (anyGestor && anyGestor.length > 0) {
          newAssignee = anyGestor[0];
        }
      }

      if (newAssignee) {
        const leadTags = (lead as any).tags || [];
        
        // Buscar nome do usuário anterior
        let assignedUserName = 'Não atribuído';
        if (lead.assigned_to) {
          const { data: prevUser } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', lead.assigned_to)
            .single();
          assignedUserName = prevUser?.full_name || 'Não atribuído';
        }
        
        const { error: updateError } = await supabase
          .from('crm_leads')
          .update({
            assigned_to: newAssignee.id,
            tags: [...leadTags, 'escalonado:reativacao', `escalonado_para:${newAssignee.full_name}`],
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        if (!updateError) {
          escalations.push({
            lead_id: lead.id,
            lead_name: lead.name,
            old_assignee: assignedUserName,
            new_assignee: newAssignee.full_name,
          });

          await supabase.from('crm_lead_history').insert({
            lead_id: lead.id,
            action: 'escalation',
            details: {
              reason: 'Lead sem fechamento há 14+ dias',
              old_assignee_id: lead.assigned_to,
              old_assignee_name: assignedUserName,
              new_assignee_id: newAssignee.id,
              new_assignee_name: newAssignee.full_name,
              days_without_closing: Math.floor((Date.now() - new Date(lead.stage_changed_at).getTime()) / (24 * 60 * 60 * 1000)),
            },
            performed_by: '00000000-0000-0000-0000-000000000000',
          });

          notifications.push({
            user_id: lead.assigned_to,
            title: '🔄 Lead Escalonado',
            message: `Lead ${lead.name} foi escalonado para ${newAssignee.full_name} após 14 dias sem fechamento`,
            type: 'lead_escalated',
          });

          notifications.push({
            user_id: newAssignee.id,
            title: '📥 Lead Recebido para Reativação',
            message: `Você recebeu o lead ${lead.name} para reativação.`,
            type: 'lead_received',
          });

          await supabase.from('crm_tasks').insert({
            lead_id: lead.id,
            title: 'Reativar lead escalonado',
            description: `Lead escalonado de ${assignedUserName}. Tentar nova abordagem.`,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high',
            assigned_to: newAssignee.id,
          });
        }
      }
    }

    // Inserir notificações
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    console.log(`✅ Escalonamento concluído: ${escalations.length} leads escalonados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${escalations.length} leads escalonados`,
        escalations,
        notifications_sent: notifications.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro no escalonamento:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
