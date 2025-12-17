import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Achievement } from "@/components/RecentAchievements";
import type { ChartData } from "@/components/EvolutionChart";
import { fireGoldConfetti, fireGoalConfetti, fireLeadershipChange } from "@/lib/confetti";
import { toast } from "@/hooks/use-toast";

interface TeamScore {
  id: string;
  name: string;
  totalPoints: number;
  revenuePoints: number;
  qualityPoints: number;
  modifierPoints: number;
  totalRevenue: number;
}

interface GoalsState {
  goal1: boolean;
  goal2: boolean;
  goal3: boolean;
}

// Scoring constants
const SCORING = {
  revenue: {
    perThousand: 1,
  },
  quality: {
    nps9or10: 5,
    nps9or10WithMention: 10,
    testimonialGoogle: 10,
    testimonialVideo: 30,
    testimonialGold: 50,
    referralCollected: 5,
    referralToConsultation: 20,
    referralToSurgery: 50,
    ambassador: 50,
    unilover: 30,
    instagramMention: 5,
  },
};

const GOALS = {
  goal1: 2500000,
  goal2: 2700000,
  goal3: 3000000,
};

export const useTeamScores = () => {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalClinicRevenue, setTotalClinicRevenue] = useState(0);
  
  // Track previous state for celebrations
  const previousLeaderId = useRef<string | null>(null);
  const previousGoals = useRef<GoalsState>({ goal1: false, goal2: false, goal3: false });
  const isFirstLoad = useRef(true);

  const calculateScores = useCallback(async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");

      if (teamsError) {
        console.error("Error fetching teams:", teamsError);
        setIsLoading(false);
        return;
      }

      if (!teamsData || teamsData.length === 0) {
        setIsLoading(false);
        return;
      }

      const teamScores: TeamScore[] = [];
      const allAchievements: Achievement[] = [];
      let clinicRevenue = 0;

      const [
        { data: allRevenue },
        { data: allNps },
        { data: allTestimonials },
        { data: allReferrals },
        { data: allIndicators },
        { data: allCards },
      ] = await Promise.all([
        supabase.from("revenue_records").select("*"),
        supabase.from("nps_records").select("*"),
        supabase.from("testimonial_records").select("*"),
        supabase.from("referral_records").select("*"),
        supabase.from("other_indicators").select("*"),
        supabase.from("cards").select("*"),
      ]);

      for (const team of teamsData) {
        let revenuePoints = 0;
        let qualityPoints = 0;
        let modifierPoints = 0;
        let teamRevenue = 0;

        // Revenue
        const teamRevenueRecords = allRevenue?.filter(r => r.team_id === team.id) || [];
        teamRevenue = teamRevenueRecords.reduce((sum, r) => sum + Number(r.amount), 0);
        revenuePoints = Math.floor(teamRevenue / 1000) * SCORING.revenue.perThousand;

        // NPS
        const teamNps = allNps?.filter(r => r.team_id === team.id) || [];
        for (const nps of teamNps) {
          if (nps.score >= 9) {
            const pts = nps.cited_member ? SCORING.quality.nps9or10WithMention : SCORING.quality.nps9or10;
            qualityPoints += pts;
            allAchievements.push({
              id: nps.id,
              type: "nps",
              teamName: team.name,
              description: `NPS ${nps.score}${nps.cited_member ? " com menção" : ""}`,
              timestamp: formatTimestamp(nps.created_at),
              points: pts,
            });
          }
        }

        // Testimonials
        const teamTestimonials = allTestimonials?.filter(r => r.team_id === team.id) || [];
        for (const t of teamTestimonials) {
          let pts = 0;
          let desc = "";
          if (t.type === "google") {
            pts = SCORING.quality.testimonialGoogle;
            desc = "Depoimento Google 5★";
          } else if (t.type === "video") {
            pts = SCORING.quality.testimonialVideo;
            desc = "Depoimento em vídeo";
          } else if (t.type === "gold") {
            pts = SCORING.quality.testimonialGold;
            desc = "Depoimento Ouro";
          }
          qualityPoints += pts;
          allAchievements.push({
            id: t.id,
            type: "testimonial",
            teamName: team.name,
            description: `${desc}${t.patient_name ? ` - ${t.patient_name}` : ""}`,
            timestamp: formatTimestamp(t.created_at),
            points: pts,
          });
        }

        // Referrals
        const teamReferrals = allReferrals?.filter(r => r.team_id === team.id) || [];
        for (const r of teamReferrals) {
          const pts =
            r.collected * SCORING.quality.referralCollected +
            r.to_consultation * SCORING.quality.referralToConsultation +
            r.to_surgery * SCORING.quality.referralToSurgery;
          qualityPoints += pts;
          if (pts > 0) {
            allAchievements.push({
              id: r.id,
              type: "referral",
              teamName: team.name,
              description: `${r.collected} coletadas, ${r.to_consultation} consulta, ${r.to_surgery} cirurgia`,
              timestamp: formatTimestamp(r.created_at),
              points: pts,
            });
          }
        }

        // Other indicators
        const teamIndicators = allIndicators?.filter(r => r.team_id === team.id) || [];
        for (const ind of teamIndicators) {
          const ambassadorPts = ind.ambassadors * SCORING.quality.ambassador;
          const uniloverPts = ind.unilovers * SCORING.quality.unilover;
          const instaPts = ind.instagram_mentions * SCORING.quality.instagramMention;
          qualityPoints += ambassadorPts + uniloverPts + instaPts;

          if (ind.ambassadors > 0) {
            allAchievements.push({
              id: `${ind.id}-amb`,
              type: "ambassador",
              teamName: team.name,
              description: `${ind.ambassadors} embaixador(es)`,
              timestamp: formatTimestamp(ind.created_at),
              points: ambassadorPts,
            });
          }
        }

        // Cards
        const teamCards = allCards?.filter(r => r.team_id === team.id) || [];
        for (const card of teamCards) {
          modifierPoints += card.points;
          const cardType = `card_${card.type}` as Achievement["type"];
          allAchievements.push({
            id: card.id,
            type: cardType,
            teamName: team.name,
            description: `Cartão ${getCardLabel(card.type)}: ${card.reason}`,
            timestamp: formatTimestamp(card.created_at),
            points: card.points,
          });
        }

        clinicRevenue += teamRevenue;

        teamScores.push({
          id: team.id,
          name: team.name,
          revenuePoints,
          qualityPoints,
          modifierPoints,
          totalPoints: revenuePoints + qualityPoints + modifierPoints,
          totalRevenue: teamRevenue,
        });
      }

      // Sort by total points
      teamScores.sort((a, b) => b.totalPoints - a.totalPoints);
      allAchievements.sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp));

      // Check for celebrations (only after first load)
      if (!isFirstLoad.current && teamScores.length > 0) {
        const currentLeaderId = teamScores[0].id;
        
        // Leadership change celebration
        if (previousLeaderId.current && previousLeaderId.current !== currentLeaderId) {
          fireLeadershipChange();
          toast({
            title: "🏆 Nova Liderança!",
            description: `${teamScores[0].name} assumiu a liderança!`,
          });
        }

        // Goal celebrations
        const currentGoals: GoalsState = {
          goal1: clinicRevenue >= GOALS.goal1,
          goal2: clinicRevenue >= GOALS.goal2,
          goal3: clinicRevenue >= GOALS.goal3,
        };

        if (!previousGoals.current.goal1 && currentGoals.goal1) {
          fireGoalConfetti();
          toast({
            title: "🎯 Meta 1 Atingida!",
            description: "Parabéns! A clínica atingiu R$ 2.500.000!",
          });
        }

        if (!previousGoals.current.goal2 && currentGoals.goal2) {
          fireGoalConfetti();
          toast({
            title: "👑 Meta 2 Atingida!",
            description: "+50 pontos para todas as equipes!",
          });
        }

        if (!previousGoals.current.goal3 && currentGoals.goal3) {
          fireGoalConfetti();
          fireGoldConfetti();
          toast({
            title: "💎 Meta 3 Atingida!",
            description: "+100 pontos para todas as equipes! ÉPICO!",
          });
        }

        previousGoals.current = currentGoals;
      }

      // Update previous leader
      if (teamScores.length > 0) {
        previousLeaderId.current = teamScores[0].id;
      }

      // Mark first load complete
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        // Set initial goals state
        previousGoals.current = {
          goal1: clinicRevenue >= GOALS.goal1,
          goal2: clinicRevenue >= GOALS.goal2,
          goal3: clinicRevenue >= GOALS.goal3,
        };
      }

      // Chart data
      const months = ["Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const chart: ChartData[] = months.map(month => ({
        month,
        team1: teamScores[0]?.revenuePoints || 0,
        team2: teamScores[1]?.revenuePoints || 0,
      }));

      setTeams(teamScores);
      setAchievements(allAchievements.slice(0, 20));
      setChartData(chart);
      setTotalClinicRevenue(clinicRevenue);
    } catch (error) {
      console.error("Error calculating scores:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateScores();

    const channel = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "revenue_records" }, calculateScores)
      .on("postgres_changes", { event: "*", schema: "public", table: "nps_records" }, calculateScores)
      .on("postgres_changes", { event: "*", schema: "public", table: "testimonial_records" }, calculateScores)
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_records" }, calculateScores)
      .on("postgres_changes", { event: "*", schema: "public", table: "other_indicators" }, calculateScores)
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, calculateScores)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calculateScores]);

  // Manual celebration trigger for testing
  const triggerCelebration = useCallback((type: "goal" | "leadership" | "gold") => {
    switch (type) {
      case "goal":
        fireGoalConfetti();
        break;
      case "leadership":
        fireLeadershipChange();
        break;
      case "gold":
        fireGoldConfetti();
        break;
    }
  }, []);

  return { 
    teams, 
    achievements, 
    chartData, 
    totalClinicRevenue, 
    isLoading, 
    refetch: calculateScores,
    triggerCelebration,
  };
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Agora";
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays < 7) return `Há ${diffDays}d`;
  return date.toLocaleDateString("pt-BR");
}

function parseTimestamp(ts: string): number {
  if (ts === "Agora") return Date.now();
  const match = ts.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    if (ts.includes("h")) return Date.now() - num * 60 * 60 * 1000;
    if (ts.includes("d")) return Date.now() - num * 24 * 60 * 60 * 1000;
  }
  return 0;
}

function getCardLabel(type: string): string {
  return { blue: "Azul", white: "Branco", yellow: "Amarelo", red: "Vermelho" }[type] || type;
}

export default useTeamScores;
