import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, 
  Target, Clock, Award, AlertTriangle,
  Zap, BarChart3, PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export function CRMOverviewDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['crm-overview-metrics'],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subDays(monthStart, 1));
      const lastMonthEnd = endOfMonth(subDays(monthStart, 1));

      // Current month leads
      const { data: currentLeads } = await supabase
        .from('crm_leads')
        .select('id, created_at, won_at, lost_at, estimated_value, contract_value, lead_score, is_priority, is_stale')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      // Last month leads for comparison
      const { data: lastMonthLeads } = await supabase
        .from('crm_leads')
        .select('id, created_at, won_at, lost_at, estimated_value, contract_value')
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      // All active leads
      const { data: allActiveLeads } = await supabase
        .from('crm_leads')
        .select('id, created_at, stage_id, estimated_value, is_stale, lead_score, pipeline_id')
        .is('won_at', null)
        .is('lost_at', null);

      // Won leads this month
      const { data: wonThisMonth } = await supabase
        .from('crm_leads')
        .select('id, contract_value, estimated_value, won_at')
        .gte('won_at', monthStart.toISOString())
        .lte('won_at', monthEnd.toISOString());

      // Won leads last month
      const { data: wonLastMonth } = await supabase
        .from('crm_leads')
        .select('id, contract_value, estimated_value')
        .gte('won_at', lastMonthStart.toISOString())
        .lte('won_at', lastMonthEnd.toISOString());

      // Tasks due
      const { data: pendingTasks } = await supabase
        .from('crm_tasks')
        .select('id, due_date, is_completed, is_overdue')
        .eq('is_completed', false);

      // Pipelines
      const { data: pipelines } = await supabase
        .from('crm_pipelines')
        .select('id, name, color');

      // Leads by pipeline
      const pipelineCounts = (pipelines || []).map(p => ({
        ...p,
        count: (allActiveLeads || []).filter(l => l.pipeline_id === p.id).length,
        value: (allActiveLeads || []).filter(l => l.pipeline_id === p.id)
          .reduce((acc, l) => acc + (l.estimated_value || 0), 0),
      }));

      // Calculate metrics
      const currentMonthCount = currentLeads?.length || 0;
      const lastMonthCount = lastMonthLeads?.length || 0;
      const leadGrowth = lastMonthCount > 0 
        ? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100 
        : 0;

      const currentWonValue = (wonThisMonth || []).reduce(
        (acc, l) => acc + (l.contract_value || l.estimated_value || 0), 0
      );
      const lastWonValue = (wonLastMonth || []).reduce(
        (acc, l) => acc + (l.contract_value || l.estimated_value || 0), 0
      );
      const revenueGrowth = lastWonValue > 0 
        ? ((currentWonValue - lastWonValue) / lastWonValue) * 100 
        : 0;

      const activeCount = allActiveLeads?.length || 0;
      const pipelineValue = (allActiveLeads || []).reduce(
        (acc, l) => acc + (l.estimated_value || 0), 0
      );

      const staleCount = (allActiveLeads || []).filter(l => l.is_stale).length;
      const highScoreCount = (allActiveLeads || []).filter(l => (l.lead_score || 0) >= 70).length;

      const overdueTasks = (pendingTasks || []).filter(t => t.is_overdue).length;
      const todayTasks = (pendingTasks || []).filter(t => {
        const due = new Date(t.due_date);
        return differenceInDays(due, now) === 0;
      }).length;

      const conversionRate = currentMonthCount > 0 
        ? ((wonThisMonth?.length || 0) / currentMonthCount) * 100 
        : 0;

      return {
        newLeads: currentMonthCount,
        leadGrowth,
        activeLeads: activeCount,
        pipelineValue,
        wonThisMonth: wonThisMonth?.length || 0,
        revenueThisMonth: currentWonValue,
        revenueGrowth,
        conversionRate,
        staleLeads: staleCount,
        highScoreLeads: highScoreCount,
        overdueTasks,
        todayTasks,
        pendingTasks: pendingTasks?.length || 0,
        pipelineCounts,
      };
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const cards: MetricCard[] = [
    {
      title: 'Novos Leads',
      value: metrics.newLeads,
      change: metrics.leadGrowth,
      changeLabel: 'vs mês anterior',
      icon: <Users className="h-4 w-4" />,
      trend: metrics.leadGrowth >= 0 ? 'up' : 'down',
      color: 'text-blue-500',
    },
    {
      title: 'Leads Ativos',
      value: metrics.activeLeads,
      icon: <Target className="h-4 w-4" />,
      color: 'text-purple-500',
    },
    {
      title: 'Valor no Pipeline',
      value: `R$ ${(metrics.pipelineValue / 1000).toFixed(0)}k`,
      icon: <BarChart3 className="h-4 w-4" />,
      color: 'text-amber-500',
    },
    {
      title: 'Fechamentos',
      value: metrics.wonThisMonth,
      icon: <Award className="h-4 w-4" />,
      color: 'text-green-500',
    },
    {
      title: 'Receita do Mês',
      value: `R$ ${(metrics.revenueThisMonth / 1000).toFixed(0)}k`,
      change: metrics.revenueGrowth,
      changeLabel: 'vs mês anterior',
      icon: <DollarSign className="h-4 w-4" />,
      trend: metrics.revenueGrowth >= 0 ? 'up' : 'down',
      color: 'text-emerald-500',
    },
    {
      title: 'Taxa Conversão',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-cyan-500',
    },
    {
      title: 'Leads Qualificados',
      value: metrics.highScoreLeads,
      icon: <Zap className="h-4 w-4" />,
      color: 'text-yellow-500',
    },
    {
      title: 'Tarefas Pendentes',
      value: metrics.pendingTasks,
      icon: <Clock className="h-4 w-4" />,
      color: metrics.overdueTasks > 0 ? 'text-red-500' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={cn("p-2 rounded-lg bg-muted/50", card.color)}>
                  {card.icon}
                </span>
                {card.change !== undefined && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      card.trend === 'up' ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"
                    )}
                  >
                    {card.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(card.change).toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Stale Leads Alert */}
        {metrics.staleLeads > 0 && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="font-medium text-orange-600">{metrics.staleLeads} leads estagnados</p>
                <p className="text-xs text-muted-foreground">Sem atividade há mais de 3 dias</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Tasks Alert */}
        {metrics.overdueTasks > 0 && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Clock className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-600">{metrics.overdueTasks} tarefas atrasadas</p>
                <p className="text-xs text-muted-foreground">Requer atenção imediata</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today Tasks */}
        {metrics.todayTasks > 0 && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-blue-600">{metrics.todayTasks} tarefas para hoje</p>
                <p className="text-xs text-muted-foreground">Mantenha o foco!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pipeline Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            Distribuição por Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {metrics.pipelineCounts.map(pipeline => (
              <div 
                key={pipeline.id} 
                className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: pipeline.color || '#888' }}
                  />
                  <span className="text-sm font-medium truncate">{pipeline.name}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{pipeline.count}</p>
                    <p className="text-xs text-muted-foreground">leads</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      R$ {(pipeline.value / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
