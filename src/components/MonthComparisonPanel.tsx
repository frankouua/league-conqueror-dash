import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface MonthComparisonPanelProps {
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

const MonthComparisonPanel = ({ currentMonth, currentYear }: MonthComparisonPanelProps) => {
  // Visão global: todas as vendedoras enxergam todos os dados (exceto “Minhas Metas”)

  // Generate last 6 months for comparison
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

  // Fetch revenue data for all months
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["month-comparison", currentMonth, currentYear],
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

        const { data, error } = await supabase
          .from("revenue_records")
          .select("amount")
          .gte("date", startDate)
          .lte("date", endDate);

        if (error) {
          console.error("Error fetching revenue:", error);
          continue;
        }

        const revenue = (data || []).reduce((sum, r) => sum + Number(r.amount), 0);
        const count = data?.length || 0;
        const avgTicket = count > 0 ? revenue / count : 0;

        results.push({ month, year, revenue, count, avgTicket });
      }

      return results;
    },
  });

  // Fetch referral data
  const { data: referralData } = useQuery({
    queryKey: ["month-comparison-referrals", currentMonth, currentYear],
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

    // Trend calculation (is it accelerating or decelerating?)
    let trend: "accelerating" | "stable" | "decelerating" = "stable";
    if (twoMonthsAgo) {
      const prevGrowth = twoMonthsAgo.revenue > 0
        ? ((previous.revenue - twoMonthsAgo.revenue) / twoMonthsAgo.revenue) * 100
        : 0;
      if (momGrowth > prevGrowth + 5) trend = "accelerating";
      else if (momGrowth < prevGrowth - 5) trend = "decelerating";
    }

    // Best and worst months
    const sortedByRevenue = [...revenueData].sort((a, b) => b.revenue - a.revenue);
    const bestMonth = sortedByRevenue[0];
    const worstMonth = sortedByRevenue[sortedByRevenue.length - 1];

    return {
      current,
      previous,
      momGrowth,
      avgRevenue,
      vsAvg,
      trend,
      bestMonth,
      worstMonth,
    };
  }, [revenueData]);

  // Chart data
  const chartData = useMemo(() => {
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
        conversions: referral?.converted || 0,
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

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-64 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-gradient-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span>Comparativo Mês-a-Mês</span>
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
            {/* MoM Growth */}
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

            {/* Trend */}
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

            {/* Best Month */}
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

            {/* vs Average */}
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

        {/* Revenue Evolution Chart */}
        <div className="h-64">
          <p className="text-sm font-medium text-muted-foreground mb-2">Evolução do Faturamento</p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
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
                labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Bars */}
        <div className="h-48">
          <p className="text-sm font-medium text-muted-foreground mb-2">Vendas x Indicações</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Nº Vendas" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="referrals" 
                name="Indicações" 
                fill="hsl(var(--info))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
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
              {chartData.map((row, index) => {
                const prevRow = index > 0 ? chartData[index - 1] : null;
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
      </CardContent>
    </Card>
  );
};

export default MonthComparisonPanel;
