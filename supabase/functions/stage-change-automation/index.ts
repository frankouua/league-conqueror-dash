import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Mudança de Stage
// Executa ações automáticas quando um lead muda de estágio
// Nota: As tarefas do checklist são criadas pela edge function create-stage-tasks

interface StageChangePayload {
  lead_id: string;
  old_stage_id?: string;
  new_stage_id: string;
  performed_by?: string;
}

// Configuração de pontuação para indicações na Copa
const REFERRAL_POINTS = {
  // Estágios que dão pontos quando lead de indicação chega
  CONSULTA_REALIZADA: 15, // "Consulta Realizada/Negociação"
  CIRURGIA_REALIZADA: 30, // "Cirurgia Realizada"
};

// Nomes de estágios que dão pontos (case insensitive matching)
const CONSULTA_STAGE_NAMES = ['consulta realizada', 'negociação', 'consulta realizada/negociação'];
const CIRURGIA_STAGE_NAMES = ['cirurgia realizada', 'operou', 'ganho (transferência)'];

// Fontes que identificam um lead como indicação
const REFERRAL_SOURCES = ['indicação', 'indicacao', '[1.6] indicação de paciente'];

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
      supabase.from('crm_leads').select('*, assigned_to, team_id, pipeline_id, source').eq('id', lead_id).single(),
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
    const tags: string[] = [];

    // ======== PONTUAÇÃO COPA - INDICAÇÕES ========
    // Verifica se é um lead de indicação e dá pontos ao time
    const isReferralLead = lead.source && 
      REFERRAL_SOURCES.some(src => lead.source.toLowerCase().includes(src));
    
    if (isReferralLead && lead.team_id) {
      const newStageLower = newStage.name.toLowerCase();
      let copaPoints = 0;
      let copaReason = '';
      
      // Verifica se chegou em Consulta Realizada
      if (CONSULTA_STAGE_NAMES.some(name => newStageLower.includes(name))) {
        // Verificar se já não deu pontos para esse lead nesse estágio
        const { data: existingCard } = await supabase
          .from('cards')
          .select('id')
          .eq('team_id', lead.team_id)
          .eq('reason', `Indicação consultou: ${lead.name}`)
          .single();
        
        if (!existingCard) {
          copaPoints = REFERRAL_POINTS.CONSULTA_REALIZADA;
          copaReason = `Indicação consultou: ${lead.name}`;
        }
      }
      
      // Verifica se chegou em Cirurgia Realizada
      if (CIRURGIA_STAGE_NAMES.some(name => newStageLower.includes(name))) {
        const { data: existingCard } = await supabase
          .from('cards')
          .select('id')
          .eq('team_id', lead.team_id)
          .eq('reason', `Indicação operou: ${lead.name}`)
          .single();
        
        if (!existingCard) {
          copaPoints = REFERRAL_POINTS.CIRURGIA_REALIZADA;
          copaReason = `Indicação operou: ${lead.name}`;
        }
      }
      
      // Registrar pontos na tabela cards
      if (copaPoints > 0 && copaReason) {
        const { error: cardError } = await supabase
          .from('cards')
          .insert({
            team_id: lead.team_id,
            type: 'bonus', // Tipo bonus adicionado ao enum card_type
            points: copaPoints,
            reason: copaReason,
            applied_by: performed_by || lead.assigned_to || '00000000-0000-0000-0000-000000000000',
            date: new Date().toISOString().split('T')[0],
          });
        
        if (!cardError) {
          actions.push(`🏆 Copa: +${copaPoints} pontos para o time (${copaReason})`);
          console.log(`🏆 Copa points awarded: ${copaPoints} for ${copaReason}`);
          
          // Notificar o time
          notifications.push({
            user_id: lead.assigned_to,
            title: `🏆 +${copaPoints} Pontos na Copa!`,
            message: copaReason,
            type: 'copa_points',
          });
        } else {
          console.error('Erro ao registrar pontos Copa:', cardError);
        }
      }
    }

    // ======== AUTOMAÇÕES POR STAGE (Tags, Notificações, Updates) ========
    // Nota: As tarefas do checklist são criadas automaticamente pela create-stage-tasks

    // STAGE: Engajamento (Social Selling)
    if (newStage.name === 'Engajamento') {
      tags.push('origem:social', 'temperatura:frio');
      actions.push('Tags de engajamento adicionadas');
    }

    // STAGE: Contato Inicial
    if (newStage.name === 'Contato Inicial' || newStage.name === 'Novo Lead') {
      tags.push('status:primeiro_contato');
      actions.push('Tag de primeiro contato adicionada');
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
      actions.push('Tag de agendamento adicionada');
    }

    // STAGE: Consulta Agendada
    if (newStage.name === 'Consulta Agendada' || newStage.name === 'Aguardando Consulta') {
      tags.push('etapa:consulta_agendada');
      actions.push('Tag de consulta agendada adicionada');
    }

    // STAGE: Proposta Enviada
    if (newStage.name === 'Proposta Enviada' || newStage.name === 'Negociação') {
      tags.push('etapa:proposta');
      // Notificar coordenação
      notifications.push({
        user_id: performed_by || lead.assigned_to,
        title: '📋 Proposta Enviada',
        message: `Proposta enviada para ${lead.name} - acompanhar fechamento`,
        type: 'lead_proposal',
      });
      actions.push('Notificação de proposta enviada');
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
    if (newStage.name === 'Venda Ganha' || newStage.name === 'Ganho' || newStage.is_win_stage) {
      tags.push('resultado:ganho');
      await supabase.from('crm_leads').update({ 
        won_at: new Date().toISOString(),
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
    if (newStage.name === 'Perdido' || newStage.is_lost_stage) {
      tags.push('resultado:perdido');
      await supabase.from('crm_leads').update({ 
        lost_at: new Date().toISOString(),
      }).eq('id', lead_id);
      actions.push('Lead marcado como perdido');
    }

    // STAGE: Pós-Cirurgia
    if (newStage.name === 'Pós-Cirurgia' || newStage.name === 'Pós-Operatório') {
      tags.push('etapa:pos_cirurgia');
      actions.push('Tag de pós-cirurgia adicionada');
    }

    // STAGE: Upsell / Cross-sell
    if (newStage.name === 'Oportunidade Upsell' || newStage.name === 'Upsell') {
      tags.push('oportunidade:upsell');
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
      actions.push('Tag de reativação adicionada');
    }

    // ======== EXECUTAR AÇÕES ========

    // Adicionar tags ao lead
    if (tags.length > 0) {
      const currentTags = lead.tags || [];
      const newTags = [...new Set([...currentTags, ...tags])];
      await supabase.from('crm_leads').update({ tags: newTags }).eq('id', lead_id);
      actions.push(`Tags adicionadas: ${tags.join(', ')}`);
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
      action_type: 'stage_automation',
      title: 'Automação de estágio executada',
      metadata: {
        old_stage: oldStage?.name,
        new_stage: newStage.name,
        actions_executed: actions,
        tags_added: tags,
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
        notifications_sent: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("❌ Erro na automação:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
