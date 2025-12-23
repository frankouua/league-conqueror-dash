import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PredefinedGoal {
  id: string;
  first_name: string;
  department: string;
  position: string;
  meta1_goal: number;
  meta2_goal: number;
  meta3_goal: number;
  month: number;
  year: number;
  matched_user_id: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  contested: boolean;
  contest_reason: string | null;
}

export function usePredefinedGoals() {
  const { user } = useAuth();
  const [pendingGoal, setPendingGoal] = useState<PredefinedGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingGoal = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data, error: fetchError } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("matched_user_id", user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .eq("confirmed", false)
        .eq("contested", false)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setPendingGoal(data);
    } catch (err) {
      console.error("Error fetching pending goal:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar metas");
    } finally {
      setLoading(false);
    }
  };

  const confirmGoal = async (goalId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("predefined_goals")
        .update({
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", goalId);

      if (updateError) throw updateError;
      setPendingGoal(null);
      return { success: true };
    } catch (err) {
      console.error("Error confirming goal:", err);
      return { success: false, error: err instanceof Error ? err.message : "Erro ao confirmar meta" };
    }
  };

  const contestGoal = async (goalId: string, reason: string) => {
    try {
      const { error: updateError } = await supabase
        .from("predefined_goals")
        .update({
          contested: true,
          contest_reason: reason,
        })
        .eq("id", goalId);

      if (updateError) throw updateError;
      setPendingGoal(null);
      return { success: true };
    } catch (err) {
      console.error("Error contesting goal:", err);
      return { success: false, error: err instanceof Error ? err.message : "Erro ao contestar meta" };
    }
  };

  useEffect(() => {
    fetchPendingGoal();
  }, [user]);

  return {
    pendingGoal,
    loading,
    error,
    confirmGoal,
    contestGoal,
    refetch: fetchPendingGoal,
  };
}
