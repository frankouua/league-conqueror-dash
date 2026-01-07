import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DepartmentProgress {
  name: string;
  goal: number;
  sold: number;
}

interface TeamProgressData {
  teamId: string;
  teamName: string;
  departments: DepartmentProgress[];
  totalGoal: number;
  totalSold: number;
}

interface TeamQuantityData {
  teamId: string;
  teamName: string;
  departments: DepartmentProgress[];
  totalGoal: number;
  totalSold: number;
}

// Map database department strings to department_goals names
const DEPARTMENT_MAPPING: Record<string, string> = {
  "01 - CIRURGIA PLÁSTICA": "Cirurgia Plástica",
  "02 - CONSULTA CIRURGIA PLÁSTICA": "Consulta Cirurgia Plástica",
  "03 - PÓS OPERATÓRIO": "Pós Operatório",
  "04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS": "Soroterapia / Protocolos Nutricionais",
  "05 - RETORNO": "Retorno",
  "06 - RETOQUE - CIRURGIA PLÁSTICA": "Cirurgia Plástica",
  "08 - HARMONIZAÇÃO FACIAL E CORPORAL": "Harmonização Facial e Corporal",
  "09 - SPA E ESTÉTICA": "Spa e Estética",
  "16 - OUTROS": "Unique Travel Experience",
  "LUXSKIN": "Luxskin",
  "15 - LUXSKIN": "Luxskin",
};

// Short names for display
const SHORT_NAMES: Record<string, string> = {
  "Cirurgia Plástica": "Cirurgia",
  "Consulta Cirurgia Plástica": "Consulta",
  "Pós Operatório": "Pós-Op",
  "Soroterapia / Protocolos Nutricionais": "Soroterapia",
  "Harmonização Facial e Corporal": "Harmonia",
  "Spa e Estética": "Spa",
  "Unique Travel Experience": "Travel",
  "Luxskin": "Luxskin",
};

export const useTeamProgressData = (month: number, year: number) => {
  const [teamsProgress, setTeamsProgress] = useState<TeamProgressData[]>([]);
  const [teamsQuantity, setTeamsQuantity] = useState<TeamQuantityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Calculate date range
      const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      // Fetch all data in parallel
      const [
        { data: teams },
        { data: departmentGoals },
        { data: quantityGoals },
        { data: revenueRecords },
      ] = await Promise.all([
        supabase.from("teams").select("id, name").order("name"),
        supabase
          .from("department_goals")
          .select("*")
          .eq("month", month)
          .eq("year", year),
        supabase
          .from("department_quantity_goals")
          .select("*")
          .eq("month", month)
          .eq("year", year),
        supabase
          .from("revenue_records")
          .select("team_id, department, amount")
          .gte("date", startOfMonth)
          .lte("date", endOfMonth),
      ]);

      if (!teams || teams.length === 0) {
        setTeamsProgress([]);
        setTeamsQuantity([]);
        return;
      }

      // Build goal maps
      const goalsByDept: Record<string, number> = {};
      departmentGoals?.forEach((dg) => {
        goalsByDept[dg.department_name] = dg.meta1_goal;
      });

      const qtyGoalsByDept: Record<string, number> = {};
      quantityGoals?.forEach((qg) => {
        qtyGoalsByDept[qg.department_name] = qg.quantity_goal;
      });

      // Process each team for revenue progress
      const progressData: TeamProgressData[] = teams.map((team) => {
        const deptSales: Record<string, number> = {};
        
        revenueRecords
          ?.filter((r) => r.team_id === team.id)
          .forEach((r) => {
            const rawDept = r.department || "";
            const mappedDept = DEPARTMENT_MAPPING[rawDept] || "Outros";
            
            if (!deptSales[mappedDept]) {
              deptSales[mappedDept] = 0;
            }
            deptSales[mappedDept] += Number(r.amount) || 0;
          });

        const departments: DepartmentProgress[] = [];
        let totalGoal = 0;
        let totalSold = 0;

        Object.entries(goalsByDept).forEach(([deptName, goal]) => {
          const teamGoal = goal / 2;
          const sold = deptSales[deptName] || 0;
          
          departments.push({
            name: SHORT_NAMES[deptName] || deptName,
            goal: teamGoal,
            sold,
          });
          
          totalGoal += teamGoal;
          totalSold += sold;
        });

        departments.sort((a, b) => b.goal - a.goal);

        return {
          teamId: team.id,
          teamName: team.name,
          departments,
          totalGoal,
          totalSold,
        };
      });

      // Process each team for quantity progress
      const quantityData: TeamQuantityData[] = teams.map((team) => {
        const deptCounts: Record<string, number> = {};
        
        revenueRecords
          ?.filter((r) => r.team_id === team.id)
          .forEach((r) => {
            const rawDept = r.department || "";
            const mappedDept = DEPARTMENT_MAPPING[rawDept] || "Outros";
            
            if (!deptCounts[mappedDept]) {
              deptCounts[mappedDept] = 0;
            }
            deptCounts[mappedDept] += 1; // Count each record
          });

        const departments: DepartmentProgress[] = [];
        let totalGoal = 0;
        let totalSold = 0;

        Object.entries(qtyGoalsByDept).forEach(([deptName, goal]) => {
          const teamGoal = Math.ceil(goal / 2); // Each team gets half
          const sold = deptCounts[deptName] || 0;
          
          departments.push({
            name: SHORT_NAMES[deptName] || deptName,
            goal: teamGoal,
            sold,
          });
          
          totalGoal += teamGoal;
          totalSold += sold;
        });

        departments.sort((a, b) => b.goal - a.goal);

        return {
          teamId: team.id,
          teamName: team.name,
          departments,
          totalGoal,
          totalSold,
        };
      });

      setTeamsProgress(progressData);
      setTeamsQuantity(quantityData);
    } catch (error) {
      console.error("Error fetching team progress:", error);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { teamsProgress, teamsQuantity, isLoading, refetch: fetchData };
};
