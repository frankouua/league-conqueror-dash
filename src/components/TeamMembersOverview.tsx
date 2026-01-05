import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Trophy, TrendingUp, Star, DollarSign, Target, Award } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface TeamMembersOverviewProps {
  month: number;
  year: number;
}

interface MemberStats {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  position: string | null;
  department: string | null;
  revenueTotal: number;
  npsCount: number;
  testimonialCount: number;
  referralCount: number;
  totalPoints: number;
}

const POSITION_LABELS: Record<string, string> = {
  comercial_1_captacao: "Social Selling",
  comercial_2_closer: "Closer",
  comercial_3_experiencia: "Customer Success",
  comercial_4_farmer: "Farmer",
  sdr: "SDR",
  coordenador: "Coordenador",
  gerente: "Gerente",
  assistente: "Assistente",
  outro: "Outro",
};

const TeamMembersOverview = ({ month, year }: TeamMembersOverviewProps) => {
  const { profile, role } = useAuth();

  const dateStart = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const dateEnd = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id && role !== "admin") return [];
      
      let query = supabase.from("profiles").select("*");
      
      if (role !== "admin" && profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile || role === "admin",
  });

  // Fetch revenue records
  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-records-team", profile?.team_id, dateStart, dateEnd],
    queryFn: async () => {
      let query = supabase
        .from("revenue_records")
        .select("*")
        .gte("date", dateStart)
        .lte("date", dateEnd);

      if (role !== "admin" && profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile || role === "admin",
  });

  // Fetch NPS records
  const { data: npsRecords } = useQuery({
    queryKey: ["nps-records-team", profile?.team_id, dateStart, dateEnd],
    queryFn: async () => {
      let query = supabase
        .from("nps_records")
        .select("*")
        .gte("date", dateStart)
        .lte("date", dateEnd);

      if (role !== "admin" && profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile || role === "admin",
  });

  // Fetch testimonial records
  const { data: testimonialRecords } = useQuery({
    queryKey: ["testimonial-records-team", profile?.team_id, dateStart, dateEnd],
    queryFn: async () => {
      let query = supabase
        .from("testimonial_records")
        .select("*")
        .gte("date", dateStart)
        .lte("date", dateEnd);

      if (role !== "admin" && profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile || role === "admin",
  });

  // Fetch referral records
  const { data: referralRecords } = useQuery({
    queryKey: ["referral-records-team", profile?.team_id, dateStart, dateEnd],
    queryFn: async () => {
      let query = supabase
        .from("referral_records")
        .select("*")
        .gte("date", dateStart)
        .lte("date", dateEnd);

      if (role !== "admin" && profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile || role === "admin",
  });

  // Calculate member stats
  const memberStats: MemberStats[] = (teamMembers || []).map((member) => {
    const userId = member.user_id;

    // Revenue
    const memberRevenue = (revenueRecords || [])
      .filter((r) => r.user_id === userId || r.attributed_to_user_id === userId)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const revenuePoints = Math.floor(memberRevenue / 10000);

    // NPS
    const memberNps = (npsRecords || []).filter(
      (r) => r.user_id === userId || r.attributed_to_user_id === userId
    );
    let npsPoints = 0;
    memberNps.forEach((n) => {
      if (n.score === 9) npsPoints += 3;
      if (n.score === 10) npsPoints += 5;
      if (n.cited_member) npsPoints += 10;
    });

    // Testimonials
    const memberTestimonials = (testimonialRecords || []).filter(
      (r) => r.user_id === userId || r.attributed_to_user_id === userId
    );
    let testimonialPoints = 0;
    memberTestimonials.forEach((t) => {
      if (t.type === "google") testimonialPoints += 10;
      if (t.type === "video") testimonialPoints += 20;
      if (t.type === "gold") testimonialPoints += 40;
    });

    // Referrals
    const memberReferrals = (referralRecords || []).filter(
      (r) => r.user_id === userId || r.attributed_to_user_id === userId
    );
    let referralPoints = 0;
    memberReferrals.forEach((r) => {
      referralPoints += (r.collected || 0) * 5;
      referralPoints += (r.to_consultation || 0) * 15;
      referralPoints += (r.to_surgery || 0) * 30;
    });

    return {
      userId,
      fullName: member.full_name,
      avatarUrl: member.avatar_url,
      position: member.position,
      department: member.department,
      revenueTotal: memberRevenue,
      npsCount: memberNps.length,
      testimonialCount: memberTestimonials.length,
      referralCount: memberReferrals.reduce((sum, r) => sum + (r.collected || 0), 0),
      totalPoints: revenuePoints + npsPoints + testimonialPoints + referralPoints,
    };
  });

  // Sort by total points
  const sortedMembers = [...memberStats].sort((a, b) => b.totalPoints - a.totalPoints);
  const maxPoints = sortedMembers[0]?.totalPoints || 1;

  // Team totals
  const teamTotals = {
    revenue: sortedMembers.reduce((sum, m) => sum + m.revenueTotal, 0),
    nps: sortedMembers.reduce((sum, m) => sum + m.npsCount, 0),
    testimonials: sortedMembers.reduce((sum, m) => sum + m.testimonialCount, 0),
    referrals: sortedMembers.reduce((sum, m) => sum + m.referralCount, 0),
    points: sortedMembers.reduce((sum, m) => sum + m.totalPoints, 0),
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (!sortedMembers.length) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="w-5 h-5 text-primary" />
          Visão Geral do Time
          <Badge variant="outline" className="ml-auto font-normal">
            {sortedMembers.length} membros
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Faturamento</span>
            </div>
            <p className="font-bold text-lg text-emerald-500">
              {formatCurrency(teamTotals.revenue)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">NPS</span>
            </div>
            <p className="font-bold text-lg text-blue-500">{teamTotals.nps}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Depoimentos</span>
            </div>
            <p className="font-bold text-lg text-purple-500">{teamTotals.testimonials}</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Indicações</span>
            </div>
            <p className="font-bold text-lg text-orange-500">{teamTotals.referrals}</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Pontos Totais</span>
            </div>
            <p className="font-bold text-lg text-primary">{teamTotals.points.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* Members Ranking */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Ranking Individual
          </h4>
          <div className="space-y-2">
            {sortedMembers.slice(0, 10).map((member, index) => (
              <div
                key={member.userId}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-primary/30 ${
                  index === 0
                    ? "bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30"
                    : index === 1
                    ? "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/30"
                    : index === 2
                    ? "bg-gradient-to-r from-orange-700/10 to-transparent border-orange-700/30"
                    : "bg-card/50 border-border"
                }`}
              >
                {/* Position */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0
                      ? "bg-amber-500 text-amber-950"
                      : index === 1
                      ? "bg-slate-400 text-slate-950"
                      : index === 2
                      ? "bg-orange-700 text-orange-100"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}º
                </div>

                {/* Avatar */}
                <Avatar className="w-10 h-10 border-2 border-primary/20">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                    {getInitials(member.fullName)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{member.fullName}</p>
                    {member.position && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                        {POSITION_LABELS[member.position] || member.position}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(member.revenueTotal)}
                    </span>
                    <span className="hidden sm:flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {member.npsCount} NPS
                    </span>
                    <span className="hidden md:flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {member.testimonialCount} dep.
                    </span>
                  </div>
                </div>

                {/* Points & Progress */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary">{member.totalPoints.toLocaleString("pt-BR")} pts</p>
                  <Progress
                    value={(member.totalPoints / maxPoints) * 100}
                    className="w-20 h-1.5 mt-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamMembersOverview;
