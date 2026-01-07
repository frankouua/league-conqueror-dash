import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, Target, Users, Calendar,
  ArrowUpRight, ArrowDownRight, BarChart3, PieChart,
  Clock, Zap, Award, CheckCircle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart as RePieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function CRMSalesMetrics() {
  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);

  // Fetch CRM metrics
  const { data: crmMetrics, isLoading: loadingCRM } = useQuery({
    queryKey: ['crm-sales-metrics'],
    queryFn: async () => {
      const startCurrent = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endCurrent = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const startLast = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      const endLast = format(endOfMonth(lastMonth), 'yyyy-MM-dd');

      // Current month wins
      const { data: currentWins } = await supabase
        .from('crm_leads')
        .select('contract_value, won_at')
        .not('won_at', 'is', null)
        .gte('won_at', startCurrent)
        .lte('won_at', endCurrent);

      // Last month wins
      const { data: lastWins } = await supabase
        .from('crm_leads')
        .select('contract_value')
        .not('won_at', 'is', null)
        .gte('won_at', startLast)
        .lte('won_at', endLast);

      // Active leads
      const { data: activeLeads } = await supabase
        .from('crm_leads')
        .select('id, estimated_value, created_at, stage_id, pipeline_id')
        .is('won_at', null)
        .is('lost_at', null);

      // Stage distribution
      const { data: stages } = await supabase
        .from('crm_stages')
        .select('id, name, color');

      const currentValue = currentWins?.reduce((sum, l) => sum + (l.contract_value || 0), 0) || 0;
      const lastValue = lastWins?.reduce((sum, l) => sum + (l.contract_value || 0), 0) || 0;
      const pipelineValue = activeLeads?.reduce((sum, l) => sum + (l.estimated_value || 0), 0) || 0;
      
      // Calculate stage distribution
      const stageDistribution: Record<string, { count: number; value: number; name: string; color: string }> = {};
      stages?.forEach(s => {
        stageDistribution[s.id] = { count: 0, value: 0, name: s.name, color: s.color || '#6b7280' };
      });
      activeLeads?.forEach(l => {
        if (stageDistribution[l.stage_id]) {
          stageDistribution[l.stage_id].count++;
          stageDistribution[l.stage_id].value += l.estimated_value || 0;
        }
      });

      // Daily wins for chart
      const dailyWins: Record<string, number> = {};
      currentWins?.forEach(w => {
        const day = format(new Date(w.won_at!), 'dd/MM');
        dailyWins[day] = (dailyWins[day] || 0) + (w.contract_value || 0);
      });

      return {
        currentMonthValue: currentValue,
        lastMonthValue: lastValue,
        valueGrowth: lastValue > 0 ? ((currentValue - lastValue) / lastValue) * 100 : 0,
        currentMonthDeals: currentWins?.length || 0,
        lastMonthDeals: lastWins?.length || 0,
        dealsGrowth: lastWins?.length ? ((((currentWins?.length || 0) - lastWins.length) / lastWins.length) * 100) : 0,
        pipelineValue,
        activeLeads: activeLeads?.length || 0,
        avgTicket: currentWins?.length ? currentValue / currentWins.length : 0,
        stageDistribution: Object.values(stageDistribution).filter(s => s.count > 0),
        dailyData: Object.entries(dailyWins).map(([day, value]) => ({ day, value })),
      };
    },
  });

  // Fetch revenue records for comparison
  const { data: revenueMetrics, isLoading: loadingRevenue } = useQuery({
    queryKey: ['crm-revenue-comparison'],
    queryFn: async () => {
      const startCurrent = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endCurrent = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      // Revenue records (executed)
      const { data: executed } = await supabase
        .from('executed_records')
        .select('amount')
        .gte('date', startCurrent)
        .lte('date', endCurrent);

      // Revenue records (sold)
      const { data: sold } = await supabase
        .from('revenue_records')
        .select('amount')
        .gte('date', startCurrent)
        .lte('date', endCurrent);

      const executedTotal = executed?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const soldTotal = sold?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

      return {
        executedTotal,
        soldTotal,
        conversionRate: soldTotal > 0 ? (executedTotal / soldTotal) * 100 : 0,
      };
    },
  });

  // Fetch team performance
  const { data: teamPerformance = [], isLoading: loadingTeam } = useQuery({
    queryKey: ['crm-team-performance'],
    queryFn: async () => {
      const startCurrent = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const { data: leads } = await supabase
        .from('crm_leads')
        .select(`
          assigned_to,
          contract_value,
          won_at,
          profiles:assigned_to(full_name)
        `)
        .not('won_at', 'is', null)
        .gte('won_at', startCurrent);

      const performance: Record<string, { name: string; deals: number; value: number }> = {};
      
      leads?.forEach(l => {
        const assignedTo = l.assigned_to || 'unassigned';
        const name = (l.profiles as any)?.full_name || 'Não atribuído';
        if (!performance[assignedTo]) {
          performance[assignedTo] = { name, deals: 0, value: 0 };
        }
        performance[assignedTo].deals++;
        performance[assignedTo].value += l.contract_value || 0;
      });

      return Object.values(performance)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      notation: value >= 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 1000000 ? 1 : 0,
    }).format(value || 0);
  };

  const isLoading = loadingCRM || loadingRevenue || loadingTeam;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento CRM</p>
                <p className="text-2xl font-bold">{formatCurrency(crmMetrics?.currentMonthValue || 0)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {(crmMetrics?.valueGrowth || 0) >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${(crmMetrics?.valueGrowth || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {Math.abs(crmMetrics?.valueGrowth || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deals Fechados</p>
                <p className="text-2xl font-bold">{crmMetrics?.currentMonthDeals || 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  {(crmMetrics?.dealsGrowth || 0) >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${(crmMetrics?.dealsGrowth || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {Math.abs(crmMetrics?.dealsGrowth || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Ativo</p>
                <p className="text-2xl font-bold">{formatCurrency(crmMetrics?.pipelineValue || 0)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {crmMetrics?.activeLeads} leads
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <Target className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(crmMetrics?.avgTicket || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Fechamentos por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={crmMetrics?.dailyData || []}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={crmMetrics?.stageDistribution || []}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {crmMetrics?.stageDistribution?.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Vendido vs Executado (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Vendido</span>
                <span className="font-medium">{formatCurrency(revenueMetrics?.soldTotal || 0)}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Executado</span>
                <span className="font-medium">{formatCurrency(revenueMetrics?.executedTotal || 0)}</span>
              </div>
              <Progress value={revenueMetrics?.conversionRate || 0} className="h-2 bg-blue-100" />
            </div>
            <div className="p-3 rounded-lg bg-accent/50 text-center">
              <p className="text-sm text-muted-foreground">Taxa de Execução</p>
              <p className="text-2xl font-bold">{(revenueMetrics?.conversionRate || 0).toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Vendedores (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamPerformance.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Sem dados de performance este mês
              </p>
            ) : (
              <div className="space-y-3">
                {teamPerformance.map((member, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-100' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.deals} deals</p>
                    </div>
                    <p className="font-bold text-emerald-600">{formatCurrency(member.value)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CRMSalesMetrics;
