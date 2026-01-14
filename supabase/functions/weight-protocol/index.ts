import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeightPayload {
  action: 'record_weight' | 'check_progress' | 'alert_delayed' | 'get_history';
  lead_id?: string;
  weight?: number;
  notes?: string;
  recorded_by?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WeightPayload = await req.json();

    // Registrar peso
    if (payload.action === 'record_weight') {
      if (!payload.lead_id || !payload.weight) {
        return new Response(
          JSON.stringify({ success: false, error: 'lead_id e weight são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Buscar dados do lead
      const { data: lead } = await supabase
        .from('crm_leads')
        .select('initial_weight, target_weight, current_weight, name, assigned_to')
        .eq('id', payload.lead_id)
        .single();

      // Registrar histórico
      await supabase
        .from('lead_weight_tracking')
        .insert({
          lead_id: payload.lead_id,
          weight: payload.weight,
          target_weight: lead?.target_weight,
          weight_loss_goal: lead?.initial_weight ? lead.initial_weight - (lead?.target_weight || 0) : null,
          notes: payload.notes,
          recorded_by: payload.recorded_by
        });

      // Atualizar peso atual no lead
      await supabase
        .from('crm_leads')
        .update({ current_weight: payload.weight })
        .eq('id', payload.lead_id);

      // Calcular progresso
      const initialWeight = lead?.initial_weight || payload.weight;
      const targetWeight = lead?.target_weight || payload.weight;
      const weightLost = initialWeight - payload.weight;
      const goalWeight = initialWeight - targetWeight;
      const progressPercent = goalWeight > 0 ? (weightLost / goalWeight) * 100 : 0;

      // Registrar no histórico do lead
      await supabase
        .from('crm_lead_history')
        .insert({
          lead_id: payload.lead_id,
          action: 'weight_recorded',
          description: `Peso registrado: ${payload.weight}kg (${progressPercent.toFixed(1)}% do objetivo)`,
          performed_by: payload.recorded_by,
          metadata: { 
            weight: payload.weight, 
            progress: progressPercent,
            target: targetWeight
          }
        });

      // Verificar se atingiu a meta
      if (payload.weight <= targetWeight && lead?.assigned_to) {
        await supabase
          .from('notifications')
          .insert({
            user_id: lead.assigned_to,
            title: '🎉 Meta de Peso Atingida!',
            message: `${lead.name} atingiu o peso objetivo de ${targetWeight}kg!`,
            type: 'weight_goal_achieved'
          });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          currentWeight: payload.weight,
          targetWeight,
          progress: progressPercent,
          goalAchieved: payload.weight <= targetWeight
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar progresso de todos os leads em protocolo
    if (payload.action === 'check_progress') {
      const { data: leadsInProtocol } = await supabase
        .from('crm_leads')
        .select(`
          id, name, initial_weight, target_weight, current_weight, 
          weight_loss_deadline, surgery_date, assigned_to
        `)
        .eq('needs_weight_loss', true)
        .is('won_at', null)
        .is('lost_at', null);

      const analysis = (leadsInProtocol || []).map(lead => {
        const initialWeight = lead.initial_weight || 0;
        const targetWeight = lead.target_weight || 0;
        const currentWeight = lead.current_weight || initialWeight;
        const goalWeight = initialWeight - targetWeight;
        const weightLost = initialWeight - currentWeight;
        const progressPercent = goalWeight > 0 ? (weightLost / goalWeight) * 100 : 0;

        // Calcular dias restantes
        const deadline = lead.weight_loss_deadline || lead.surgery_date;
        const daysRemaining = deadline 
          ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        // Calcular ritmo necessário
        const weightRemaining = currentWeight - targetWeight;
        const dailyNeeded = daysRemaining && daysRemaining > 0 
          ? weightRemaining / daysRemaining 
          : null;

        // Status
        let status = 'on_track';
        if (progressPercent >= 100) {
          status = 'achieved';
        } else if (daysRemaining !== null && daysRemaining <= 0) {
          status = 'overdue';
        } else if (dailyNeeded && dailyNeeded > 0.15) { // Mais de 150g/dia é muito
          status = 'at_risk';
        } else if (progressPercent < 30 && daysRemaining && daysRemaining < 30) {
          status = 'delayed';
        }

        return {
          lead_id: lead.id,
          name: lead.name,
          initialWeight,
          currentWeight,
          targetWeight,
          weightLost,
          progressPercent,
          daysRemaining,
          dailyNeeded,
          status,
          assigned_to: lead.assigned_to
        };
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          leads: analysis,
          summary: {
            total: analysis.length,
            achieved: analysis.filter(l => l.status === 'achieved').length,
            onTrack: analysis.filter(l => l.status === 'on_track').length,
            atRisk: analysis.filter(l => l.status === 'at_risk').length,
            delayed: analysis.filter(l => l.status === 'delayed').length,
            overdue: analysis.filter(l => l.status === 'overdue').length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Alertar leads atrasados
    if (payload.action === 'alert_delayed') {
      const { data: leadsInProtocol } = await supabase
        .from('crm_leads')
        .select('id, name, initial_weight, target_weight, current_weight, weight_loss_deadline, assigned_to')
        .eq('needs_weight_loss', true)
        .is('won_at', null)
        .is('lost_at', null);

      const notifications = [];

      for (const lead of leadsInProtocol || []) {
        const initialWeight = lead.initial_weight || 0;
        const targetWeight = lead.target_weight || 0;
        const currentWeight = lead.current_weight || initialWeight;
        const goalWeight = initialWeight - targetWeight;
        const weightLost = initialWeight - currentWeight;
        const progressPercent = goalWeight > 0 ? (weightLost / goalWeight) * 100 : 0;

        const deadline = lead.weight_loss_deadline;
        const daysRemaining = deadline 
          ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        // Alerta se atrasado
        if (daysRemaining !== null && daysRemaining <= 7 && progressPercent < 80 && lead.assigned_to) {
          notifications.push({
            user_id: lead.assigned_to,
            title: '⚠️ Protocolo de Peso Atrasado',
            message: `${lead.name} está com ${progressPercent.toFixed(1)}% do objetivo e faltam apenas ${daysRemaining} dias`,
            type: 'weight_protocol_delayed'
          });
        }
      }

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      return new Response(
        JSON.stringify({ success: true, alertsSent: notifications.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar histórico de peso
    if (payload.action === 'get_history') {
      if (!payload.lead_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'lead_id é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data: history } = await supabase
        .from('lead_weight_tracking')
        .select('*')
        .eq('lead_id', payload.lead_id)
        .order('recorded_at', { ascending: true });

      const { data: lead } = await supabase
        .from('crm_leads')
        .select('initial_weight, target_weight, current_weight, weight_loss_deadline')
        .eq('id', payload.lead_id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          history: history || [],
          lead: lead || {}
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
