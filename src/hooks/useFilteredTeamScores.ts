import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";

interface FilteredTeamScore {
  id: string;
  name: string;
  totalPoints: number;
  revenuePoints: number;
  qualityPoints: number;
  modifierPoints: number;
  totalRevenue: number;
}

export type PeriodFilter = "month" | "semester" | "year" | "all";

const SCORING = {
  revenue: { perThousand: 1 },
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

const getDateRange = (period: PeriodFilter): { start: Date; end: Date } => {
  const now = new Date();
  switch (period) {
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "semester":
      return { start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) };
    case "year":
      return { start: startOfYear(now), end: endOfMonth(now) };
    case "all":
    default:
      return { start: new Date(2020, 0, 1), end: endOfMonth(now) };
  }
};

export const useFilteredTeamScores = (period: PeriodFilter = "all") => {
  const [teams, setTeams] = useState<FilteredTeamScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const calculateScores = useCallback(async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange(period);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");

      if (!teamsData || teamsData.length === 0) {
        setIsLoading(false);
        return;
      }

      const [
        { data: allRevenue },
        { data: allNps },
        { data: allTestimonials },
        { data: allReferrals },
        { data: allIndicators },
        { data: allCards },
      ] = await Promise.all([
        supabase.from("revenue_records").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("nps_records").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("testimonial_records").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("referral_records").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("other_indicators").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("cards").select("*").gte("date", startStr).lte("date", endStr),
      ]);

      const teamScores: FilteredTeamScore[] = [];

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
            qualityPoints += nps.cited_member ? SCORING.quality.nps9or10WithMention : SCORING.quality.nps9or10;
          }
        }

        // Testimonials
        const teamTestimonials = allTestimonials?.filter(r => r.team_id === team.id) || [];
        for (const t of teamTestimonials) {
          if (t.type === "google") qualityPoints += SCORING.quality.testimonialGoogle;
          else if (t.type === "video") qualityPoints += SCORING.quality.testimonialVideo;
          else if (t.type === "gold") qualityPoints += SCORING.quality.testimonialGold;
        }

        // Referrals
        const teamReferrals = allReferrals?.filter(r => r.team_id === team.id) || [];
        for (const r of teamReferrals) {
          qualityPoints +=
            r.collected * SCORING.quality.referralCollected +
            r.to_consultation * SCORING.quality.referralToConsultation +
            r.to_surgery * SCORING.quality.referralToSurgery;
        }

        // Other indicators
        const teamIndicators = allIndicators?.filter(r => r.team_id === team.id) || [];
        for (const ind of teamIndicators) {
          qualityPoints +=
            ind.ambassadors * SCORING.quality.ambassador +
            ind.unilovers * SCORING.quality.unilover +
            ind.instagram_mentions * SCORING.quality.instagramMention;
        }

        // Cards
        const teamCards = allCards?.filter(r => r.team_id === team.id) || [];
        for (const card of teamCards) {
          modifierPoints += card.points;
        }

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

      teamScores.sort((a, b) => b.totalPoints - a.totalPoints);
      setTeams(teamScores);
    } catch (error) {
      console.error("Error calculating filtered scores:", error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    calculateScores();
  }, [calculateScores]);

  return { teams, isLoading, refetch: calculateScores };
};
