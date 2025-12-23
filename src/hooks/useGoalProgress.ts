import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useGoalProgress = () => {
  const { user } = useAuth();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const { data: goalData } = useQuery({
    queryKey: ["goal-progress", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get user's predefined goal
      const { data: goals } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("matched_user_id", user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();

      if (!goals) return null;

      // Get user's revenue for the month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0];
      const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];

      const { data: revenues } = await supabase
        .from("revenue_records")
        .select("amount")
        .or(`user_id.eq.${user.id},attributed_to_user_id.eq.${user.id}`)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth);

      const totalRevenue = revenues?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const goal = goals.meta1_goal || 0;
      const progress = goal > 0 ? (totalRevenue / goal) * 100 : 0;

      return {
        goal,
        current: totalRevenue,
        progress,
        isNearGoal: progress >= 90 && progress < 100,
        hasReachedGoal: progress >= 100,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return goalData;
};
