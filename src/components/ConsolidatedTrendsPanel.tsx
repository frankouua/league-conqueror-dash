import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Target,
  Users,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConsolidatedTrendsPanelProps {
  currentMonth: number;
  currentYear: number;
}

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const MONTH_NAMES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const ConsolidatedTrendsPanel = ({ currentMonth, currentYear }: ConsolidatedTrendsPanelProps) => {
  // Generate last 6 months range
  const monthsRange = useMemo(() => {
    const currentDate = new Date(currentYear, currentMonth - 1, 1);
    return eachMonthOfInterval({
      start: subMonths(currentDate, 5),
      end: currentDate,
    });
  }, [currentMonth, currentYear]);

  // Generate months to fetch
  const monthsToFetch = useMemo(() => {
    const months: { month: number; year: number }[] = [];
    for (let i = 0; i < 6; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      months.push({ month: m, year: y });
    }
    return months.reverse();
  }, [currentMonth, currentYear]);

  // Fetch revenue data for comparison
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["consolidated-trends-revenue", currentMonth, currentYear],
    queryFn: async () => {
      const results: {
        month: number;
        year: number;
        revenue: number;
        count: number;
        avgTicket: number;
      }[] = [];

      for (const { month, year } of monthsToFetch) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

        const { data } = await supabase
          .from("revenue_records")
          .select("amount")
          .gte("date", startDate)
          .lte("date", endDate);

        const revenue = (data || []).reduce((sum, r) => sum + Number(r.amount), 0);
        const count = data?.length || 0;
        const avgTicket = count > 0 ? revenue / count : 0;

        results.push({ month, year, revenue, count, avgTicket });
      }

      return results;
    },
  });

  // Fetch executed records
  const { data: executedRecords } = useQuery({
    queryKey: ["consolidated-trends-executed", currentMonth, currentYear],
    queryFn: async () => {
      const startDate = format(monthsRange[0], "yyyy-MM-dd");
      const endDate = format(endOfMonth(monthsRange[monthsRange.length - 1]), "yyyy-MM-dd");
      
      const { data } = await supabase
        .from("executed_records")
        .select("amount, date")
        .gte("date", startDate)
        .lte("date", endDate);
      return data || [];
    },
  });

  // Fetch predefined goals
  const { data: goals } = useQuery({
    queryKey: ["consolidated-trends-goals", currentMonth, currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("predefined_goals")
        .select("month, year, meta1_goal, meta2_goal, meta3_goal");
      return data || [];
    },
  });

  // Fetch referral data
  const { data: referralData } = useQuery({
    queryKey: ["consolidated-trends-referrals", currentMonth, currentYear],
    queryFn: async () => {
      const results: { month: number; year: number; collected: number; converted: number }[] = [];

      for (const { month, year } of monthsToFetch) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

        const { data } = await supabase
          .from("referral_records")
          .select("collected, to_surgery")
          .gte("date", startDate)
          .lte("date", endDate);

        const collected = (data || []).reduce((sum, r) => sum + Number(r.collected), 0);
        const converted = (data || []).reduce((sum, r) => sum + Number(r.to_surgery), 0);

        results.push({ month, year, collected, converted });
      }

      return results;
    },
  });

  // Fetch NPS records
  const { data: npsRecords } = useQuery({
    queryKey: ["consolidated-trends-nps", currentMonth, currentYear],
    queryFn: async () => {
      const startDate = format(monthsRange[0], "yyyy-MM-dd");
      const endDate = format(endOfMonth(monthsRange[monthsRange.length - 1]), "yyyy-MM-dd");
      
      const { data } = await supabase
        .from("nps_records")
        .select("score, date")
        .gte("date", startDate)
        .lte("date", endDate);
      return data || [];
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
    return value.toFixed(0);
  };

  // Calculate metrics and trends
  const metrics = useMemo(() => {
    if (!revenueData || revenueData.length < 2) return null;

    const current = revenueData[revenueData.length - 1];
    const previous = revenueData[revenueData.length - 2];
    const twoMonthsAgo = revenueData.length >= 3 ? revenueData[revenueData.length - 3] : null;

    const momGrowth = previous.revenue > 0
      ? ((current.revenue - previous.revenue) / previous.revenue) * 100
      : 0;

    const avgRevenue = revenueData.reduce((sum, r) => sum + r.revenue, 0) / revenueData.length;
    const vsAvg = avgRevenue > 0 ? ((current.revenue - avgRevenue) / avgRevenue) * 100 : 0;

    let trend: "accelerating" | "stable" | "decelerating" = "stable";
    if (twoMonthsAgo) {
      const prevGrowth = twoMonthsAgo.revenue > 0
        ? ((previous.revenue - twoMonthsAgo.revenue) / twoMonthsAgo.revenue) * 100
        : 0;
      if (momGrowth > prevGrowth + 5) trend = "accelerating";
      else if (momGrowth < prevGrowth - 5) trend = "decelerating";
    }

    const sortedByRevenue = [...revenueData].sort((a, b) => b.revenue - a.revenue);
    const bestMonth = sortedByRevenue[0];

    return {
      current,
      previous,
      momGrowth,
      avgRevenue,
      vsAvg,
      trend,
      bestMonth,
    };
  }, [revenueData]);

  // Revenue vs Executed chart data
  const revenueVsExecutedData = useMemo(() => {
    return monthsRange.map((monthDate) => {
      const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });
      const m = monthDate.getMonth() + 1;
      const y = monthDate.getFullYear();

      const monthRevenue = revenueData
        ?.find(r => r.month === m && r.year === y)?.revenue || 0;

      const monthExecuted = executedRecords
        ?.filter((r) => r.date >= monthStart && r.date <= monthEnd)
        .reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      const monthGoals = goals?.filter((g) => g.month === m && g.year === y) || [];
      const totalMeta1 = monthGoals.reduce((sum, g) => sum + Number(g.meta1_goal), 0);

      return {
        month: monthLabel,
        vendido: monthRevenue,
        executado: monthExecuted,
        meta1: totalMeta1,
      };
    });
  }, [monthsRange, revenueData, executedRecords, goals]);

  // Goal achievement data
  const goalAchievementData = useMemo(() => {
    return monthsRange.map((monthDate) => {
      const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });
      const m = monthDate.getMonth() + 1;
      const y = monthDate.getFullYear();

      const monthRevenue = revenueData
        ?.find(r => r.month === m && r.year === y)?.revenue || 0;

      const monthGoals = goals?.filter((g) => g.month === m && g.year === y) || [];
      const totalMeta1 = monthGoals.reduce((sum, g) => sum + Number(g.meta1_goal), 0);
      const totalMeta2 = monthGoals.reduce((sum, g) => sum + Number(g.meta2_goal), 0);
      const totalMeta3 = monthGoals.reduce((sum, g) => sum + Number(g.meta3_goal), 0);

      const percentMeta1 = totalMeta1 > 0 ? (monthRevenue / totalMeta1) * 100 : 0;
      const percentMeta2 = totalMeta2 > 0 ? (monthRevenue / totalMeta2) * 100 : 0;
      const percentMeta3 = totalMeta3 > 0 ? (monthRevenue / totalMeta3) * 100 : 0;

      return {
        month: monthLabel,
        percentMeta1: Math.round(percentMeta1),
        percentMeta2: Math.round(percentMeta2),
        percentMeta3: Math.round(percentMeta3),
      };
    });
  }, [monthsRange, revenueData, goals]);

  // Quality metrics data
  const qualityMetricsData = useMemo(() => {
    return monthsRange.map((monthDate) => {
      const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });
      const m = monthDate.getMonth() + 1;
      const y = monthDate.getFullYear();

      const monthNps = npsRecords?.filter((r) => r.date >= monthStart && r.date <= monthEnd) || [];
      const avgNps = monthNps.length > 0 
        ? Math.round(monthNps.reduce((sum, n) => sum + n.score, 0) / monthNps.length) 
        : 0;

      const referral = referralData?.find(ref => ref.month === m && ref.year === y);
      const totalReferrals = referral ? referral.collected + referral.converted : 0;

      return {
        month: monthLabel,
        nps: avgNps,
        indicacoes: totalReferrals,
      };
    });
  }, [monthsRange, npsRecords, referralData]);

  // Comparison chart data
  const comparisonChartData = useMemo(() => {
    if (!revenueData) return [];

    return revenueData.map((r, index) => {
      const referral = referralData?.find(ref => ref.month === r.month && ref.year === r.year);
      return {
        name: `${MONTH_NAMES[r.month - 1]}/${String(r.year).slice(2)}`,
        fullName: `${MONTH_NAMES_FULL[r.month - 1]} ${r.year}`,
        revenue: r.revenue,
        count: r.count,
        avgTicket: r.avgTicket,
        referrals: referral?.collected || 0,
        isCurrent: index === revenueData.length - 1,
      };
    });
  }, [revenueData, referralData]);

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-success";
    if (value < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  // Calculate trends
  const revenueTrend = useMemo(() => {
    const data = revenueVsExecutedData.map(d => d.vendido);
    if (data.length < 2) return 0;
    const lastValue = data[data.length - 1];
    const previousValue = data[data.length - 2];
    if (previousValue === 0) return 0;
    return ((lastValue - previousValue) / previousValue) * 100;
  }, [revenueVsExecutedData]);

  const executedTrend = useMemo(() => {
    const data = revenueVsExecutedData.map(d => d.executado);
    if (data.length < 2) return 0;
    const lastValue = data[data.length - 1];
    const previousValue = data[data.length - 2];
    if (previousValue === 0) return 0;
    return ((lastValue - previousValue) / previousValue) * 100;
  }, [revenueVsExecutedData]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-96 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span>Análise de Tendências</span>
          </div>
          <Badge variant="outline" className="gap-1">
            <Calendar className="w-3 h-3" />
            Últimos 6 meses
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${metrics.momGrowth >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                {metrics.momGrowth >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                )}
                <span className="text-xs text-muted-foreground">vs. Mês Anterior</span>
              </div>
              <p className={`text-2xl font-bold ${getTrendColor(metrics.momGrowth)}`}>
                {metrics.momGrowth >= 0 ? "+" : ""}{metrics.momGrowth.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(metrics.current.revenue)} vs {formatCurrency(metrics.previous.revenue)}
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                {metrics.trend === "accelerating" && <TrendingUp className="w-4 h-4 text-success" />}
                {metrics.trend === "decelerating" && <TrendingDown className="w-4 h-4 text-destructive" />}
                {metrics.trend === "stable" && <Minus className="w-4 h-4 text-info" />}
                <span className="text-xs text-muted-foreground">Tendência</span>
              </div>
              <p className={`text-lg font-bold ${
                metrics.trend === "accelerating" ? "text-success" :
                metrics.trend === "decelerating" ? "text-destructive" : "text-info"
              }`}>
                {metrics.trend === "accelerating" && "Acelerando"}
                {metrics.trend === "decelerating" && "Desacelerando"}
                {metrics.trend === "stable" && "Estável"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Média: {formatCurrency(metrics.avgRevenue)}
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-primary/10 border-primary/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Melhor Mês</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {MONTH_NAMES_FULL[metrics.bestMonth.month - 1]}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(metrics.bestMonth.revenue)}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${metrics.vsAvg >= 0 ? "bg-info/10 border-info/30" : "bg-muted/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                {getTrendIcon(metrics.vsAvg)}
                <span className="text-xs text-muted-foreground">vs. Média 6 Meses</span>
              </div>
              <p className={`text-2xl font-bold ${getTrendColor(metrics.vsAvg)}`}>
                {metrics.vsAvg >= 0 ? "+" : ""}{metrics.vsAvg.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.vsAvg >= 0 ? "Acima" : "Abaixo"} da média
              </p>
            </div>
          </div>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 gap-1">
            <TabsTrigger value="comparison" className="text-xs sm:text-sm gap-1">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Comparativo</span>
              <span className="sm:hidden">Comp.</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs sm:text-sm gap-1">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Vendido vs Executado</span>
              <span className="sm:hidden">V x E</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm gap-1">
              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Atingimento</span>
              <span className="sm:hidden">Metas</span>
            </TabsTrigger>
            <TabsTrigger value="quality" className="text-xs sm:text-sm gap-1">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Qualidade</span>
              <span className="sm:hidden">NPS</span>
            </TabsTrigger>
          </TabsList>

          {/* Comparison Tab - Monthly Table and Chart */}
          <TabsContent value="comparison" className="space-y-4">
            {/* Revenue Evolution Chart */}
            <div className="h-64">
              <p className="text-sm font-medium text-muted-foreground mb-2">Evolução do Faturamento</p>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={comparisonChartData}>
                  <defs>
                    <linearGradient id="revenueGradientConsolidated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickFormatter={(value) => formatCompact(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                    labelFormatter={(label) => comparisonChartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradientConsolidated)"
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Mês</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Faturamento</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Vendas</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Ticket Médio</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonChartData.map((row, index) => {
                    const prevRow = index > 0 ? comparisonChartData[index - 1] : null;
                    const variation = prevRow && prevRow.revenue > 0
                      ? ((row.revenue - prevRow.revenue) / prevRow.revenue) * 100
                      : 0;

                    return (
                      <tr 
                        key={row.name} 
                        className={`border-b border-border/50 ${row.isCurrent ? "bg-primary/5" : ""}`}
                      >
                        <td className="py-2 font-medium">
                          {row.fullName}
                          {row.isCurrent && (
                            <Badge variant="outline" className="ml-2 text-xs">Atual</Badge>
                          )}
                        </td>
                        <td className="py-2 text-right font-bold">{formatCurrency(row.revenue)}</td>
                        <td className="py-2 text-right">{row.count}</td>
                        <td className="py-2 text-right">{formatCurrency(row.avgTicket)}</td>
                        <td className={`py-2 text-right font-medium flex items-center justify-end gap-1 ${getTrendColor(variation)}`}>
                          {index > 0 && (
                            <>
                              {getTrendIcon(variation)}
                              {variation >= 0 ? "+" : ""}{variation.toFixed(1)}%
                            </>
                          )}
                          {index === 0 && <span className="text-muted-foreground">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Revenue vs Executed Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600 dark:text-blue-400">Tendência Vendas</span>
                  <Badge className={revenueTrend >= 0 ? "bg-green-500" : "bg-red-500"}>
                    {revenueTrend >= 0 ? "+" : ""}{revenueTrend.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600 dark:text-green-400">Tendência Executado</span>
                  <Badge className={executedTrend >= 0 ? "bg-green-500" : "bg-red-500"}>
                    {executedTrend >= 0 ? "+" : ""}{executedTrend.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueVsExecutedData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tickFormatter={(v) => formatCompact(v)} 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="meta1"
                    name="Meta 1"
                    fill="hsl(var(--muted))"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    fillOpacity={0.3}
                  />
                  <Bar dataKey="vendido" name="Vendido" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="executado" name="Executado" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Goal Achievement Tab */}
          <TabsContent value="goals" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={goalAchievementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tickFormatter={(v) => `${v}%`} 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={() => 100}
                    name="Meta 100%"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentMeta1"
                    name="% Meta 1"
                    stroke="hsl(45 93% 47%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(45 93% 47%)", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentMeta2"
                    name="% Meta 2"
                    stroke="hsl(217 91% 60%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(217 91% 60%)", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentMeta3"
                    name="% Meta 3"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142 76% 36%)", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                Meta 1 (Bronze)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Meta 2 (Prata)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                Meta 3 (Ouro)
              </span>
            </div>
          </TabsContent>

          {/* Quality Metrics Tab */}
          <TabsContent value="quality" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={qualityMetricsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    yAxisId="left"
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    domain={[0, 10]}
                    label={{ value: 'NPS', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Indicações', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="right"
                    dataKey="indicacoes" 
                    name="Indicações" 
                    fill="hsl(280 67% 52%)" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="nps"
                    name="NPS Médio"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={3}
                    dot={{ fill: "hsl(142 76% 36%)", r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {qualityMetricsData.length > 0 
                    ? Math.round(qualityMetricsData.reduce((sum, d) => sum + d.nps, 0) / qualityMetricsData.filter(d => d.nps > 0).length || 0)
                    : 0}
                </div>
                <div className="text-xs text-muted-foreground">NPS Médio Período</div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {qualityMetricsData.reduce((sum, d) => sum + d.indicacoes, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Indicações</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ConsolidatedTrendsPanel;
