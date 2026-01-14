import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TravelPayload {
  action: 'check_pending' | 'update_travel' | 'alert_d45' | 'get_details';
  lead_id?: string;
  travel_data?: any;
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

    const payload: TravelPayload = await req.json();

    // Verificar leads que precisam de viagem organizada
    if (payload.action === 'check_pending') {
      const { data: pendingTravel } = await supabase
        .from('crm_leads')
        .select(`
          id, name, surgery_date, phone, email, assigned_to,
          lead_travel(*)
        `)
        .eq('needs_travel', true)
        .eq('travel_organized', false)
        .not('surgery_date', 'is', null)
        .is('won_at', null)
        .is('lost_at', null);

      const leadsWithStatus = (pendingTravel || []).map(lead => {
        const travel = lead.lead_travel?.[0];
        const daysUntilSurgery = lead.surgery_date 
          ? Math.ceil((new Date(lead.surgery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        const checklist = {
          flight_arrival: !!travel?.arrival_flight,
          flight_departure: !!travel?.departure_flight,
          hotel: !!travel?.hotel_name && travel?.hotel_confirmed,
          driver: !!travel?.driver_name && travel?.driver_confirmed,
          companion: !travel?.has_companion || !!travel?.companion_name,
          home_care: !travel?.needs_home_care || !!travel?.home_care_nurse
        };

        const completedItems = Object.values(checklist).filter(v => v).length;
        const totalItems = Object.keys(checklist).length;

        return {
          ...lead,
          travel,
          daysUntilSurgery,
          checklist,
          progress: Math.round((completedItems / totalItems) * 100),
          urgency: daysUntilSurgery && daysUntilSurgery <= 7 ? 'critical' :
                   daysUntilSurgery && daysUntilSurgery <= 30 ? 'high' :
                   daysUntilSurgery && daysUntilSurgery <= 45 ? 'medium' : 'low'
        };
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          leads: leadsWithStatus,
          summary: {
            total: leadsWithStatus.length,
            critical: leadsWithStatus.filter(l => l.urgency === 'critical').length,
            high: leadsWithStatus.filter(l => l.urgency === 'high').length,
            medium: leadsWithStatus.filter(l => l.urgency === 'medium').length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar dados de viagem
    if (payload.action === 'update_travel') {
      if (!payload.lead_id || !payload.travel_data) {
        return new Response(
          JSON.stringify({ success: false, error: 'lead_id e travel_data são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Verificar se todos os itens obrigatórios estão preenchidos
      const allConfirmed = 
        payload.travel_data.arrival_flight &&
        payload.travel_data.departure_flight &&
        payload.travel_data.hotel_confirmed &&
        payload.travel_data.driver_confirmed &&
        (!payload.travel_data.has_companion || payload.travel_data.companion_name) &&
        (!payload.travel_data.needs_home_care || payload.travel_data.home_care_nurse);

      // Upsert travel data
      const { error } = await supabase
        .from('lead_travel')
        .upsert({
          lead_id: payload.lead_id,
          ...payload.travel_data,
          all_confirmed: allConfirmed
        }, { onConflict: 'lead_id' });

      if (error) {
        // Se falhou, tentar insert
        await supabase
          .from('lead_travel')
          .insert({
            lead_id: payload.lead_id,
            ...payload.travel_data,
            all_confirmed: allConfirmed
          });
      }

      // Atualizar status no lead
      await supabase
        .from('crm_leads')
        .update({ travel_organized: allConfirmed })
        .eq('id', payload.lead_id);

      // Registrar no histórico
      await supabase
        .from('crm_lead_history')
        .insert({
          lead_id: payload.lead_id,
          action: 'travel_updated',
          description: allConfirmed 
            ? 'Viagem completamente organizada' 
            : 'Dados de viagem atualizados',
          metadata: payload.travel_data
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          allConfirmed,
          message: allConfirmed 
            ? 'Viagem organizada com sucesso!' 
            : 'Dados atualizados. Alguns itens ainda pendentes.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Alertar D-45 (45 dias antes da cirurgia)
    if (payload.action === 'alert_d45') {
      const d45 = new Date();
      d45.setDate(d45.getDate() + 45);

      const { data: upcomingTravel } = await supabase
        .from('crm_leads')
        .select(`
          id, name, surgery_date, assigned_to, team_id,
          lead_travel(*)
        `)
        .eq('needs_travel', true)
        .eq('travel_organized', false)
        .lte('surgery_date', d45.toISOString().split('T')[0])
        .gte('surgery_date', new Date().toISOString().split('T')[0])
        .is('won_at', null)
        .is('lost_at', null);

      const notifications = [];
      const tasks = [];

      for (const lead of upcomingTravel || []) {
        const daysUntil = Math.ceil(
          (new Date(lead.surgery_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        // Notificar vendedor
        if (lead.assigned_to) {
          notifications.push({
            user_id: lead.assigned_to,
            title: '✈️ Organizar Viagem - D-' + daysUntil,
            message: `${lead.name} precisa de viagem organizada para cirurgia em ${lead.surgery_date}`,
            type: 'travel_organization'
          });

          // Criar tarefa
          tasks.push({
            lead_id: lead.id,
            title: `Organizar viagem - ${lead.name}`,
            description: `Faltam ${daysUntil} dias para a cirurgia. Verificar: voos, hotel, motorista, acompanhante.`,
            due_date: new Date().toISOString(),
            assigned_to: lead.assigned_to,
            priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 30 ? 'high' : 'medium'
          });
        }
      }

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      if (tasks.length > 0) {
        await supabase.from('crm_tasks').insert(tasks);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          alertsSent: notifications.length,
          tasksCreated: tasks.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar detalhes de viagem
    if (payload.action === 'get_details') {
      if (!payload.lead_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'lead_id é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data: travel } = await supabase
        .from('lead_travel')
        .select('*')
        .eq('lead_id', payload.lead_id)
        .single();

      const { data: lead } = await supabase
        .from('crm_leads')
        .select('name, surgery_date, surgery_location, needs_travel, travel_organized')
        .eq('id', payload.lead_id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          travel: travel || {},
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
