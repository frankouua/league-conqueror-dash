import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Calendar, Trophy, Users, CheckCircle2, TrendingUp, TrendingDown, Award, Target, Clock, History } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  goal_description: string | null;
  goal_value: number | null;
  goal_metric: string | null;
  prize_description: string | null;
  prize_value: number | null;
  is_active: boolean;
}

interface CampaignStats {
  campaign: Campaign;
  totalActions: number;
  completedActions: number;
  completionRate: number;
  participantsCount: number;
  totalParticipants: number;
  participationRate: number;
  duration: number;
  winner?: { name: string; team: string; rate: number };
}

const CAMPAIGN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  mensal: { label: "Mensal", color: "bg-blue-500" },
  semestral: { label: "Semestral", color: "bg-purple-500" },
  anual: { label: "Anual", color: "bg-amber-500" },
  oportuna: { label: "Oportuna", color: "bg-emerald-500" },
  estrategica: { label: "Estratégica", color: "bg-rose-500" },
};

const CampaignHistory = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedCampaign1, setSelectedCampaign1] = useState<string>("");
  const [selectedCampaign2, setSelectedCampaign2] = useState<string>("");

  // Fetch ended campaigns
  const { data: endedCampaigns = [], isLoading } = useQuery({
    queryKey: ["ended-campaigns", selectedYear],
    queryFn: async () => {
      const startOfYear = `${selectedYear}-01-01`;
      const endOfYear = `${selectedYear}-12-31`;
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_template", false)
        .gte("start_date", startOfYear)
        .lte("end_date", endOfYear)
        .lt("end_date", today)
        .order("end_date", { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user,
  });

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, team_id");
      if (error) throw error;
      return data;
    },
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ["teams-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all campaign stats
  const { data: campaignStats = [] } = useQuery({
    queryKey: ["campaign-stats", endedCampaigns.map(c => c.id).join(",")],
    queryFn: async () => {
      const stats: CampaignStats[] = [];

      for (const campaign of endedCampaigns) {
        // Get actions
        const { data: actions } = await supabase
          .from("campaign_actions")
          .select("id")
          .eq("campaign_id", campaign.id);

        const totalActions = actions?.length || 0;

        // Get progress
        const { data: progress } = await supabase
          .from("campaign_checklist_progress")
          .select("user_id, action_id, completed")
          .eq("campaign_id", campaign.id)
          .eq("completed", true);

        const completedActions = progress?.length || 0;
        const uniqueParticipants = new Set(progress?.map(p => p.user_id) || []);

        // Calculate per-user completion for winner
        const userCompletions: Record<string, number> = {};
        progress?.forEach(p => {
          userCompletions[p.user_id] = (userCompletions[p.user_id] || 0) + 1;
        });

        let winner = undefined;
        if (totalActions > 0 && Object.keys(userCompletions).length > 0) {
          const winnerId = Object.entries(userCompletions)
            .sort((a, b) => b[1] - a[1])[0];
          const winnerProfile = profiles.find(p => p.user_id === winnerId[0]);
          const winnerTeam = teams.find(t => t.id === winnerProfile?.team_id);
          
          if (winnerProfile) {
            winner = {
              name: winnerProfile.full_name,
              team: winnerTeam?.name || "Sem equipe",
              rate: Math.round((winnerId[1] / totalActions) * 100),
            };
          }
        }

        const totalPossibleActions = totalActions * profiles.length;
        const completionRate = totalPossibleActions > 0 
          ? Math.round((completedActions / totalPossibleActions) * 100) 
          : 0;

        stats.push({
          campaign,
          totalActions,
          completedActions,
          completionRate,
          participantsCount: uniqueParticipants.size,
          totalParticipants: profiles.length,
          participationRate: profiles.length > 0 
            ? Math.round((uniqueParticipants.size / profiles.length) * 100) 
            : 0,
          duration: differenceInDays(new Date(campaign.end_date), new Date(campaign.start_date)),
          winner,
        });
      }

      return stats;
    },
    enabled: endedCampaigns.length > 0 && profiles.length > 0,
  });

  // Get available years
  const availableYears = Array.from({ length: 5 }, (_, i) => 
    (new Date().getFullYear() - i).toString()
  );

  // Prepare comparison data
  const getComparisonData = () => {
    const stats1 = campaignStats.find(s => s.campaign.id === selectedCampaign1);
    const stats2 = campaignStats.find(s => s.campaign.id === selectedCampaign2);

    if (!stats1 || !stats2) return null;

    return {
      stats1,
      stats2,
      radarData: [
        { metric: "Conclusão", campaign1: stats1.completionRate, campaign2: stats2.completionRate },
        { metric: "Participação", campaign1: stats1.participationRate, campaign2: stats2.participationRate },
        { metric: "Engajamento", campaign1: Math.min(100, stats1.completedActions * 2), campaign2: Math.min(100, stats2.completedActions * 2) },
      ],
      barData: [
        { name: "Taxa de Conclusão", [stats1.campaign.name]: stats1.completionRate, [stats2.campaign.name]: stats2.completionRate },
        { name: "Taxa de Participação", [stats1.campaign.name]: stats1.participationRate, [stats2.campaign.name]: stats2.participationRate },
      ],
    };
  };

  // Chart data for timeline
  const timelineData = campaignStats.map(s => ({
    name: s.campaign.name.length > 15 ? s.campaign.name.substring(0, 15) + "..." : s.campaign.name,
    fullName: s.campaign.name,
    conclusão: s.completionRate,
    participação: s.participationRate,
    date: format(new Date(s.campaign.end_date), "MMM/yy", { locale: ptBR }),
  })).reverse();

  // Stats by type
  const statsByType = CAMPAIGN_TYPE_LABELS ? Object.keys(CAMPAIGN_TYPE_LABELS).map(type => {
    const typeCampaigns = campaignStats.filter(s => s.campaign.campaign_type === type);
    const avgCompletion = typeCampaigns.length > 0
      ? Math.round(typeCampaigns.reduce((sum, s) => sum + s.completionRate, 0) / typeCampaigns.length)
      : 0;
    return {
      type: CAMPAIGN_TYPE_LABELS[type].label,
      count: typeCampaigns.length,
      avgCompletion,
    };
  }).filter(s => s.count > 0) : [];

  const comparison = getComparisonData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Histórico de Campanhas
        </h2>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {endedCampaigns.length === 0 ? (
        <Card className="bg-card/50 border-border">
          <CardContent className="p-8 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhuma campanha encerrada em {selectedYear}.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="overview" className="gap-1">
              <TrendingUp className="w-3 h-3" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1">
              <Calendar className="w-3 h-3" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-1">
              <Target className="w-3 h-3" />
              Comparar
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{endedCampaigns.length}</p>
                  <p className="text-xs text-muted-foreground">campanhas</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-chart-2" />
                    <span className="text-xs text-muted-foreground">Média Conclusão</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {campaignStats.length > 0 
                      ? Math.round(campaignStats.reduce((sum, s) => sum + s.completionRate, 0) / campaignStats.length)
                      : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-chart-3" />
                    <span className="text-xs text-muted-foreground">Média Participação</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {campaignStats.length > 0 
                      ? Math.round(campaignStats.reduce((sum, s) => sum + s.participationRate, 0) / campaignStats.length)
                      : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Total Prêmios</span>
                  </div>
                  <p className="text-2xl font-bold">
                    R$ {campaignStats
                      .filter(s => s.campaign.prize_value)
                      .reduce((sum, s) => sum + (s.campaign.prize_value || 0), 0)
                      .toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Evolution Chart */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Evolução ao Longo do Ano
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="conclusão" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        name="Conclusão"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="participação" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))' }}
                        name="Participação"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Stats by Type */}
            {statsByType.length > 0 && (
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Performance por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statsByType}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "avgCompletion" ? `${value}%` : value,
                            name === "avgCompletion" ? "Média Conclusão" : "Quantidade"
                          ]}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="avgCompletion" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Média Conclusão" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list" className="space-y-4">
            {campaignStats.map((stats) => {
              const typeInfo = CAMPAIGN_TYPE_LABELS[stats.campaign.campaign_type] || CAMPAIGN_TYPE_LABELS.mensal;
              return (
                <Card key={stats.campaign.id} className="bg-card/50 border-border overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Left section - Campaign info */}
                    <div className="flex-1 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{stats.campaign.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${typeInfo.color} text-white text-[10px]`}>
                              {typeInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(stats.campaign.start_date), "dd/MM", { locale: ptBR })} - {format(new Date(stats.campaign.end_date), "dd/MM/yy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{stats.duration} dias</span>
                          </div>
                        </div>
                      </div>

                      {stats.campaign.goal_description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {stats.campaign.goal_description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Conclusão</p>
                          <div className="flex items-center gap-2">
                            <Progress value={stats.completionRate} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{stats.completionRate}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Participação</p>
                          <div className="flex items-center gap-2">
                            <Progress value={stats.participationRate} className="h-2 flex-1" />
                            <span className="text-sm font-medium">{stats.participationRate}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right section - Winner & Prize */}
                    <div className="md:w-56 p-4 bg-muted/30 border-t md:border-t-0 md:border-l border-border flex flex-col justify-center gap-3">
                      {stats.winner && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Destaque</p>
                            <p className="text-sm font-medium truncate">{stats.winner.name}</p>
                            <p className="text-[10px] text-muted-foreground">{stats.winner.rate}% conclusão</p>
                          </div>
                        </div>
                      )}
                      {stats.campaign.prize_value && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Award className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Prêmio</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              R$ {stats.campaign.prize_value.toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      )}
                      {!stats.winner && !stats.campaign.prize_value && (
                        <p className="text-xs text-muted-foreground text-center">
                          Sem dados de destaque
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm">Selecione duas campanhas para comparar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Campanha 1</label>
                    <Select value={selectedCampaign1} onValueChange={setSelectedCampaign1}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {endedCampaigns.map(c => (
                          <SelectItem key={c.id} value={c.id} disabled={c.id === selectedCampaign2}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Campanha 2</label>
                    <Select value={selectedCampaign2} onValueChange={setSelectedCampaign2}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {endedCampaigns.map(c => (
                          <SelectItem key={c.id} value={c.id} disabled={c.id === selectedCampaign1}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {comparison && (
              <>
                {/* Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 truncate">{comparison.stats1.campaign.name}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Conclusão</span>
                          <span className="font-medium">{comparison.stats1.completionRate}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Participação</span>
                          <span className="font-medium">{comparison.stats1.participationRate}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Participantes</span>
                          <span className="font-medium">{comparison.stats1.participantsCount}/{comparison.stats1.totalParticipants}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duração</span>
                          <span className="font-medium">{comparison.stats1.duration} dias</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 truncate">{comparison.stats2.campaign.name}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Conclusão</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{comparison.stats2.completionRate}%</span>
                            {comparison.stats2.completionRate > comparison.stats1.completionRate ? (
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                            ) : comparison.stats2.completionRate < comparison.stats1.completionRate ? (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            ) : null}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Participação</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{comparison.stats2.participationRate}%</span>
                            {comparison.stats2.participationRate > comparison.stats1.participationRate ? (
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                            ) : comparison.stats2.participationRate < comparison.stats1.participationRate ? (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            ) : null}
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Participantes</span>
                          <span className="font-medium">{comparison.stats2.participantsCount}/{comparison.stats2.totalParticipants}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duração</span>
                          <span className="font-medium">{comparison.stats2.duration} dias</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Comparison Chart */}
                <Card className="bg-card/50 border-border">
                  <CardHeader>
                    <CardTitle className="text-sm">Comparativo Visual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparison.barData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number) => [`${value}%`]}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Bar dataKey={comparison.stats1.campaign.name} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          <Bar dataKey={comparison.stats2.campaign.name} fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!comparison && selectedCampaign1 && selectedCampaign2 && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </CardContent>
              </Card>
            )}

            {(!selectedCampaign1 || !selectedCampaign2) && (
              <Card className="bg-card/50 border-border">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Selecione duas campanhas acima para ver o comparativo.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default CampaignHistory;
