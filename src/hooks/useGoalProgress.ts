import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useGoalProgress = (selectedMonth?: number, selectedYear?: number) => {
  const { user } = useAuth();
  
  // Use current month/year if not specified
  const currentDate = new Date();
  const month = selectedMonth ?? (currentDate.getMonth() + 1);
  const year = selectedYear ?? currentDate.getFullYear();

  const { data: goalData } = useQuery({
    queryKey: ["goal-progress", user?.id, month, year],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get user's predefined goal
      const { data: goals } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("matched_user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (!goals) return null;

      // Get user's revenue for the month
      const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

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
        month,
        year,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return goalData;
};
