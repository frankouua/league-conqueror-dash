import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação Pós-Venda
// Conforme documento: Fluxo pós-venda com checklist cirúrgico e acompanhamento

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🎯 Iniciando automação pós-venda...");

    // Buscar leads que acabaram de fechar (won_at nas últimas 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: newWins, error: winsError } = await supabase
      .from('crm_leads')
      .select('id, name, phone, email, assigned_to, contract_value, interested_procedures')
      .gte('won_at', oneDayAgo)
      .is('post_surgery_checklist_assigned', null);

    if (winsError) throw winsError;

    console.log(`📋 ${newWins?.length || 0} novas vendas para processar`);

    const processed: string[] = [];
    const tasks: any[] = [];
    const notifications: any[] = [];

    for (const lead of newWins || []) {
      // Buscar checklist cirúrgico apropriado
      const procedureName = lead.interested_procedures?.[0] || 'geral';
      
      const { data: checklist } = await supabase
        .from('crm_surgery_checklist')
        .select('*')
        .or(`procedure_type.ilike.%${procedureName}%,procedure_type.eq.geral`)
        .eq('is_active', true)
        .limit(1);

      if (checklist && checklist.length > 0) {
        // Atribuir checklist ao lead
        await supabase.from('crm_lead_surgery_checklist').insert({
          lead_id: lead.id,
          checklist_id: checklist[0].id,
          completed_items: {},
          completion_percentage: 0,
        });

        // Marcar lead como processado
        await supabase
          .from('crm_leads')
          .update({ post_surgery_checklist_assigned: true })
          .eq('id', lead.id);

        processed.push(lead.id);
      }

      // Criar tarefas pós-venda conforme documento
      const postSaleTasks = [
        { title: 'Enviar contrato assinado', days: 0, priority: 'high' },
        { title: 'Confirmar exames pré-operatórios', days: 1, priority: 'high' },
        { title: 'Agendar retorno pós-procedimento', days: 2, priority: 'medium' },
        { title: 'Enviar orientações pré-procedimento', days: 3, priority: 'medium' },
        { title: 'Ligar confirmando tudo ok', days: 5, priority: 'medium' },
        { title: 'Pesquisa NPS pós-procedimento', days: 30, priority: 'low' },
      ];

      for (const task of postSaleTasks) {
        tasks.push({
          lead_id: lead.id,
          title: task.title,
          description: `Tarefa pós-venda automática para ${lead.name}`,
          due_date: new Date(Date.now() + task.days * 24 * 60 * 60 * 1000).toISOString(),
          priority: task.priority,
          assigned_to: lead.assigned_to,
          status: 'pending',
        });
      }

      // Notificar vendedor
      if (lead.assigned_to) {
        notifications.push({
          user_id: lead.assigned_to,
          title: '🎉 Nova Venda Fechada!',
          message: `Parabéns! Venda de ${lead.name} concluída. Tarefas pós-venda criadas.`,
          type: 'sale_closed',
        });
      }

      // Registrar no histórico
      await supabase.from('crm_lead_history').insert({
        lead_id: lead.id,
        action_type: 'post_sale_automation',
        title: 'Automação pós-venda iniciada',
        description: 'Checklist cirúrgico e tarefas criadas automaticamente',
        performed_by: '00000000-0000-0000-0000-000000000000',
      });
    }

    // Inserir tarefas em lote
    if (tasks.length > 0) {
      await supabase.from('crm_tasks').insert(tasks);
    }

    // Inserir notificações
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Log da automação
    await supabase.from('automation_logs').insert({
      automation_type: 'post_sale',
      status: 'success',
      results: { processed: processed.length, tasks_created: tasks.length },
    });

    console.log(`✅ Pós-venda processado: ${processed.length} leads, ${tasks.length} tarefas criadas`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processed.length,
        tasks_created: tasks.length,
        notifications_sent: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na automação pós-venda:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
