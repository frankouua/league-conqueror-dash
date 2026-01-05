import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENT_DEFINITIONS, AchievementType } from "./useAchievements";

// Hook to check and award achievements based on user activity
export const useAchievementChecker = () => {
  
  const checkAchievement = useCallback(async (
    userId: string,
    type: AchievementType,
    teamId?: string,
    month?: number,
    year?: number
  ): Promise<boolean> => {
    const def = ACHIEVEMENT_DEFINITIONS[type];
    if (!def) return false;

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    // Check if already unlocked for this period
    const { data: existing } = await supabase
      .from("user_achievements")
      .select("id")
      .eq("user_id", userId)
      .eq("achievement_type", type)
      .eq("month", targetMonth)
      .eq("year", targetYear)
      .limit(1);

    if (existing && existing.length > 0) return false;

    // Unlock achievement
    const { error } = await supabase.from("user_achievements").insert({
      user_id: userId,
      team_id: teamId || null,
      achievement_type: type,
      achievement_name: def.name,
      description: def.description,
      icon: def.icon,
      points_value: def.points,
      month: targetMonth,
      year: targetYear
    });

    return !error;
  }, []);

  // Check sales-based achievements
  const checkSalesAchievements = useCallback(async (
    userId: string,
    totalRevenue: number,
    teamId?: string
  ) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const unlocked: string[] = [];

    if (totalRevenue > 0) {
      if (await checkAchievement(userId, "first_sale_month", teamId, month, year)) {
        unlocked.push("first_sale_month");
      }
    }
    if (totalRevenue >= 10000) {
      if (await checkAchievement(userId, "sales_10k", teamId, month, year)) {
        unlocked.push("sales_10k");
      }
    }
    if (totalRevenue >= 50000) {
      if (await checkAchievement(userId, "sales_50k", teamId, month, year)) {
        unlocked.push("sales_50k");
      }
    }
    if (totalRevenue >= 100000) {
      if (await checkAchievement(userId, "sales_100k", teamId, month, year)) {
        unlocked.push("sales_100k");
      }
    }

    return unlocked;
  }, [checkAchievement]);

  // Check referral-based achievements
  const checkReferralAchievements = useCallback(async (
    userId: string,
    totalReferrals: number,
    conversions: number,
    teamId?: string
  ) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const unlocked: string[] = [];

    if (totalReferrals >= 1) {
      if (await checkAchievement(userId, "referral_first", teamId, month, year)) {
        unlocked.push("referral_first");
      }
    }
    if (totalReferrals >= 5) {
      if (await checkAchievement(userId, "referral_5", teamId, month, year)) {
        unlocked.push("referral_5");
      }
    }
    if (totalReferrals >= 10) {
      if (await checkAchievement(userId, "referral_10", teamId, month, year)) {
        unlocked.push("referral_10");
      }
    }
    if (conversions >= 1) {
      if (await checkAchievement(userId, "referral_converted", teamId, month, year)) {
        unlocked.push("referral_converted");
      }
    }

    return unlocked;
  }, [checkAchievement]);

  // Check streak-based achievements
  const checkStreakAchievements = useCallback(async (
    userId: string,
    consecutiveDays: number,
    teamId?: string
  ) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const unlocked: string[] = [];

    if (consecutiveDays >= 3) {
      if (await checkAchievement(userId, "streak_3", teamId, month, year)) {
        unlocked.push("streak_3");
      }
    }
    if (consecutiveDays >= 5) {
      if (await checkAchievement(userId, "streak_5", teamId, month, year)) {
        unlocked.push("streak_5");
      }
    }
    if (consecutiveDays >= 7) {
      if (await checkAchievement(userId, "streak_week", teamId, month, year)) {
        unlocked.push("streak_week");
      }
    }
    if (consecutiveDays >= 10) {
      if (await checkAchievement(userId, "streak_10", teamId, month, year)) {
        unlocked.push("streak_10");
      }
    }

    return unlocked;
  }, [checkAchievement]);

  // Check NPS-based achievements
  const checkNPSAchievements = useCallback(async (
    userId: string,
    score: number,
    citedMember: boolean,
    totalPerfectNPS: number,
    teamId?: string
  ) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const unlocked: string[] = [];

    if (score === 10 && citedMember) {
      if (await checkAchievement(userId, "nps_perfect", teamId, month, year)) {
        unlocked.push("nps_perfect");
      }
    }
    if (totalPerfectNPS >= 5) {
      if (await checkAchievement(userId, "nps_5_perfect", teamId, month, year)) {
        unlocked.push("nps_5_perfect");
      }
    }

    return unlocked;
  }, [checkAchievement]);

  // Check testimonial achievements
  const checkTestimonialAchievements = useCallback(async (
    userId: string,
    type: "google" | "video" | "gold",
    isFirst: boolean,
    teamId?: string
  ) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const unlocked: string[] = [];

    if (isFirst) {
      if (await checkAchievement(userId, "testimonial_first", teamId, month, year)) {
        unlocked.push("testimonial_first");
      }
    }
    if (type === "gold") {
      if (await checkAchievement(userId, "testimonial_gold", teamId, month, year)) {
        unlocked.push("testimonial_gold");
      }
    }

    return unlocked;
  }, [checkAchievement]);

  // Check goal achievements
  const checkGoalAchievements = useCallback(async (
    userId: string,
    progressPercentage: number,
    teamId?: string
  ) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const unlocked: string[] = [];

    if (progressPercentage >= 100) {
      if (await checkAchievement(userId, "goal_achieved", teamId, month, year)) {
        unlocked.push("goal_achieved");
      }
    }
    if (progressPercentage >= 120) {
      if (await checkAchievement(userId, "goal_exceeded", teamId, month, year)) {
        unlocked.push("goal_exceeded");
      }
    }

    return unlocked;
  }, [checkAchievement]);

  // Check lead response achievements
  const checkLeadResponseAchievements = useCallback(async (
    userId: string,
    responseTimeMinutes: number,
    fastResponsesCount: number,
    teamId?: string
  ) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const unlocked: string[] = [];

    if (responseTimeMinutes < 60) {
      if (await checkAchievement(userId, "speed_demon", teamId, month, year)) {
        unlocked.push("speed_demon");
      }
    }
    if (fastResponsesCount >= 5) {
      if (await checkAchievement(userId, "quick_responder", teamId, month, year)) {
        unlocked.push("quick_responder");
      }
    }

    return unlocked;
  }, [checkAchievement]);

  return {
    checkAchievement,
    checkSalesAchievements,
    checkReferralAchievements,
    checkStreakAchievements,
    checkNPSAchievements,
    checkTestimonialAchievements,
    checkGoalAchievements,
    checkLeadResponseAchievements
  };
};

export default useAchievementChecker;
