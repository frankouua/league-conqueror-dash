import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Marketing - Processa campanhas ativas e envia comunicações
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("📣 Iniciando automação de marketing...");

    const today = new Date().toISOString().split('T')[0];

    // Buscar campanhas ativas
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today);

    if (campaignsError) throw campaignsError;

    console.log(`📊 ${campaigns?.length || 0} campanhas ativas encontradas`);

    let processedCampaigns = 0;
    let leadsContacted = 0;
    let alertsSent = 0;

    for (const campaign of campaigns || []) {
      try {
        // Verificar se precisa enviar alerta de campanha
        const daysUntilEnd = Math.ceil(
          (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        if (campaign.alert_days_before && daysUntilEnd <= campaign.alert_days_before) {
          // Verificar se já enviou alerta hoje
          const { data: existingAlert } = await supabase
            .from('campaign_alerts')
            .select('id')
            .eq('campaign_id', campaign.id)
            .eq('alert_type', 'ending_soon')
            .gte('sent_at', today)
            .maybeSingle();

          if (!existingAlert) {
            // Enviar alerta para todos os vendedores
            const { data: sellers } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .in('position', ['Vendedor', 'Pré-vendedor', 'Closer', 'SDR']);

            for (const seller of sellers || []) {
              await supabase.from('notifications').insert({
                user_id: seller.user_id,
                title: `⏰ Campanha "${campaign.name}" termina em ${daysUntilEnd} dias!`,
                message: campaign.goal_description || `Meta: ${campaign.goal_value}`,
                type: 'campaign_alert'
              });
              alertsSent++;
            }

            await supabase.from('campaign_alerts').insert({
              campaign_id: campaign.id,
              alert_type: 'ending_soon',
              message: `Campanha termina em ${daysUntilEnd} dias`
            });
          }
        }

        // Buscar leads elegíveis para a campanha (baseado no tipo)
        let leadsQuery = supabase
          .from('crm_leads')
          .select('id, name, phone, email, assigned_to, temperature')
          .is('lost_at', null)
          .is('won_at', null);

        // Filtrar por tipo de campanha
        switch (campaign.campaign_type) {
          case 'reactivation':
            leadsQuery = leadsQuery.eq('is_stale', true);
            break;
          case 'hot_leads':
            leadsQuery = leadsQuery.eq('temperature', 'hot');
            break;
          case 'recurrence':
            leadsQuery = leadsQuery.eq('is_recurrence', true);
            break;
        }

        const { data: eligibleLeads } = await leadsQuery.limit(100);

        // Registrar leads elegíveis para follow-up
        for (const lead of eligibleLeads || []) {
          // Verificar se já foi contatado nesta campanha
          const { data: existingAction } = await supabase
            .from('crm_lead_history')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('action_type', 'campaign_contact')
            .gte('created_at', campaign.start_date)
            .maybeSingle();

          if (!existingAction && lead.assigned_to) {
            // Criar tarefa para o vendedor
            await supabase.from('crm_lead_tasks').insert({
              lead_id: lead.id,
              assigned_to: lead.assigned_to,
              title: `Campanha: ${campaign.name}`,
              description: campaign.description || `Contatar lead para campanha ${campaign.name}`,
              priority: 'high',
              due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            leadsContacted++;
          }
        }

        processedCampaigns++;
      } catch (e) {
        console.error(`Erro ao processar campanha ${campaign.id}:`, e);
      }
    }

    console.log("✅ Automação de marketing concluída!", {
      processedCampaigns,
      leadsContacted,
      alertsSent
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Marketing automation completed",
        processed_campaigns: processedCampaigns,
        leads_contacted: leadsContacted,
        alerts_sent: alertsSent,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error("❌ Erro na automação de marketing:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
