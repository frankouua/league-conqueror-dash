import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Trophy,
} from "lucide-react";

interface LeadResponseMetricsProps {
  month: number;
  year: number;
}

const LeadResponseMetrics = ({ month, year }: LeadResponseMetricsProps) => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59`;

  // Fetch leads with response data
  const { data: leads } = useQuery({
    queryKey: ["lead-response-metrics", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_leads")
        .select("id, status, created_at, last_contact_at, assigned_to, team_id")
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for seller names
  const { data: profiles } = useQuery({
    queryKey: ["profiles-response"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, team_id");
      if (error) throw error;
      return data;
    },
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams-response"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  const metrics = useMemo(() => {
    if (!leads || !profiles) {
      return {
        overall: { avg: 0, under2h: 0, under24h: 0, over48h: 0, total: 0 },
        bySeller: [],
        byTeam: [],
        staleLeads: [],
      };
    }

    // Calculate response times
    const leadsWithResponse = leads.filter((l) => l.last_contact_at);
    const responseTimes = leadsWithResponse.map((l) => {
      const created = new Date(l.created_at).getTime();
      const contacted = new Date(l.last_contact_at!).getTime();
      return {
        leadId: l.id,
        assignedTo: l.assigned_to,
        teamId: l.team_id,
        hours: (contacted - created) / (1000 * 60 * 60),
      };
    });

    // Overall metrics
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, r) => sum + r.hours, 0) / responseTimes.length
      : 0;

    const under2h = responseTimes.filter((r) => r.hours <= 2).length;
    const under24h = responseTimes.filter((r) => r.hours <= 24).length;
    const over48h = responseTimes.filter((r) => r.hours > 48).length;

    // By seller
    const sellerMap = new Map<string, { times: number[]; name: string; teamId: string }>();
    responseTimes.forEach((r) => {
      if (r.assignedTo) {
        const existing = sellerMap.get(r.assignedTo) || { times: [], name: "", teamId: r.teamId };
        existing.times.push(r.hours);
        const profile = profiles.find((p) => p.user_id === r.assignedTo);
        existing.name = profile?.full_name || "Desconhecido";
        existing.teamId = profile?.team_id || r.teamId;
        sellerMap.set(r.assignedTo, existing);
      }
    });

    const bySeller = Array.from(sellerMap.entries())
      .map(([userId, data]) => {
        const avg = data.times.reduce((sum, t) => sum + t, 0) / data.times.length;
        const team = teams?.find((t) => t.id === data.teamId);
        return {
          userId,
          name: data.name,
          teamName: team?.name || "Sem equipe",
          avgTime: avg,
          totalLeads: data.times.length,
          under2hPercent: (data.times.filter((t) => t <= 2).length / data.times.length) * 100,
        };
      })
      .sort((a, b) => a.avgTime - b.avgTime); // Fastest first

    // By team
    const teamMap = new Map<string, number[]>();
    responseTimes.forEach((r) => {
      const existing = teamMap.get(r.teamId) || [];
      existing.push(r.hours);
      teamMap.set(r.teamId, existing);
    });

    const byTeam = Array.from(teamMap.entries())
      .map(([teamId, times]) => {
        const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
        const team = teams?.find((t) => t.id === teamId);
        return {
          teamId,
          teamName: team?.name || "Sem equipe",
          avgTime: avg,
          totalLeads: times.length,
        };
      })
      .sort((a, b) => a.avgTime - b.avgTime);

    // Stale leads (no contact yet)
    const now = new Date();
    const staleLeads = leads
      .filter((l) => !l.last_contact_at && ["nova", "em_contato"].includes(l.status))
      .map((l) => {
        const hoursSinceCreation = (now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60);
        const assignedProfile = profiles.find((p) => p.user_id === l.assigned_to);
        return {
          id: l.id,
          hoursSinceCreation,
          assignedTo: assignedProfile?.full_name || "Não atribuído",
          urgency: hoursSinceCreation > 48 ? "critical" : hoursSinceCreation > 24 ? "high" : hoursSinceCreation > 2 ? "medium" : "low",
        };
      })
      .sort((a, b) => b.hoursSinceCreation - a.hoursSinceCreation);

    return {
      overall: {
        avg: avgResponseTime,
        under2h,
        under24h,
        over48h,
        total: leads.length,
        withResponse: leadsWithResponse.length,
      },
      bySeller,
      byTeam,
      staleLeads,
    };
  }, [leads, profiles, teams]);

  const getTimeColor = (hours: number) => {
    if (hours <= 2) return "text-success";
    if (hours <= 24) return "text-amber-500";
    return "text-destructive";
  };

  const getTimeBadge = (hours: number) => {
    if (hours <= 2) return <Badge className="bg-success text-success-foreground text-xs">⚡ Rápido</Badge>;
    if (hours <= 24) return <Badge variant="outline" className="text-amber-500 border-amber-500 text-xs">Normal</Badge>;
    return <Badge variant="destructive" className="text-xs">Lento</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Tempo de Resposta - Indicações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`p-3 rounded-lg border ${metrics.overall.avg <= 2 ? "bg-success/10 border-success/30" : metrics.overall.avg <= 24 ? "bg-amber-500/10 border-amber-500/30" : "bg-destructive/10 border-destructive/30"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-4 h-4 ${getTimeColor(metrics.overall.avg)}`} />
              <span className="text-xs text-muted-foreground">Média Geral</span>
            </div>
            <p className={`text-xl font-bold ${getTimeColor(metrics.overall.avg)}`}>
              {metrics.overall.avg.toFixed(1)}h
            </p>
          </div>

          <div className="p-3 rounded-lg bg-success/10 border border-success/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Até 2h</span>
            </div>
            <p className="text-xl font-bold text-success">
              {metrics.overall.under2h}
              <span className="text-xs font-normal ml-1">
                ({metrics.overall.withResponse > 0 ? ((metrics.overall.under2h / metrics.overall.withResponse) * 100).toFixed(0) : 0}%)
              </span>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Até 24h</span>
            </div>
            <p className="text-xl font-bold text-amber-600">
              {metrics.overall.under24h}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">+48h sem contato</span>
            </div>
            <p className="text-xl font-bold text-destructive">
              {metrics.staleLeads.filter((l) => l.urgency === "critical").length}
            </p>
          </div>
        </div>

        {/* Ranking by Seller */}
        {metrics.bySeller.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Ranking de Velocidade
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {metrics.bySeller.slice(0, 5).map((seller, idx) => (
                <div
                  key={seller.userId}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    idx === 0 ? "bg-gradient-gold-shine/20 border border-primary/30" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${idx === 0 ? "text-primary" : "text-muted-foreground"}`}>
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-sm">{seller.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {seller.teamName.replace(" Team", "")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTimeBadge(seller.avgTime)}
                    <span className={`font-bold ${getTimeColor(seller.avgTime)}`}>
                      {seller.avgTime.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Comparison */}
        {metrics.byTeam.length >= 2 && (
          <div className="grid grid-cols-2 gap-3">
            {metrics.byTeam.map((team, idx) => (
              <div
                key={team.teamId}
                className={`p-3 rounded-lg border ${
                  idx === 0 ? "border-success/30 bg-success/10" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{team.teamName}</span>
                  {idx === 0 && <Trophy className="w-4 h-4 text-success" />}
                </div>
                <p className={`text-lg font-bold ${getTimeColor(team.avgTime)}`}>
                  {team.avgTime.toFixed(1)}h média
                </p>
                <p className="text-xs text-muted-foreground">{team.totalLeads} leads</p>
              </div>
            ))}
          </div>
        )}

        {metrics.overall.total === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma indicação neste período</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadResponseMetrics;
