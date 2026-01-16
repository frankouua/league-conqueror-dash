import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Target, TrendingUp, TrendingDown, CheckCircle2, XCircle, 
  AlertTriangle, Flame, Thermometer, Calendar, Clock, Building2, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { CLINIC_GOALS } from '@/constants/clinicGoals';
import { 
  format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isWeekend, differenceInDays, addDays
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

interface PeriodData {
  label: string;
  dateRange: string;
  icon: any;
  goal: number;
  achieved: number;
  progress: number;
  status: 'success' | 'warning' | 'danger' | 'neutral';
  daysRemaining: number;
  dailyNeeded: number;
  pacePercent: number; // % acima/abaixo do esperado
}

interface SellerData {
  userId: string;
  name: string;
  periods: PeriodData[];
  meta3: number;
  projectedMonthly: number;
  projectionPercent: number;
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

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
};

const getStatus = (achieved: number, goal: number): 'success' | 'warning' | 'danger' | 'neutral' => {
  const progress = goal > 0 ? (achieved / goal) * 100 : 0;
  if (progress >= 100) return 'success';
  if (progress >= 70) return 'warning';
  if (progress >= 40) return 'neutral';
  return 'danger';
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

function calculatePeriods(
  meta3: number, 
  revenueData: { date: string; amount: number }[], 
  today: Date
): { periods: PeriodData[]; projectedMonthly: number; projectionPercent: number } {
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

  // Expected values for pace calculation (pro-rata based on elapsed time)
  const weekBusinessDays = getBusinessDays(weekStart, weekEnd);
  const elapsedWeekBusinessDays = getBusinessDays(weekStart, today);
  const elapsedBiweekBusinessDays = getBusinessDays(biweek.start, today);

  const expectedToday = dailyGoal; // Full day goal
  const expectedWeek = weeklyGoal * (elapsedWeekBusinessDays / weekBusinessDays);
  const expectedBiweek = biweeklyGoal * (elapsedBiweekBusinessDays / biweekBusinessDays);
  const expectedMonth = meta3 * (elapsedMonthBusinessDays / totalMonthBusinessDays);

  const calcPacePercent = (achieved: number, expected: number) => 
    expected > 0 ? ((achieved - expected) / expected) * 100 : 0;

  const periods: PeriodData[] = [
    {
      label: 'Hoje',
      dateRange: `Dia ${format(today, 'dd')}`,
      icon: Clock,
      goal: dailyGoal,
      achieved: todayRevenue,
      progress: dailyGoal > 0 ? Math.min(100, (todayRevenue / dailyGoal) * 100) : 0,
      status: getStatus(todayRevenue, dailyGoal),
      daysRemaining: 0,
      dailyNeeded: Math.max(0, dailyGoal - todayRevenue),
      pacePercent: calcPacePercent(todayRevenue, expectedToday),
    },
    {
      label: 'Semana',
      dateRange: `${format(weekStart, 'dd')}-${format(weekEnd, 'dd')} ${format(today, 'MMM', { locale: ptBR })}`,
      icon: Calendar,
      goal: weeklyGoal,
      achieved: weekRevenue,
      progress: weeklyGoal > 0 ? Math.min(100, (weekRevenue / weeklyGoal) * 100) : 0,
      status: getStatus(weekRevenue, weeklyGoal),
      daysRemaining: daysRemainingWeek,
      dailyNeeded: businessDaysRemainingWeek > 0 ? Math.max(0, (weeklyGoal - weekRevenue) / businessDaysRemainingWeek) : 0,
      pacePercent: calcPacePercent(weekRevenue, expectedWeek),
    },
    {
      label: biweek.label,
      dateRange: `${format(biweek.start, 'dd')}-${format(biweek.end, 'dd')} ${format(today, 'MMM', { locale: ptBR })}`,
      icon: Calendar,
      goal: biweeklyGoal,
      achieved: biweekRevenue,
      progress: biweeklyGoal > 0 ? Math.min(100, (biweekRevenue / biweeklyGoal) * 100) : 0,
      status: getStatus(biweekRevenue, biweeklyGoal),
      daysRemaining: daysRemainingBiweek,
      dailyNeeded: businessDaysRemainingBiweek > 0 ? Math.max(0, (biweeklyGoal - biweekRevenue) / businessDaysRemainingBiweek) : 0,
      pacePercent: calcPacePercent(biweekRevenue, expectedBiweek),
    },
    {
      label: 'Mês',
      dateRange: `01-${format(monthEnd, 'dd')} ${format(today, 'MMM', { locale: ptBR })}`,
      icon: Target,
      goal: meta3,
      achieved: monthRevenue,
      progress: meta3 > 0 ? Math.min(100, (monthRevenue / meta3) * 100) : 0,
      status: getStatus(monthRevenue, meta3),
      daysRemaining: daysRemainingMonth,
      dailyNeeded: businessDaysRemainingMonth > 0 ? Math.max(0, (meta3 - monthRevenue) / businessDaysRemainingMonth) : 0,
      pacePercent: calcPacePercent(monthRevenue, expectedMonth),
    },
  ];

  const projectedMonthly = elapsedMonthBusinessDays > 0 
    ? (monthRevenue / elapsedMonthBusinessDays) * totalMonthBusinessDays 
    : 0;
  const projectionPercent = meta3 > 0 ? (projectedMonthly / meta3) * 100 : 0;

  return { periods, projectedMonthly, projectionPercent };
}

// Format pace percentage with sign
const formatPacePercent = (percent: number) => {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(0)}%`;
};

// Get pace color based on percentage
const getPaceColor = (percent: number) => {
  if (percent >= 10) return 'text-emerald-500';
  if (percent >= 0) return 'text-green-500';
  if (percent >= -10) return 'text-yellow-500';
  return 'text-red-500';
};

// Period Card Component (compact)
function PeriodCard({ period }: { period: PeriodData }) {
  const paceColor = getPaceColor(period.pacePercent);
  const isAbove = period.pacePercent >= 0;
  
  return (
    <div className={cn("p-2 rounded-lg border", getStatusBg(period.status))}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-col">
          <span className="text-xs font-medium">{period.label}</span>
          <span className="text-[9px] text-muted-foreground">{period.dateRange}</span>
        </div>
        {/* Pace Badge */}
        <Badge 
          variant="outline" 
          className={cn(
            "text-[9px] px-1.5 py-0.5 h-auto gap-0.5",
            paceColor,
            isAbove ? "border-green-500/30" : "border-red-500/30"
          )}
        >
          {isAbove ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {formatPacePercent(period.pacePercent)}
        </Badge>
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
  );
}

export function MultiPeriodGoalTracker() {
  const [activeTab, setActiveTab] = useState('total');
  const today = startOfDay(new Date());
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

  // Fetch all revenue for the month (all sellers) - using attributed_to_user_id
  const { data: allRevenueData } = useQuery({
    queryKey: ['all-period-revenue', currentMonth, currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from('revenue_records')
        .select('date, amount, attributed_to_user_id, user_id')
        .gte('date', monthStart)
        .lte('date', monthEnd);
      return data || [];
    },
  });

  // Fetch all individual goals for the month
  const { data: allGoalsData } = useQuery({
    queryKey: ['all-period-goals', currentMonth, currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from('individual_goals')
        .select('user_id, meta3_goal, revenue_goal')
        .eq('month', currentMonth)
        .eq('year', currentYear);
      return data || [];
    },
  });

  // Fetch profiles for seller names
  const { data: profilesData } = useQuery({
    queryKey: ['seller-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('position', ['comercial_1_captacao', 'comercial_2_closer', 'comercial_3_experiencia', 'comercial_4_farmer', 'sdr']);
      return data || [];
    },
  });

  // Calculate company total data
  const companyData = useMemo(() => {
    if (!allRevenueData) return null;
    
    const meta3 = CLINIC_GOALS.META_3;
    const result = calculatePeriods(meta3, allRevenueData, today);
    
    return { ...result, meta3 };
  }, [allRevenueData, today]);

  // Calculate per-seller data
  const sellersData = useMemo(() => {
    if (!allRevenueData || !allGoalsData || !profilesData) return [];

    const sellers: SellerData[] = [];

    allGoalsData.forEach(goal => {
      const meta3 = goal.meta3_goal || goal.revenue_goal || 0;
      if (meta3 <= 0) return;

      const profile = profilesData.find(p => p.user_id === goal.user_id);
      if (!profile) return;

      const sellerRevenue = allRevenueData
        .filter(r => (r.attributed_to_user_id === goal.user_id) || (!r.attributed_to_user_id && r.user_id === goal.user_id))
        .map(r => ({ date: r.date, amount: r.amount || 0 }));

      const result = calculatePeriods(meta3, sellerRevenue, today);

      sellers.push({
        userId: goal.user_id,
        name: profile.full_name || 'Vendedor',
        periods: result.periods,
        meta3,
        projectedMonthly: result.projectedMonthly,
        projectionPercent: result.projectionPercent,
      });
    });

    // Sort by projection percent descending
    return sellers.sort((a, b) => b.projectionPercent - a.projectionPercent);
  }, [allRevenueData, allGoalsData, profilesData, today]);

  const getProjectionStatus = (percent: number) => {
    if (percent >= 100) return { label: '🎯', color: 'text-green-600', bg: 'bg-green-500' };
    if (percent >= 90) return { label: '🔥', color: 'text-yellow-600', bg: 'bg-yellow-500' };
    if (percent >= 70) return { label: '⚡', color: 'text-orange-600', bg: 'bg-orange-500' };
    return { label: '⚠️', color: 'text-red-600', bg: 'bg-red-500' };
  };

  if (!companyData) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">Carregando metas...</p>
        </CardContent>
      </Card>
    );
  }

  const companyProjection = getProjectionStatus(companyData.projectionPercent);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Metas por Período
          </CardTitle>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-7">
              <TabsTrigger value="total" className="text-xs px-2 h-6 gap-1">
                <Building2 className="w-3 h-3" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="vendedores" className="text-xs px-2 h-6 gap-1">
                <Users className="w-3 h-3" />
                Vendedores
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {activeTab === 'total' ? (
          <div className="space-y-3">
            {/* Company Thermometer */}
            {(() => {
              // Calculate days to reach goal at current pace
              const monthlyPace = companyData.periods[3]; // Month period
              const elapsedDays = today.getDate();
              const remainingGoal = companyData.meta3 - monthlyPace.achieved;
              const dailyAverage = elapsedDays > 0 ? monthlyPace.achieved / elapsedDays : 0;
              const daysToGoal = dailyAverage > 0 ? Math.ceil(remainingGoal / dailyAverage) : 999;
              const goalReached = monthlyPace.achieved >= companyData.meta3;
              const monthEnd = endOfMonth(today);
              const daysRemainingMonth = differenceInDays(monthEnd, today);
              const willReachInTime = daysToGoal <= daysRemainingMonth;
              
              // Pace message
              let paceMessage = '';
              if (goalReached) {
                paceMessage = '🎯 Meta atingida! Continue assim!';
              } else if (willReachInTime) {
                paceMessage = `🚀 Nesse ritmo, bate a meta em ${daysToGoal} dias`;
              } else {
                const projectedFinal = dailyAverage * (elapsedDays + daysRemainingMonth);
                paceMessage = `⚡ Nesse ritmo, chega em ${formatCurrency(projectedFinal)} no final do mês`;
              }
              
              return (
                <div className="p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">Projeção da Clínica</span>
                    </div>
                    <Badge variant="outline" className={cn("text-xs gap-1", companyProjection.color)}>
                      {companyData.projectionPercent >= 100 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {companyData.projectionPercent.toFixed(0)}% {companyProjection.label}
                    </Badge>
                  </div>
                  
                  <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("absolute inset-y-0 left-0 rounded-full transition-all", companyProjection.bg)}
                      style={{ width: `${Math.min(100, companyData.projectionPercent)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className={cn(
                      "font-medium",
                      goalReached ? "text-green-600" : willReachInTime ? "text-emerald-600" : "text-orange-600"
                    )}>
                      {paceMessage}
                    </span>
                    <span className="text-muted-foreground">Meta: <strong className="text-primary">{formatCurrency(companyData.meta3)}</strong></span>
                  </div>
                </div>
              );
            })()}

            {/* Company Period Cards */}
            <div className="grid grid-cols-4 gap-2">
              {companyData.periods.map((period, index) => (
                <PeriodCard key={index} period={period} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {sellersData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum vendedor com metas individuais configuradas.
              </p>
            ) : (
              sellersData.map(seller => {
                const sellerProjection = getProjectionStatus(seller.projectionPercent);
                return (
                  <div key={seller.userId} className="p-2 rounded-lg border bg-card/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium truncate max-w-[120px]">{seller.name.split(' ')[0]}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full", sellerProjection.bg)}
                              style={{ width: `${Math.min(100, seller.projectionPercent)}%` }}
                            />
                          </div>
                        </div>
                        <span className={cn("text-[10px] font-bold", sellerProjection.color)}>
                          {seller.projectionPercent.toFixed(0)}% {sellerProjection.label}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {seller.periods.map((period, idx) => (
                        <div key={idx} className={cn("px-1.5 py-1 rounded text-center", getStatusBg(period.status))}>
                          <p className="text-[9px] text-muted-foreground">{period.label}</p>
                          <p className="text-[7px] text-muted-foreground/70">{period.dateRange}</p>
                          <p className={cn(
                            "text-[10px] font-bold",
                            period.status === 'success' && "text-green-600",
                            period.status === 'warning' && "text-yellow-600",
                            period.status === 'danger' && "text-red-600"
                          )}>
                            {formatCurrency(period.achieved)}
                          </p>
                          <p className="text-[8px] text-muted-foreground">/{formatCurrency(period.goal)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
