import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Star, MessageSquare, Heart, Sparkles, Trophy, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

type PeriodFilter = "month" | "year" | "all";

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
          { data: allReferralLeads },
          { data: allIndicators },
        ] = await Promise.all([
          supabase.from("nps_records").select("*").gte("date", start).lte("date", end),
          supabase.from("testimonial_records").select("*").gte("date", start).lte("date", end),
          supabase.from("referral_leads").select("*").gte("created_at", `${start}T00:00:00`).lte("created_at", `${end}T23:59:59`),
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

          // Referrals from referral_leads table (Alavancas)
          // IMPORTANT: Points are NOT cumulative - each referral counts only for its highest status
          // - Just collected (novo/em_contato) = 5 pts
          // - Became consultation (agendou) = 15 pts (not 5+15)
          // - Became surgery (operou) = 30 pts (not 5+15+30)
          const teamReferrals = allReferralLeads?.filter(r => r.team_id === team.id) || [];
          
          // Count by EXCLUSIVE categories (each referral only in ONE category)
          const referralsSurgery = teamReferrals.filter(r => r.status === "operou").length;
          const referralsConsultation = teamReferrals.filter(r => r.status === "agendou").length; // Only agendou, NOT operou
          const referralsCollected = teamReferrals.filter(r => 
            r.status !== "operou" && r.status !== "agendou"
          ).length; // Only those that haven't progressed

          // Other indicators
          const teamIndicators = allIndicators?.filter(r => r.team_id === team.id) || [];
          const ambassadors = teamIndicators.reduce((sum, i) => sum + (i.ambassadors || 0), 0);
          const unilovers = teamIndicators.reduce((sum, i) => sum + (i.unilovers || 0), 0);
          const instagramMentions = teamIndicators.reduce((sum, i) => sum + (i.instagram_mentions || 0), 0);

          // Calculate total points
          const npsPoints = nps9Count * 3 + nps10Count * 5 + npsCitations * 10;
          const testimonialPoints = testimonialWhatsapp * 5 + testimonialGoogle * 10 + testimonialVideo * 30 + testimonialGold * 50;
          // Referral points: each referral only counts once for its highest status
          // Collected (not progressed) = 5 pts, Consultation = 15 pts, Surgery = 30 pts
          const referralPoints = referralsCollected * 5 + referralsConsultation * 15 + referralsSurgery * 30;
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
      <Card className="bg-gradient-card border-border">
        <CardHeader className="py-3 px-4">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (teamStats.length < 2) return null;

  const team1 = teamStats[0];
  const team2 = teamStats[1];

  const getPercentage = (v1: number, v2: number) => {
    const total = v1 + v2;
    if (total === 0) return { p1: 50, p2: 50 };
    return { p1: (v1 / total) * 100, p2: (v2 / total) * 100 };
  };

  const categories = [
    {
      name: "NPS",
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      items: [
        { label: "NPS 10", v1: team1.nps10Count, v2: team2.nps10Count, pts: 5 },
        { label: "NPS 9", v1: team1.nps9Count, v2: team2.nps9Count, pts: 3 },
        { label: "Com Menção", v1: team1.npsCitations, v2: team2.npsCitations, pts: 10 },
      ],
    },
    {
      name: "Depoimentos",
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      items: [
        { label: "Ouro", v1: team1.testimonialGold, v2: team2.testimonialGold, pts: 50 },
        { label: "Vídeo", v1: team1.testimonialVideo, v2: team2.testimonialVideo, pts: 30 },
        { label: "Google 5★", v1: team1.testimonialGoogle, v2: team2.testimonialGoogle, pts: 10 },
        { label: "WhatsApp", v1: team1.testimonialWhatsapp, v2: team2.testimonialWhatsapp, pts: 5 },
      ],
    },
    {
      name: "Indicações",
      icon: Heart,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      items: [
        { label: "→ Cirurgia", v1: team1.referralsSurgery, v2: team2.referralsSurgery, pts: 30 },
        { label: "→ Consulta", v1: team1.referralsConsultation, v2: team2.referralsConsultation, pts: 15 },
        { label: "Apenas Coletadas", v1: team1.referralsCollected, v2: team2.referralsCollected, pts: 5 },
      ],
    },
    {
      name: "Extras",
      icon: Sparkles,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      items: [
        { label: "Embaixadoras", v1: team1.ambassadors, v2: team2.ambassadors, pts: 50 },
        { label: "UniLovers", v1: team1.unilovers, v2: team2.unilovers, pts: 5 },
        { label: "Menções Insta", v1: team1.instagramMentions, v2: team2.instagramMentions, pts: 2 },
      ],
    },
  ];

  return (
    <Card className="bg-gradient-card border-border overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="w-4 h-4 text-primary" />
            Indicadores de Qualidade
          </CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
              {(["month", "year", "all"] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                    period === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {p === "month" ? "Mês" : p === "year" ? "Ano" : "Geral"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Team Headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mb-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <img 
              src={team1.teamName.toLowerCase().includes("lioness") ? brasaoLioness : brasaoTroia} 
              alt={team1.teamName}
              className="w-10 h-10 object-contain"
            />
            <div>
              <p className="text-sm font-bold text-foreground">{team1.teamName}</p>
              <p className={cn(
                "text-lg font-black",
                team1.totalQualityPoints > team2.totalQualityPoints ? "text-green-500" : "text-muted-foreground"
              )}>
                {team1.totalQualityPoints} pts
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">VS</span>
          </div>
          
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{team2.teamName}</p>
              <p className={cn(
                "text-lg font-black",
                team2.totalQualityPoints > team1.totalQualityPoints ? "text-green-500" : "text-muted-foreground"
              )}>
                {team2.totalQualityPoints} pts
              </p>
            </div>
            <img 
              src={team2.teamName.toLowerCase().includes("lioness") ? brasaoLioness : brasaoTroia} 
              alt={team2.teamName}
              className="w-10 h-10 object-contain"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.name} className={cn("rounded-lg p-3", cat.bgColor)}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("w-4 h-4", cat.color)} />
                  <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                </div>
                
                <div className="space-y-2">
                  {cat.items.map((item) => {
                    const { p1, p2 } = getPercentage(item.v1, item.v2);
                    const t1Win = item.v1 > item.v2;
                    const t2Win = item.v2 > item.v1;
                    const hasData = item.v1 > 0 || item.v2 > 0;
                    
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn("font-bold", t1Win ? "text-green-500" : "text-foreground")}>
                            {item.v1}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {item.label} ({item.pts}pts)
                          </span>
                          <span className={cn("font-bold", t2Win ? "text-green-500" : "text-foreground")}>
                            {item.v2}
                          </span>
                        </div>
                        
                        <div className="relative h-2 bg-background/50 rounded-full overflow-hidden">
                          {hasData && (
                            <>
                              <div
                                className={cn(
                                  "absolute left-0 h-full transition-all duration-500 rounded-l-full",
                                  t1Win ? "bg-green-500" : "bg-primary/60"
                                )}
                                style={{ width: `${p1}%` }}
                              />
                              <div
                                className={cn(
                                  "absolute right-0 h-full transition-all duration-500 rounded-r-full",
                                  t2Win ? "bg-green-500" : "bg-primary/60"
                                )}
                                style={{ width: `${p2}%` }}
                              />
                            </>
                          )}
                          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-background -translate-x-1/2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {team1.totalQualityPoints > team2.totalQualityPoints
              ? `${team1.teamName} lidera em qualidade`
              : team2.totalQualityPoints > team1.totalQualityPoints
              ? `${team2.teamName} lidera em qualidade`
              : "Empate em qualidade!"}
          </span>
          <span className="font-semibold text-primary">
            Diferença: {Math.abs(team1.totalQualityPoints - team2.totalQualityPoints)} pts
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamQualityComparisonCard;
