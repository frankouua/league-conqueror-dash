import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Star, MessageSquare, Heart, Users, Instagram, 
  Award, Sparkles, Calendar, Trophy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

type PeriodFilter = "month" | "semester" | "year" | "all";

const periodLabels: Record<PeriodFilter, string> = {
  month: "Este Mês",
  semester: "Semestre",
  year: "Este Ano",
  all: "Geral",
};

interface TeamQualityStats {
  teamId: string;
  teamName: string;
  nps9Count: number;
  nps10Count: number;
  npsCitations: number;
  testimonialWhatsapp: number;
  testimonialGoogle: number;
  testimonialVideo: number;
  testimonialGold: number;
  referralsCollected: number;
  referralsConsultation: number;
  referralsSurgery: number;
  ambassadors: number;
  unilovers: number;
  instagramMentions: number;
  totalQualityPoints: number;
}

const getDateRange = (period: PeriodFilter): { start: string; end: string } => {
  const now = new Date();
  let start: Date;
  
  switch (period) {
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "semester":
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
    default:
      start = new Date(2026, 0, 1);
  }
  
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

const TeamQualityComparisonCard = () => {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<TeamQualityStats[]>([]);

  useEffect(() => {
    const fetchQualityStats = async () => {
      setIsLoading(true);
      try {
        const { start, end } = getDateRange(period);

        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name")
          .order("name");

        if (!teamsData || teamsData.length === 0) {
          setIsLoading(false);
          return;
        }

        const [
          { data: allNps },
          { data: allTestimonials },
          { data: allReferrals },
          { data: allIndicators },
        ] = await Promise.all([
          supabase.from("nps_records").select("*").gte("date", start).lte("date", end),
          supabase.from("testimonial_records").select("*").gte("date", start).lte("date", end),
          supabase.from("referral_records").select("*").gte("date", start).lte("date", end),
          supabase.from("other_indicators").select("*").gte("date", start).lte("date", end),
        ]);

        const stats: TeamQualityStats[] = teamsData.map((team) => {
          // NPS
          const teamNps = allNps?.filter(r => r.team_id === team.id) || [];
          const nps9Count = teamNps.filter(n => n.score === 9).length;
          const nps10Count = teamNps.filter(n => n.score === 10).length;
          const npsCitations = teamNps.filter(n => n.cited_member).length;

          // Testimonials
          const teamTestimonials = allTestimonials?.filter(r => r.team_id === team.id) || [];
          const testimonialWhatsapp = teamTestimonials.filter(t => t.type === "whatsapp").length;
          const testimonialGoogle = teamTestimonials.filter(t => t.type === "google").length;
          const testimonialVideo = teamTestimonials.filter(t => t.type === "video").length;
          const testimonialGold = teamTestimonials.filter(t => t.type === "gold").length;

          // Referrals
          const teamReferrals = allReferrals?.filter(r => r.team_id === team.id) || [];
          const referralsCollected = teamReferrals.reduce((sum, r) => sum + (r.collected || 0), 0);
          const referralsConsultation = teamReferrals.reduce((sum, r) => sum + (r.to_consultation || 0), 0);
          const referralsSurgery = teamReferrals.reduce((sum, r) => sum + (r.to_surgery || 0), 0);

          // Other indicators
          const teamIndicators = allIndicators?.filter(r => r.team_id === team.id) || [];
          const ambassadors = teamIndicators.reduce((sum, i) => sum + (i.ambassadors || 0), 0);
          const unilovers = teamIndicators.reduce((sum, i) => sum + (i.unilovers || 0), 0);
          const instagramMentions = teamIndicators.reduce((sum, i) => sum + (i.instagram_mentions || 0), 0);

          // Calculate total points
          const npsPoints = nps9Count * 3 + nps10Count * 5 + npsCitations * 10;
          const testimonialPoints = testimonialWhatsapp * 5 + testimonialGoogle * 10 + testimonialVideo * 30 + testimonialGold * 50;
          const referralPoints = referralsCollected * 5 + referralsConsultation * 20 + referralsSurgery * 50;
          const indicatorPoints = ambassadors * 50 + unilovers * 5 + instagramMentions * 2;
          const totalQualityPoints = npsPoints + testimonialPoints + referralPoints + indicatorPoints;

          return {
            teamId: team.id,
            teamName: team.name,
            nps9Count,
            nps10Count,
            npsCitations,
            testimonialWhatsapp,
            testimonialGoogle,
            testimonialVideo,
            testimonialGold,
            referralsCollected,
            referralsConsultation,
            referralsSurgery,
            ambassadors,
            unilovers,
            instagramMentions,
            totalQualityPoints,
          };
        });

        // Sort by total quality points
        stats.sort((a, b) => b.totalQualityPoints - a.totalQualityPoints);
        setTeamStats(stats);
      } catch (error) {
        console.error("Error fetching quality stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQualityStats();
  }, [period]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border overflow-hidden">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (teamStats.length < 2) return null;

  const team1 = teamStats[0];
  const team2 = teamStats[1];

  const getPercentage = (value1: number, value2: number) => {
    const total = value1 + value2;
    if (total === 0) return { p1: 50, p2: 50 };
    return {
      p1: (value1 / total) * 100,
      p2: (value2 / total) * 100,
    };
  };

  const qualityMetrics = [
    {
      category: "NPS",
      icon: Star,
      color: "text-yellow-500",
      items: [
        { label: "NPS 10 (5pts)", value1: team1.nps10Count, value2: team2.nps10Count },
        { label: "NPS 9 (3pts)", value1: team1.nps9Count, value2: team2.nps9Count },
        { label: "Com Menção (+10pts)", value1: team1.npsCitations, value2: team2.npsCitations },
      ],
    },
    {
      category: "Depoimentos",
      icon: MessageSquare,
      color: "text-blue-500",
      items: [
        { label: "Ouro (50pts)", value1: team1.testimonialGold, value2: team2.testimonialGold },
        { label: "Vídeo (30pts)", value1: team1.testimonialVideo, value2: team2.testimonialVideo },
        { label: "Google 5★ (10pts)", value1: team1.testimonialGoogle, value2: team2.testimonialGoogle },
        { label: "WhatsApp (5pts)", value1: team1.testimonialWhatsapp, value2: team2.testimonialWhatsapp },
      ],
    },
    {
      category: "Indicações",
      icon: Heart,
      color: "text-pink-500",
      items: [
        { label: "→ Cirurgia (50pts)", value1: team1.referralsSurgery, value2: team2.referralsSurgery },
        { label: "→ Consulta (20pts)", value1: team1.referralsConsultation, value2: team2.referralsConsultation },
        { label: "Coletadas (5pts)", value1: team1.referralsCollected, value2: team2.referralsCollected },
      ],
    },
    {
      category: "Extras",
      icon: Sparkles,
      color: "text-purple-500",
      items: [
        { label: "Embaixadoras (50pts)", value1: team1.ambassadors, value2: team2.ambassadors },
        { label: "UniLovers (5pts)", value1: team1.unilovers, value2: team2.unilovers },
        { label: "Menções Insta (2pts)", value1: team1.instagramMentions, value2: team2.instagramMentions },
      ],
    },
  ];

  return (
    <Card className="bg-gradient-card border-border overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="w-5 h-5 text-primary" />
            Indicadores de Qualidade
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(Object.keys(periodLabels) as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>Exibindo: {periodLabels[period]}</span>
        </div>

        {/* Team Headers */}
        <div className="grid grid-cols-3 gap-4 text-center items-center">
          <div className="flex items-center gap-2">
            <img 
              src={team1.teamName.toLowerCase().includes("lioness") ? brasaoLioness : brasaoTroia} 
              alt={team1.teamName}
              className="w-8 h-8 object-contain"
            />
            <div className="text-left">
              <span className="text-sm font-semibold text-primary truncate block">
                {team1.teamName}
              </span>
              <span className="text-xs text-green-500 font-bold">{team1.totalQualityPoints} pts</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">VS</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="text-right">
              <span className="text-sm font-semibold text-primary truncate block">
                {team2.teamName}
              </span>
              <span className="text-xs text-muted-foreground font-bold">{team2.totalQualityPoints} pts</span>
            </div>
            <img 
              src={team2.teamName.toLowerCase().includes("lioness") ? brasaoLioness : brasaoTroia} 
              alt={team2.teamName}
              className="w-8 h-8 object-contain"
            />
          </div>
        </div>

        {/* Quality Metrics by Category */}
        {qualityMetrics.map((category, catIdx) => {
          const Icon = category.icon;
          return (
            <div key={catIdx} className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                <Icon className={`w-4 h-4 ${category.color}`} />
                <span className="text-sm font-semibold text-foreground">{category.category}</span>
              </div>
              
              {category.items.map((metric, idx) => {
                const { p1, p2 } = getPercentage(metric.value1, metric.value2);
                const team1Winning = metric.value1 > metric.value2;
                const team2Winning = metric.value2 > metric.value1;
                const isTied = metric.value1 === metric.value2;
                const hasData = metric.value1 > 0 || metric.value2 > 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">{metric.label}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                      {/* Team 1 Value */}
                      <div className="text-left">
                        <span
                          className={`text-sm font-bold ${
                            team1Winning
                              ? "text-green-500"
                              : isTied && hasData
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {metric.value1}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        {hasData && (
                          <>
                            <div
                              className={`absolute left-0 h-full transition-all duration-500 ${
                                team1Winning
                                  ? "bg-gradient-to-r from-green-500 to-green-400"
                                  : "bg-gradient-to-r from-primary/60 to-primary/40"
                              }`}
                              style={{ width: `${p1}%` }}
                            />
                            <div
                              className={`absolute right-0 h-full transition-all duration-500 ${
                                team2Winning
                                  ? "bg-gradient-to-l from-green-500 to-green-400"
                                  : "bg-gradient-to-l from-primary/60 to-primary/40"
                              }`}
                              style={{ width: `${p2}%` }}
                            />
                          </>
                        )}
                        {/* Center divider */}
                        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-background/50 -translate-x-1/2" />
                      </div>

                      {/* Team 2 Value */}
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${
                            team2Winning
                              ? "text-green-500"
                              : isTied && hasData
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {metric.value2}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Summary */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {team1.totalQualityPoints > team2.totalQualityPoints
                ? `${team1.teamName} lidera em qualidade`
                : team2.totalQualityPoints > team1.totalQualityPoints
                ? `${team2.teamName} lidera em qualidade`
                : "Empate em indicadores de qualidade!"}
            </span>
            <span className="text-primary font-medium">
              Diferença: {Math.abs(team1.totalQualityPoints - team2.totalQualityPoints)} pts
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamQualityComparisonCard;
