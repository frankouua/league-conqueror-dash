import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Conquista de Metas
// Conforme documento: Celebrações e gamificação

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🏆 Verificando conquistas de metas...");

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Buscar vendedores com seus resultados do mês
    const { data: sellers } = await supabase
      .from('profiles')
      .select('id, full_name, team_id, position')
      .in('position', ['SDR', 'Pré-Vendas', 'Closer', 'Comercial 1', 'Comercial 2', 'Comercial 3'])
      .eq('is_approved', true);

    const achievements: any[] = [];
    const notifications: any[] = [];

    for (const seller of sellers || []) {
      // Buscar metas do vendedor
      const { data: goals } = await supabase
        .from('individual_goals')
        .select('*')
        .eq('user_id', seller.id)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      // Buscar resultados do mês
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

      const { data: salesData } = await supabase
        .from('crm_leads')
        .select('id, contract_value')
        .eq('assigned_to', seller.id)
        .not('won_at', 'is', null)
        .gte('won_at', startOfMonth)
        .lte('won_at', endOfMonth);

      const totalSales = salesData?.reduce((acc, s) => acc + (s.contract_value || 0), 0) || 0;
      const salesCount = salesData?.length || 0;

      // Verificar metas atingidas
      for (const goal of goals || []) {
        let achieved = false;
        let achievementType = '';

        if (goal.goal_type === 'revenue' && totalSales >= goal.target_value) {
          achieved = true;
          achievementType = 'meta_faturamento';
        } else if (goal.goal_type === 'sales_count' && salesCount >= goal.target_value) {
          achieved = true;
          achievementType = 'meta_vendas';
        }

        if (achieved && !goal.achieved_at) {
          // Marcar meta como atingida
          await supabase
            .from('individual_goals')
            .update({ 
              achieved_at: new Date().toISOString(),
              current_value: goal.goal_type === 'revenue' ? totalSales : salesCount,
            })
            .eq('id', goal.id);

          // Adicionar pontos de gamificação
          await supabase.from('crm_gamification_points').insert({
            user_id: seller.id,
            action_type: achievementType,
            points: 100,
            description: `Meta ${goal.goal_type} atingida!`,
            period_month: currentMonth,
            period_year: currentYear,
          });

          achievements.push({
            user_id: seller.id,
            user_name: seller.full_name,
            goal_type: goal.goal_type,
            target: goal.target_value,
            achieved: goal.goal_type === 'revenue' ? totalSales : salesCount,
          });

          // Notificar vendedor
          notifications.push({
            user_id: seller.id,
            title: '🏆 Meta Atingida!',
            message: `Parabéns! Você atingiu sua meta de ${goal.goal_type}! +100 pontos`,
            type: 'goal_achieved',
          });

          // Registrar conquista
          await supabase.from('user_achievements').insert({
            user_id: seller.id,
            achievement_type: achievementType,
            title: `Meta de ${goal.goal_type} - ${currentMonth}/${currentYear}`,
            description: `Atingiu ${goal.goal_type === 'revenue' ? 'R$ ' + totalSales.toLocaleString() : salesCount + ' vendas'}`,
          });
        }
      }

      // Verificar milestones especiais
      const milestones = [
        { count: 10, name: 'Primeira Dezena', points: 50 },
        { count: 25, name: 'Quarto de Século', points: 100 },
        { count: 50, name: 'Cinquentão', points: 200 },
        { count: 100, name: 'Centurião', points: 500 },
      ];

      for (const milestone of milestones) {
        if (salesCount === milestone.count) {
          // Verificar se já ganhou este milestone no mês
          const { data: existingMilestone } = await supabase
            .from('crm_gamification_points')
            .select('id')
            .eq('user_id', seller.id)
            .eq('action_type', `milestone_${milestone.count}`)
            .eq('period_month', currentMonth)
            .eq('period_year', currentYear)
            .limit(1);

          if (!existingMilestone || existingMilestone.length === 0) {
            await supabase.from('crm_gamification_points').insert({
              user_id: seller.id,
              action_type: `milestone_${milestone.count}`,
              points: milestone.points,
              description: `Milestone: ${milestone.name}`,
              period_month: currentMonth,
              period_year: currentYear,
            });

            notifications.push({
              user_id: seller.id,
              title: `🎯 ${milestone.name}!`,
              message: `Você atingiu ${milestone.count} vendas no mês! +${milestone.points} pontos`,
              type: 'milestone_achieved',
            });
          }
        }
      }
    }

    // Inserir notificações
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Log da automação
    await supabase.from('automation_logs').insert({
      automation_type: 'goal_achievement',
      status: 'success',
      results: { 
        sellers_checked: sellers?.length || 0,
        achievements: achievements.length,
      },
    });

    console.log(`✅ Metas verificadas: ${achievements.length} conquistas`);

    return new Response(
      JSON.stringify({
        success: true,
        sellers_checked: sellers?.length || 0,
        achievements: achievements.length,
        details: achievements,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na verificação de metas:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
