import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TeamStats {
  teamName: string;
  teamMotto: string | null;
  currentMonthPoints: number;
  totalPoints: number;
  position: number;
}

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

export const useUserTeamStats = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.team_id) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch team info
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name, motto")
        .eq("id", profile.team_id)
        .single();

      if (!teamData) {
        setIsLoading(false);
        return;
      }

      // Fetch all teams for comparison
      const { data: allTeams } = await supabase.from("teams").select("id, name");

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      // Fetch all data
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

      // Calculate points for each team
      const calculateTeamPoints = (teamId: string, startDate?: Date, endDate?: Date) => {
        let points = 0;

        // Revenue
        const teamRevenue = allRevenue?.filter((r) => {
          if (r.team_id !== teamId) return false;
          if (startDate && endDate) {
            const date = new Date(r.date);
            return date >= startDate && date <= endDate;
          }
          return true;
        }) || [];
        const totalRevenue = teamRevenue.reduce((sum, r) => sum + Number(r.amount), 0);
        points += Math.floor(totalRevenue / 1000) * SCORING.revenue.perThousand;

        // NPS
        const teamNps = allNps?.filter((r) => {
          if (r.team_id !== teamId) return false;
          if (startDate && endDate) {
            const date = new Date(r.date);
            return date >= startDate && date <= endDate;
          }
          return true;
        }) || [];
        for (const nps of teamNps) {
          if (nps.score >= 9) {
            points += nps.cited_member ? SCORING.quality.nps9or10WithMention : SCORING.quality.nps9or10;
          }
        }

        // Testimonials
        const teamTestimonials = allTestimonials?.filter((r) => {
          if (r.team_id !== teamId) return false;
          if (startDate && endDate) {
            const date = new Date(r.date);
            return date >= startDate && date <= endDate;
          }
          return true;
        }) || [];
        for (const t of teamTestimonials) {
          if (t.type === "google") points += SCORING.quality.testimonialGoogle;
          else if (t.type === "video") points += SCORING.quality.testimonialVideo;
          else if (t.type === "gold") points += SCORING.quality.testimonialGold;
        }

        // Referrals
        const teamReferrals = allReferrals?.filter((r) => {
          if (r.team_id !== teamId) return false;
          if (startDate && endDate) {
            const date = new Date(r.date);
            return date >= startDate && date <= endDate;
          }
          return true;
        }) || [];
        for (const r of teamReferrals) {
          points +=
            r.collected * SCORING.quality.referralCollected +
            r.to_consultation * SCORING.quality.referralToConsultation +
            r.to_surgery * SCORING.quality.referralToSurgery;
        }

        // Other indicators
        const teamIndicators = allIndicators?.filter((r) => {
          if (r.team_id !== teamId) return false;
          if (startDate && endDate) {
            const date = new Date(r.date);
            return date >= startDate && date <= endDate;
          }
          return true;
        }) || [];
        for (const ind of teamIndicators) {
          points +=
            ind.ambassadors * SCORING.quality.ambassador +
            ind.unilovers * SCORING.quality.unilover +
            ind.instagram_mentions * SCORING.quality.instagramMention;
        }

        // Cards
        const teamCards = allCards?.filter((r) => {
          if (r.team_id !== teamId) return false;
          if (startDate && endDate) {
            const date = new Date(r.date);
            return date >= startDate && date <= endDate;
          }
          return true;
        }) || [];
        for (const card of teamCards) {
          points += card.points;
        }

        return points;
      };

      // Calculate current team points
      const currentMonthPoints = calculateTeamPoints(profile.team_id, monthStart, monthEnd);
      const totalPoints = calculateTeamPoints(profile.team_id);

      // Calculate position
      const teamScores = (allTeams || []).map((team) => ({
        id: team.id,
        points: calculateTeamPoints(team.id),
      }));
      teamScores.sort((a, b) => b.points - a.points);
      const position = teamScores.findIndex((t) => t.id === profile.team_id) + 1;

      setStats({
        teamName: teamData.name,
        teamMotto: teamData.motto,
        currentMonthPoints,
        totalPoints,
        position,
      });
    } catch (error) {
      console.error("Error fetching team stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.team_id]);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel("user-team-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "revenue_records" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "nps_records" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "testimonial_records" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "referral_records" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "other_indicators" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
};

export default useUserTeamStats;
