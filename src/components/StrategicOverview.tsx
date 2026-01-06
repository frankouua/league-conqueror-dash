import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, TrendingDown, Target, DollarSign, Users, Calendar, 
  Clock, AlertTriangle, CheckCircle2, Lightbulb, Zap, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Trophy, CalendarDays, Brain,
  ShoppingCart, UserCheck, Percent, Activity, Flame, Star, History,
  GitCompare, PieChart, Eye, Sparkles, MessageSquare, Heart, XCircle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subYears, differenceInDays, isWeekend, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CLINIC_GOALS } from "@/constants/clinicGoals";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LineChart, Line, Legend, PieChart as RechartsPie, Pie } from "recharts";

interface StrategicOverviewProps {
  month: number;
  year: number;
}

export default function StrategicOverview({ month, year }: StrategicOverviewProps) {
  const today = new Date();
  const currentDayOfMonth = today.getDate();
  const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");
  const currentDateStr = format(new Date(year, month - 1, Math.min(currentDayOfMonth, 28)), "yyyy-MM-dd");
  
  // Same period last year (day 1 to current day of month)
  const lastYearStart = format(new Date(year - 1, month - 1, 1), "yyyy-MM-dd");
  const lastYearSamePeriodEnd = format(new Date(year - 1, month - 1, Math.min(currentDayOfMonth, 28)), "yyyy-MM-dd");
  const lastYearFullMonthEnd = format(endOfMonth(new Date(year - 1, month - 1, 1)), "yyyy-MM-dd");
  
  // Calculate business days
  const daysInMonth = differenceInDays(endOfMonth(new Date(year, month - 1, 1)), new Date(year, month - 1, 1)) + 1;
  const daysPassed = Math.min(currentDayOfMonth, daysInMonth);
  const daysRemaining = Math.max(0, daysInMonth - daysPassed);
  
  let businessDaysRemaining = 0;
  let businessDaysPassed = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (!isWeekend(date)) {
      if (d <= daysPassed) businessDaysPassed++;
      else businessDaysRemaining++;
    }
  }

  // Current month revenue (up to today)
  const { data: revenueData } = useQuery({
    queryKey: ["strategic-revenue-v2", startDate, currentDateStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_records")
        .select("amount, date, patient_name, department, procedure_name, origin")
        .gte("date", startDate)
        .lte("date", currentDateStr);
      return data || [];
    },
  });

  // Same period LAST YEAR (day 1 to same day of month)
  const { data: lastYearSamePeriod } = useQuery({
    queryKey: ["strategic-lastyear-period", lastYearStart, lastYearSamePeriodEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_records")
        .select("amount, date")
        .gte("date", lastYearStart)
        .lte("date", lastYearSamePeriodEnd);
      return data || [];
    },
  });

  // Full month LAST YEAR (for projection comparison)
  const { data: lastYearFullMonth } = useQuery({
    queryKey: ["strategic-lastyear-full", lastYearStart, lastYearFullMonthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_records")
        .select("amount, date")
        .gte("date", lastYearStart)
        .lte("date", lastYearFullMonthEnd);
      return data || [];
    },
  });

  // Last month (for MoM comparison)
  const lastMonthStart = format(startOfMonth(subMonths(new Date(year, month - 1, 1), 1)), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(subMonths(new Date(year, month - 1, 1), 1)), "yyyy-MM-dd");
  
  const { data: lastMonthData } = useQuery({
    queryKey: ["strategic-lastmonth", lastMonthStart, lastMonthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_records")
        .select("amount")
        .gte("date", lastMonthStart)
        .lte("date", lastMonthEnd);
      return data || [];
    },
  });

  // Executed data
  const { data: executedData } = useQuery({
    queryKey: ["strategic-executed-v2", startDate, currentDateStr],
    queryFn: async () => {
      const { data } = await supabase
        .from("executed_records")
        .select("amount, date")
        .gte("date", startDate)
        .lte("date", currentDateStr);
      return data || [];
    },
  });

  // Referral leads
  const { data: referralLeads } = useQuery({
    queryKey: ["strategic-leads-v2", startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_leads")
        .select("status, temperature, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59");
      return data || [];
    },
  });

  // Cancellations
  const { data: cancellations } = useQuery({
    queryKey: ["strategic-cancellations-v2", startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("cancellations")
        .select("status, contract_value, reason")
        .gte("cancellation_request_date", startDate)
        .lte("cancellation_request_date", endDate);
      return data || [];
    },
  });

  // Active campaigns
  const { data: campaigns } = useQuery({
    queryKey: ["strategic-campaigns-v2"],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("name, start_date, end_date, goal_value, goal_description, campaign_type")
        .eq("is_active", true)
        .gte("end_date", format(today, "yyyy-MM-dd"));
      return data || [];
    },
  });

  // RFV Segments
  const { data: rfvData } = useQuery({
    queryKey: ["strategic-rfv-v2"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rfv_customers")
        .select("segment, total_value, average_ticket");
      return data || [];
    },
  });

  // Sellers
  const { data: sellers } = useQuery({
    queryKey: ["strategic-sellers-v2"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("department", "comercial");
      return data || [];
    },
  });

  // Top procedures/departments
  const procedureAnalysis = useMemo(() => {
    if (!revenueData) return { byDepartment: [], byProcedure: [], byOrigin: [] };
    
    const deptMap: Record<string, number> = {};
    const procMap: Record<string, number> = {};
    const originMap: Record<string, number> = {};
    
    revenueData.forEach(r => {
      const dept = r.department || "Não informado";
      const proc = r.procedure_name || "Não informado";
      const origin = r.origin || "Não informado";
      
      deptMap[dept] = (deptMap[dept] || 0) + Number(r.amount);
      procMap[proc] = (procMap[proc] || 0) + Number(r.amount);
      originMap[origin] = (originMap[origin] || 0) + Number(r.amount);
    });
    
    return {
      byDepartment: Object.entries(deptMap)
        .map(([name, value]) => ({ name: name.substring(0, 15), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      byProcedure: Object.entries(procMap)
        .map(([name, value]) => ({ name: name.substring(0, 20), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      byOrigin: Object.entries(originMap)
        .map(([name, value]) => ({ name: name.substring(0, 15), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    };
  }, [revenueData]);

  // Calculate all metrics
  const metrics = useMemo(() => {
    const totalSold = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const totalExecuted = executedData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const salesCount = revenueData?.length || 0;
    const uniquePatients = new Set(revenueData?.map(r => r.patient_name)).size;
    
    // Year over Year comparison (same period)
    const lastYearSamePeriodTotal = lastYearSamePeriod?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const lastYearFullMonthTotal = lastYearFullMonth?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const lastYearSalesCount = lastYearSamePeriod?.length || 0;
    
    const yoyChange = lastYearSamePeriodTotal > 0 
      ? ((totalSold - lastYearSamePeriodTotal) / lastYearSamePeriodTotal) * 100 
      : 0;
    const yoyDifference = totalSold - lastYearSamePeriodTotal;
    
    // Month over Month
    const lastMonthTotal = lastMonthData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const momChange = lastMonthTotal > 0 ? ((totalSold - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    
    // Goals
    const meta1 = CLINIC_GOALS.META_1;
    const meta2 = CLINIC_GOALS.META_2;
    const meta3 = CLINIC_GOALS.META_3;
    
    const meta1Progress = Math.min(100, (totalSold / meta1) * 100);
    const meta2Progress = Math.min(100, (totalSold / meta2) * 100);
    const meta3Progress = Math.min(100, (totalSold / meta3) * 100);
    
    const missingMeta1 = Math.max(0, meta1 - totalSold);
    const missingMeta2 = Math.max(0, meta2 - totalSold);
    const missingMeta3 = Math.max(0, meta3 - totalSold);
    
    // Averages and projections
    const avgTicket = salesCount > 0 ? totalSold / salesCount : 0;
    const dailyAvg = daysPassed > 0 ? totalSold / daysPassed : 0;
    const dailyNeeded = businessDaysRemaining > 0 ? missingMeta1 / businessDaysRemaining : 0;
    const projection = dailyAvg * daysInMonth;
    
    // How many sales needed to hit goal?
    const salesNeeded = avgTicket > 0 ? Math.ceil(missingMeta1 / avgTicket) : 0;
    const salesPerDay = businessDaysRemaining > 0 ? (salesNeeded / businessDaysRemaining).toFixed(1) : "0";
    
    // Leads
    const totalLeads = referralLeads?.length || 0;
    const hotLeads = referralLeads?.filter(l => l.temperature === "hot").length || 0;
    const warmLeads = referralLeads?.filter(l => l.temperature === "warm").length || 0;
    const convertedLeads = referralLeads?.filter(l => l.status === "ganho" || l.status === "operou").length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    
    // Cancellations
    const totalCancellations = cancellations?.length || 0;
    const retainedCancellations = cancellations?.filter(c => c.status === "retained").length || 0;
    const cancelledValue = cancellations?.filter(c => 
      c.status === "cancelled_with_fine" || c.status === "cancelled_no_fine"
    ).reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;
    const retentionRate = totalCancellations > 0 ? (retainedCancellations / totalCancellations) * 100 : 0;
    
    // RFV
    const rfvSegments = rfvData?.reduce((acc, c) => {
      acc[c.segment] = (acc[c.segment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const atRiskCustomers = (rfvSegments["Em Risco"] || 0) + (rfvSegments["Não Podem Perder"] || 0);
    const champions = rfvSegments["Campeões"] || 0;
    const loyalCustomers = rfvSegments["Leais"] || 0;
    const newCustomers = rfvSegments["Novos"] || 0;
    const totalCustomers = rfvData?.length || 0;
    
    // Revenue per seller
    const sellersCount = sellers?.length || 1;
    const revenuePerSeller = totalSold / sellersCount;
    
    return {
      totalSold, totalExecuted, salesCount, uniquePatients,
      lastYearSamePeriodTotal, lastYearFullMonthTotal, lastYearSalesCount,
      yoyChange, yoyDifference,
      lastMonthTotal, momChange,
      meta1, meta2, meta3,
      meta1Progress, meta2Progress, meta3Progress,
      missingMeta1, missingMeta2, missingMeta3,
      avgTicket, dailyAvg, dailyNeeded, projection,
      salesNeeded, salesPerDay,
      totalLeads, hotLeads, warmLeads, convertedLeads, conversionRate,
      totalCancellations, retainedCancellations, cancelledValue, retentionRate,
      atRiskCustomers, champions, loyalCustomers, newCustomers, totalCustomers,
      sellersCount, revenuePerSeller,
      activeCampaigns: campaigns?.length || 0,
    };
  }, [revenueData, executedData, lastYearSamePeriod, lastYearFullMonth, lastMonthData, referralLeads, cancellations, rfvData, sellers, campaigns, daysPassed, daysInMonth, businessDaysRemaining]);

  // Daily comparison chart data
  const dailyComparisonData = useMemo(() => {
    const currentByDay: Record<number, number> = {};
    const lastYearByDay: Record<number, number> = {};
    
    revenueData?.forEach(r => {
      const day = parseISO(r.date).getDate();
      currentByDay[day] = (currentByDay[day] || 0) + Number(r.amount);
    });
    
    lastYearSamePeriod?.forEach(r => {
      const day = parseISO(r.date).getDate();
      lastYearByDay[day] = (lastYearByDay[day] || 0) + Number(r.amount);
    });
    
    const data = [];
    for (let d = 1; d <= Math.min(daysPassed, 15); d++) {
      data.push({
        day: `${d}`,
        atual: currentByDay[d] || 0,
        anterior: lastYearByDay[d] || 0,
      });
    }
    return data;
  }, [revenueData, lastYearSamePeriod, daysPassed]);

  // RFV Pie data
  const rfvPieData = useMemo(() => {
    if (!rfvData) return [];
    const segments: Record<string, number> = {};
    rfvData.forEach(c => {
      segments[c.segment] = (segments[c.segment] || 0) + 1;
    });
    return Object.entries(segments)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rfvData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
    return `R$ ${value.toFixed(0)}`;
  };

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getYoYColor = (change: number) => change >= 0 ? "text-emerald-500" : "text-red-500";
  const getYoYBg = (change: number) => change >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30";
  const getYoYIcon = (change: number) => change >= 0 ? TrendingUp : TrendingDown;

  const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

  // Strategic insights
  const strategicInsights = useMemo(() => {
    const insights: { icon: any; title: string; text: string; type: "success" | "warning" | "danger" | "info" }[] = [];
    
    // YoY insight
    if (metrics.yoyChange !== 0) {
      insights.push({
        icon: metrics.yoyChange >= 0 ? TrendingUp : TrendingDown,
        title: metrics.yoyChange >= 0 ? "Crescimento YoY" : "Queda YoY",
        text: `${metrics.yoyChange >= 0 ? "+" : ""}${metrics.yoyChange.toFixed(0)}% vs mesmo período ${year - 1}. Diferença de ${formatCurrency(Math.abs(metrics.yoyDifference))}.`,
        type: metrics.yoyChange >= 10 ? "success" : metrics.yoyChange < -10 ? "danger" : "info"
      });
    }
    
    // Pace to goal
    if (metrics.meta1Progress < 100) {
      const paceRatio = metrics.dailyNeeded / (metrics.dailyAvg || 1);
      if (paceRatio > 1.5) {
        insights.push({
          icon: AlertTriangle,
          title: "Ritmo Insuficiente",
          text: `Precisa aumentar ${Math.round((paceRatio - 1) * 100)}% o ritmo diário. Necessário ${metrics.salesPerDay} vendas/dia.`,
          type: "danger"
        });
      } else if (paceRatio <= 1) {
        insights.push({
          icon: CheckCircle2,
          title: "No Ritmo!",
          text: `Mantendo o ritmo atual, projeção de ${formatCurrency(metrics.projection)} no mês.`,
          type: "success"
        });
      }
    }
    
    // Hot leads
    if (metrics.hotLeads > 0) {
      insights.push({
        icon: Flame,
        title: "Leads Quentes",
        text: `${metrics.hotLeads} leads quentes + ${metrics.warmLeads} mornos aguardando ação. Potencial de conversão!`,
        type: "warning"
      });
    }
    
    // At risk customers
    if (metrics.atRiskCustomers > 20) {
      insights.push({
        icon: Heart,
        title: "Clientes em Risco",
        text: `${metrics.atRiskCustomers} clientes podem ser perdidos. Ative campanha de reativação!`,
        type: "danger"
      });
    }
    
    // Ticket médio comparison
    const avgTicketLastYear = metrics.lastYearSalesCount > 0 
      ? metrics.lastYearSamePeriodTotal / metrics.lastYearSalesCount 
      : 0;
    if (avgTicketLastYear > 0) {
      const ticketChange = ((metrics.avgTicket - avgTicketLastYear) / avgTicketLastYear) * 100;
      if (Math.abs(ticketChange) > 10) {
        insights.push({
          icon: ShoppingCart,
          title: ticketChange > 0 ? "Ticket Subiu" : "Ticket Caiu",
          text: `Ticket médio ${ticketChange > 0 ? "+" : ""}${ticketChange.toFixed(0)}% vs ano passado (${formatCurrency(avgTicketLastYear)} → ${formatCurrency(metrics.avgTicket)}).`,
          type: ticketChange > 0 ? "success" : "warning"
        });
      }
    }
    
    // Campaigns
    if (campaigns && campaigns.length > 0) {
      insights.push({
        icon: Zap,
        title: "Campanhas Ativas",
        text: campaigns.map(c => c.name).join(", "),
        type: "info"
      });
    }
    
    return insights;
  }, [metrics, campaigns, year]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Visão Geral Estratégica
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: ptBR })} • 
            Dia {daysPassed} de {daysInMonth} ({businessDaysRemaining} dias úteis restantes)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {metrics.meta1Progress >= 100 && (
            <Badge className="gap-1 bg-emerald-500 animate-pulse">
              <Trophy className="h-3 w-3" /> Meta 1 ✓
            </Badge>
          )}
          {metrics.meta2Progress >= 100 && (
            <Badge className="gap-1 bg-blue-500">
              <Trophy className="h-3 w-3" /> Meta 2 ✓
            </Badge>
          )}
          {metrics.meta3Progress >= 100 && (
            <Badge className="gap-1 bg-gradient-gold-shine text-primary-foreground animate-bounce">
              <Star className="h-3 w-3" /> META 3 🏆
            </Badge>
          )}
        </div>
      </div>

      {/* COMPARATIVO ANO A ANO - Destaque Principal */}
      <Card className={`border-2 ${getYoYBg(metrics.yoyChange)}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompare className="h-5 w-5" />
            Comparativo: {month}/{year} vs {month}/{year - 1} (Mesmo Período)
          </CardTitle>
          <CardDescription>
            Dia 1 a {daysPassed} de {format(new Date(year, month - 1, 1), "MMMM", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Este Ano</p>
              <p className="text-2xl font-bold text-gradient-gold">{formatCurrency(metrics.totalSold)}</p>
              <p className="text-xs text-muted-foreground">{metrics.salesCount} vendas</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Ano Passado</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.lastYearSamePeriodTotal)}</p>
              <p className="text-xs text-muted-foreground">{metrics.lastYearSalesCount} vendas</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Variação %</p>
              <p className={`text-2xl font-bold ${getYoYColor(metrics.yoyChange)}`}>
                {metrics.yoyChange >= 0 ? "+" : ""}{metrics.yoyChange.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">YoY</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Diferença R$</p>
              <p className={`text-2xl font-bold ${getYoYColor(metrics.yoyDifference)}`}>
                {metrics.yoyDifference >= 0 ? "+" : ""}{formatCurrency(metrics.yoyDifference)}
              </p>
              <p className="text-xs text-muted-foreground">vs ano anterior</p>
            </div>
          </div>
          
          {/* Mini chart comparison */}
          {dailyComparisonData.length > 0 && (
            <div className="mt-4 h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyComparisonData}>
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrencyFull(value)}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Line type="monotone" dataKey="atual" stroke="hsl(var(--primary))" strokeWidth={2} name={`${year}`} dot={false} />
                  <Line type="monotone" dataKey="anterior" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" name={`${year - 1}`} dot={false} />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <Badge variant="outline" className={getYoYColor(metrics.momChange)}>
                {metrics.momChange >= 0 ? "+" : ""}{metrics.momChange.toFixed(0)}% MoM
              </Badge>
            </div>
            <p className="text-2xl font-bold text-gradient-gold">{formatCurrency(metrics.totalSold)}</p>
            <p className="text-xs text-muted-foreground">Vendido até hoje</p>
          </CardContent>
        </Card>

        <Card className={`border ${metrics.meta1Progress >= 100 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Target className="h-4 w-4" />
            </div>
            <p className={`text-2xl font-bold ${metrics.meta1Progress >= 100 ? "text-emerald-500" : "text-red-500"}`}>
              {metrics.meta1Progress >= 100 ? "✓ Batida" : formatCurrency(metrics.missingMeta1)}
            </p>
            <p className="text-xs text-muted-foreground">Falta Meta 1</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(metrics.avgTicket)}</p>
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <Badge variant="outline">{businessDaysRemaining}d</Badge>
            </div>
            <p className="text-2xl font-bold text-amber-500">{formatCurrency(metrics.dailyNeeded)}</p>
            <p className="text-xs text-muted-foreground">Necessário/dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-500">{metrics.salesNeeded}</p>
            <p className="text-xs text-muted-foreground">Vendas p/ meta ({metrics.salesPerDay}/dia)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(metrics.revenuePerSeller)}</p>
            <p className="text-xs text-muted-foreground">Média/Vendedora</p>
          </CardContent>
        </Card>
      </div>

      {/* Progresso das Metas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Progresso das Metas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                Meta 1 - {formatCurrency(metrics.meta1)}
                {metrics.meta1Progress >= 100 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </span>
              <span className={metrics.meta1Progress >= 100 ? "text-emerald-500" : "text-muted-foreground"}>
                {metrics.meta1Progress.toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.meta1Progress} className="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                Meta 2 - {formatCurrency(metrics.meta2)}
                {metrics.meta2Progress >= 100 && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
              </span>
              <span className={metrics.meta2Progress >= 100 ? "text-blue-500" : "text-muted-foreground"}>
                {metrics.meta2Progress.toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.meta2Progress} className="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                Meta 3 - {formatCurrency(metrics.meta3)}
                {metrics.meta3Progress >= 100 && <Star className="h-4 w-4 text-amber-500" />}
              </span>
              <span className={metrics.meta3Progress >= 100 ? "text-amber-500" : "text-muted-foreground"}>
                {metrics.meta3Progress.toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.meta3Progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Insights Estratégicos */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insights Estratégicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {strategicInsights.length > 0 ? (
            strategicInsights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg ${
                  insight.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20" :
                  insight.type === "warning" ? "bg-amber-500/10 border border-amber-500/20" :
                  insight.type === "danger" ? "bg-red-500/10 border border-red-500/20" :
                  "bg-blue-500/10 border border-blue-500/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  <insight.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                    insight.type === "success" ? "text-emerald-500" :
                    insight.type === "warning" ? "text-amber-500" :
                    insight.type === "danger" ? "text-red-500" :
                    "text-blue-500"
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.text}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Carregando insights...</p>
          )}
        </CardContent>
      </Card>

      {/* Grid de Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Departamentos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Departamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {procedureAnalysis.byDepartment.length > 0 ? (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={procedureAnalysis.byDepartment} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} fontSize={10} />
                    <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                    <Tooltip formatter={(value: number) => formatCurrencyFull(value)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Top Origens */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Origens</CardTitle>
          </CardHeader>
          <CardContent>
            {procedureAnalysis.byOrigin.length > 0 ? (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={procedureAnalysis.byOrigin} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} fontSize={10} />
                    <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                    <Tooltip formatter={(value: number) => formatCurrencyFull(value)} />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* RFV Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Segmentação RFV ({metrics.totalCustomers} clientes)</CardTitle>
          </CardHeader>
          <CardContent>
            {rfvPieData.length > 0 ? (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={rfvPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ name, percent }) => `${name.substring(0, 8)} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      fontSize={9}
                    >
                      {rfvPieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados RFV</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo Operacional */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Resumo Operacional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-emerald-500">{metrics.sellersCount}</p>
              <p className="text-xs text-muted-foreground">Vendedoras</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{metrics.uniquePatients}</p>
              <p className="text-xs text-muted-foreground">Pacientes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-amber-500">{metrics.hotLeads + metrics.warmLeads}</p>
              <p className="text-xs text-muted-foreground">Leads Ativos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-purple-500">{metrics.conversionRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Conversão</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-red-500">{metrics.totalCancellations}</p>
              <p className="text-xs text-muted-foreground">Cancelamentos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-emerald-500">{metrics.retentionRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Retenção</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Campeões RFV:</span>
              <span className="font-semibold text-emerald-500">{metrics.champions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leais:</span>
              <span className="font-semibold text-blue-500">{metrics.loyalCustomers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Em Risco:</span>
              <span className="font-semibold text-amber-500">{metrics.atRiskCustomers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Executado:</span>
              <span className="font-semibold">{formatCurrency(metrics.totalExecuted)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projeção */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Projeção Mês</span>
            </div>
            <p className="text-3xl font-bold text-blue-500">{formatCurrency(metrics.projection)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado na média diária de {formatCurrency(metrics.dailyAvg)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-5 w-5" />
              <span className="font-medium">Mês Anterior</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(metrics.lastMonthTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(subMonths(new Date(year, month - 1, 1), 1), "MMMM yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <GitCompare className="h-5 w-5" />
              <span className="font-medium">Mesmo Mês {year - 1}</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(metrics.lastYearFullMonthTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total de {format(new Date(year - 1, month - 1, 1), "MMMM yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Urgentes */}
      {(metrics.hotLeads > 0 || metrics.atRiskCustomers > 20 || metrics.dailyNeeded > metrics.dailyAvg * 1.3) && (
        <Card className="border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-red-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Ações Prioritárias Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {metrics.hotLeads > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Flame className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="font-semibold">Ligar para {metrics.hotLeads} leads quentes</p>
                    <p className="text-xs text-muted-foreground">Alta probabilidade de conversão</p>
                  </div>
                </div>
              )}
              {metrics.atRiskCustomers > 20 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Heart className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="font-semibold">Ativar reativação</p>
                    <p className="text-xs text-muted-foreground">{metrics.atRiskCustomers} clientes em risco</p>
                  </div>
                </div>
              )}
              {metrics.dailyNeeded > metrics.dailyAvg * 1.3 && metrics.meta1Progress < 100 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Sparkles className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-semibold">Acelerar vendas</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(metrics.dailyNeeded)}/dia para meta</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
