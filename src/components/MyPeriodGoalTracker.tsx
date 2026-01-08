import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Target, TrendingUp, TrendingDown, CheckCircle2, XCircle, 
  AlertTriangle, Flame, Thermometer, Calendar, Clock, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isWeekend, differenceInDays, addDays
} from 'date-fns';
import { cn } from '@/lib/utils';

interface PeriodData {
  label: string;
  icon: any;
  goal: number;
  achieved: number;
  progress: number;
  status: 'success' | 'warning' | 'danger' | 'neutral';
  daysRemaining: number;
  dailyNeeded: number;
}

// Calculate business days in a period
function getBusinessDays(start: Date, end: Date): number {
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => !isWeekend(d)).length;
}

// Get biweek period (1-15 or 16-end of month)
function getBiweekPeriod(date: Date): { start: Date; end: Date; label: string } {
  const day = date.getDate();
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  
  if (day <= 15) {
    return {
      start: monthStart,
      end: new Date(date.getFullYear(), date.getMonth(), 15),
      label: '1ª Quinzena'
    };
  } else {
    return {
      start: new Date(date.getFullYear(), date.getMonth(), 16),
      end: monthEnd,
      label: '2ª Quinzena'
    };
  }
}

export function MyPeriodGoalTracker() {
  const { user } = useAuth();
  const today = startOfDay(new Date());
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Fetch user's individual meta3_goal
  const { data: goalData } = useQuery({
    queryKey: ['my-period-goals-meta3', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user) return null;
      
      const { data } = await supabase
        .from('individual_goals')
        .select('meta3_goal, revenue_goal')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();
      
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's revenue for the month
  const { data: revenueData } = useQuery({
    queryKey: ['my-period-revenue', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user) return [];

      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('revenue_records')
        .select('date, amount')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd);

      return data || [];
    },
    enabled: !!user,
  });

  const periodsData = useMemo(() => {
    const meta3 = goalData?.meta3_goal || goalData?.revenue_goal || 0;
    if (!meta3 || !revenueData) return null;

    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const biweek = getBiweekPeriod(today);

    const totalMonthBusinessDays = getBusinessDays(monthStart, monthEnd);
    const elapsedMonthBusinessDays = getBusinessDays(monthStart, today);
    
    const dailyGoal = meta3 / totalMonthBusinessDays;
    const weeklyGoal = dailyGoal * 5;
    const biweekBusinessDays = getBusinessDays(biweek.start, biweek.end);
    const biweeklyGoal = dailyGoal * biweekBusinessDays;

    const todayStr = format(today, 'yyyy-MM-dd');
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    const biweekStartStr = format(biweek.start, 'yyyy-MM-dd');
    const biweekEndStr = format(biweek.end, 'yyyy-MM-dd');

    const todayRevenue = revenueData.filter(r => r.date === todayStr).reduce((sum, r) => sum + (r.amount || 0), 0);
    const weekRevenue = revenueData.filter(r => r.date >= weekStartStr && r.date <= weekEndStr).reduce((sum, r) => sum + (r.amount || 0), 0);
    const biweekRevenue = revenueData.filter(r => r.date >= biweekStartStr && r.date <= biweekEndStr).reduce((sum, r) => sum + (r.amount || 0), 0);
    const monthRevenue = revenueData.reduce((sum, r) => sum + (r.amount || 0), 0);

    const daysRemainingWeek = Math.max(0, differenceInDays(weekEnd, today));
    const daysRemainingBiweek = Math.max(0, differenceInDays(biweek.end, today));
    const daysRemainingMonth = Math.max(0, differenceInDays(monthEnd, today));

    const businessDaysRemainingWeek = getBusinessDays(addDays(today, 1), weekEnd);
    const businessDaysRemainingBiweek = getBusinessDays(addDays(today, 1), biweek.end);
    const businessDaysRemainingMonth = getBusinessDays(addDays(today, 1), monthEnd);

    const getStatus = (achieved: number, goal: number): 'success' | 'warning' | 'danger' | 'neutral' => {
      const progress = goal > 0 ? (achieved / goal) * 100 : 0;
      if (progress >= 100) return 'success';
      if (progress >= 70) return 'warning';
      if (progress >= 40) return 'neutral';
      return 'danger';
    };

    const periods: PeriodData[] = [
      {
        label: 'Hoje',
        icon: Clock,
        goal: dailyGoal,
        achieved: todayRevenue,
        progress: dailyGoal > 0 ? Math.min(100, (todayRevenue / dailyGoal) * 100) : 0,
        status: getStatus(todayRevenue, dailyGoal),
        daysRemaining: 0,
        dailyNeeded: Math.max(0, dailyGoal - todayRevenue),
      },
      {
        label: 'Semana',
        icon: Calendar,
        goal: weeklyGoal,
        achieved: weekRevenue,
        progress: weeklyGoal > 0 ? Math.min(100, (weekRevenue / weeklyGoal) * 100) : 0,
        status: getStatus(weekRevenue, weeklyGoal),
        daysRemaining: daysRemainingWeek,
        dailyNeeded: businessDaysRemainingWeek > 0 ? Math.max(0, (weeklyGoal - weekRevenue) / businessDaysRemainingWeek) : 0,
      },
      {
        label: biweek.label,
        icon: Calendar,
        goal: biweeklyGoal,
        achieved: biweekRevenue,
        progress: biweeklyGoal > 0 ? Math.min(100, (biweekRevenue / biweeklyGoal) * 100) : 0,
        status: getStatus(biweekRevenue, biweeklyGoal),
        daysRemaining: daysRemainingBiweek,
        dailyNeeded: businessDaysRemainingBiweek > 0 ? Math.max(0, (biweeklyGoal - biweekRevenue) / businessDaysRemainingBiweek) : 0,
      },
      {
        label: 'Mês',
        icon: Target,
        goal: meta3,
        achieved: monthRevenue,
        progress: meta3 > 0 ? Math.min(100, (monthRevenue / meta3) * 100) : 0,
        status: getStatus(monthRevenue, meta3),
        daysRemaining: daysRemainingMonth,
        dailyNeeded: businessDaysRemainingMonth > 0 ? Math.max(0, (meta3 - monthRevenue) / businessDaysRemainingMonth) : 0,
      },
    ];

    const projectedMonthly = elapsedMonthBusinessDays > 0 
      ? (monthRevenue / elapsedMonthBusinessDays) * totalMonthBusinessDays 
      : 0;
    const projectionPercent = meta3 > 0 ? (projectedMonthly / meta3) * 100 : 0;

    return { periods, projectedMonthly, projectionPercent, meta3 };
  }, [goalData, revenueData, today]);

  if (!periodsData) {
    return (
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Minhas Metas por Período
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-xs text-muted-foreground text-center py-4">
            Configure sua meta mensal individual para ver o acompanhamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'danger': return <XCircle className="w-3 h-3 text-red-500" />;
      default: return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 border-green-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'danger': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-muted/50 border-border';
    }
  };

  const getProjectionStatus = (percent: number) => {
    if (percent >= 100) return { label: 'No alvo! 🎯', color: 'text-green-600', bg: 'bg-green-500' };
    if (percent >= 90) return { label: 'Quase lá! 🔥', color: 'text-yellow-600', bg: 'bg-yellow-500' };
    if (percent >= 70) return { label: 'Acelere! ⚡', color: 'text-orange-600', bg: 'bg-orange-500' };
    return { label: 'Atenção! ⚠️', color: 'text-red-600', bg: 'bg-red-500' };
  };

  const projection = getProjectionStatus(periodsData.projectionPercent);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Minhas Metas por Período
          </CardTitle>
          <Badge variant="outline" className={cn("text-xs gap-1", projection.color)}>
            {periodsData.projectionPercent >= 100 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {periodsData.projectionPercent.toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* Personal Thermometer */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Minha Projeção</span>
            </div>
            <span className={cn("text-xs font-bold", projection.color)}>
              {projection.label}
            </span>
          </div>
          
          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("absolute inset-y-0 left-0 rounded-full transition-all", projection.bg)}
              style={{ width: `${Math.min(100, periodsData.projectionPercent)}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-muted-foreground">
              Projetado: <strong>{formatCurrency(periodsData.projectedMonthly)}</strong>
            </span>
            <span className="text-muted-foreground">
              Meta: <strong className="text-primary">{formatCurrency(periodsData.meta3)}</strong>
            </span>
          </div>
        </div>

        {/* Period Cards */}
        <div className="grid grid-cols-4 gap-2">
          {periodsData.periods.map((period, index) => (
            <div key={index} className={cn("p-2 rounded-lg border", getStatusBg(period.status))}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{period.label}</span>
                {getStatusIcon(period.status)}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  "text-sm font-bold",
                  period.status === 'success' && "text-green-600",
                  period.status === 'warning' && "text-yellow-600",
                  period.status === 'danger' && "text-red-600"
                )}>
                  {formatCurrency(period.achieved)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  / {formatCurrency(period.goal)}
                </span>
              </div>
              <Progress value={period.progress} className="h-1 mt-1" />
              {period.status === 'success' && (
                <div className="flex items-center gap-1 mt-1">
                  <Flame className="w-2.5 h-2.5 text-green-500" />
                  <span className="text-[9px] text-green-600">Meta batida!</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
