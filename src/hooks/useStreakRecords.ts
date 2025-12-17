import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StreakRecord {
  id: string;
  teamId: string;
  teamName: string;
  consecutiveWins: number;
  startMonth: number;
  endMonth: number;
  year: number;
  createdAt: string;
}

export const useStreakRecords = () => {
  const [records, setRecords] = useState<StreakRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allTimeRecord, setAllTimeRecord] = useState<StreakRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("winning_streaks")
        .select("*")
        .order("consecutive_wins", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching streak records:", error);
        return;
      }

      const mappedRecords: StreakRecord[] = (data || []).map((r) => ({
        id: r.id,
        teamId: r.team_id,
        teamName: r.team_name,
        consecutiveWins: r.consecutive_wins,
        startMonth: r.start_month,
        endMonth: r.end_month,
        year: r.year,
        createdAt: r.created_at,
      }));

      setRecords(mappedRecords);
      if (mappedRecords.length > 0) {
        setAllTimeRecord(mappedRecords[0]);
      }
    } catch (error) {
      console.error("Error fetching streak records:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveStreakRecord = useCallback(async (
    teamId: string,
    teamName: string,
    consecutiveWins: number,
    months: number[],
    year: number
  ) => {
    if (consecutiveWins < 3) return;

    try {
      // Check if this exact streak already exists
      const { data: existing } = await supabase
        .from("winning_streaks")
        .select("id")
        .eq("team_id", teamId)
        .eq("consecutive_wins", consecutiveWins)
        .eq("start_month", months[0])
        .eq("end_month", months[months.length - 1])
        .eq("year", year)
        .maybeSingle();

      if (existing) return; // Already recorded

      const { error } = await supabase
        .from("winning_streaks")
        .insert({
          team_id: teamId,
          team_name: teamName,
          consecutive_wins: consecutiveWins,
          start_month: months[0],
          end_month: months[months.length - 1],
          year,
        });

      if (error) {
        console.error("Error saving streak record:", error);
        return;
      }

      // Refresh records
      fetchRecords();
    } catch (error) {
      console.error("Error saving streak record:", error);
    }
  }, [fetchRecords]);

  useEffect(() => {
    fetchRecords();

    const channel = supabase
      .channel("streak-records-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "winning_streaks" }, fetchRecords)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  return { records, allTimeRecord, isLoading, saveStreakRecord, refetch: fetchRecords };
};

export default useStreakRecords;
