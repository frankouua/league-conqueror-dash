import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const alerts: any[] = [];

    // Fetch SLA configurations
    const { data: slaConfigs, error: slaError } = await supabase
      .from('crm_sla_config')
      .select(`
        *,
        pipeline:crm_pipelines(id, name),
        stage:crm_stages(id, name)
      `)
      .eq('is_active', true);

    if (slaError) throw slaError;

    // Fetch active leads
    const { data: leads, error: leadsError } = await supabase
      .from('crm_leads')
      .select(`
        *,
        assigned_user:profiles!crm_leads_assigned_to_fkey(id, user_id, full_name),
        stage:crm_stages(id, name)
      `)
      .is('won_at', null)
      .is('lost_at', null);

    if (leadsError) throw leadsError;

    for (const lead of leads || []) {
      // Find applicable SLA config
      const slaConfig = slaConfigs?.find(
        (c) => c.stage_id === lead.stage_id || c.pipeline_id === lead.pipeline_id
      );

      if (!slaConfig) continue;

      // Calculate time in current stage
      const stageEnteredAt = lead.stage_entered_at ? new Date(lead.stage_entered_at) : new Date(lead.created_at);
      let hoursInStage = (now.getTime() - stageEnteredAt.getTime()) / (1000 * 60 * 60);

      // Adjust for business hours if configured
      if (slaConfig.business_hours_only) {
        // Simplified: assume 8 business hours per day
        const daysInStage = Math.floor(hoursInStage / 24);
        const remainingHours = hoursInStage % 24;
        hoursInStage = daysInStage * 8 + Math.min(remainingHours, 8);
      }

      let alertType: string | null = null;
      let alertPriority: string = 'medium';

      if (hoursInStage >= slaConfig.critical_hours) {
        alertType = 'sla_critical';
        alertPriority = 'critical';
      } else if (hoursInStage >= slaConfig.max_hours) {
        alertType = 'sla_breach';
        alertPriority = 'high';
      } else if (hoursInStage >= slaConfig.warning_hours) {
        alertType = 'sla_warning';
        alertPriority = 'medium';
      }

      if (!alertType) continue;

      // Check if alert already sent recently
      const { data: recentAlert } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', alertType)
        .eq('metadata->>lead_id', lead.id)
        .gte('created_at', new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString())
        .single();

      if (recentAlert) continue;

      // Create alert notification
      const message = `Lead "${lead.name}" está há ${Math.round(hoursInStage)}h no estágio "${lead.stage?.name || 'Desconhecido'}". SLA: ${slaConfig.max_hours}h`;

      if (lead.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: lead.assigned_to,
          title: alertType === 'sla_critical' ? '🚨 SLA CRÍTICO' : 
                 alertType === 'sla_breach' ? '⚠️ SLA Violado' : '⏰ Alerta de SLA',
          message,
          type: alertType,
          metadata: { lead_id: lead.id, hours_in_stage: hoursInStage, sla_max: slaConfig.max_hours },
        });
      }

      // Notify coordinators for critical alerts
      if (alertPriority === 'critical') {
        const { data: coordinators } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('position', 'Coordenador(a)');

        for (const coord of coordinators || []) {
          await supabase.from('notifications').insert({
            user_id: coord.user_id,
            title: '🚨 ESCALAÇÃO: SLA Crítico',
            message: `${message} - Responsável: ${lead.assigned_user?.full_name || 'Não atribuído'}`,
            type: 'sla_escalation',
            metadata: { lead_id: lead.id, assigned_to: lead.assigned_to },
          });
        }
      }

      alerts.push({
        leadId: lead.id,
        leadName: lead.name,
        alertType,
        hoursInStage: Math.round(hoursInStage),
        slaMaxHours: slaConfig.max_hours,
        assignedTo: lead.assigned_to,
      });
    }

    // Check for stale leads (no contact in 24h+)
    const { data: staleLeads } = await supabase
      .from('crm_leads')
      .select('id, name, assigned_to, last_contact_at')
      .is('won_at', null)
      .is('lost_at', null)
      .or(`last_contact_at.is.null,last_contact_at.lt.${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}`);

    for (const lead of staleLeads || []) {
      // Check if alert already sent
      const { data: recentAlert } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'lead_stale')
        .eq('metadata->>lead_id', lead.id)
        .gte('created_at', new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
        .single();

      if (recentAlert) continue;

      if (lead.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: lead.assigned_to,
          title: '📵 Lead sem contato',
          message: `Lead "${lead.name}" está há mais de 24h sem contato. Entre em contato!`,
          type: 'lead_stale',
          metadata: { lead_id: lead.id },
        });
      }

      alerts.push({
        leadId: lead.id,
        leadName: lead.name,
        alertType: 'lead_stale',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsGenerated: alerts.length,
        alerts,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error checking SLA alerts:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
