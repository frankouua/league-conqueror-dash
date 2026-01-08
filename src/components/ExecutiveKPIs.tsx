import { useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Calendar,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { CLINIC_GOALS } from "@/constants/clinicGoals";
import { PaceBadge, PaceIndicator } from "@/components/PaceBadge";
import { calculatePaceMetrics } from "@/lib/paceAnalysis";
import { cn } from "@/lib/utils";

interface ExecutiveKPIsProps {
  month: number;
  year: number;
}

const ExecutiveKPIs = ({ month, year }: ExecutiveKPIsProps) => {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - currentDay);
  const businessDaysRemaining = Math.round(daysRemaining * 0.7);
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Previous month dates for comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
  const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prevLastDay).padStart(2, "0")}`;

  // Fetch current month revenue
  const { data: revenueData } = useQuery({
    queryKey: ["kpi-revenue", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount, date, user_id")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch previous month revenue for comparison
  const { data: prevRevenueData } = useQuery({
    queryKey: ["kpi-revenue-prev", prevMonth, prevYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount")
        .gte("date", prevStartDate)
        .lte("date", prevEndDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch referral leads
  const { data: leadsData } = useQuery({
    queryKey: ["kpi-leads", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_leads")
        .select("id, status, created_at, last_contact_at, assigned_to")
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59");
      if (error) throw error;
      return data;
    },
  });

  // Fetch cancellations
  const { data: cancellationsData } = useQuery({
    queryKey: ["kpi-cancellations", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cancellations")
        .select("contract_value, status")
        .gte("cancellation_request_date", startDate)
        .lte("cancellation_request_date", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch department goals
  const { data: deptGoals } = useQuery({
    queryKey: ["kpi-dept-goals", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_goals")
        .select("meta1_goal, meta2_goal, meta3_goal")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
  });

  // Fetch active sellers count
  const { data: sellersData } = useQuery({
    queryKey: ["kpi-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, position")
        .in("position", ["comercial_1_captacao", "comercial_2_closer", "comercial_3_experiencia", "comercial_4_farmer", "sdr"]);
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const metrics = useMemo(() => {
    // Revenue metrics
    const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const prevTotalRevenue = prevRevenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const revenueGrowth = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

    // Goals - SEMPRE destacar Meta 3 como objetivo principal
    const meta1 = deptGoals?.reduce((sum, g) => sum + Number(g.meta1_goal), 0) || CLINIC_GOALS.META_1;
    const meta2 = deptGoals?.reduce((sum, g) => sum + Number(g.meta2_goal), 0) || CLINIC_GOALS.META_2;
    const meta3 = deptGoals?.reduce((sum, g) => sum + Number(g.meta3_goal), 0) || CLINIC_GOALS.META_3;
    // Progress based on Meta 3 (our main goal)
    const goalProgress = meta3 > 0 ? (totalRevenue / meta3) * 100 : 0;

    // PACE ANALYSIS - Compare current vs expected for today
    const paceMetrics = calculatePaceMetrics(meta3, totalRevenue, currentDay, daysInMonth);

    // Projections
    const dailyAverage = currentDay > 0 ? totalRevenue / currentDay : 0;
    const projectedTotal = dailyAverage * daysInMonth;
    const projectedGoalLevel = projectedTotal >= meta3 ? 3 : projectedTotal >= meta2 ? 2 : projectedTotal >= meta1 ? 1 : 0;

    // Daily target to hit META 3 (our main goal)
    const remainingForMeta3 = Math.max(0, meta3 - totalRevenue);
    const dailyNeeded = daysRemaining > 0 ? remainingForMeta3 / daysRemaining : 0;
    const dailyNeededBusiness = businessDaysRemaining > 0 ? remainingForMeta3 / businessDaysRemaining : 0;

    // Leads metrics
    const totalLeads = leadsData?.length || 0;
    const convertedLeads = leadsData?.filter(l => ["operou", "ganho"].includes(l.status)).length || 0;
    const hotLeads = leadsData?.filter(l => ["nova", "em_contato", "agendou"].includes(l.status)).length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Lead response time (average hours to first contact)
    const leadsWithContact = leadsData?.filter(l => l.last_contact_at) || [];
    const avgResponseTime = leadsWithContact.length > 0
      ? leadsWithContact.reduce((sum, l) => {
          const created = new Date(l.created_at).getTime();
          const contacted = new Date(l.last_contact_at!).getTime();
          return sum + (contacted - created) / (1000 * 60 * 60); // hours
        }, 0) / leadsWithContact.length
      : 0;

    // Stale leads (no contact in 48h)
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);
    const staleLeads = leadsData?.filter(l => 
      ["nova", "em_contato"].includes(l.status) && 
      (!l.last_contact_at || new Date(l.last_contact_at) < cutoff)
    ).length || 0;

    // Cancellations
    const totalCancelled = cancellationsData?.reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;
    const retainedCount = cancellationsData?.filter(c => c.status === "retained").length || 0;
    const cancelledCount = cancellationsData?.filter(c => ["cancelled_with_fine", "cancelled_no_fine"].includes(c.status)).length || 0;

    // Active sellers
    const activeSellers = sellersData?.length || 0;
    const avgPerSeller = activeSellers > 0 ? totalRevenue / activeSellers : 0;

    return {
      totalRevenue,
      revenueGrowth,
      goalProgress,
      meta1,
      meta2,
      meta3,
      projectedTotal,
      projectedGoalLevel,
      dailyNeeded,
      dailyNeededBusiness,
      remainingForMeta3,
      totalLeads,
      hotLeads,
      conversionRate,
      avgResponseTime,
      staleLeads,
      totalCancelled,
      retainedCount,
      cancelledCount,
      activeSellers,
      avgPerSeller,
      dailyAverage,
      paceMetrics, // Add pace metrics
    };
  }, [revenueData, prevRevenueData, leadsData, cancellationsData, deptGoals, sellersData, currentDay, daysInMonth, daysRemaining, businessDaysRemaining]);

  const getGoalLevelBadge = (level: number) => {
    switch (level) {
      case 3:
        return <Badge className="bg-gradient-gold-shine text-primary-foreground">Meta 3 🏆</Badge>;
      case 2:
        return <Badge className="bg-success text-success-foreground">Meta 2</Badge>;
      case 1:
        return <Badge className="bg-amber-500 text-white">Meta 1</Badge>;
      default:
        return <Badge variant="destructive">Abaixo da Meta</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Faturamento */}
        <Card className={cn(
          "bg-gradient-to-br border-2 transition-all",
          metrics.paceMetrics.bgColor,
          metrics.paceMetrics.borderColor
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <PaceBadge 
                monthlyGoal={metrics.meta3}
                currentValue={metrics.totalRevenue}
                currentDay={currentDay}
                totalDaysInMonth={daysInMonth}
                compact
              />
            </div>
            <p className="text-2xl font-black text-primary">{formatCompact(metrics.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <Progress value={Math.min(metrics.goalProgress, 100)} className="h-1.5 mt-2" />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{metrics.goalProgress.toFixed(0)}% da Meta 3</p>
              <p className={cn("text-xs font-medium", metrics.paceMetrics.textColor)}>
                Esp: {formatCompact(metrics.paceMetrics.expected)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Projeção */}
        <Card className={metrics.projectedGoalLevel >= 1 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-success" />
              {getGoalLevelBadge(metrics.projectedGoalLevel)}
            </div>
            <p className="text-2xl font-black">{formatCompact(metrics.projectedTotal)}</p>
            <p className="text-xs text-muted-foreground">Projeção Mês</p>
            {isCurrentMonth && metrics.remainingForMeta3 > 0 && (
              <p className="text-xs text-primary mt-2 font-medium">
                Falta: {formatCurrency(metrics.remainingForMeta3)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Meta Diária - com comparação de ritmo */}
        <Card className={cn(
          "border-2 transition-all",
          metrics.dailyAverage >= metrics.paceMetrics.dailyTarget 
            ? "border-success/50 bg-success/10" 
            : "border-amber-500/30 bg-amber-500/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-amber-500" />
              <Badge variant="outline" className="text-xs">{daysRemaining}d</Badge>
            </div>
            <p className="text-2xl font-black text-amber-600">{formatCompact(metrics.dailyNeededBusiness)}</p>
            <p className="text-xs text-muted-foreground">Meta/Dia Útil</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Média atual:</span>
                <span className={cn(
                  "font-medium",
                  metrics.dailyAverage >= metrics.paceMetrics.dailyTarget ? "text-success" : "text-amber-500"
                )}>
                  {formatCurrency(metrics.dailyAverage)}/dia
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Meta diária:</span>
                <span className="text-muted-foreground">
                  {formatCurrency(metrics.paceMetrics.dailyTarget)}/dia
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicações */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              {metrics.staleLeads > 0 && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {metrics.staleLeads}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-black">{metrics.totalLeads}</p>
            <p className="text-xs text-muted-foreground">Indicações</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">{metrics.hotLeads} quentes</Badge>
              <span className="text-xs text-success">{metrics.conversionRate.toFixed(0)}% conv.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs - Compact inline row */}
      <div className="flex flex-wrap items-center gap-2 px-2 py-2 rounded-lg bg-secondary/30 border border-border/50">
        {/* Tempo de Resposta */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
          metrics.avgResponseTime > 24 ? "bg-destructive/10 text-destructive" : 
          metrics.avgResponseTime > 2 ? "bg-amber-500/10 text-amber-600" : "bg-success/10 text-success"
        )}>
          <Clock className="w-3 h-3" />
          <span className="font-semibold">{metrics.avgResponseTime.toFixed(1)}h</span>
          <span className="text-muted-foreground hidden sm:inline">Resposta</span>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Média/Vendedora */}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-primary/10">
          <Zap className="w-3 h-3 text-primary" />
          <span className="font-semibold">{formatCompact(metrics.avgPerSeller)}</span>
          <span className="text-muted-foreground hidden sm:inline">Média/Vend.</span>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Vendedoras */}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-muted">
          <Users className="w-3 h-3 text-primary" />
          <span className="font-semibold">{metrics.activeSellers}</span>
          <span className="text-muted-foreground hidden sm:inline">Vendedoras</span>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Cancelamentos */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
          metrics.cancelledCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        )}>
          <TrendingDown className="w-3 h-3" />
          <span className="font-semibold">{metrics.cancelledCount}</span>
          <span className="hidden sm:inline">Cancelamentos</span>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Retidos */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
          metrics.retainedCount > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        )}>
          <CheckCircle2 className="w-3 h-3" />
          <span className="font-semibold">{metrics.retainedCount}</span>
          <span className="hidden sm:inline">Retidos</span>
        </div>
      </div>
    </div>
  );
};

export default memo(ExecutiveKPIs);
