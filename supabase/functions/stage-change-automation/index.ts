import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Mudança de Stage
// Executa ações automáticas quando um lead muda de estágio

interface StageChangePayload {
  lead_id: string;
  old_stage_id?: string;
  new_stage_id: string;
  performed_by?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: StageChangePayload = await req.json();
    const { lead_id, old_stage_id, new_stage_id, performed_by } = payload;

    console.log("🔄 Stage change automation triggered:", { lead_id, old_stage_id, new_stage_id });

    // Buscar informações do lead e stages
    const [leadResult, newStageResult, oldStageResult] = await Promise.all([
      supabase.from('crm_leads').select('*, assigned_to, team_id, pipeline_id').eq('id', lead_id).single(),
      supabase.from('crm_stages').select('*, pipeline:crm_pipelines(*)').eq('id', new_stage_id).single(),
      old_stage_id ? supabase.from('crm_stages').select('*').eq('id', old_stage_id).single() : null,
    ]);

    const lead = leadResult.data;
    const newStage = newStageResult.data;
    const oldStage = oldStageResult?.data;

    if (!lead || !newStage) {
      throw new Error("Lead ou Stage não encontrado");
    }

    const actions: string[] = [];
    const notifications: any[] = [];
    const tasks: any[] = [];
    const tags: string[] = [];

    // ======== AUTOMAÇÕES POR STAGE ========

    // STAGE: Engajamento (Social Selling)
    if (newStage.name === 'Engajamento') {
      tags.push('origem:social', 'temperatura:frio');
      tasks.push({
        lead_id,
        title: 'Responder interação em 2h',
        description: 'Lead engajou nas redes sociais - responder rapidamente',
        due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        assigned_to: lead.assigned_to,
      });
      actions.push('Tarefa criada: Responder interação');
    }

    // STAGE: Contato Inicial
    if (newStage.name === 'Contato Inicial' || newStage.name === 'Novo Lead') {
      tags.push('status:primeiro_contato');
      tasks.push({
        lead_id,
        title: 'Fazer primeiro contato em 15min',
        description: 'Lead novo - velocidade de resposta é crucial!',
        due_date: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        priority: 'urgent',
        assigned_to: lead.assigned_to,
      });
      actions.push('Tarefa urgente criada: Primeiro contato');
    }

    // STAGE: Qualificação
    if (newStage.name === 'Qualificação' || newStage.name === 'Em Qualificação') {
      tags.push('etapa:qualificacao');
      // Chamar IA para qualificar
      try {
        await supabase.functions.invoke('crm-ai-qualify', { body: { lead_id } });
        actions.push('IA de qualificação acionada');
      } catch (e) {
        console.error('Erro ao qualificar:', e);
      }
    }

    // STAGE: Agendamento
    if (newStage.name === 'Agendamento' || newStage.name === 'Agendar Consulta') {
      tags.push('etapa:agendamento');
      tasks.push({
        lead_id,
        title: 'Agendar consulta em 24h',
        description: 'Lead qualificado - agendar consulta com urgência',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        assigned_to: lead.assigned_to,
      });
      actions.push('Tarefa criada: Agendar consulta');
    }

    // STAGE: Consulta Agendada
    if (newStage.name === 'Consulta Agendada' || newStage.name === 'Aguardando Consulta') {
      tags.push('etapa:consulta_agendada');
      tasks.push({
        lead_id,
        title: 'Confirmar consulta 24h antes',
        description: 'Confirmar presença do paciente',
        due_date: lead.next_contact_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        assigned_to: lead.assigned_to,
      });
      actions.push('Lembrete de confirmação agendado');
    }

    // STAGE: Proposta Enviada
    if (newStage.name === 'Proposta Enviada' || newStage.name === 'Negociação') {
      tags.push('etapa:proposta');
      tasks.push({
        lead_id,
        title: 'Follow-up de proposta em 48h',
        description: 'Verificar se paciente tem dúvidas sobre a proposta',
        due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        assigned_to: lead.assigned_to,
      });
      // Notificar coordenação
      notifications.push({
        user_id: performed_by || lead.assigned_to,
        title: '📋 Proposta Enviada',
        message: `Proposta enviada para ${lead.name} - acompanhar fechamento`,
        type: 'lead_proposal',
      });
      actions.push('Follow-up de proposta agendado');
    }

    // STAGE: Fechamento/Venda
    if (newStage.name === 'Fechamento' || newStage.name === 'Venda Fechada' || newStage.name === 'Contrato') {
      tags.push('etapa:fechamento', 'prioridade:alta');
      // Atualizar temperatura para quente
      await supabase.from('crm_leads').update({ temperature: 'hot' }).eq('id', lead_id);
      actions.push('Temperatura atualizada para HOT');

      // Notificar time
      notifications.push({
        user_id: performed_by || lead.assigned_to,
        title: '🔥 Lead em Fechamento!',
        message: `${lead.name} está em fase final de fechamento`,
        type: 'lead_closing',
      });
    }

    // STAGE: Venda Ganha / Won
    if (newStage.name === 'Venda Ganha' || newStage.name === 'Ganho' || newStage.is_won) {
      tags.push('resultado:ganho');
      await supabase.from('crm_leads').update({ 
        won_at: new Date().toISOString(),
        status: 'won'
      }).eq('id', lead_id);

      // Gamificação
      try {
        await supabase.functions.invoke('award-gamification-points', {
          body: { 
            user_id: lead.assigned_to, 
            action: 'sale_closed',
            lead_id,
            value: lead.contract_value || lead.estimated_value || 0
          }
        });
        actions.push('Pontos de gamificação atribuídos');
      } catch (e) {
        console.error('Erro gamificação:', e);
      }

      // Notificação de celebração
      notifications.push({
        user_id: lead.assigned_to,
        title: '🎉 VENDA FECHADA!',
        message: `Parabéns! Venda de ${lead.name} foi concluída!`,
        type: 'sale_won',
      });
    }

    // STAGE: Perdido
    if (newStage.name === 'Perdido' || newStage.is_lost) {
      tags.push('resultado:perdido');
      await supabase.from('crm_leads').update({ 
        lost_at: new Date().toISOString(),
        status: 'lost'
      }).eq('id', lead_id);
      actions.push('Lead marcado como perdido');
    }

    // STAGE: Pós-Cirurgia
    if (newStage.name === 'Pós-Cirurgia' || newStage.name === 'Pós-Operatório') {
      tags.push('etapa:pos_cirurgia');
      // Criar checklist de acompanhamento
      tasks.push(
        {
          lead_id,
          title: 'Ligar D+1 (dia seguinte)',
          description: 'Verificar como paciente está após a cirurgia',
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          assigned_to: lead.assigned_to,
        },
        {
          lead_id,
          title: 'Acompanhamento D+7',
          description: 'Verificar recuperação após 1 semana',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          assigned_to: lead.assigned_to,
        },
        {
          lead_id,
          title: 'Solicitar NPS D+30',
          description: 'Pedir avaliação do paciente após 30 dias',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          assigned_to: lead.assigned_to,
        }
      );
      actions.push('Checklist pós-cirurgia criado');
    }

    // STAGE: Upsell / Cross-sell
    if (newStage.name === 'Oportunidade Upsell' || newStage.name === 'Upsell') {
      tags.push('oportunidade:upsell');
      tasks.push({
        lead_id,
        title: 'Abordar cliente para upsell em 24h',
        description: 'Apresentar procedimento complementar ao cliente',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        assigned_to: lead.assigned_to,
      });
      // Buscar recomendações de procedimentos
      try {
        await supabase.functions.invoke('get-procedure-recommendation', { body: { leadId: lead_id } });
        actions.push('Recomendações de procedimentos geradas');
      } catch (e) {
        console.error('Erro ao buscar recomendações:', e);
      }
    }

    // STAGE: Embaixadora
    if (newStage.name === 'Embaixadora') {
      tags.push('embaixadora:ativa');
      notifications.push({
        user_id: lead.assigned_to,
        title: '🌟 Nova Embaixadora!',
        message: `${lead.name} entrou no programa de embaixadoras`,
        type: 'ambassador',
      });
      actions.push('Cliente adicionada ao programa de embaixadoras');
    }

    // STAGE: Reativação
    if (newStage.name === 'Reativação') {
      tags.push('reativacao:em_andamento');
      tasks.push({
        lead_id,
        title: 'Reativar cliente em 24h',
        description: 'Cliente inativo - preparar oferta especial para reativação',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        assigned_to: lead.assigned_to,
      });
      actions.push('Tarefa de reativação criada');
    }

    // ======== EXECUTAR AÇÕES ========

    // Adicionar tags ao lead
    if (tags.length > 0) {
      const currentTags = lead.tags || [];
      const newTags = [...new Set([...currentTags, ...tags])];
      await supabase.from('crm_leads').update({ tags: newTags }).eq('id', lead_id);
      actions.push(`Tags adicionadas: ${tags.join(', ')}`);
    }

    // Criar tarefas
    if (tasks.length > 0) {
      for (const task of tasks) {
        await supabase.from('crm_tasks').insert(task);
      }
      actions.push(`${tasks.length} tarefa(s) criada(s)`);
    }

    // Criar notificações
    if (notifications.length > 0) {
      for (const notification of notifications) {
        await supabase.from('notifications').insert(notification);
      }
      actions.push(`${notifications.length} notificação(ões) enviada(s)`);
    }

    // Registrar no histórico
    await supabase.from('crm_lead_history').insert({
      lead_id,
      action: 'stage_automation',
      details: {
        old_stage: oldStage?.name,
        new_stage: newStage.name,
        actions_executed: actions,
        tags_added: tags,
        tasks_created: tasks.length,
        notifications_sent: notifications.length,
      },
      performed_by: performed_by || '00000000-0000-0000-0000-000000000000',
    });

    console.log("✅ Automações executadas:", actions);

    return new Response(
      JSON.stringify({
        success: true,
        lead_id,
        old_stage: oldStage?.name,
        new_stage: newStage.name,
        actions_executed: actions,
        tags_added: tags,
        tasks_created: tasks.length,
        notifications_sent: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na automação:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
