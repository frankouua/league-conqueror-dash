import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Star, MessageSquare, Heart, Sparkles, Trophy, ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);

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
          const teamReferrals = allReferralLeads?.filter(r => r.team_id === team.id) || [];
          const referralsCollected = teamReferrals.length; // All collected
          const referralsConsultation = teamReferrals.filter(r => r.status === "agendou" || r.status === "operou").length;
          const referralsSurgery = teamReferrals.filter(r => r.status === "operou").length;

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
      <Card className="bg-muted/30 border-border">
        <CardHeader className="py-2 px-3">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
      </Card>
    );
  }

  if (teamStats.length < 2) return null;

  const team1 = teamStats[0];
  const team2 = teamStats[1];

  const compactMetrics = [
    { label: "NPS 10", icon: Star, v1: team1.nps10Count, v2: team2.nps10Count, color: "text-yellow-500" },
    { label: "NPS 9", icon: Star, v1: team1.nps9Count, v2: team2.nps9Count, color: "text-yellow-400" },
    { label: "Menções NPS", icon: Star, v1: team1.npsCitations, v2: team2.npsCitations, color: "text-amber-500" },
    { label: "Dep. Ouro", icon: MessageSquare, v1: team1.testimonialGold, v2: team2.testimonialGold, color: "text-amber-400" },
    { label: "Dep. Vídeo", icon: MessageSquare, v1: team1.testimonialVideo, v2: team2.testimonialVideo, color: "text-blue-500" },
    { label: "Dep. Google", icon: MessageSquare, v1: team1.testimonialGoogle, v2: team2.testimonialGoogle, color: "text-blue-400" },
    { label: "Dep. WhatsApp", icon: MessageSquare, v1: team1.testimonialWhatsapp, v2: team2.testimonialWhatsapp, color: "text-green-500" },
    { label: "Indic. Coletadas", icon: Heart, v1: team1.referralsCollected, v2: team2.referralsCollected, color: "text-pink-500" },
    { label: "Indic. → Consulta", icon: Heart, v1: team1.referralsConsultation, v2: team2.referralsConsultation, color: "text-pink-400" },
    { label: "Indic. → Cirurgia", icon: Heart, v1: team1.referralsSurgery, v2: team2.referralsSurgery, color: "text-rose-500" },
    { label: "Embaixadoras", icon: Sparkles, v1: team1.ambassadors, v2: team2.ambassadors, color: "text-purple-500" },
    { label: "UniLovers", icon: Sparkles, v1: team1.unilovers, v2: team2.unilovers, color: "text-purple-400" },
    { label: "Menções Insta", icon: Sparkles, v1: team1.instagramMentions, v2: team2.instagramMentions, color: "text-fuchsia-500" },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-muted/30 border-border">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                <CardTitle className="text-xs font-medium text-foreground">
                  Indicadores de Qualidade
                </CardTitle>
                <div className="flex gap-1">
                  {(["month", "year", "all"] as PeriodFilter[]).map((p) => (
                    <button
                      key={p}
                      onClick={(e) => { e.stopPropagation(); setPeriod(p); }}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] rounded transition-all",
                        period === p
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {p === "month" ? "Mês" : p === "year" ? "Ano" : "Geral"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground truncate max-w-[60px]">{team1.teamName.split(" ")[0]}</span>
                  <span className={cn("font-bold", team1.totalQualityPoints > team2.totalQualityPoints ? "text-green-500" : "text-muted-foreground")}>
                    {team1.totalQualityPoints}
                  </span>
                  <span className="text-muted-foreground">×</span>
                  <span className={cn("font-bold", team2.totalQualityPoints > team1.totalQualityPoints ? "text-green-500" : "text-muted-foreground")}>
                    {team2.totalQualityPoints}
                  </span>
                  <span className="text-muted-foreground truncate max-w-[60px]">{team2.teamName.split(" ")[0]}</span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-2 px-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-1">
              {compactMetrics.map((m, i) => {
                const Icon = m.icon;
                const t1Win = m.v1 > m.v2;
                const t2Win = m.v2 > m.v1;
                return (
                  <div key={i} className="flex items-center justify-between py-0.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <Icon className={cn("w-2.5 h-2.5 shrink-0", m.color)} />
                      <span className="text-[10px] text-muted-foreground truncate">{m.label}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium">
                      <span className={t1Win ? "text-green-500" : "text-muted-foreground"}>{m.v1}</span>
                      <span className="text-muted-foreground/50">:</span>
                      <span className={t2Win ? "text-green-500" : "text-muted-foreground"}>{m.v2}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default TeamQualityComparisonCard;
