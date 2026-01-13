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

// Scoring constants - Updated to match Playbook
const SCORING = {
  revenue: { perThousand: 1 },
  quality: {
    nps9: 3,              // NPS 9 = 3pts
    nps10: 5,             // NPS 10 = 5pts
    npsCitationBonus: 10, // Citação nominal = +10pts
    testimonialWhatsapp: 5,   // Depoimento WhatsApp = 5pts
    testimonialGoogle: 10,  // Google Review 5★ = 10pts
    testimonialVideo: 30,   // Vídeo padrão = 30pts
    testimonialGold: 50,    // Depoimento Ouro = 50pts
    referralCollected: 5,        // Indicação coletada = 5pts
    referralToConsultation: 20,  // → Consulta = +20pts
    referralToSurgery: 50,       // → Cirurgia = +50pts
    ambassador: 50,       // Paciente Embaixadora = 50pts
    unilover: 5,          // UniLovers = 5pts
    instagramMention: 2,  // Menção Instagram = 2pts
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
      // Começar a partir de 2026
      return { start: new Date(2026, 0, 1), end: endOfMonth(now) };
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
        { data: allSpecialEvents },
        { data: allCancellations },
      ] = await Promise.all([
        supabase.from("revenue_records").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("nps_records").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("testimonial_records").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("referral_records").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("other_indicators").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("cards").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("special_events").select("*").gte("date", startStr).lte("date", endStr),
        supabase.from("cancellations").select("*").gte("cancellation_request_date", startStr).lte("cancellation_request_date", endStr).in("status", ["cancelled_with_fine", "cancelled_no_fine", "credit_used"]),
      ]);

      const teamScores: FilteredTeamScore[] = [];

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
            if (nps.cited_member) pts += SCORING.quality.npsCitationBonus;
            qualityPoints += pts;
          }
        }

        // Testimonials
        const teamTestimonials = allTestimonials?.filter(r => r.team_id === team.id) || [];
        for (const t of teamTestimonials) {
          if (t.type === "whatsapp") qualityPoints += SCORING.quality.testimonialWhatsapp;
          else if (t.type === "google") qualityPoints += SCORING.quality.testimonialGoogle;
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

        // Special Events (Boosters & Turning Points)
        const teamSpecialEvents = allSpecialEvents?.filter(r => r.team_id === team.id) || [];
        for (const event of teamSpecialEvents) {
          modifierPoints += event.points;
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
