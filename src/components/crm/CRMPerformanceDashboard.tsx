import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, Target, DollarSign,
  Users, Clock, Award, Zap, BarChart3, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function CRMPerformanceDashboard() {
  const { user, profile } = useAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Fetch comprehensive performance data
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['crm-performance-dashboard', user?.id],
    queryFn: async () => {
      // Get all my leads
      const { data: allLeads, error: allError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id);
      
      if (allError) throw allError;

      // Get won leads this month
      const { data: wonThisMonth, error: wonError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id)
        .not('won_at', 'is', null)
        .gte('won_at', monthStart.toISOString())
        .lte('won_at', monthEnd.toISOString());
      
      if (wonError) throw wonError;

      // Get lost leads this month
      const { data: lostThisMonth, error: lostError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id)
        .not('lost_at', 'is', null)
        .gte('lost_at', monthStart.toISOString())
        .lte('lost_at', monthEnd.toISOString());
      
      if (lostError) throw lostError;

      // Get leads created this week
      const { data: newThisWeek, error: newError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());
      
      if (newError) throw newError;

      // Get stages for pipeline distribution
      const { data: stages } = await supabase
        .from('crm_stages')
        .select('id, name, color');

      // Calculate metrics
      const activeLeads = allLeads?.filter(l => !l.won_at && !l.lost_at) || [];
      const staleLeads = activeLeads.filter(l => l.is_stale);
      const priorityLeads = activeLeads.filter(l => l.is_priority);
      const qualifiedLeads = activeLeads.filter(l => (l.lead_score || 0) >= 25);
      
      const totalWonValue = wonThisMonth?.reduce((acc, l) => acc + (l.contract_value || l.estimated_value || 0), 0) || 0;
      const avgTicket = wonThisMonth?.length ? totalWonValue / wonThisMonth.length : 0;
      const winRate = (wonThisMonth?.length || 0) + (lostThisMonth?.length || 0) > 0
        ? ((wonThisMonth?.length || 0) / ((wonThisMonth?.length || 0) + (lostThisMonth?.length || 0))) * 100
        : 0;
      const pipelineValue = activeLeads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);
      const avgDaysInStage = activeLeads.reduce((acc, l) => acc + (l.days_in_stage || 0), 0) / (activeLeads.length || 1);

      // Stage distribution for pie chart
      const stageDistribution = stages?.map(stage => ({
        name: stage.name,
        value: activeLeads.filter(l => l.stage_id === stage.id).length,
        color: stage.color || '#6366f1',
      })).filter(s => s.value > 0) || [];

      // Daily wins for area chart (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date;
      });

      const dailyWins = last30Days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const wins = wonThisMonth?.filter(l => 
          l.won_at && format(new Date(l.won_at), 'yyyy-MM-dd') === dateStr
        ).length || 0;
        const revenue = wonThisMonth?.filter(l => 
          l.won_at && format(new Date(l.won_at), 'yyyy-MM-dd') === dateStr
        ).reduce((acc, l) => acc + (l.contract_value || l.estimated_value || 0), 0) || 0;
        
        return {
          date: format(date, 'dd/MM'),
          wins,
          revenue: revenue / 1000,
        };
      });

      return {
        activeLeads: activeLeads.length,
        staleLeads: staleLeads.length,
        priorityLeads: priorityLeads.length,
        qualifiedLeads: qualifiedLeads.length,
        wonThisMonth: wonThisMonth?.length || 0,
        lostThisMonth: lostThisMonth?.length || 0,
        newThisWeek: newThisWeek?.length || 0,
        totalWonValue,
        avgTicket,
        winRate,
        pipelineValue,
        avgDaysInStage,
        stageDistribution,
        dailyWins,
      };
    },
    enabled: !!user,
  });

  const metrics = [
    {
      label: 'Leads Ativos',
      value: performanceData?.activeLeads || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Vendas do Mês',
      value: performanceData?.wonThisMonth || 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Taxa de Conversão',
      value: `${(performanceData?.winRate || 0).toFixed(0)}%`,
      icon: Target,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Receita do Mês',
      value: `R$ ${((performanceData?.totalWonValue || 0) / 1000).toFixed(0)}k`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", metric.bgColor)}>
                    <Icon className={cn("w-5 h-5", metric.color)} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Receita dos Últimos 30 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData?.dailyWins || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toFixed(1)}k`, 'Receita']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Distribuição por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center">
              {(performanceData?.stageDistribution?.length || 0) > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceData?.stageDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {performanceData?.stageDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum lead ativo</p>
                </div>
              )}
              <div className="space-y-1 ml-4">
                {performanceData?.stageDistribution.slice(0, 5).map((stage, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate max-w-[100px]">{stage.name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {stage.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-amber-500">
                  {performanceData?.staleLeads || 0}
                </div>
                <div className="text-xs text-muted-foreground">Leads Parados</div>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-purple-500">
                  {performanceData?.qualifiedLeads || 0}
                </div>
                <div className="text-xs text-muted-foreground">Qualificados</div>
              </div>
              <Award className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-blue-500">
                  R$ {((performanceData?.pipelineValue || 0) / 1000).toFixed(0)}k
                </div>
                <div className="text-xs text-muted-foreground">Valor Pipeline</div>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-500/5 border-gray-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">
                  {(performanceData?.avgDaysInStage || 0).toFixed(1)}d
                </div>
                <div className="text-xs text-muted-foreground">Média/Estágio</div>
              </div>
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
