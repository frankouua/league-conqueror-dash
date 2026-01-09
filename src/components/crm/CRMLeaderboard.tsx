import { useQuery } from '@tanstack/react-query';
import { 
  Trophy, Medal, Award, TrendingUp, Target, 
  Phone, Calendar, DollarSign, Zap, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { isSeller } from '@/constants/sellerPositions';

interface CRMLeaderboardProps {
  period?: 'month' | 'week' | 'all';
}

interface SellerStats {
  user_id: string;
  name: string;
  avatar_url?: string;
  won_count: number;
  won_value: number;
  conversion_rate: number;
  avg_cycle_days: number;
  activities_count: number;
}

export function CRMLeaderboard({ period = 'month' }: CRMLeaderboardProps) {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['crm-leaderboard', period],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Get all won leads this month with assigned user
      const { data: wonLeads } = await supabase
        .from('crm_leads')
        .select('id, assigned_to, contract_value, estimated_value, created_at, won_at')
        .not('won_at', 'is', null)
        .gte('won_at', monthStart.toISOString())
        .lte('won_at', monthEnd.toISOString());

      // Get total leads per user
      const { data: allLeads } = await supabase
        .from('crm_leads')
        .select('id, assigned_to')
        .gte('created_at', monthStart.toISOString());

      // Get profiles (only sellers)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, position');

      // Filter only sellers
      const sellerProfiles = (profiles || []).filter(p => isSeller(p.position));

      // Get activity counts
      const { data: activities } = await supabase
        .from('crm_lead_history')
        .select('performed_by')
        .gte('created_at', monthStart.toISOString());

      // Aggregate stats per user
      const statsMap = new Map<string, SellerStats>();

      // Initialize from seller profiles only
      sellerProfiles.forEach(profile => {
        statsMap.set(profile.user_id, {
          user_id: profile.user_id,
          name: profile.full_name,
          avatar_url: profile.avatar_url || undefined,
          won_count: 0,
          won_value: 0,
          conversion_rate: 0,
          avg_cycle_days: 0,
          activities_count: 0,
        });
      });

      // Calculate won counts and values
      const cycleDays: Record<string, number[]> = {};
      wonLeads?.forEach(lead => {
        if (lead.assigned_to) {
          const stats = statsMap.get(lead.assigned_to);
          if (stats) {
            stats.won_count++;
            stats.won_value += (lead.contract_value || lead.estimated_value || 0);
            
            // Calculate cycle days
            if (lead.created_at && lead.won_at) {
              const days = Math.floor(
                (new Date(lead.won_at).getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              if (!cycleDays[lead.assigned_to]) cycleDays[lead.assigned_to] = [];
              cycleDays[lead.assigned_to].push(days);
            }
          }
        }
      });

      // Calculate conversion rates
      const leadsPerUser: Record<string, number> = {};
      allLeads?.forEach(lead => {
        if (lead.assigned_to) {
          leadsPerUser[lead.assigned_to] = (leadsPerUser[lead.assigned_to] || 0) + 1;
        }
      });

      statsMap.forEach((stats, userId) => {
        const totalLeads = leadsPerUser[userId] || 0;
        stats.conversion_rate = totalLeads > 0 ? (stats.won_count / totalLeads) * 100 : 0;
        
        const cycles = cycleDays[userId] || [];
        stats.avg_cycle_days = cycles.length > 0 
          ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) 
          : 0;
      });

      // Count activities
      activities?.forEach(activity => {
        if (activity.performed_by) {
          const stats = statsMap.get(activity.performed_by);
          if (stats) {
            stats.activities_count++;
          }
        }
      });

      // Convert to array and sort by won value
      return Array.from(statsMap.values())
        .filter(s => s.won_count > 0 || s.activities_count > 5)
        .sort((a, b) => b.won_value - a.won_value);
    },
    staleTime: 60000,
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="w-5 text-center text-sm font-medium text-muted-foreground">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30';
    if (index === 1) return 'bg-gradient-to-r from-gray-500/10 to-slate-500/10 border-gray-400/30';
    if (index === 2) return 'bg-gradient-to-r from-amber-700/10 to-orange-700/10 border-amber-700/30';
    return '';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Ranking de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...(leaderboard?.map(s => s.won_value) || [1]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Ranking de Vendas
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Este Mês
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="revenue" className="text-xs gap-1">
              <DollarSign className="h-3 w-3" />
              Receita
            </TabsTrigger>
            <TabsTrigger value="deals" className="text-xs gap-1">
              <Target className="h-3 w-3" />
              Fechamentos
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1">
              <Zap className="h-3 w-3" />
              Atividades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-2 mt-0">
            {leaderboard?.slice(0, 10).map((seller, index) => (
              <div 
                key={seller.user_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
                  getRankBg(index)
                )}
              >
                {getRankIcon(index)}
                <Avatar className="h-9 w-9">
                  {seller.avatar_url && <AvatarImage src={seller.avatar_url} />}
                  <AvatarFallback>{seller.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">{seller.name}</span>
                    <span className="text-sm font-bold text-green-600">
                      R$ {(seller.won_value / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <Progress 
                    value={(seller.won_value / maxValue) * 100} 
                    className="h-1.5"
                  />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="deals" className="space-y-2 mt-0">
            {[...(leaderboard || [])].sort((a, b) => b.won_count - a.won_count).slice(0, 10).map((seller, index) => (
              <div 
                key={seller.user_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
                  getRankBg(index)
                )}
              >
                {getRankIcon(index)}
                <Avatar className="h-9 w-9">
                  {seller.avatar_url && <AvatarImage src={seller.avatar_url} />}
                  <AvatarFallback>{seller.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{seller.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {seller.won_count} fechamentos
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {seller.conversion_rate.toFixed(0)}% conv.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="activity" className="space-y-2 mt-0">
            {[...(leaderboard || [])].sort((a, b) => b.activities_count - a.activities_count).slice(0, 10).map((seller, index) => (
              <div 
                key={seller.user_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
                  getRankBg(index)
                )}
              >
                {getRankIcon(index)}
                <Avatar className="h-9 w-9">
                  {seller.avatar_url && <AvatarImage src={seller.avatar_url} />}
                  <AvatarFallback>{seller.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{seller.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-xs">
                        {seller.activities_count} atividades
                      </Badge>
                      {seller.avg_cycle_days > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ~{seller.avg_cycle_days}d ciclo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {(!leaderboard || leaderboard.length === 0) && (
          <div className="py-8 text-center text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum dado de ranking ainda</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
