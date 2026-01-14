import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de NPS
// Gerencia coleta de NPS e ações baseadas na resposta

interface NPSPayload {
  action: 'send_survey' | 'process_response' | 'check_pending';
  lead_id?: string;
  nps_score?: number;
  feedback?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NPSPayload = await req.json().catch(() => ({ action: 'check_pending' }));

    console.log("⭐ Automação NPS:", payload.action);

    const results: any = {};

    // ======== ENVIAR PESQUISA NPS ========
    if (payload.action === 'send_survey' && payload.lead_id) {
      const { data: lead } = await supabase
        .from('crm_leads')
        .select('id, name, phone, whatsapp, email, assigned_to, won_at')
        .eq('id', payload.lead_id)
        .single();

      if (lead) {
        // Criar registro de pesquisa pendente
        await supabase.from('nps_surveys').insert({
          lead_id: lead.id,
          status: 'pending',
          sent_at: new Date().toISOString(),
        });

        // Criar tarefa para follow-up
        await supabase.from('crm_tasks').insert({
          lead_id: lead.id,
          title: 'Coletar NPS do paciente',
          description: `Solicitar avaliação NPS de ${lead.name}`,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          assigned_to: lead.assigned_to,
        });

        results.survey_sent = {
          lead_name: lead.name,
          lead_id: lead.id,
        };
      }
    }

    // ======== PROCESSAR RESPOSTA NPS ========
    if (payload.action === 'process_response' && payload.lead_id && payload.nps_score !== undefined) {
      const { data: lead } = await supabase
        .from('crm_leads')
        .select('id, name, assigned_to, tags')
        .eq('id', payload.lead_id)
        .single();

      if (lead) {
        const score = payload.nps_score;
        let category: 'promotor' | 'neutro' | 'detrator';
        let newTags = [...(lead.tags || [])];

        // Classificar
        if (score >= 9) {
          category = 'promotor';
          newTags.push('nps:promotor');
        } else if (score >= 7) {
          category = 'neutro';
          newTags.push('nps:neutro');
        } else {
          category = 'detrator';
          newTags.push('nps:detrator');
        }

        // Atualizar lead
        await supabase.from('crm_leads').update({
          nps_score: score,
          nps_category: category,
          nps_feedback: payload.feedback,
          nps_collected_at: new Date().toISOString(),
          tags: newTags,
        }).eq('id', lead.id);

        // Registrar resposta
        await supabase.from('form_responses').insert({
          lead_id: lead.id,
          form_type: 'nps',
          nps_score: score,
          nps_category: category,
          responses: { feedback: payload.feedback },
        });

        // ====== AÇÕES BASEADAS NA CATEGORIA ======

        // PROMOTOR (9-10): Pedir indicação e depoimento
        if (category === 'promotor') {
          // Criar tarefa para solicitar indicação
          await supabase.from('crm_tasks').insert({
            lead_id: lead.id,
            title: 'Solicitar indicação de cliente promotor',
            description: `${lead.name} deu nota ${score}! Aproveite para pedir indicações e depoimento.`,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high',
            assigned_to: lead.assigned_to,
          });

          // Notificar vendedor
          await supabase.from('notifications').insert({
            user_id: lead.assigned_to,
            title: '🌟 Cliente Promotor!',
            message: `${lead.name} deu nota ${score} no NPS! Hora de pedir indicação!`,
            type: 'nps_promoter',
          });

          // Gamificação
          await supabase.functions.invoke('award-gamification-points', {
            body: {
              user_id: lead.assigned_to,
              action: 'nps_promoter',
              lead_id: lead.id,
              points: 25,
            }
          });

          results.promoter_actions = ['Tarefa de indicação criada', 'Notificação enviada', 'Pontos gamificação'];
        }

        // NEUTRO (7-8): Follow-up para entender
        if (category === 'neutro') {
          await supabase.from('crm_tasks').insert({
            lead_id: lead.id,
            title: 'Follow-up NPS neutro',
            description: `${lead.name} deu nota ${score}. Entender o que poderia melhorar.`,
            due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            priority: 'medium',
            assigned_to: lead.assigned_to,
          });

          results.neutral_actions = ['Tarefa de follow-up criada'];
        }

        // DETRATOR (0-6): Alerta urgente!
        if (category === 'detrator') {
          // Notificação urgente para vendedor
          await supabase.from('notifications').insert({
            user_id: lead.assigned_to,
            title: '🚨 ALERTA: Cliente Detrator!',
            message: `${lead.name} deu nota ${score} no NPS! Ação imediata necessária!`,
            type: 'nps_detractor',
          });

          // Notificar gestores
          const { data: admins } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');

          for (const admin of admins || []) {
            await supabase.from('notifications').insert({
              user_id: admin.user_id,
              title: '🚨 Detrator Identificado',
              message: `${lead.name} deu NPS ${score}. Feedback: ${payload.feedback || 'Não informado'}`,
              type: 'nps_detractor_alert',
            });
          }

          // Tarefa urgente
          await supabase.from('crm_tasks').insert({
            lead_id: lead.id,
            title: 'URGENTE: Reverter detrator',
            description: `Cliente ${lead.name} é detrator (NPS ${score}). Feedback: ${payload.feedback || 'Não informado'}. Ligar HOJE!`,
            due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 horas
            priority: 'urgent',
            assigned_to: lead.assigned_to,
          });

          results.detractor_actions = ['Alertas enviados', 'Tarefa urgente criada', 'Gestores notificados'];
        }

        results.nps_processed = {
          lead_name: lead.name,
          score,
          category,
          feedback: payload.feedback,
        };
      }
    }

    // ======== VERIFICAR NPS PENDENTES ========
    if (payload.action === 'check_pending') {
      // Buscar leads que fizeram cirurgia há 30+ dias e não têm NPS
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: pendingNPS } = await supabase
        .from('crm_leads')
        .select('id, name, won_at, assigned_to')
        .not('won_at', 'is', null)
        .lt('won_at', thirtyDaysAgo)
        .is('nps_score', null);

      // Criar tarefas para coletar NPS
      const tasksCreated: any[] = [];
      for (const lead of pendingNPS || []) {
        // Verificar se já tem tarefa pendente
        const { data: existingTask } = await supabase
          .from('crm_tasks')
          .select('id')
          .eq('lead_id', lead.id)
          .ilike('title', '%NPS%')
          .eq('is_completed', false)
          .limit(1);

        if (!existingTask || existingTask.length === 0) {
          await supabase.from('crm_tasks').insert({
            lead_id: lead.id,
            title: 'Coletar NPS do paciente',
            description: `Solicitar avaliação NPS de ${lead.name}`,
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'medium',
            assigned_to: lead.assigned_to,
          });

          tasksCreated.push({ lead_name: lead.name });
        }
      }

      results.pending_nps = pendingNPS?.length || 0;
      results.tasks_created = tasksCreated.length;
    }

    console.log("✅ Automação NPS concluída:", results);

    return new Response(
      JSON.stringify({
        success: true,
        action: payload.action,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na automação NPS:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
