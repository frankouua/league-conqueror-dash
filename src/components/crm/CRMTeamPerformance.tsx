import { useQuery } from '@tanstack/react-query';
import { 
  Trophy, Medal, Users, Target, TrendingUp, TrendingDown,
  DollarSign, Clock, Star, Award, Crown, Zap,
  BarChart3, CheckCircle2, XCircle, Flame
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isSeller } from '@/constants/sellerPositions';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

interface SellerPerformance {
  userId: string;
  name: string;
  avatar?: string;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalRevenue: number;
  avgTicket: number;
  winRate: number;
  avgResponseTime: number;
  conversionRate: number;
  rank: number;
}

export function CRMTeamPerformance() {
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState('month');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case '3-months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  // Fetch team members (only sellers)
  const { data: teamMembers } = useQuery({
    queryKey: ['crm-team-members', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, position')
        .eq('team_id', profile.team_id);
      
      if (error) throw error;
      // Filter only sellers (not coordinators, managers, etc.)
      return (data || []).filter(p => isSeller(p.position));
    },
    enabled: !!profile?.team_id,
  });

  // Fetch performance data
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['crm-team-performance', period, profile?.team_id],
    queryFn: async () => {
      if (!teamMembers?.length) return [];

      const performances: SellerPerformance[] = await Promise.all(
        teamMembers.map(async (member) => {
          // Get all leads
          const { data: allLeads } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('assigned_to', member.user_id)
            .gte('created_at', start.toISOString());

          // Get won leads
          const { data: wonLeads } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('assigned_to', member.user_id)
            .not('won_at', 'is', null)
            .gte('won_at', start.toISOString())
            .lte('won_at', end.toISOString());

          // Get lost leads
          const { data: lostLeads } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('assigned_to', member.user_id)
            .not('lost_at', 'is', null)
            .gte('lost_at', start.toISOString())
            .lte('lost_at', end.toISOString());

          const activeLeads = (allLeads || []).filter(l => !l.won_at && !l.lost_at).length;
          const wonCount = wonLeads?.length || 0;
          const lostCount = lostLeads?.length || 0;
          const totalRevenue = wonLeads?.reduce((acc, l) => acc + (l.contract_value || l.estimated_value || 0), 0) || 0;
          const avgTicket = wonCount > 0 ? totalRevenue / wonCount : 0;
          const totalClosed = wonCount + lostCount;
          const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
          const conversionRate = (allLeads?.length || 0) > 0 ? (wonCount / allLeads!.length) * 100 : 0;

          return {
            userId: member.user_id,
            name: member.full_name,
            avatar: member.avatar_url || undefined,
            activeLeads,
            wonLeads: wonCount,
            lostLeads: lostCount,
            totalRevenue,
            avgTicket,
            winRate,
            avgResponseTime: Math.random() * 24, // Placeholder
            conversionRate,
            rank: 0,
          };
        })
      );

      // Sort by total revenue and assign ranks
      performances.sort((a, b) => b.totalRevenue - a.totalRevenue);
      performances.forEach((p, i) => {
        p.rank = i + 1;
      });

      return performances;
    },
    enabled: !!teamMembers?.length,
  });

  const topPerformer = performanceData?.[0];
  const totalTeamRevenue = performanceData?.reduce((acc, p) => acc + p.totalRevenue, 0) || 0;
  const totalTeamWins = performanceData?.reduce((acc, p) => acc + p.wonLeads, 0) || 0;
  const avgTeamWinRate = performanceData?.length 
    ? performanceData.reduce((acc, p) => acc + p.winRate, 0) / performanceData.length 
    : 0;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}º</span>;
  };

  const chartData = performanceData?.map(p => ({
    name: p.name.split(' ')[0],
    receita: p.totalRevenue / 1000,
    vendas: p.wonLeads,
    taxa: p.winRate,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Performance do Time
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe o desempenho individual e coletivo
          </p>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="last-month">Mês Anterior</SelectItem>
            <SelectItem value="3-months">Últimos 3 Meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  R$ {(totalTeamRevenue / 1000).toFixed(0)}k
                </div>
                <div className="text-xs text-muted-foreground">Receita Total Time</div>
              </div>
              <DollarSign className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{totalTeamWins}</div>
                <div className="text-xs text-muted-foreground">Vendas do Time</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{avgTeamWinRate.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Taxa Média Conversão</div>
              </div>
              <Target className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{performanceData?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Vendedores Ativos</div>
              </div>
              <Users className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer Highlight */}
      {topPerformer && (
        <Card className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16 border-4 border-yellow-500">
                  <AvatarImage src={topPerformer.avatar} />
                  <AvatarFallback>{topPerformer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">{topPerformer.name}</h3>
                  <Badge className="bg-yellow-500">Top Performer</Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-2">
                  <div>
                    <div className="text-sm font-bold">R$ {(topPerformer.totalRevenue / 1000).toFixed(0)}k</div>
                    <div className="text-xs text-muted-foreground">Receita</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold">{topPerformer.wonLeads}</div>
                    <div className="text-xs text-muted-foreground">Vendas</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold">{topPerformer.winRate.toFixed(0)}%</div>
                    <div className="text-xs text-muted-foreground">Conversão</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold">{topPerformer.activeLeads}</div>
                    <div className="text-xs text-muted-foreground">Leads Ativos</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-4">
          {/* Ranking List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de Vendedores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {performanceData?.map((seller) => (
                <div 
                  key={seller.userId}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg transition-colors",
                    seller.rank === 1 ? "bg-yellow-500/10" :
                    seller.rank === 2 ? "bg-gray-500/10" :
                    seller.rank === 3 ? "bg-amber-500/10" : "bg-muted/30",
                    seller.userId === user?.id && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    {getRankIcon(seller.rank)}
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={seller.avatar} />
                      <AvatarFallback>{seller.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {seller.name}
                        {seller.userId === user?.id && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {seller.activeLeads} leads ativos
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="font-bold">R$ {(seller.totalRevenue / 1000).toFixed(0)}k</div>
                      <div className="text-xs text-muted-foreground">Receita</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{seller.wonLeads}</div>
                      <div className="text-xs text-muted-foreground">Vendas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600">{seller.lostLeads}</div>
                      <div className="text-xs text-muted-foreground">Perdas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-amber-600">{seller.winRate.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Conversão</div>
                    </div>
                  </div>

                  <div className="w-32">
                    <Progress 
                      value={Math.min((seller.totalRevenue / (topPerformer?.totalRevenue || 1)) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {/* Comparison Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${v}k`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(1)}k`, 'Receita']} />
                      <Bar dataKey="receita" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vendas vs Taxa de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="vendas" fill="#22c55e" name="Vendas" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="taxa" fill="#f59e0b" name="Taxa %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
