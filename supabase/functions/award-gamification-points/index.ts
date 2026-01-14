import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PointsRequest {
  userId: string;
  actionType: string;
  leadId?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, actionType, leadId, metadata }: PointsRequest = await req.json();

    if (!userId || !actionType) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId and actionType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the gamification rule for this action
    const { data: rule, error: ruleError } = await supabase
      .from('crm_gamification_rules')
      .select('*')
      .eq('action_type', actionType)
      .eq('is_active', true)
      .single();

    if (ruleError || !rule) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active rule found for this action type' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let points = rule.base_points;
    let multiplier = 1;
    const multiplierReasons: string[] = [];

    // Apply multiplier conditions
    if (rule.multiplier_conditions) {
      const conditions = rule.multiplier_conditions;

      // Time-based multiplier (e.g., quick response)
      if (conditions.quick_response && metadata?.responseTimeMinutes) {
        if (metadata.responseTimeMinutes <= 5) {
          multiplier *= 2;
          multiplierReasons.push('Resposta rápida (2x)');
        } else if (metadata.responseTimeMinutes <= 15) {
          multiplier *= 1.5;
          multiplierReasons.push('Resposta ágil (1.5x)');
        }
      }

      // Value-based multiplier
      if (conditions.value_threshold && metadata?.contractValue) {
        if (metadata.contractValue >= conditions.value_threshold.high) {
          multiplier *= 2;
          multiplierReasons.push('Alto valor (2x)');
        } else if (metadata.contractValue >= conditions.value_threshold.medium) {
          multiplier *= 1.5;
          multiplierReasons.push('Médio valor (1.5x)');
        }
      }

      // Streak multiplier
      if (conditions.streak_bonus) {
        const { data: streakData } = await supabase
          .from('crm_gamification_points')
          .select('created_at')
          .eq('user_id', userId)
          .eq('action_type', actionType)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(7);

        if (streakData && streakData.length >= 5) {
          multiplier *= 1.5;
          multiplierReasons.push('Streak 5 dias (1.5x)');
        }
      }
    }

    const finalPoints = Math.round(points * multiplier);

    // Record the points
    const { data: pointsRecord, error: insertError } = await supabase
      .from('crm_gamification_points')
      .insert({
        user_id: userId,
        action_type: actionType,
        points: finalPoints,
        lead_id: leadId,
        multiplier,
        multiplier_reason: multiplierReasons.join(', ') || null,
        metadata,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Check for achievement unlocks
    const achievements = await checkAchievements(supabase, userId);

    // Get updated totals
    const { data: totals } = await supabase
      .from('crm_gamification_points')
      .select('points')
      .eq('user_id', userId);

    const totalPoints = totals?.reduce((sum, r) => sum + r.points, 0) || 0;

    // Determine level
    const level = Math.floor(totalPoints / 500) + 1;
    const pointsToNextLevel = (level * 500) - totalPoints;

    return new Response(
      JSON.stringify({
        success: true,
        pointsAwarded: finalPoints,
        basePoints: points,
        multiplier,
        multiplierReasons,
        totalPoints,
        level,
        pointsToNextLevel,
        achievementsUnlocked: achievements,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error awarding points:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkAchievements(supabase: any, userId: string): Promise<any[]> {
  const unlockedAchievements: any[] = [];

  // Fetch all active achievements
  const { data: achievements } = await supabase
    .from('crm_gamification_achievements')
    .select('*')
    .eq('is_active', true);

  // Fetch user's current achievements
  const { data: userAchievements } = await supabase
    .from('crm_user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const unlockedIds = new Set(userAchievements?.map((a: any) => a.achievement_id) || []);

  for (const achievement of achievements || []) {
    if (unlockedIds.has(achievement.id)) continue;

    let qualified = false;
    let currentValue = 0;

    switch (achievement.requirement_type) {
      case 'sales_count':
        const { count: salesCount } = await supabase
          .from('crm_leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .not('won_at', 'is', null);
        currentValue = salesCount || 0;
        qualified = currentValue >= achievement.requirement_value;
        break;

      case 'referrals_count':
        const { count: refCount } = await supabase
          .from('referral_leads')
          .select('id', { count: 'exact', head: true })
          .eq('referred_by_user', userId);
        currentValue = refCount || 0;
        qualified = currentValue >= achievement.requirement_value;
        break;

      case 'quick_responses':
        const { count: quickCount } = await supabase
          .from('crm_gamification_points')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('action_type', 'quick_response');
        currentValue = quickCount || 0;
        qualified = currentValue >= achievement.requirement_value;
        break;

      case 'total_points':
        const { data: pointsData } = await supabase
          .from('crm_gamification_points')
          .select('points')
          .eq('user_id', userId);
        currentValue = pointsData?.reduce((s: number, r: any) => s + r.points, 0) || 0;
        qualified = currentValue >= achievement.requirement_value;
        break;
    }

    if (qualified) {
      // Unlock the achievement
      await supabase.from('crm_user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id,
      });

      // Award XP
      if (achievement.xp_reward) {
        await supabase.from('crm_gamification_points').insert({
          user_id: userId,
          action_type: 'achievement_unlocked',
          points: achievement.xp_reward,
          metadata: { achievement_id: achievement.id, achievement_name: achievement.name },
        });
      }

      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: `🏆 Conquista Desbloqueada!`,
        message: `Você desbloqueou "${achievement.name}"! +${achievement.xp_reward || 0} XP`,
        type: 'achievement',
        metadata: { achievement_id: achievement.id },
      });

      unlockedAchievements.push(achievement);
    }
  }

  return unlockedAchievements;
}
