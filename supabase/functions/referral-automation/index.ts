import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Indicações (Referral)
// Gerencia programa de indicações e embaixadoras

interface ReferralPayload {
  action: 'new_referral' | 'referral_converted' | 'check_pending';
  referrer_lead_id?: string;
  referred_lead_id?: string;
  referrer_name?: string;
  referred_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ReferralPayload = await req.json().catch(() => ({ action: 'check_pending' }));

    console.log("🎁 Automação de indicações:", payload.action);

    const results: any = {};

    // ======== NOVA INDICAÇÃO ========
    if (payload.action === 'new_referral' && payload.referrer_lead_id && payload.referred_name) {
      // Buscar dados do indicador
      const { data: referrer } = await supabase
        .from('crm_leads')
        .select('id, name, email, phone, assigned_to, tags')
        .eq('id', payload.referrer_lead_id)
        .single();

      if (referrer) {
        // Criar lead indicado
        const { data: newLead, error: createError } = await supabase
          .from('crm_leads')
          .insert({
            name: payload.referred_name,
            source: 'referral',
            source_detail: `Indicado por: ${referrer.name}`,
            tags: [`indicador:${referrer.name}`, 'origem:indicacao'],
            referred_by: referrer.id,
          })
          .select()
          .single();

        if (!createError && newLead) {
          // Adicionar tag no indicador
          const newTags = [...(referrer.tags || []), `indicacao:${payload.referred_name}`];
          await supabase.from('crm_leads').update({ tags: newTags }).eq('id', referrer.id);

          // Notificar indicador
          await supabase.from('notifications').insert({
            user_id: referrer.assigned_to,
            title: '🎁 Indicação Recebida!',
            message: `${referrer.name} indicou ${payload.referred_name}. Acompanhe a conversão!`,
            type: 'referral_received',
          });

          // Criar tarefa para agradecer
          await supabase.from('crm_tasks').insert({
            lead_id: referrer.id,
            title: 'Agradecer indicação',
            description: `Agradecer ${referrer.name} pela indicação de ${payload.referred_name}`,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            priority: 'medium',
            assigned_to: referrer.assigned_to,
          });

          // Gamificação
          await supabase.functions.invoke('award-gamification-points', {
            body: {
              user_id: referrer.assigned_to,
              action: 'referral_received',
              lead_id: referrer.id,
            }
          });

          results.new_referral = {
            referrer: referrer.name,
            referred: payload.referred_name,
            new_lead_id: newLead.id,
          };
        }
      }
    }

    // ======== INDICAÇÃO CONVERTIDA ========
    if (payload.action === 'referral_converted' && payload.referred_lead_id) {
      // Buscar lead convertido e seu indicador
      const { data: convertedLead } = await supabase
        .from('crm_leads')
        .select('id, name, referred_by, contract_value, estimated_value')
        .eq('id', payload.referred_lead_id)
        .single();

      if (convertedLead?.referred_by) {
        const { data: referrer } = await supabase
          .from('crm_leads')
          .select('id, name, assigned_to, tags')
          .eq('id', convertedLead.referred_by)
          .single();

        if (referrer) {
          // Adicionar tag de conversão
          const newTags = [...(referrer.tags || []), `indicacao_convertida:${convertedLead.name}`];
          await supabase.from('crm_leads').update({ tags: newTags }).eq('id', referrer.id);

          // Calcular bônus (exemplo: 5% do valor)
          const bonus = (convertedLead.contract_value || convertedLead.estimated_value || 0) * 0.05;

          // Notificar indicador
          await supabase.from('notifications').insert({
            user_id: referrer.assigned_to,
            title: '🎉 Indicação Convertida!',
            message: `Parabéns! ${convertedLead.name} (indicado por ${referrer.name}) fechou! Bônus: R$ ${bonus.toLocaleString('pt-BR')}`,
            type: 'referral_converted',
          });

          // Gamificação - pontos extras
          await supabase.functions.invoke('award-gamification-points', {
            body: {
              user_id: referrer.assigned_to,
              action: 'referral_converted',
              lead_id: referrer.id,
              bonus_points: 50,
            }
          });

          // Registrar histórico
          await supabase.from('crm_lead_history').insert({
            lead_id: referrer.id,
            action: 'referral_bonus',
            details: {
              referred_lead: convertedLead.name,
              bonus_amount: bonus,
            },
            performed_by: '00000000-0000-0000-0000-000000000000',
          });

          results.conversion = {
            referrer: referrer.name,
            converted: convertedLead.name,
            bonus,
          };
        }
      }
    }

    // ======== VERIFICAR INDICAÇÕES PENDENTES ========
    if (payload.action === 'check_pending') {
      // Buscar leads indicados que ainda não converteram
      const { data: pendingReferrals } = await supabase
        .from('crm_leads')
        .select(`
          id, name, referred_by, created_at, assigned_to,
          referrer:crm_leads!crm_leads_referred_by_fkey(id, name, assigned_to)
        `)
        .not('referred_by', 'is', null)
        .is('won_at', null)
        .is('lost_at', null);

      // Para cada indicação, verificar se precisa de follow-up
      const followUps: any[] = [];
      for (const lead of pendingReferrals || []) {
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(lead.created_at).getTime()) / (24 * 60 * 60 * 1000)
        );

        // Se passou 7 dias, notificar para follow-up
        if (daysSinceCreation === 7 || daysSinceCreation === 14 || daysSinceCreation === 30) {
          await supabase.from('notifications').insert({
            user_id: lead.assigned_to,
            title: '📌 Follow-up de Indicação',
            message: `Lead ${lead.name} foi indicado há ${daysSinceCreation} dias e ainda não converteu`,
            type: 'referral_followup',
          });

          followUps.push({
            lead_name: lead.name,
            days_pending: daysSinceCreation,
          });
        }
      }

      results.pending_referrals = pendingReferrals?.length || 0;
      results.follow_ups_sent = followUps.length;
    }

    // ======== VERIFICAR EMBAIXADORAS ATIVAS ========
    // Buscar leads com tag de embaixadora
    const { data: ambassadors } = await supabase
      .from('crm_leads')
      .select('id, name, tags')
      .contains('tags', ['embaixadora:ativa']);

    // Contar indicações por embaixadora
    const ambassadorStats: any[] = [];
    for (const ambassador of ambassadors || []) {
      const { count } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by', ambassador.id);

      const { count: convertedCount } = await supabase
        .from('crm_leads')
        .select('id', { count: 'exact', head: true })
        .eq('referred_by', ambassador.id)
        .not('won_at', 'is', null);

      ambassadorStats.push({
        name: ambassador.name,
        total_referrals: count || 0,
        converted: convertedCount || 0,
      });
    }

    results.ambassadors = ambassadorStats;

    console.log("✅ Automação de indicações concluída:", results);

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
    console.error("❌ Erro na automação de indicações:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
