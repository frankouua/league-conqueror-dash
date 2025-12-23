import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fireGoalConfetti } from "@/lib/confetti";

interface GoalCheck {
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  month: number;
  year: number;
  goalType: "revenue" | "nps" | "testimonials" | "referrals";
  goalValue: number;
  actualValue: number;
}

export const useGoalNotifications = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const checkedGoalsRef = useRef<Set<string>>(new Set());

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch all data needed for goal checking
  const { data: profiles } = useQuery({
    queryKey: ["profiles-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["teams-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: goals } = useQuery({
    queryKey: ["goals-notifications", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear);
      if (error) throw error;
      return data;
    },
  });

  const { data: existingNotifications } = useQuery({
    queryKey: ["existing-notifications", currentMonth, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .gte("created_at", startDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch records for the current month
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;

  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-notifications", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: npsRecords } = useQuery({
    queryKey: ["nps-notifications", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: testimonialRecords } = useQuery({
    queryKey: ["testimonials-notifications", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonial_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const { data: referralRecords } = useQuery({
    queryKey: ["referrals-notifications", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Create notification mutation
  const createNotification = useMutation({
    mutationFn: async (notification: {
      user_id?: string;
      team_id?: string;
      type: string;
      title: string;
      message: string;
    }) => {
      const { error } = await supabase.from("notifications").insert(notification);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["existing-notifications"] });
    },
  });

  // Check goals and create notifications
  useEffect(() => {
    if (!goals || !profiles || !teams || !existingNotifications) return;

    const teamMap = new Map(teams.map(t => [t.id, t.name]));
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    // Check individual goals
    goals.forEach(goal => {
      const profile = profileMap.get(goal.user_id);
      if (!profile) return;

      const userRevenue = revenueRecords?.filter(r => r.user_id === goal.user_id).reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const userNps = npsRecords?.filter(r => r.user_id === goal.user_id).length || 0;
      const userTestimonials = testimonialRecords?.filter(r => r.user_id === goal.user_id).length || 0;
      const userReferrals = referralRecords?.filter(r => r.user_id === goal.user_id).reduce((sum, r) => sum + r.collected + r.to_consultation + r.to_surgery, 0) || 0;

      const goalTypes = [
        { type: "revenue", goal: Number(goal.revenue_goal), actual: userRevenue, label: "Faturamento" },
        { type: "nps", goal: goal.nps_goal, actual: userNps, label: "NPS" },
        { type: "testimonials", goal: goal.testimonials_goal, actual: userTestimonials, label: "Depoimentos" },
        { type: "referrals", goal: goal.referrals_goal, actual: userReferrals, label: "Indicações" },
      ];

      goalTypes.forEach(({ type, goal: goalValue, actual, label }) => {
        if (goalValue <= 0) return;

        const progress = (actual / goalValue) * 100;
        const nearGoalKey = `near_${goal.user_id}_${type}_${currentMonth}_${currentYear}`;
        const achievedKey = `individual_${goal.user_id}_${type}_${currentMonth}_${currentYear}`;
        
        // Check for 90% notification (near goal)
        if (progress >= 90 && progress < 100) {
          const existingNearNotif = existingNotifications.find(n => 
            n.user_id === goal.user_id && 
            n.type === "goal_near" && 
            n.title.includes(label)
          );

          if (!existingNearNotif && !checkedGoalsRef.current.has(nearGoalKey)) {
            checkedGoalsRef.current.add(nearGoalKey);
            
            const remaining = goalValue - actual;
            const remainingFormatted = type === "revenue" 
              ? `R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : `${remaining}`;
            
            createNotification.mutate({
              user_id: goal.user_id,
              team_id: goal.team_id,
              type: "goal_near",
              title: `🔥 Falta pouco! ${label} a 90%`,
              message: `Você está quase lá! Faltam apenas ${remainingFormatted} para bater sua meta de ${label}!`,
            });

            // Show toast if it's the current user
            if (goal.user_id === user?.id) {
              toast({
                title: `🔥 Falta pouco para sua meta de ${label}!`,
                description: `Você está a 90%! Faltam apenas ${remainingFormatted}.`,
              });
            }
          }
        }

        // Check for 100% notification (goal achieved)
        const existingNotif = existingNotifications.find(n => 
          n.user_id === goal.user_id && 
          n.type === "goal_individual" && 
          n.title.includes(label)
        );

        if (existingNotif || checkedGoalsRef.current.has(achievedKey)) return;

        if (actual >= goalValue) {
          checkedGoalsRef.current.add(achievedKey);
          
          createNotification.mutate({
            user_id: goal.user_id,
            team_id: goal.team_id,
            type: "goal_individual",
            title: `🎯 Meta de ${label} Atingida!`,
            message: `${profile.full_name} atingiu sua meta individual de ${label}! (${actual}/${goalValue})`,
          });

          // Show toast and confetti if it's the current user
          if (goal.user_id === user?.id) {
            toast({
              title: `🎯 Meta de ${label} Atingida!`,
              description: `Parabéns! Você atingiu sua meta de ${label}!`,
            });
            fireGoalConfetti();
          }
        }
      });
    });

    // Check team goals
    teams.forEach(team => {
      const teamMembers = profiles.filter(p => p.team_id === team.id);
      const teamGoals = goals.filter(g => g.team_id === team.id);

      if (teamGoals.length === 0) return;

      let totalRevenueGoal = 0, totalNpsGoal = 0, totalTestimonialsGoal = 0, totalReferralsGoal = 0;
      let totalRevenue = 0, totalNps = 0, totalTestimonials = 0, totalReferrals = 0;

      teamMembers.forEach(member => {
        const memberGoal = teamGoals.find(g => g.user_id === member.user_id);
        if (memberGoal) {
          totalRevenueGoal += Number(memberGoal.revenue_goal);
          totalNpsGoal += memberGoal.nps_goal;
          totalTestimonialsGoal += memberGoal.testimonials_goal;
          totalReferralsGoal += memberGoal.referrals_goal;
        }

        totalRevenue += revenueRecords?.filter(r => r.user_id === member.user_id).reduce((sum, r) => sum + Number(r.amount), 0) || 0;
        totalNps += npsRecords?.filter(r => r.user_id === member.user_id).length || 0;
        totalTestimonials += testimonialRecords?.filter(r => r.user_id === member.user_id).length || 0;
        totalReferrals += referralRecords?.filter(r => r.user_id === member.user_id).reduce((sum, r) => sum + r.collected + r.to_consultation + r.to_surgery, 0) || 0;
      });

      const teamGoalTypes = [
        { type: "revenue", goal: totalRevenueGoal, actual: totalRevenue, label: "Faturamento" },
        { type: "nps", goal: totalNpsGoal, actual: totalNps, label: "NPS" },
        { type: "testimonials", goal: totalTestimonialsGoal, actual: totalTestimonials, label: "Depoimentos" },
        { type: "referrals", goal: totalReferralsGoal, actual: totalReferrals, label: "Indicações" },
      ];

      teamGoalTypes.forEach(({ type, goal: goalValue, actual, label }) => {
        if (goalValue <= 0) return;

        const notificationKey = `team_${team.id}_${type}_${currentMonth}_${currentYear}`;
        
        const existingNotif = existingNotifications.find(n => 
          n.team_id === team.id && 
          n.type === "goal_team" && 
          n.title.includes(label)
        );

        if (existingNotif || checkedGoalsRef.current.has(notificationKey)) return;

        if (actual >= goalValue) {
          checkedGoalsRef.current.add(notificationKey);
          
          createNotification.mutate({
            team_id: team.id,
            type: "goal_team",
            title: `🏆 ${team.name}: Meta Coletiva de ${label}!`,
            message: `A equipe ${team.name} atingiu a meta coletiva de ${label}! (${actual}/${goalValue})`,
          });

          // Show toast if user is part of this team
          if (profile?.team_id === team.id) {
            toast({
              title: `🏆 Meta Coletiva de ${label} Atingida!`,
              description: `Sua equipe ${team.name} atingiu a meta coletiva!`,
            });
            fireGoalConfetti();
          }
        }
      });
    });
  }, [goals, profiles, teams, existingNotifications, revenueRecords, npsRecords, testimonialRecords, referralRecords, user?.id, profile?.team_id]);

  return null;
};
