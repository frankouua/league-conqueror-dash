import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Target, Users, CheckCircle2, Clock, Trophy, TrendingUp, Award } from "lucide-react";
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
  is_active: boolean;
  prize_description: string | null;
  prize_value: number | null;
}

interface TeamProgress {
  team_id: string;
  team_name: string;
  total_actions: number;
  completed_actions: number;
  completion_rate: number;
  members_count: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const CampaignResultsDashboard = () => {
  const { user } = useAuth();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  // Fetch all active/recent campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns-results-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user,
  });

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Fetch campaign actions
  const { data: campaignActions = [] } = useQuery({
    queryKey: ["campaign-actions-results", selectedCampaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_actions")
        .select("*")
        .eq("campaign_id", selectedCampaignId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCampaignId,
  });

  // Fetch all progress for this campaign
  const { data: allProgress = [] } = useQuery({
    queryKey: ["campaign-all-progress", selectedCampaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_checklist_progress")
        .select(`
          *,
          profiles:user_id (
            full_name,
            team_id,
            teams:team_id (name)
          )
        `)
        .eq("campaign_id", selectedCampaignId)
        .eq("completed", true);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCampaignId,
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

  // Fetch profiles with teams
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-with-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, team_id");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCampaignId,
  });

  // Calculate team progress
  const teamProgress: TeamProgress[] = teams.map(team => {
    const teamMembers = profiles.filter(p => p.team_id === team.id);
    const totalActions = teamMembers.length * campaignActions.length;
    const completedActions = allProgress.filter(p => {
      const profile = profiles.find(pr => pr.user_id === p.user_id);
      return profile?.team_id === team.id;
    }).length;

    return {
      team_id: team.id,
      team_name: team.name,
      total_actions: totalActions,
      completed_actions: completedActions,
      completion_rate: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
      members_count: teamMembers.length,
    };
  }).filter(t => t.members_count > 0);

  // Individual ranking
  const individualRanking = profiles.map(profile => {
    const userProgress = allProgress.filter(p => p.user_id === profile.user_id);
    return {
      name: profile.full_name,
      team_id: profile.team_id,
      team_name: teams.find(t => t.id === profile.team_id)?.name || "Sem equipe",
      completed: userProgress.length,
      total: campaignActions.length,
      rate: campaignActions.length > 0 ? Math.round((userProgress.length / campaignActions.length) * 100) : 0,
    };
  })
    .filter(u => u.total > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  // Daily evolution data
  const dailyProgress = (() => {
    if (!selectedCampaign) return [];
    
    const progressByDate: Record<string, number> = {};
    allProgress.forEach(p => {
      if (p.completed_at) {
        const date = p.completed_at.split('T')[0];
        progressByDate[date] = (progressByDate[date] || 0) + 1;
      }
    });

    return Object.entries(progressByDate)
      .map(([date, count]) => ({
        date: format(new Date(date), "dd/MM", { locale: ptBR }),
        concluídas: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  })();

  // Action completion stats
  const actionStats = campaignActions.map(action => {
    const completedCount = allProgress.filter(p => p.action_id === action.id).length;
    const totalPossible = profiles.length;
    return {
      name: action.title.length > 20 ? action.title.substring(0, 20) + "..." : action.title,
      fullName: action.title,
      concluídas: completedCount,
      pendentes: totalPossible - completedCount,
      rate: totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0,
    };
  });

  const getDaysRemaining = () => {
    if (!selectedCampaign) return 0;
    return Math.max(0, differenceInDays(new Date(selectedCampaign.end_date), new Date()));
  };

  const getOverallProgress = () => {
    const total = profiles.length * campaignActions.length;
    return total > 0 ? Math.round((allProgress.length / total) * 100) : 0;
  };

  if (campaigns.length === 0) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhuma campanha ativa para exibir resultados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Dashboard de Resultados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Selecione uma campanha" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCampaign && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Progresso Geral</span>
                </div>
                <p className="text-2xl font-bold">{getOverallProgress()}%</p>
                <Progress value={getOverallProgress()} className="h-1.5 mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-chart-2" />
                  <span className="text-xs text-muted-foreground">Ações Concluídas</span>
                </div>
                <p className="text-2xl font-bold">{allProgress.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {profiles.length * campaignActions.length} possíveis
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-chart-3" />
                  <span className="text-xs text-muted-foreground">Participantes</span>
                </div>
                <p className="text-2xl font-bold">{profiles.length}</p>
                <p className="text-xs text-muted-foreground mt-1">membros engajados</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-chart-4" />
                  <span className="text-xs text-muted-foreground">Dias Restantes</span>
                </div>
                <p className="text-2xl font-bold">{getDaysRemaining()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  até {format(new Date(selectedCampaign.end_date), "dd/MM", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Prize Display */}
          {(selectedCampaign.prize_description || selectedCampaign.prize_value) && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30">
              <CardContent className="p-4 flex items-center gap-4">
                <Trophy className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Premiação</p>
                  <p className="text-lg font-bold">
                    {selectedCampaign.prize_value 
                      ? `R$ ${selectedCampaign.prize_value.toLocaleString('pt-BR')}`
                      : selectedCampaign.prize_description
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Team Ranking */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Ranking por Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamProgress} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="team_name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Conclusão']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="completion_rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily Evolution */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Evolução Diária
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyProgress}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="concluídas" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Stats & Individual Ranking */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Action Completion */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Conclusão por Ação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actionStats.map((action, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1" title={action.fullName}>
                          {action.name}
                        </span>
                        <Badge variant="outline" className="ml-2">
                          {action.rate}%
                        </Badge>
                      </div>
                      <Progress value={action.rate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {individualRanking.map((person, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        idx === 0 ? 'bg-amber-500/10 border border-amber-500/30' :
                        idx === 1 ? 'bg-slate-300/10 border border-slate-300/30' :
                        idx === 2 ? 'bg-amber-700/10 border border-amber-700/30' :
                        'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{person.name}</p>
                          <p className="text-[10px] text-muted-foreground">{person.team_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{person.rate}%</p>
                        <p className="text-[10px] text-muted-foreground">
                          {person.completed}/{person.total}
                        </p>
                      </div>
                    </div>
                  ))}
                  {individualRanking.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      Nenhum progresso registrado ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default CampaignResultsDashboard;
