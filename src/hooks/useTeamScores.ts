import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Achievement } from "@/components/RecentAchievements";
import type { ChartData } from "@/components/EvolutionChart";

interface TeamScore {
  id: string;
  name: string;
  totalPoints: number;
  revenuePoints: number;
  qualityPoints: number;
  modifierPoints: number;
  totalRevenue: number;
}

// Scoring constants
const SCORING = {
  revenue: {
    perThousand: 1, // 1 ponto por R$ 1.000
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
  cards: {
    blue: 20,
    white: 10,
    yellow: -15,
    red: -40,
  },
};

export const useTeamScores = () => {
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalClinicRevenue, setTotalClinicRevenue] = useState(0);

  const calculateScores = useCallback(async () => {
    try {
      // Fetch teams
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");

      if (!teamsData || teamsData.length === 0) {
        setIsLoading(false);
        return;
      }

      const teamScores: TeamScore[] = [];
      const allAchievements: Achievement[] = [];
      let clinicRevenue = 0;

      for (const team of teamsData) {
        let revenuePoints = 0;
        let qualityPoints = 0;
        let modifierPoints = 0;
        let teamRevenue = 0;

        // Fetch revenue records
        const { data: revenueRecords } = await supabase
          .from("revenue_records")
          .select("*")
          .eq("team_id", team.id);

        if (revenueRecords) {
          teamRevenue = revenueRecords.reduce((sum, r) => sum + Number(r.amount), 0);
          revenuePoints = Math.floor(teamRevenue / 1000) * SCORING.revenue.perThousand;
        }

        // Fetch NPS records
        const { data: npsRecords } = await supabase
          .from("nps_records")
          .select("*")
          .eq("team_id", team.id);

        if (npsRecords) {
          for (const nps of npsRecords) {
            if (nps.score >= 9) {
              const pts = nps.cited_member
                ? SCORING.quality.nps9or10WithMention
                : SCORING.quality.nps9or10;
              qualityPoints += pts;
              allAchievements.push({
                id: nps.id,
                type: "nps",
                teamName: team.name,
                description: `NPS ${nps.score}${nps.cited_member ? " com menção a membro" : ""}`,
                timestamp: formatTimestamp(nps.created_at),
                points: pts,
              });
            }
          }
        }

        // Fetch testimonial records
        const { data: testimonials } = await supabase
          .from("testimonial_records")
          .select("*")
          .eq("team_id", team.id);

        if (testimonials) {
          for (const t of testimonials) {
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
        }

        // Fetch referral records
        const { data: referrals } = await supabase
          .from("referral_records")
          .select("*")
          .eq("team_id", team.id);

        if (referrals) {
          for (const r of referrals) {
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
        }

        // Fetch other indicators
        const { data: indicators } = await supabase
          .from("other_indicators")
          .select("*")
          .eq("team_id", team.id);

        if (indicators) {
          for (const ind of indicators) {
            const ambassadorPts = ind.ambassadors * SCORING.quality.ambassador;
            const uniloverPts = ind.unilovers * SCORING.quality.unilover;
            const instaPts = ind.instagram_mentions * SCORING.quality.instagramMention;
            qualityPoints += ambassadorPts + uniloverPts + instaPts;

            if (ind.ambassadors > 0) {
              allAchievements.push({
                id: `${ind.id}-amb`,
                type: "ambassador",
                teamName: team.name,
                description: `${ind.ambassadors} embaixador(es) reconhecido(s)`,
                timestamp: formatTimestamp(ind.created_at),
                points: ambassadorPts,
              });
            }
          }
        }

        // Fetch cards
        const { data: cards } = await supabase
          .from("cards")
          .select("*, teams(name)")
          .eq("team_id", team.id);

        if (cards) {
          for (const card of cards) {
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

      // Sort teams by total points
      teamScores.sort((a, b) => b.totalPoints - a.totalPoints);

      // Sort achievements by timestamp (most recent first)
      allAchievements.sort((a, b) => {
        const dateA = parseTimestamp(a.timestamp);
        const dateB = parseTimestamp(b.timestamp);
        return dateB - dateA;
      });

      // Generate chart data (last 6 months)
      const chartPoints = await generateChartData(teamsData);

      setTeams(teamScores);
      setAchievements(allAchievements.slice(0, 20));
      setChartData(chartPoints);
      setTotalClinicRevenue(clinicRevenue);
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating scores:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateScores();

    // Set up real-time subscriptions
    const channels = [
      supabase.channel("revenue-changes").on(
        "postgres_changes",
        { event: "*", schema: "public", table: "revenue_records" },
        () => calculateScores()
      ),
      supabase.channel("nps-changes").on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nps_records" },
        () => calculateScores()
      ),
      supabase.channel("testimonial-changes").on(
        "postgres_changes",
        { event: "*", schema: "public", table: "testimonial_records" },
        () => calculateScores()
      ),
      supabase.channel("referral-changes").on(
        "postgres_changes",
        { event: "*", schema: "public", table: "referral_records" },
        () => calculateScores()
      ),
      supabase.channel("indicators-changes").on(
        "postgres_changes",
        { event: "*", schema: "public", table: "other_indicators" },
        () => calculateScores()
      ),
      supabase.channel("cards-changes").on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        () => calculateScores()
      ),
    ];

    channels.forEach((ch) => ch.subscribe());

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [calculateScores]);

  return {
    teams,
    achievements,
    chartData,
    totalClinicRevenue,
    isLoading,
    refetch: calculateScores,
  };
};

// Helper functions
function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Agora";
  if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  return date.toLocaleDateString("pt-BR");
}

function parseTimestamp(ts: string): number {
  if (ts === "Agora") return Date.now();
  if (ts.startsWith("Há")) {
    const match = ts.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (ts.includes("hora")) return Date.now() - num * 60 * 60 * 1000;
      if (ts.includes("dia")) return Date.now() - num * 24 * 60 * 60 * 1000;
    }
  }
  return new Date(ts).getTime();
}

function getCardLabel(type: string): string {
  const labels: Record<string, string> = {
    blue: "Azul",
    white: "Branco",
    yellow: "Amarelo",
    red: "Vermelho",
  };
  return labels[type] || type;
}

async function generateChartData(teams: { id: string; name: string }[]): Promise<ChartData[]> {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const now = new Date();
  const chartData: ChartData[] = [];

  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthName = months[monthDate.getMonth()];

    const point: ChartData = { month: monthName, team1: 0, team2: 0 };

    for (let j = 0; j < teams.length && j < 2; j++) {
      const team = teams[j];
      // Get revenue for this month
      const { data: revenue } = await supabase
        .from("revenue_records")
        .select("amount")
        .eq("team_id", team.id)
        .gte("date", monthDate.toISOString().split("T")[0])
        .lte("date", monthEnd.toISOString().split("T")[0]);

      const total = revenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const pts = Math.floor(total / 1000);

      if (j === 0) point.team1 = pts;
      else point.team2 = pts;
    }

    chartData.push(point);
  }

  return chartData;
}

export default useTeamScores;
