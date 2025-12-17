import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyChampion {
  month: number;
  year: number;
  teamId: string;
  teamName: string;
  totalPoints: number;
}

interface ChampionsData {
  currentMonthLeader: { teamName: string; points: number } | null;
  semesterLeader: { teamName: string; points: number } | null;
  yearLeader: { teamName: string; points: number } | null;
  monthlyHistory: MonthlyChampion[];
}

// Scoring constants (same as useTeamScores)
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

export const useChampions = () => {
  const [champions, setChampions] = useState<ChampionsData>({
    currentMonthLeader: null,
    semesterLeader: null,
    yearLeader: null,
    monthlyHistory: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const calculateChampions = useCallback(async () => {
    try {
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name");

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
        supabase.from("revenue_records").select("*"),
        supabase.from("nps_records").select("*"),
        supabase.from("testimonial_records").select("*"),
        supabase.from("referral_records").select("*"),
        supabase.from("other_indicators").select("*"),
        supabase.from("cards").select("*"),
      ]);

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const currentSemester = currentMonth <= 6 ? 1 : 2;

      // Helper to calculate team points for a specific period
      const calculateTeamPointsForPeriod = (
        teamId: string,
        startDate: Date,
        endDate: Date
      ) => {
        let revenuePoints = 0;
        let qualityPoints = 0;
        let modifierPoints = 0;

        // Revenue
        const teamRevenue = allRevenue?.filter((r) => {
          const date = new Date(r.date);
          return r.team_id === teamId && date >= startDate && date <= endDate;
        }) || [];
        const totalRevenue = teamRevenue.reduce((sum, r) => sum + Number(r.amount), 0);
        revenuePoints = Math.floor(totalRevenue / 1000) * SCORING.revenue.perThousand;

        // NPS
        const teamNps = allNps?.filter((r) => {
          const date = new Date(r.date);
          return r.team_id === teamId && date >= startDate && date <= endDate;
        }) || [];
        for (const nps of teamNps) {
          if (nps.score >= 9) {
            qualityPoints += nps.cited_member
              ? SCORING.quality.nps9or10WithMention
              : SCORING.quality.nps9or10;
          }
        }

        // Testimonials
        const teamTestimonials = allTestimonials?.filter((r) => {
          const date = new Date(r.date);
          return r.team_id === teamId && date >= startDate && date <= endDate;
        }) || [];
        for (const t of teamTestimonials) {
          if (t.type === "google") qualityPoints += SCORING.quality.testimonialGoogle;
          else if (t.type === "video") qualityPoints += SCORING.quality.testimonialVideo;
          else if (t.type === "gold") qualityPoints += SCORING.quality.testimonialGold;
        }

        // Referrals
        const teamReferrals = allReferrals?.filter((r) => {
          const date = new Date(r.date);
          return r.team_id === teamId && date >= startDate && date <= endDate;
        }) || [];
        for (const r of teamReferrals) {
          qualityPoints +=
            r.collected * SCORING.quality.referralCollected +
            r.to_consultation * SCORING.quality.referralToConsultation +
            r.to_surgery * SCORING.quality.referralToSurgery;
        }

        // Other indicators
        const teamIndicators = allIndicators?.filter((r) => {
          const date = new Date(r.date);
          return r.team_id === teamId && date >= startDate && date <= endDate;
        }) || [];
        for (const ind of teamIndicators) {
          qualityPoints +=
            ind.ambassadors * SCORING.quality.ambassador +
            ind.unilovers * SCORING.quality.unilover +
            ind.instagram_mentions * SCORING.quality.instagramMention;
        }

        // Cards
        const teamCards = allCards?.filter((r) => {
          const date = new Date(r.date);
          return r.team_id === teamId && date >= startDate && date <= endDate;
        }) || [];
        for (const card of teamCards) {
          modifierPoints += card.points;
        }

        return revenuePoints + qualityPoints + modifierPoints;
      };

      // Current month
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      // Current semester
      const semesterStartMonth = currentSemester === 1 ? 0 : 6;
      const semesterEndMonth = currentSemester === 1 ? 5 : 11;
      const semesterStart = new Date(currentYear, semesterStartMonth, 1);
      const semesterEnd = new Date(currentYear, semesterEndMonth + 1, 0, 23, 59, 59);

      // Current year
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

      // Calculate leaders for each period
      let currentMonthLeader: { teamName: string; points: number } | null = null;
      let semesterLeader: { teamName: string; points: number } | null = null;
      let yearLeader: { teamName: string; points: number } | null = null;

      for (const team of teamsData) {
        const monthPoints = calculateTeamPointsForPeriod(team.id, monthStart, monthEnd);
        const semesterPoints = calculateTeamPointsForPeriod(team.id, semesterStart, semesterEnd);
        const yearPoints = calculateTeamPointsForPeriod(team.id, yearStart, yearEnd);

        if (!currentMonthLeader || monthPoints > currentMonthLeader.points) {
          currentMonthLeader = { teamName: team.name, points: monthPoints };
        }
        if (!semesterLeader || semesterPoints > semesterLeader.points) {
          semesterLeader = { teamName: team.name, points: semesterPoints };
        }
        if (!yearLeader || yearPoints > yearLeader.points) {
          yearLeader = { teamName: team.name, points: yearPoints };
        }
      }

      // Calculate monthly history for the current year
      const monthlyHistory: MonthlyChampion[] = [];
      for (let month = 1; month <= currentMonth; month++) {
        const mStart = new Date(currentYear, month - 1, 1);
        const mEnd = new Date(currentYear, month, 0, 23, 59, 59);

        let winner: MonthlyChampion | null = null;
        for (const team of teamsData) {
          const points = calculateTeamPointsForPeriod(team.id, mStart, mEnd);
          if (points > 0 && (!winner || points > winner.totalPoints)) {
            winner = {
              month,
              year: currentYear,
              teamId: team.id,
              teamName: team.name,
              totalPoints: points,
            };
          }
        }
        if (winner) {
          monthlyHistory.push(winner);
        }
      }

      setChampions({
        currentMonthLeader,
        semesterLeader,
        yearLeader,
        monthlyHistory,
      });
    } catch (error) {
      console.error("Error calculating champions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateChampions();

    const channel = supabase
      .channel("champions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "revenue_records" }, calculateChampions)
      .on("postgres_changes", { event: "*", schema: "public", table: "nps_records" }, calculateChampions)
      .on("postgres_changes", { event: "*", schema: "public", table: "testimonial_records" }, calculateChampions)
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_records" }, calculateChampions)
      .on("postgres_changes", { event: "*", schema: "public", table: "other_indicators" }, calculateChampions)
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, calculateChampions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calculateChampions]);

  return { champions, isLoading };
};

export default useChampions;
