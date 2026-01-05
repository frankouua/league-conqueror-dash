import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS = {
  // Sales milestones
  first_sale_month: {
    name: "Primeira Venda do Mês",
    description: "Registrou a primeira venda do mês",
    icon: "🎯",
    points: 10,
    category: "sales"
  },
  sales_10k: {
    name: "R$ 10K em Vendas",
    description: "Atingiu R$ 10.000 em vendas no mês",
    icon: "💰",
    points: 20,
    category: "sales"
  },
  sales_50k: {
    name: "R$ 50K em Vendas",
    description: "Atingiu R$ 50.000 em vendas no mês",
    icon: "💎",
    points: 50,
    category: "sales"
  },
  sales_100k: {
    name: "R$ 100K em Vendas",
    description: "Atingiu R$ 100.000 em vendas no mês",
    icon: "👑",
    points: 100,
    category: "sales"
  },
  
  // Referrals
  referral_first: {
    name: "Primeira Indicação",
    description: "Coletou a primeira indicação",
    icon: "🌟",
    points: 10,
    category: "referrals"
  },
  referral_5: {
    name: "5 Indicações",
    description: "Coletou 5 indicações no mês",
    icon: "⭐",
    points: 25,
    category: "referrals"
  },
  referral_10: {
    name: "10 Indicações",
    description: "Coletou 10 indicações no mês",
    icon: "🌠",
    points: 50,
    category: "referrals"
  },
  referral_converted: {
    name: "Indicação Convertida",
    description: "Converteu uma indicação em cirurgia",
    icon: "🎊",
    points: 30,
    category: "referrals"
  },
  
  // Streaks
  streak_3: {
    name: "Sequência de 3 Dias",
    description: "3 dias consecutivos com vendas",
    icon: "🔥",
    points: 15,
    category: "streaks"
  },
  streak_5: {
    name: "Sequência de 5 Dias",
    description: "5 dias consecutivos com vendas",
    icon: "🔥🔥",
    points: 30,
    category: "streaks"
  },
  streak_10: {
    name: "Sequência de 10 Dias",
    description: "10 dias consecutivos com vendas",
    icon: "🔥🔥🔥",
    points: 60,
    category: "streaks"
  },
  streak_week: {
    name: "Semana Perfeita",
    description: "7 dias consecutivos com vendas",
    icon: "📅",
    points: 40,
    category: "streaks"
  },
  
  // Quality
  testimonial_first: {
    name: "Primeiro Depoimento",
    description: "Conseguiu o primeiro depoimento",
    icon: "📝",
    points: 15,
    category: "quality"
  },
  testimonial_gold: {
    name: "Depoimento Gold",
    description: "Conseguiu um depoimento Gold",
    icon: "🏅",
    points: 50,
    category: "quality"
  },
  nps_perfect: {
    name: "NPS Perfeito",
    description: "Recebeu NPS 10 com citação de nome",
    icon: "💯",
    points: 20,
    category: "quality"
  },
  nps_5_perfect: {
    name: "5 NPS Perfeitos",
    description: "Recebeu 5 NPS nota 10 no mês",
    icon: "🌟",
    points: 40,
    category: "quality"
  },
  
  // Goals
  goal_achieved: {
    name: "Meta Batida",
    description: "Atingiu 100% da meta mensal",
    icon: "🏆",
    points: 100,
    category: "goals"
  },
  goal_exceeded: {
    name: "Meta Superada",
    description: "Ultrapassou 120% da meta mensal",
    icon: "🚀",
    points: 150,
    category: "goals"
  },
  
  // Lead Response
  speed_demon: {
    name: "Speed Demon",
    description: "Respondeu lead em menos de 1 hora",
    icon: "⚡",
    points: 15,
    category: "leads"
  },
  quick_responder: {
    name: "Resposta Rápida",
    description: "5 leads respondidos em menos de 2h",
    icon: "🏃",
    points: 25,
    category: "leads"
  },
  
  // Special
  comeback: {
    name: "Virada Épica",
    description: "Liderou após estar em 2º lugar",
    icon: "🔄",
    points: 50,
    category: "special"
  },
  champion_month: {
    name: "Campeão do Mês",
    description: "Liderou a equipe campeã do mês",
    icon: "👑",
    points: 100,
    category: "special"
  },
  champion_semester: {
    name: "Campeão do Semestre",
    description: "Liderou a equipe campeã do semestre",
    icon: "🏆",
    points: 200,
    category: "special"
  }
} as const;

export type AchievementType = keyof typeof ACHIEVEMENT_DEFINITIONS;

export interface UserAchievement {
  id: string;
  user_id: string;
  team_id: string | null;
  achievement_type: string;
  achievement_name: string;
  description: string | null;
  icon: string | null;
  points_value: number;
  unlocked_at: string;
  month: number | null;
  year: number | null;
  metadata: Record<string, unknown>;
}

interface AchievementStats {
  totalAchievements: number;
  totalPoints: number;
  byCategory: Record<string, number>;
  recentAchievements: UserAchievement[];
}

export const useAchievements = (userId?: string, month?: number, year?: number) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>({
    totalAchievements: 0,
    totalPoints: 0,
    byCategory: {},
    recentAchievements: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", targetUserId)
        .order("unlocked_at", { ascending: false });

      if (month && year) {
        query = query.eq("month", month).eq("year", year);
      }

      const { data, error } = await query;

      if (error) throw error;

      const achievementsData = (data || []) as UserAchievement[];
      setAchievements(achievementsData);

      // Calculate stats
      const totalPoints = achievementsData.reduce((sum, a) => sum + (a.points_value || 0), 0);
      const byCategory: Record<string, number> = {};
      
      for (const achievement of achievementsData) {
        const def = ACHIEVEMENT_DEFINITIONS[achievement.achievement_type as AchievementType];
        if (def) {
          byCategory[def.category] = (byCategory[def.category] || 0) + 1;
        }
      }

      setStats({
        totalAchievements: achievementsData.length,
        totalPoints,
        byCategory,
        recentAchievements: achievementsData.slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, month, year]);

  // Check and unlock achievements
  const checkAndUnlockAchievement = useCallback(async (
    type: AchievementType,
    targetMonth?: number,
    targetYear?: number
  ) => {
    if (!targetUserId) return false;

    const def = ACHIEVEMENT_DEFINITIONS[type];
    if (!def) return false;

    // Check if already unlocked for this period
    const existingQuery = supabase
      .from("user_achievements")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("achievement_type", type);

    if (targetMonth && targetYear) {
      existingQuery.eq("month", targetMonth).eq("year", targetYear);
    }

    const { data: existing } = await existingQuery.limit(1);
    
    if (existing && existing.length > 0) return false;

    // Unlock new achievement
    const { error } = await supabase.from("user_achievements").insert({
      user_id: targetUserId,
      achievement_type: type,
      achievement_name: def.name,
      description: def.description,
      icon: def.icon,
      points_value: def.points,
      month: targetMonth || new Date().getMonth() + 1,
      year: targetYear || new Date().getFullYear()
    });

    if (!error) {
      fetchAchievements();
      return true;
    }
    return false;
  }, [targetUserId, fetchAchievements]);

  // Get all team achievements for leaderboard
  const getTeamAchievements = useCallback(async (teamId: string) => {
    const { data, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("team_id", teamId)
      .order("unlocked_at", { ascending: false });

    if (error) {
      console.error("Error fetching team achievements:", error);
      return [];
    }
    return data as UserAchievement[];
  }, []);

  // Get leaderboard
  const getAchievementLeaderboard = useCallback(async (limitCount = 10) => {
    const { data, error } = await supabase
      .from("user_achievements")
      .select("user_id, points_value")
      .order("unlocked_at", { ascending: false });

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }

    // Aggregate by user
    const userPoints: Record<string, number> = {};
    for (const achievement of (data || [])) {
      userPoints[achievement.user_id] = (userPoints[achievement.user_id] || 0) + (achievement.points_value || 0);
    }

    return Object.entries(userPoints)
      .map(([userId, points]) => ({ userId, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limitCount);
  }, []);

  useEffect(() => {
    fetchAchievements();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("achievements-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: targetUserId ? `user_id=eq.${targetUserId}` : undefined
        },
        () => fetchAchievements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAchievements, targetUserId]);

  return {
    achievements,
    stats,
    isLoading,
    checkAndUnlockAchievement,
    getTeamAchievements,
    getAchievementLeaderboard,
    refetch: fetchAchievements,
    definitions: ACHIEVEMENT_DEFINITIONS
  };
};

export default useAchievements;
