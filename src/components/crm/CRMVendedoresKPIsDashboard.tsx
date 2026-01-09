import { useQuery } from '@tanstack/react-query';
import { 
  Users, Target, DollarSign, Clock, TrendingUp, 
  Flame, Activity, Crown, Medal, Award, Zap,
  AlertTriangle, CheckCircle2, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface VendedorKPI {
  user_id: string;
  seller_name: string;
  seller_avatar_url: string | null;
  seller_position: string;
  leads_ativos: number;
  vendas_mes: number;
  taxa_conversao: number;
  faturamento_mes: number;
  ciclo_medio_dias: number;
  ticket_medio: number;
  ltv: number;
  leads_quentes: number;
  atividades_mes: number;
  rank_position: number;
}

export function CRMVendedoresKPIsDashboard() {
  const { user, profile } = useAuth();
  const [sortBy, setSortBy] = useState<'faturamento' | 'conversao' | 'leads'>('faturamento');

  const { data: vendedores, isLoading } = useQuery({
    queryKey: ['crm-vendedores-kpis', profile?.team_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_vendedores_kpis', {
        team_id_param: profile?.team_id || null
      });
      
      if (error) throw error;
      return data as VendedorKPI[];
    },
    enabled: !!profile,
  });

  // Totais do time
  const teamTotals = vendedores?.reduce((acc, v) => ({
    faturamento: acc.faturamento + Number(v.faturamento_mes || 0),
    vendas: acc.vendas + Number(v.vendas_mes || 0),
    leadsAtivos: acc.leadsAtivos + Number(v.leads_ativos || 0),
    leadsQuentes: acc.leadsQuentes + Number(v.leads_quentes || 0),
    atividades: acc.atividades + Number(v.atividades_mes || 0),
  }), { faturamento: 0, vendas: 0, leadsAtivos: 0, leadsQuentes: 0, atividades: 0 });

  const sortedVendedores = [...(vendedores || [])].sort((a, b) => {
    switch (sortBy) {
      case 'conversao':
        return Number(b.taxa_conversao) - Number(a.taxa_conversao);
      case 'leads':
        return Number(b.leads_ativos) - Number(a.leads_ativos);
      default:
        return Number(b.faturamento_mes) - Number(a.faturamento_mes);
    }
  });

  const maxFaturamento = Math.max(...(sortedVendedores.map(v => Number(v.faturamento_mes)) || [1]));

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}º</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-500/10 to-slate-500/5 border-gray-400/20';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/10 to-orange-600/5 border-amber-600/20';
    return '';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Dashboard de Vendedores
          </h2>
          <p className="text-sm text-muted-foreground">
            Todos os KPIs por vendedor - visão expandida
          </p>
        </div>
        
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="faturamento">Faturamento</SelectItem>
            <SelectItem value="conversao">Taxa Conversão</SelectItem>
            <SelectItem value="leads">Leads Ativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resumo do Time */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-lg font-bold">R$ {((teamTotals?.faturamento || 0) / 1000).toFixed(0)}k</div>
                <div className="text-xs text-muted-foreground">Faturamento Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-lg font-bold">{teamTotals?.vendas || 0}</div>
                <div className="text-xs text-muted-foreground">Vendas do Mês</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-lg font-bold">{teamTotals?.leadsAtivos || 0}</div>
                <div className="text-xs text-muted-foreground">Leads Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-lg font-bold">{teamTotals?.leadsQuentes || 0}</div>
                <div className="text-xs text-muted-foreground">Leads Quentes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border-cyan-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-500" />
              <div>
                <div className="text-lg font-bold">{teamTotals?.atividades || 0}</div>
                <div className="text-xs text-muted-foreground">Atividades</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Vendedores com KPIs Expandidos */}
      <div className="space-y-4">
        {sortedVendedores.map((vendedor, index) => {
          const isCurrentUser = vendedor.user_id === user?.id;
          const rank = index + 1;
          
          return (
            <Card 
              key={vendedor.user_id}
              className={cn(
                "transition-all",
                getRankBg(rank),
                isCurrentUser && "ring-2 ring-primary"
              )}
            >
              <CardContent className="p-4">
                {/* Header do Vendedor */}
                <div className="flex items-center gap-4 mb-4 pb-3 border-b">
                  <div className="flex items-center gap-3">
                    {getRankIcon(rank)}
                    <Avatar className="h-12 w-12 border-2 border-background">
                      {vendedor.seller_avatar_url && (
                        <AvatarImage src={vendedor.seller_avatar_url} />
                      )}
                      <AvatarFallback>
                        {vendedor.seller_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {vendedor.seller_name}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                        {rank === 1 && (
                          <Badge className="bg-yellow-500 text-xs">Top Seller</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {vendedor.seller_position}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progresso de Faturamento */}
                  <div className="flex-1 ml-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Faturamento</span>
                      <span className="text-sm font-bold text-green-600">
                        R$ {(Number(vendedor.faturamento_mes) / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <Progress 
                      value={(Number(vendedor.faturamento_mes) / maxFaturamento) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* KPIs Grid - Já Expandido */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Leads Ativos */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Leads Ativos</span>
                    </div>
                    <div className="text-xl font-bold">{Number(vendedor.leads_ativos) || 0}</div>
                  </div>

                  {/* Taxa de Conversão */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Conversão</span>
                    </div>
                    <div className="text-xl font-bold">{Number(vendedor.taxa_conversao)?.toFixed(0) || 0}%</div>
                  </div>

                  {/* Vendas do Mês */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Vendas Mês</span>
                    </div>
                    <div className="text-xl font-bold text-green-600">{Number(vendedor.vendas_mes) || 0}</div>
                  </div>

                  {/* Ciclo Médio de Vendas */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-muted-foreground">Ciclo Médio</span>
                    </div>
                    <div className="text-xl font-bold">{Number(vendedor.ciclo_medio_dias)?.toFixed(0) || 0} dias</div>
                  </div>

                  {/* Ticket Médio */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Ticket Médio</span>
                    </div>
                    <div className="text-xl font-bold">R$ {(Number(vendedor.ticket_medio) / 1000).toFixed(0)}k</div>
                  </div>

                  {/* LTV */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs text-muted-foreground">LTV</span>
                    </div>
                    <div className="text-xl font-bold">R$ {(Number(vendedor.ltv) / 1000).toFixed(0)}k</div>
                  </div>
                </div>

                {/* Segunda Linha de KPIs Secundários */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  {/* Leads Quentes */}
                  <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <div>
                      <div className="text-sm font-bold">{Number(vendedor.leads_quentes) || 0}</div>
                      <div className="text-xs text-muted-foreground">Leads Quentes</div>
                    </div>
                  </div>

                  {/* Atividades */}
                  <div className="flex items-center gap-2 p-2 bg-cyan-500/10 rounded-lg">
                    <Activity className="w-4 h-4 text-cyan-500" />
                    <div>
                      <div className="text-sm font-bold">{Number(vendedor.atividades_mes) || 0}</div>
                      <div className="text-xs text-muted-foreground">Atividades</div>
                    </div>
                  </div>

                  {/* Ranking */}
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                    <Award className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-sm font-bold">{rank}º</div>
                      <div className="text-xs text-muted-foreground">Ranking</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {sortedVendedores.length === 0 && (
          <Card className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum vendedor encontrado</p>
          </Card>
        )}
      </div>
    </div>
  );
}