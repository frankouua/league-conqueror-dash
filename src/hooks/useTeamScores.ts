import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Achievement } from "@/components/RecentAchievements";
import type { ChartData } from "@/components/EvolutionChart";
import { fireGoldConfetti, fireGoalConfetti, fireLeadershipChange } from "@/lib/confetti";
import { playGoalSound, playLeadershipSound, playVictoryFanfare, playDefeatSound } from "@/lib/sounds";
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

// Scoring constants - Updated to match Playbook
const SCORING = {
  revenue: {
    perThousand: 1,
  },
  quality: {
    nps9: 3,              // NPS 9 = 3pts
    nps10: 5,             // NPS 10 = 5pts
    npsCitationBonus: 10, // Citação nominal = +10pts
    testimonialGoogle: 10,  // Google Review 5★ = 10pts
    testimonialVideo: 30,   // Vídeo padrão = 30pts (was 20)
    testimonialGold: 50,    // Depoimento Ouro = 50pts (was 40)
    referralCollected: 5,        // Indicação coletada = 5pts
    referralToConsultation: 20,  // → Consulta = +20pts (was 15)
    referralToSurgery: 50,       // → Cirurgia = +50pts (was 30)
    ambassador: 50,       // Paciente Embaixadora = 50pts
    unilover: 5,          // UniLovers = 5pts (was 30)
    instagramMention: 2,  // Menção Instagram = 2pts (was 5)
  },
};

const GOALS = {
  goal1: 2500000,
  goal2: 2700000,
  goal3: 3000000,
};

export const useTeamScores = (userTeamId?: string | null, selectedMonth?: number, selectedYear?: number) => {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalClinicRevenue, setTotalClinicRevenue] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Use current month/year if not specified
  const currentDate = new Date();
  const month = selectedMonth ?? (currentDate.getMonth() + 1);
  const year = selectedYear ?? currentDate.getFullYear();
  
  // Calculate date range for filtering
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  
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
        { data: allSpecialEvents },
        { data: allCancellations },
      ] = await Promise.all([
        supabase.from("revenue_records").select("*").gte("date", startOfMonth).lte("date", endOfMonth),
        supabase.from("nps_records").select("*").gte("date", startOfMonth).lte("date", endOfMonth),
        supabase.from("testimonial_records").select("*").gte("date", startOfMonth).lte("date", endOfMonth),
        supabase.from("referral_records").select("*").gte("date", startOfMonth).lte("date", endOfMonth),
        supabase.from("other_indicators").select("*").gte("date", startOfMonth).lte("date", endOfMonth),
        supabase.from("cards").select("*").gte("date", startOfMonth).lte("date", endOfMonth),
        supabase.from("special_events").select("*").gte("date", startOfMonth).lte("date", endOfMonth),
        supabase.from("cancellations").select("*").in("status", ["cancelled_with_fine", "cancelled_no_fine", "credit_used"]).gte("cancellation_request_date", startOfMonth).lte("cancellation_request_date", endOfMonth),
      ]);

      for (const team of teamsData) {
        let revenuePoints = 0;
        let qualityPoints = 0;
        let modifierPoints = 0;
        let teamRevenue = 0;

        // Revenue
        const teamRevenueRecords = allRevenue?.filter(r => r.team_id === team.id) || [];
        const grossRevenue = teamRevenueRecords.reduce((sum, r) => sum + Number(r.amount), 0);
        
        // Subtract confirmed cancellations from revenue
        const teamCancellations = allCancellations?.filter(c => c.team_id === team.id) || [];
        const cancelledAmount = teamCancellations.reduce((sum, c) => sum + Number(c.contract_value), 0);
        
        teamRevenue = grossRevenue - cancelledAmount;
        revenuePoints = Math.floor(Math.max(0, teamRevenue) / 1000) * SCORING.revenue.perThousand;

        // NPS - Updated scoring: NPS 9=3pts, NPS 10=5pts, +10 bonus for citation
        const teamNps = allNps?.filter(r => r.team_id === team.id) || [];
        for (const nps of teamNps) {
          if (nps.score >= 9) {
            let pts = nps.score === 10 ? SCORING.quality.nps10 : SCORING.quality.nps9;
            if (nps.cited_member) {
              pts += SCORING.quality.npsCitationBonus;
            }
            qualityPoints += pts;
            allAchievements.push({
              id: nps.id,
              type: "nps",
              teamName: team.name,
              description: `NPS ${nps.score}${nps.cited_member ? " com menção (+10)" : ""}`,
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

        // Special Events (Boosters & Turning Points)
        const teamSpecialEvents = allSpecialEvents?.filter(r => r.team_id === team.id) || [];
        for (const event of teamSpecialEvents) {
          modifierPoints += event.points;
          allAchievements.push({
            id: event.id,
            type: event.category === "booster" ? "booster" : "turning_point",
            teamName: team.name,
            description: `${getEventLabel(event.event_type)}${event.description ? `: ${event.description}` : ""}`,
            timestamp: formatTimestamp(event.created_at),
            points: event.points,
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
          
          // Check if this is the user's team taking the lead
          if (userTeamId && currentLeaderId === userTeamId) {
            // User's team is now leading - epic celebration!
            playVictoryFanfare();
            toast({
              title: "🏆🎉 SEU TIME ASSUMIU A LIDERANÇA!",
              description: `${teamScores[0].name} está no topo! Continue assim!`,
            });
          } else if (userTeamId && previousLeaderId.current === userTeamId) {
            // User's team just lost the lead
            playDefeatSound();
            toast({
              title: "⚠️ Seu time perdeu a liderança!",
              description: `${teamScores[0].name} assumiu a ponta. É hora de reagir!`,
              variant: "destructive",
            });
          } else {
            // General leadership change
            playLeadershipSound();
            toast({
              title: "🏆 Nova Liderança!",
              description: `${teamScores[0].name} assumiu a liderança!`,
            });
          }
        }

        // Goal celebrations
        const currentGoals: GoalsState = {
          goal1: clinicRevenue >= GOALS.goal1,
          goal2: clinicRevenue >= GOALS.goal2,
          goal3: clinicRevenue >= GOALS.goal3,
        };

        if (!previousGoals.current.goal1 && currentGoals.goal1) {
          fireGoalConfetti();
          playGoalSound();
          toast({
            title: "🎯 Meta 1 Atingida!",
            description: "Parabéns! A clínica atingiu R$ 2.500.000!",
          });
        }

        if (!previousGoals.current.goal2 && currentGoals.goal2) {
          fireGoalConfetti();
          playGoalSound();
          toast({
            title: "👑 Meta 2 Atingida!",
            description: "+50 pontos para todas as equipes!",
          });
        }

        if (!previousGoals.current.goal3 && currentGoals.goal3) {
          fireGoalConfetti();
          fireGoldConfetti();
          playGoalSound();
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

      // Find the most recent update from all records
      const allDates: Date[] = [];
      allRevenue?.forEach(r => allDates.push(new Date(r.created_at)));
      allNps?.forEach(r => allDates.push(new Date(r.created_at)));
      allTestimonials?.forEach(r => allDates.push(new Date(r.created_at)));
      allReferrals?.forEach(r => allDates.push(new Date(r.created_at)));
      allIndicators?.forEach(r => allDates.push(new Date(r.created_at)));
      allCards?.forEach(r => allDates.push(new Date(r.created_at)));
      allSpecialEvents?.forEach(r => allDates.push(new Date(r.created_at)));
      
      if (allDates.length > 0) {
        const mostRecent = new Date(Math.max(...allDates.map(d => d.getTime())));
        setLastUpdated(mostRecent);
      }
    } catch (error) {
      console.error("Error calculating scores:", error);
    } finally {
      setIsLoading(false);
    }
  }, [startOfMonth, endOfMonth]);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "special_events" }, calculateScores)
      .on("postgres_changes", { event: "*", schema: "public", table: "cancellations" }, calculateScores)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calculateScores, month, year]);

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
    lastUpdated,
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

function getEventLabel(type: string): string {
  const labels: Record<string, string> = {
    chuva_fechamentos: "Chuva de Fechamentos",
    liga_lealdade: "Liga da Lealdade",
    dia_virada: "Dia da Virada",
    missao_bruna: "Missão Bruna",
    var: "VAR",
  };
  return labels[type] || type;
}

export default useTeamScores;
