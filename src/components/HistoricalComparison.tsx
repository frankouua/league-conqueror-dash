import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  DollarSign,
  BarChart3,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts";

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const FULL_MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface MonthlyData {
  month: number;
  year: number;
  revenue: number;
  executed: number;
  quantity: number;
  avgTicket: number;
}

const HistoricalComparison = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [compareYear, setCompareYear] = useState(currentYear - 1);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

  // Fetch all revenue records
  const { data: revenueRecords = [], isLoading: loadingRevenue } = useQuery({
    queryKey: ["historical-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("date, amount, department")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all executed records
  const { data: executedRecords = [], isLoading: loadingExecuted } = useQuery({
    queryKey: ["historical-executed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executed_records")
        .select("date, amount, department")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Process data by month and year
  const monthlyData = useMemo(() => {
    const dataMap = new Map<string, MonthlyData>();
    
    // Process revenue
    revenueRecords.forEach(record => {
      const date = new Date(record.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      
      if (!dataMap.has(key)) {
        dataMap.set(key, { month, year, revenue: 0, executed: 0, quantity: 0, avgTicket: 0 });
      }
      const data = dataMap.get(key)!;
      data.revenue += record.amount;
      data.quantity += 1;
    });
    
    // Process executed
    executedRecords.forEach(record => {
      const date = new Date(record.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      
      if (!dataMap.has(key)) {
        dataMap.set(key, { month, year, revenue: 0, executed: 0, quantity: 0, avgTicket: 0 });
      }
      const data = dataMap.get(key)!;
      data.executed += record.amount;
    });
    
    // Calculate average ticket
    dataMap.forEach(data => {
      data.avgTicket = data.quantity > 0 ? data.revenue / data.quantity : 0;
    });
    
    return dataMap;
  }, [revenueRecords, executedRecords]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    monthlyData.forEach(data => years.add(data.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthlyData]);

  // Compare current year with selected year
  const comparisonData = useMemo(() => {
    const result = [];
    const monthsToShow = selectedMonth === 'all' ? 12 : 1;
    const startMonth = selectedMonth === 'all' ? 1 : selectedMonth;
    const endMonth = selectedMonth === 'all' ? currentMonth : selectedMonth;
    
    for (let m = startMonth; m <= endMonth; m++) {
      const currentData = monthlyData.get(`${currentYear}-${m}`) || { revenue: 0, executed: 0, quantity: 0, avgTicket: 0 };
      const compareData = monthlyData.get(`${compareYear}-${m}`) || { revenue: 0, executed: 0, quantity: 0, avgTicket: 0 };
      
      const revenueGrowth = compareData.revenue > 0 
        ? ((currentData.revenue - compareData.revenue) / compareData.revenue) * 100 
        : 0;
      const executedGrowth = compareData.executed > 0 
        ? ((currentData.executed - compareData.executed) / compareData.executed) * 100 
        : 0;
      const quantityGrowth = compareData.quantity > 0 
        ? ((currentData.quantity - compareData.quantity) / compareData.quantity) * 100 
        : 0;
      const ticketGrowth = compareData.avgTicket > 0 
        ? ((currentData.avgTicket - compareData.avgTicket) / compareData.avgTicket) * 100 
        : 0;
      
      result.push({
        month: m,
        monthName: MONTHS[m - 1],
        fullMonthName: FULL_MONTHS[m - 1],
        currentRevenue: currentData.revenue,
        compareRevenue: compareData.revenue,
        currentExecuted: currentData.executed,
        compareExecuted: compareData.executed,
        currentQuantity: currentData.quantity,
        compareQuantity: compareData.quantity,
        currentAvgTicket: currentData.avgTicket,
        compareAvgTicket: compareData.avgTicket,
        revenueGrowth,
        executedGrowth,
        quantityGrowth,
        ticketGrowth,
      });
    }
    
    return result;
  }, [monthlyData, currentYear, compareYear, selectedMonth, currentMonth]);

  // Calculate totals
  const totals = useMemo(() => {
    const current = comparisonData.reduce((acc, d) => ({
      revenue: acc.revenue + d.currentRevenue,
      executed: acc.executed + d.currentExecuted,
      quantity: acc.quantity + d.currentQuantity,
    }), { revenue: 0, executed: 0, quantity: 0 });
    
    const compare = comparisonData.reduce((acc, d) => ({
      revenue: acc.revenue + d.compareRevenue,
      executed: acc.executed + d.compareExecuted,
      quantity: acc.quantity + d.compareQuantity,
    }), { revenue: 0, executed: 0, quantity: 0 });
    
    return {
      current,
      compare,
      growth: {
        revenue: compare.revenue > 0 ? ((current.revenue - compare.revenue) / compare.revenue) * 100 : 0,
        executed: compare.executed > 0 ? ((current.executed - compare.executed) / compare.executed) * 100 : 0,
        quantity: compare.quantity > 0 ? ((current.quantity - compare.quantity) / compare.quantity) * 100 : 0,
        avgTicket: compare.quantity > 0 && current.quantity > 0
          ? (((current.revenue / current.quantity) - (compare.revenue / compare.quantity)) / (compare.revenue / compare.quantity)) * 100
          : 0,
      }
    };
  }, [comparisonData]);

  const formatCurrency = (value: number) => `R$ ${(value / 1000).toFixed(0)}k`;
  const formatFullCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const GrowthBadge = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 gap-1">
          <ArrowUpRight className="w-3 h-3" />
          +{value.toFixed(1)}%
        </Badge>
      );
    } else if (value < 0) {
      return (
        <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 gap-1">
          <ArrowDownRight className="w-3 h-3" />
          {value.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="w-3 h-3" />
        0%
      </Badge>
    );
  };

  if (loadingRevenue || loadingExecuted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Análise Comparativa
              </CardTitle>
              <CardDescription>
                Compare o desempenho de {currentYear} com anos anteriores
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={String(compareYear)} onValueChange={(v) => setCompareYear(Number(v))}>
                <SelectTrigger className="w-32">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.filter(y => y < currentYear).map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(v === 'all' ? 'all' : Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Meses</SelectItem>
                  {FULL_MONTHS.slice(0, currentMonth).map((month, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <GrowthBadge value={totals.growth.revenue} />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.current.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              Vendido em {currentYear}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vs {formatCurrency(totals.compare.revenue)} em {compareYear}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-blue-500" />
              <GrowthBadge value={totals.growth.executed} />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totals.current.executed)}</p>
            <p className="text-xs text-muted-foreground">
              Executado em {currentYear}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vs {formatCurrency(totals.compare.executed)} em {compareYear}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-purple-500" />
              <GrowthBadge value={totals.growth.quantity} />
            </div>
            <p className="text-2xl font-bold">{totals.current.quantity.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground">
              Vendas em {currentYear}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vs {totals.compare.quantity.toLocaleString('pt-BR')} em {compareYear}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              <GrowthBadge value={totals.growth.avgTicket} />
            </div>
            <p className="text-2xl font-bold">
              {totals.current.quantity > 0 
                ? formatFullCurrency(totals.current.revenue / totals.current.quantity)
                : 'R$ 0'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Ticket Médio {currentYear}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vs {totals.compare.quantity > 0 
                ? formatFullCurrency(totals.compare.revenue / totals.compare.quantity)
                : 'R$ 0'
              } em {compareYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="executed">Executado</TabsTrigger>
          <TabsTrigger value="quantity">Quantidade</TabsTrigger>
          <TabsTrigger value="ticket">Ticket Médio</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comparativo de Receita Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => formatFullCurrency(value)}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    <Bar dataKey="compareRevenue" name={`${compareYear}`} fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="currentRevenue" name={`${currentYear}`} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="revenueGrowth" name="Crescimento %" stroke="hsl(150, 60%, 45%)" yAxisId="right" strokeWidth={2} dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executed">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comparativo de Executado Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => formatFullCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="compareExecuted" name={`${compareYear}`} fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="currentExecuted" name={`${currentYear}`} fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quantity">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comparativo de Quantidade de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="compareQuantity" name={`${compareYear}`} fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="currentQuantity" name={`${currentYear}`} fill="hsl(280, 60%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ticket">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Evolução do Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => formatFullCurrency(value)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="compareAvgTicket" name={`${compareYear}`} stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="currentAvgTicket" name={`${currentYear}`} stroke="hsl(30, 80%, 55%)" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Monthly Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Mês</th>
                  <th className="text-right py-2 px-2">Vendido {currentYear}</th>
                  <th className="text-right py-2 px-2">Vendido {compareYear}</th>
                  <th className="text-right py-2 px-2">Variação</th>
                  <th className="text-right py-2 px-2">Qtd {currentYear}</th>
                  <th className="text-right py-2 px-2">Qtd {compareYear}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{row.fullMonthName}</td>
                    <td className="text-right py-2 px-2">{formatFullCurrency(row.currentRevenue)}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{formatFullCurrency(row.compareRevenue)}</td>
                    <td className="text-right py-2 px-2">
                      <GrowthBadge value={row.revenueGrowth} />
                    </td>
                    <td className="text-right py-2 px-2">{row.currentQuantity}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{row.compareQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Insights Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {totals.growth.revenue > 0 ? (
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>
                <strong className="text-emerald-500">Crescimento!</strong> A receita cresceu {totals.growth.revenue.toFixed(1)}% 
                comparado ao mesmo período de {compareYear}.
              </span>
            </p>
          ) : totals.growth.revenue < 0 ? (
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>
                <strong className="text-rose-500">Atenção!</strong> A receita caiu {Math.abs(totals.growth.revenue).toFixed(1)}% 
                comparado ao mesmo período de {compareYear}.
              </span>
            </p>
          ) : null}
          
          {totals.growth.avgTicket > 5 && (
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>
                <strong className="text-amber-500">Ticket Médio Subiu!</strong> O valor médio por venda aumentou {totals.growth.avgTicket.toFixed(1)}%.
              </span>
            </p>
          )}
          
          {totals.growth.quantity > 10 && (
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>
                <strong className="text-blue-500">Mais Vendas!</strong> O volume de vendas cresceu {totals.growth.quantity.toFixed(1)}%.
              </span>
            </p>
          )}

          {/* Best month insight */}
          {comparisonData.length > 1 && (() => {
            const bestMonth = comparisonData.reduce((best, curr) => 
              curr.currentRevenue > best.currentRevenue ? curr : best
            );
            return (
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span>
                  <strong className="text-primary">Melhor mês:</strong> {bestMonth.fullMonthName} com {formatFullCurrency(bestMonth.currentRevenue)} em vendas.
                </span>
              </p>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalComparison;