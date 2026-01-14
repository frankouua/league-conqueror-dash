import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Performance de Vendedores - Análise e alertas
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("📊 Iniciando análise de performance de vendedores...");

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Buscar todos os vendedores
    const { data: sellers, error: sellersError } = await supabase
      .from('profiles')
      .select('user_id, full_name, team_id')
      .in('position', ['Vendedor', 'Pré-vendedor', 'Closer', 'SDR', 'Especialista de Vendas']);

    if (sellersError) throw sellersError;

    console.log(`📊 Analisando ${sellers?.length || 0} vendedores`);

    const performanceData = [];
    let alertsSent = 0;
    let topPerformers = 0;
    let needsAttention = 0;

    for (const seller of sellers || []) {
      try {
        // Buscar métricas do vendedor
        const { data: leads } = await supabase
          .from('crm_leads')
          .select('id, won_at, lost_at, contract_value, estimated_value, created_at')
          .eq('assigned_to', seller.user_id);

        const totalLeads = leads?.length || 0;
        const wonLeads = leads?.filter(l => l.won_at && new Date(l.won_at) >= startOfMonth) || [];
        const lostLeads = leads?.filter(l => l.lost_at && new Date(l.lost_at) >= startOfMonth) || [];
        const activeLeads = leads?.filter(l => !l.won_at && !l.lost_at) || [];

        const monthlyRevenue = wonLeads.reduce((sum, l) => sum + (l.contract_value || l.estimated_value || 0), 0);
        const conversionRate = (wonLeads.length + lostLeads.length) > 0 
          ? (wonLeads.length / (wonLeads.length + lostLeads.length)) * 100 
          : 0;

        // Buscar atividades do mês
        const { data: activities } = await supabase
          .from('crm_lead_history')
          .select('id')
          .eq('performed_by', seller.user_id)
          .gte('created_at', startOfMonth.toISOString());

        const activityCount = activities?.length || 0;

        // Calcular score de performance (0-100)
        let performanceScore = 0;
        performanceScore += Math.min(conversionRate, 30); // Max 30 pontos por conversão
        performanceScore += Math.min(wonLeads.length * 5, 25); // Max 25 pontos por vendas
        performanceScore += Math.min(activityCount * 0.5, 25); // Max 25 pontos por atividade
        performanceScore += Math.min(activeLeads.length * 2, 20); // Max 20 pontos por pipeline

        const sellerPerformance = {
          user_id: seller.user_id,
          name: seller.full_name,
          team_id: seller.team_id,
          total_leads: totalLeads,
          active_leads: activeLeads.length,
          won_this_month: wonLeads.length,
          lost_this_month: lostLeads.length,
          monthly_revenue: monthlyRevenue,
          conversion_rate: Math.round(conversionRate * 10) / 10,
          activity_count: activityCount,
          performance_score: Math.round(performanceScore),
          status: performanceScore >= 70 ? 'excellent' : performanceScore >= 50 ? 'good' : performanceScore >= 30 ? 'average' : 'needs_attention'
        };

        performanceData.push(sellerPerformance);

        // Enviar alertas baseado em performance
        if (sellerPerformance.status === 'excellent') {
          topPerformers++;
        } else if (sellerPerformance.status === 'needs_attention') {
          needsAttention++;
          
          // Buscar coordenadores para alertar
          const { data: admins } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('is_admin', true);

          for (const admin of admins || []) {
            await supabase.from('notifications').insert({
              user_id: admin.user_id,
              title: `⚠️ Vendedor precisa de atenção: ${seller.full_name}`,
              message: `Score: ${performanceScore}/100. Conversão: ${conversionRate.toFixed(1)}%. Atividades: ${activityCount}`,
              type: 'performance_alert'
            });
            alertsSent++;
          }
        }

        // Notificar vendedor sobre sua própria performance (se for excelente)
        if (sellerPerformance.status === 'excellent') {
          await supabase.from('notifications').insert({
            user_id: seller.user_id,
            title: `🏆 Parabéns! Performance excelente!`,
            message: `Seu score este mês é ${performanceScore}/100. Continue assim!`,
            type: 'performance_praise'
          });
        }

      } catch (e) {
        console.error(`Erro ao analisar vendedor ${seller.user_id}:`, e);
      }
    }

    // Salvar snapshot de performance
    await supabase.from('automation_logs').insert({
      automation_type: 'seller-performance',
      status: 'success',
      results: {
        total_sellers: sellers?.length,
        top_performers: topPerformers,
        needs_attention: needsAttention,
        performance_data: performanceData.slice(0, 10) // Top 10
      },
      completed_at: new Date().toISOString()
    });

    console.log("✅ Análise de performance concluída!", {
      totalSellers: sellers?.length,
      topPerformers,
      needsAttention,
      alertsSent
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Seller performance analysis completed",
        total_sellers: sellers?.length,
        top_performers: topPerformers,
        needs_attention: needsAttention,
        alerts_sent: alertsSent,
        performance_data: performanceData,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error("❌ Erro na análise de performance:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
