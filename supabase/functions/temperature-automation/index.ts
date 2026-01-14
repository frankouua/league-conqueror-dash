import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Temperatura de Leads
// Atualiza automaticamente a temperatura baseado em comportamento

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🌡️ Iniciando análise de temperatura de leads...");

    // Buscar todos os leads ativos
    const { data: leads, error: leadsError } = await supabase
      .from('crm_leads')
      .select(`
        id, name, temperature, created_at, last_activity_at, 
        stage_changed_at, estimated_value, tags, assigned_to, stage_id
      `)
      .is('won_at', null)
      .is('lost_at', null);

    if (leadsError) throw leadsError;

    const updates: any[] = [];
    const notifications: any[] = [];

    for (const lead of leads || []) {
      let newTemperature = lead.temperature || 'cold';
      let reason = '';

      // Calcular dias sem atividade
      const lastActivity = lead.last_activity_at || lead.stage_changed_at || lead.created_at;
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Buscar interações recentes
      const { count: recentInteractions } = await supabase
        .from('crm_lead_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', lead.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const interactionCount = recentInteractions || 0;

      // Buscar sentimento das interações
      const { data: sentiments } = await supabase
        .from('crm_lead_interactions')
        .select('sentiment')
        .eq('lead_id', lead.id)
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      const positiveSentiments = sentiments?.filter(s => s.sentiment === 'positive').length || 0;
      const negativeSentiments = sentiments?.filter(s => s.sentiment === 'negative').length || 0;
      const totalSentiments = sentiments?.length || 0;

      // ====== REGRAS DE TEMPERATURA ======
      // Buscar nome do estágio se necessário
      let stageName = '';
      if (lead.stage_id) {
        const { data: stageData } = await supabase
          .from('crm_stages')
          .select('name')
          .eq('id', lead.stage_id)
          .single();
        stageName = stageData?.name || '';
      }

      // HOT (Quente): Alta atividade, interações positivas, valor alto
      if (
        (interactionCount >= 3 && daysSinceActivity <= 2) ||
        (positiveSentiments > 0 && positiveSentiments >= totalSentiments * 0.7) ||
        (stageName?.includes('Proposta') || stageName?.includes('Negociação')) ||
        (lead.estimated_value && lead.estimated_value >= 10000 && daysSinceActivity <= 3)
      ) {
        newTemperature = 'hot';
        reason = 'Alta atividade recente e/ou interesse demonstrado';
      }
      // WARM (Morno): Atividade moderada
      else if (
        (interactionCount >= 1 && daysSinceActivity <= 5) ||
        (daysSinceActivity <= 7 && lead.temperature === 'hot')
      ) {
        newTemperature = 'warm';
        reason = 'Atividade moderada';
      }
      // COLD (Frio): Pouca ou nenhuma atividade
      else if (daysSinceActivity > 7) {
        newTemperature = 'cold';
        reason = `Sem atividade há ${daysSinceActivity} dias`;
      }

      // Se sentimento predominante for negativo, esfriar
      if (negativeSentiments > positiveSentiments && totalSentiments >= 2) {
        if (newTemperature === 'hot') newTemperature = 'warm';
        else if (newTemperature === 'warm') newTemperature = 'cold';
        reason = 'Interações com sentimento negativo';
      }

      // Se temperatura mudou, atualizar
      if (newTemperature !== lead.temperature) {
        updates.push({
          id: lead.id,
          name: lead.name,
          old_temperature: lead.temperature,
          new_temperature: newTemperature,
          reason,
        });

        // Atualizar lead
        await supabase.from('crm_leads').update({
          temperature: newTemperature,
          updated_at: new Date().toISOString(),
        }).eq('id', lead.id);

        // Registrar histórico
        await supabase.from('crm_lead_history').insert({
          lead_id: lead.id,
          action: 'temperature_change',
          details: {
            old_temperature: lead.temperature,
            new_temperature: newTemperature,
            reason,
            days_since_activity: daysSinceActivity,
            recent_interactions: interactionCount,
          },
          performed_by: '00000000-0000-0000-0000-000000000000',
        });

        // Notificar se esfriou de HOT para COLD
        if (lead.temperature === 'hot' && newTemperature === 'cold') {
          notifications.push({
            user_id: lead.assigned_to,
            title: '❄️ Lead Esfriou!',
            message: `${lead.name} mudou de QUENTE para FRIO. Sem atividade há ${daysSinceActivity} dias.`,
            type: 'lead_cooled',
          });
        }

        // Notificar se esquentou para HOT
        if (newTemperature === 'hot' && lead.temperature !== 'hot') {
          notifications.push({
            user_id: lead.assigned_to,
            title: '🔥 Lead Esquentou!',
            message: `${lead.name} está QUENTE! ${reason}`,
            type: 'lead_heated',
          });
        }
      }
    }

    // Inserir notificações
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    console.log(`✅ Análise concluída: ${updates.length} leads atualizados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${updates.length} leads com temperatura atualizada`,
        updates,
        notifications_sent: notifications.length,
        total_analyzed: leads?.length || 0,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na automação de temperatura:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
