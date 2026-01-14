import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationPayload {
  action: 'check_pending' | 'validate' | 'alert_pending';
  lead_id?: string;
  checklist?: {
    contracts_signed: boolean;
    entry_payment_received: boolean;
    payment_plan_confirmed: boolean;
    surgery_date_confirmed: boolean;
    patient_data_complete: boolean;
  };
  notes?: string;
  validated_by?: string;
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

    const payload: ValidationPayload = await req.json();

    // Verificar leads pendentes de validação (D-3)
    if (payload.action === 'check_pending') {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { data: pendingLeads } = await supabase
        .from('crm_leads')
        .select(`
          id, name, surgery_date, phone, email,
          coordinator_validated, coordinator_validated_at,
          assigned_to, profiles:assigned_to(full_name)
        `)
        .not('surgery_date', 'is', null)
        .lte('surgery_date', threeDaysFromNow.toISOString().split('T')[0])
        .gte('surgery_date', new Date().toISOString().split('T')[0])
        .eq('coordinator_validated', false)
        .is('won_at', null)
        .is('lost_at', null);

      return new Response(
        JSON.stringify({ 
          success: true, 
          pending: pendingLeads || [],
          count: pendingLeads?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar lead
    if (payload.action === 'validate') {
      if (!payload.lead_id || !payload.checklist) {
        return new Response(
          JSON.stringify({ success: false, error: 'lead_id e checklist são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const allChecked = Object.values(payload.checklist).every(v => v === true);

      // Upsert checklist
      const { error: checklistError } = await supabase
        .from('coordinator_validation_checklist')
        .upsert({
          lead_id: payload.lead_id,
          ...payload.checklist,
          notes: payload.notes,
          validated: allChecked,
          validated_at: allChecked ? new Date().toISOString() : null,
          validated_by: payload.validated_by
        }, {
          onConflict: 'lead_id'
        });

      if (checklistError) {
        // Se não existe, inserir
        await supabase
          .from('coordinator_validation_checklist')
          .insert({
            lead_id: payload.lead_id,
            ...payload.checklist,
            notes: payload.notes,
            validated: allChecked,
            validated_at: allChecked ? new Date().toISOString() : null,
            validated_by: payload.validated_by
          });
      }

      // Atualizar lead
      if (allChecked) {
        await supabase
          .from('crm_leads')
          .update({
            coordinator_validated: true,
            coordinator_validated_at: new Date().toISOString(),
            coordinator_validated_by: payload.validated_by
          })
          .eq('id', payload.lead_id);

        // Registrar no histórico
        await supabase
          .from('crm_lead_history')
          .insert({
            lead_id: payload.lead_id,
            action: 'coordinator_validated',
            description: 'Validação do Coordenador concluída - Todos os itens verificados',
            performed_by: payload.validated_by,
            metadata: { checklist: payload.checklist }
          });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          validated: allChecked,
          message: allChecked 
            ? 'Lead validado com sucesso' 
            : 'Checklist atualizado, mas ainda há itens pendentes'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Alertar sobre leads pendentes
    if (payload.action === 'alert_pending') {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { data: pendingLeads } = await supabase
        .from('crm_leads')
        .select('id, name, surgery_date, assigned_to')
        .not('surgery_date', 'is', null)
        .lte('surgery_date', threeDaysFromNow.toISOString().split('T')[0])
        .gte('surgery_date', new Date().toISOString().split('T')[0])
        .eq('coordinator_validated', false)
        .is('won_at', null)
        .is('lost_at', null);

      const notifications = [];

      // Buscar coordenadores/gestores
      const { data: coordinators } = await supabase
        .from('profiles')
        .select('user_id')
        .in('position', ['Coordenador', 'Gestor', 'Gerente']);

      for (const lead of pendingLeads || []) {
        // Notificar coordenadores
        for (const coord of coordinators || []) {
          notifications.push({
            user_id: coord.user_id,
            title: '⚠️ Validação Pendente',
            message: `Lead ${lead.name} tem cirurgia em ${lead.surgery_date} e ainda não foi validado`,
            type: 'coordinator_validation_pending'
          });
        }

        // Notificar vendedor responsável
        if (lead.assigned_to) {
          notifications.push({
            user_id: lead.assigned_to,
            title: '⚠️ Validação do Coordenador Pendente',
            message: `Seu lead ${lead.name} precisa de validação antes da cirurgia em ${lead.surgery_date}`,
            type: 'coordinator_validation_pending'
          });
        }
      }

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          alertsSent: notifications.length,
          pendingLeads: pendingLeads?.length || 0
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
