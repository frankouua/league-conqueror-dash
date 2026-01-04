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
import { TrendingUp, DollarSign, Target, Users, Calendar } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricalTrendsPanelProps {
  currentMonth: number;
  currentYear: number;
}

export function HistoricalTrendsPanel({ currentMonth, currentYear }: HistoricalTrendsPanelProps) {
  // Generate last 6 months range
  const monthsRange = useMemo(() => {
    const currentDate = new Date(currentYear, currentMonth - 1, 1);
    return eachMonthOfInterval({
      start: subMonths(currentDate, 5),
      end: currentDate,
    });
  }, [currentMonth, currentYear]);

  // Fetch all revenue records for historical analysis
  const { data: revenueRecords } = useQuery({
    queryKey: ["historical-revenue"],
    queryFn: async () => {
      const startDate = format(monthsRange[0], "yyyy-MM-dd");
      const endDate = format(endOfMonth(monthsRange[monthsRange.length - 1]), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount, date, department")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all executed records
  const { data: executedRecords } = useQuery({
    queryKey: ["historical-executed"],
    queryFn: async () => {
      const startDate = format(monthsRange[0], "yyyy-MM-dd");
      const endDate = format(endOfMonth(monthsRange[monthsRange.length - 1]), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("executed_records")
        .select("amount, date, department")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch predefined goals for all months
  const { data: goals } = useQuery({
    queryKey: ["historical-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predefined_goals")
        .select("month, year, meta1_goal, meta2_goal, meta3_goal");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch NPS records
  const { data: npsRecords } = useQuery({
    queryKey: ["historical-nps"],
    queryFn: async () => {
      const startDate = format(monthsRange[0], "yyyy-MM-dd");
      const endDate = format(endOfMonth(monthsRange[monthsRange.length - 1]), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("nps_records")
        .select("score, date")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch referral records
  const { data: referralRecords } = useQuery({
    queryKey: ["historical-referrals"],
    queryFn: async () => {
      const startDate = format(monthsRange[0], "yyyy-MM-dd");
      const endDate = format(endOfMonth(monthsRange[monthsRange.length - 1]), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("referral_records")
        .select("collected, to_consultation, to_surgery, date")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(value);

  // Build revenue vs executed data
  const revenueVsExecutedData = useMemo(() => {
    return monthsRange.map((monthDate) => {
      const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });
      const m = monthDate.getMonth() + 1;
      const y = monthDate.getFullYear();

      const monthRevenue = revenueRecords
        ?.filter((r) => r.date >= monthStart && r.date <= monthEnd)
        .reduce((sum, r) => sum + Number(r.amount), 0) || 0;

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
  }, [monthsRange, revenueRecords, executedRecords, goals]);

  // Build goal achievement data
  const goalAchievementData = useMemo(() => {
    return monthsRange.map((monthDate) => {
      const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });
      const m = monthDate.getMonth() + 1;
      const y = monthDate.getFullYear();

      const monthRevenue = revenueRecords
        ?.filter((r) => r.date >= monthStart && r.date <= monthEnd)
        .reduce((sum, r) => sum + Number(r.amount), 0) || 0;

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
  }, [monthsRange, revenueRecords, goals]);

  // Build quality metrics data (NPS, referrals)
  const qualityMetricsData = useMemo(() => {
    return monthsRange.map((monthDate) => {
      const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const monthLabel = format(monthDate, "MMM/yy", { locale: ptBR });

      const monthNps = npsRecords?.filter((r) => r.date >= monthStart && r.date <= monthEnd) || [];
      const avgNps = monthNps.length > 0 
        ? Math.round(monthNps.reduce((sum, n) => sum + n.score, 0) / monthNps.length) 
        : 0;

      const monthReferrals = referralRecords?.filter((r) => r.date >= monthStart && r.date <= monthEnd) || [];
      const totalReferrals = monthReferrals.reduce(
        (sum, r) => sum + r.collected + r.to_consultation + r.to_surgery, 0
      );

      return {
        month: monthLabel,
        nps: avgNps,
        indicacoes: totalReferrals,
        npsCount: monthNps.length,
      };
    });
  }, [monthsRange, npsRecords, referralRecords]);

  // Calculate trends
  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return 0;
    const lastValue = data[data.length - 1];
    const previousValue = data[data.length - 2];
    if (previousValue === 0) return 0;
    return ((lastValue - previousValue) / previousValue) * 100;
  };

  const revenueTrend = calculateTrend(revenueVsExecutedData.map(d => d.vendido));
  const executedTrend = calculateTrend(revenueVsExecutedData.map(d => d.executado));

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolução Histórica
          <Badge variant="outline" className="ml-auto">
            Últimos 6 meses
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="revenue" className="text-xs sm:text-sm gap-1">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Vendido vs Executado</span>
              <span className="sm:hidden">Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm gap-1">
              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Atingimento de Metas</span>
              <span className="sm:hidden">Metas</span>
            </TabsTrigger>
            <TabsTrigger value="quality" className="text-xs sm:text-sm gap-1">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Qualidade</span>
              <span className="sm:hidden">NPS</span>
            </TabsTrigger>
          </TabsList>

          {/* Revenue vs Executed Chart */}
          <TabsContent value="revenue" className="space-y-4">
            {/* Trend Indicators */}
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
                    tickFormatter={(v) => formatCurrency(v)} 
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

          {/* Goal Achievement Chart */}
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
                  {/* 100% reference line */}
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
            
            {/* Legend explanation */}
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

          {/* Quality Metrics Chart */}
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
}
