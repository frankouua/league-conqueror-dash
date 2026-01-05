import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  Activity,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Building2,
  PieChart,
  Zap,
  Award,
  Sun,
  Snowflake,
  Leaf,
  Flower2
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
  AreaChart,
  PieChart as RechartsPie,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
} from "recharts";

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const FULL_MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DEPARTMENT_COLORS: Record<string, string> = {
  "01 - CIRURGIA PLÁSTICA": "#8b5cf6",
  "02 - CONSULTA CIRURGIA PLÁSTICA": "#06b6d4",
  "03 - PÓS OPERATÓRIO": "#10b981",
  "04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS": "#f59e0b",
  "08 - HARMONIZAÇÃO FACIAL E CORPORAL": "#ec4899",
  "09 - SPA E ESTÉTICA": "#6366f1",
  "12 - PROTOCOLOS NUTRICIONAIS": "#84cc16",
  "21 - PRODUTOS LUXSKIN": "#f97316",
  "25 - UNIQUE TRAVEL EXPERIENCE": "#14b8a6",
};

const DEPARTMENT_SHORT_NAMES: Record<string, string> = {
  "01 - CIRURGIA PLÁSTICA": "Cirurgia Plástica",
  "02 - CONSULTA CIRURGIA PLÁSTICA": "Consultas",
  "03 - PÓS OPERATÓRIO": "Pós-Op",
  "04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS": "Soroterapia",
  "08 - HARMONIZAÇÃO FACIAL E CORPORAL": "Harmonização",
  "09 - SPA E ESTÉTICA": "SPA/Estética",
  "12 - PROTOCOLOS NUTRICIONAIS": "Protocolos",
  "21 - PRODUTOS LUXSKIN": "LuxSkin",
  "25 - UNIQUE TRAVEL EXPERIENCE": "Travel",
};

interface MonthlyData {
  month: number;
  year: number;
  revenue: number;
  executed: number;
  quantity: number;
  avgTicket: number;
}

interface DepartmentData {
  department: string;
  revenue: number;
  executed: number;
  quantity: number;
}

const HistoricalComparison = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [compareYear, setCompareYear] = useState(currentYear - 1);
  const [viewMode, setViewMode] = useState<'overview' | 'departments' | 'seasonality' | 'insights'>('overview');

  // Fetch all revenue records
  const { data: revenueRecords = [], isLoading: loadingRevenue } = useQuery({
    queryKey: ["historical-revenue-full"],
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
    queryKey: ["historical-executed-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executed_records")
        .select("date, amount, department")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    revenueRecords.forEach(r => years.add(new Date(r.date).getFullYear()));
    executedRecords.forEach(r => years.add(new Date(r.date).getFullYear()));
    // Add 2026 for future tracking
    years.add(2026);
    return Array.from(years).sort((a, b) => b - a);
  }, [revenueRecords, executedRecords]);

  // Process data by month and year
  const monthlyData = useMemo(() => {
    const dataMap = new Map<string, MonthlyData>();
    
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
    
    dataMap.forEach(data => {
      data.avgTicket = data.quantity > 0 ? data.revenue / data.quantity : 0;
    });
    
    return dataMap;
  }, [revenueRecords, executedRecords]);

  // Process data by department and year
  const departmentData = useMemo(() => {
    const dataByYear = new Map<number, Map<string, DepartmentData>>();
    
    revenueRecords.forEach(record => {
      const year = new Date(record.date).getFullYear();
      const dept = record.department || 'Outros';
      
      if (!dataByYear.has(year)) {
        dataByYear.set(year, new Map());
      }
      const yearData = dataByYear.get(year)!;
      
      if (!yearData.has(dept)) {
        yearData.set(dept, { department: dept, revenue: 0, executed: 0, quantity: 0 });
      }
      yearData.get(dept)!.revenue += record.amount;
      yearData.get(dept)!.quantity += 1;
    });
    
    executedRecords.forEach(record => {
      const year = new Date(record.date).getFullYear();
      const dept = record.department || 'Outros';
      
      if (!dataByYear.has(year)) {
        dataByYear.set(year, new Map());
      }
      const yearData = dataByYear.get(year)!;
      
      if (!yearData.has(dept)) {
        yearData.set(dept, { department: dept, revenue: 0, executed: 0, quantity: 0 });
      }
      yearData.get(dept)!.executed += record.amount;
    });
    
    return dataByYear;
  }, [revenueRecords, executedRecords]);

  // Year totals
  const yearTotals = useMemo(() => {
    const totals: Record<number, { revenue: number; executed: number; quantity: number }> = {};
    
    monthlyData.forEach((data, key) => {
      const year = data.year;
      if (!totals[year]) {
        totals[year] = { revenue: 0, executed: 0, quantity: 0 };
      }
      totals[year].revenue += data.revenue;
      totals[year].executed += data.executed;
      totals[year].quantity += data.quantity;
    });
    
    return totals;
  }, [monthlyData]);

  // Comparison data for charts
  const comparisonChartData = useMemo(() => {
    const result = [];
    
    for (let m = 1; m <= 12; m++) {
      const data2024 = monthlyData.get(`2024-${m}`) || { revenue: 0, executed: 0 };
      const data2025 = monthlyData.get(`2025-${m}`) || { revenue: 0, executed: 0 };
      const data2026 = monthlyData.get(`2026-${m}`) || { revenue: 0, executed: 0 };
      
      const growth2425 = data2024.revenue > 0 
        ? ((data2025.revenue - data2024.revenue) / data2024.revenue) * 100 
        : 0;
      
      result.push({
        month: m,
        monthName: MONTHS[m - 1],
        fullMonthName: FULL_MONTHS[m - 1],
        revenue2024: data2024.revenue,
        revenue2025: data2025.revenue,
        revenue2026: data2026.revenue,
        executed2024: data2024.executed,
        executed2025: data2025.executed,
        executed2026: data2026.executed,
        growth2425,
      });
    }
    
    return result;
  }, [monthlyData]);

  // Department comparison data (including 2026)
  const departmentComparisonData = useMemo(() => {
    const dept2024 = departmentData.get(2024) || new Map();
    const dept2025 = departmentData.get(2025) || new Map();
    const dept2026 = departmentData.get(2026) || new Map();
    
    const allDepts = new Set([...dept2024.keys(), ...dept2025.keys(), ...dept2026.keys()]);
    
    return Array.from(allDepts).map(dept => {
      const d2024 = dept2024.get(dept) || { revenue: 0, executed: 0, quantity: 0 };
      const d2025 = dept2025.get(dept) || { revenue: 0, executed: 0, quantity: 0 };
      const d2026 = dept2026.get(dept) || { revenue: 0, executed: 0, quantity: 0 };
      
      const revenueGrowth = d2024.revenue > 0 
        ? ((d2025.revenue - d2024.revenue) / d2024.revenue) * 100 
        : d2025.revenue > 0 ? 100 : 0;
      
      const executedGrowth = d2024.executed > 0 
        ? ((d2025.executed - d2024.executed) / d2024.executed) * 100 
        : d2025.executed > 0 ? 100 : 0;
      
      const revenueGrowth2526 = d2025.revenue > 0 
        ? ((d2026.revenue - d2025.revenue) / d2025.revenue) * 100 
        : d2026.revenue > 0 ? 100 : 0;
      
      return {
        department: dept,
        shortName: DEPARTMENT_SHORT_NAMES[dept] || dept.slice(0, 15),
        color: DEPARTMENT_COLORS[dept] || "#94a3b8",
        revenue2024: d2024.revenue,
        revenue2025: d2025.revenue,
        revenue2026: d2026.revenue,
        executed2024: d2024.executed,
        executed2025: d2025.executed,
        executed2026: d2026.executed,
        revenueGrowth,
        executedGrowth,
        revenueGrowth2526,
      };
    }).sort((a, b) => b.revenue2025 - a.revenue2025);
  }, [departmentData]);

  // Seasonality analysis
  const seasonalityData = useMemo(() => {
    const quarters = [
      { name: 'Q1 (Jan-Mar)', months: [1, 2, 3], icon: Snowflake },
      { name: 'Q2 (Abr-Jun)', months: [4, 5, 6], icon: Flower2 },
      { name: 'Q3 (Jul-Set)', months: [7, 8, 9], icon: Sun },
      { name: 'Q4 (Out-Dez)', months: [10, 11, 12], icon: Leaf },
    ];
    
    return quarters.map(q => {
      let total2024 = 0, total2025 = 0, total2026 = 0;
      let exec2024 = 0, exec2025 = 0, exec2026 = 0;
      
      q.months.forEach(m => {
        const d2024 = monthlyData.get(`2024-${m}`);
        const d2025 = monthlyData.get(`2025-${m}`);
        const d2026 = monthlyData.get(`2026-${m}`);
        if (d2024) { total2024 += d2024.revenue; exec2024 += d2024.executed; }
        if (d2025) { total2025 += d2025.revenue; exec2025 += d2025.executed; }
        if (d2026) { total2026 += d2026.revenue; exec2026 += d2026.executed; }
      });
      
      const growth = total2024 > 0 ? ((total2025 - total2024) / total2024) * 100 : 0;
      const growth2526 = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0;
      
      return {
        ...q,
        revenue2024: total2024,
        revenue2025: total2025,
        revenue2026: total2026,
        executed2024: exec2024,
        executed2025: exec2025,
        executed2026: exec2026,
        growth,
        growth2526,
      };
    });
  }, [monthlyData]);

  // Strategic insights
  const insights = useMemo(() => {
    const result: Array<{ type: 'success' | 'warning' | 'info' | 'strategy'; title: string; description: string }> = [];
    
    // Year-over-year growth
    const rev2024 = yearTotals[2024]?.revenue || 0;
    const rev2025 = yearTotals[2025]?.revenue || 0;
    const yoyGrowth = rev2024 > 0 ? ((rev2025 - rev2024) / rev2024) * 100 : 0;
    
    if (yoyGrowth > 20) {
      result.push({
        type: 'success',
        title: `Crescimento Excepcional: +${yoyGrowth.toFixed(1)}%`,
        description: `De R$ ${(rev2024/1000000).toFixed(1)}M em 2024 para R$ ${(rev2025/1000000).toFixed(1)}M em 2025. Continue investindo nas estratégias que funcionaram!`
      });
    } else if (yoyGrowth > 0) {
      result.push({
        type: 'info',
        title: `Crescimento Moderado: +${yoyGrowth.toFixed(1)}%`,
        description: `O faturamento cresceu de R$ ${(rev2024/1000000).toFixed(1)}M para R$ ${(rev2025/1000000).toFixed(1)}M. Identifique oportunidades para acelerar.`
      });
    } else if (yoyGrowth < 0) {
      result.push({
        type: 'warning',
        title: `Queda no Faturamento: ${yoyGrowth.toFixed(1)}%`,
        description: `Atenção! O faturamento caiu de R$ ${(rev2024/1000000).toFixed(1)}M para R$ ${(rev2025/1000000).toFixed(1)}M. Analise as causas e tome ações corretivas.`
      });
    }
    
    // Best performing month
    if (comparisonChartData.length > 0) {
      const best2025 = comparisonChartData.reduce((best, curr) => 
        curr.revenue2025 > best.revenue2025 ? curr : best
      );
      if (best2025.revenue2025 > 0) {
        result.push({
          type: 'info',
          title: `Melhor Mês de 2025: ${best2025.fullMonthName}`,
          description: `Faturamento de R$ ${(best2025.revenue2025/1000000).toFixed(2)}M. Analise o que foi feito diferente neste mês para replicar.`
        });
      }
    
      // Worst performing month
      const filteredForWorst = comparisonChartData.filter(d => d.revenue2025 > 0);
      if (filteredForWorst.length > 0) {
        const worst2025 = filteredForWorst.reduce((worst, curr) => 
          curr.revenue2025 < worst.revenue2025 ? curr : worst
        );
        if (worst2025.revenue2025 > 0) {
          result.push({
            type: 'warning',
            title: `Mês de Atenção: ${worst2025.fullMonthName}`,
            description: `Menor faturamento: R$ ${(worst2025.revenue2025/1000000).toFixed(2)}M. Considere campanhas especiais para este período em 2026.`
          });
        }
      }
    }
    
    // Department insights
    const topDept = departmentComparisonData[0];
    if (topDept) {
      result.push({
        type: 'success',
        title: `Departamento Líder: ${topDept.shortName}`,
        description: `Representa ${((topDept.revenue2025 / (rev2025 || 1)) * 100).toFixed(1)}% do faturamento. ${topDept.revenueGrowth > 0 ? `Crescimento de +${topDept.revenueGrowth.toFixed(1)}%` : `Queda de ${topDept.revenueGrowth.toFixed(1)}%`} vs 2024.`
      });
    }
    
    // Growing departments
    const growingDepts = departmentComparisonData.filter(d => d.revenueGrowth > 50 && d.revenue2024 > 100000);
    growingDepts.forEach(d => {
      result.push({
        type: 'success',
        title: `${d.shortName} em Alta: +${d.revenueGrowth.toFixed(0)}%`,
        description: `Crescimento expressivo! De R$ ${(d.revenue2024/1000).toFixed(0)}k para R$ ${(d.revenue2025/1000).toFixed(0)}k. Considere investir mais nessa área.`
      });
    });
    
    // Seasonality strategies
    if (seasonalityData.length > 0) {
      const bestQuarter = seasonalityData.reduce((best, curr) => 
        curr.revenue2025 > best.revenue2025 ? curr : best
      );
      const worstQuarter = seasonalityData.reduce((worst, curr) => 
        curr.revenue2025 < worst.revenue2025 ? curr : worst
      );
      
      result.push({
        type: 'strategy',
        title: `Sazonalidade: ${bestQuarter.name} é o período mais forte`,
        description: `Prepare-se para o próximo ${bestQuarter.name} com estoque, equipe e campanhas. ${worstQuarter.name} precisa de estratégias especiais para atrair clientes.`
      });
    }
    
    // June strategy (typically weak)
    const june2025 = comparisonChartData.find(d => d.month === 6);
    if (june2025 && rev2025 > 0 && june2025.revenue2025 < rev2025 / 12) {
      result.push({
        type: 'strategy',
        title: 'Estratégia para Junho',
        description: 'Junho tradicionalmente tem faturamento abaixo da média. Considere promoções de inverno, pacotes especiais pré-férias ou campanhas de fidelização.'
      });
    }
    
    // Execution gap
    const execRate2025 = rev2025 > 0 ? ((yearTotals[2025]?.executed || 0) / rev2025) * 100 : 0;
    if (execRate2025 < 60 && execRate2025 > 0) {
      result.push({
        type: 'warning',
        title: `Taxa de Execução: ${execRate2025.toFixed(1)}%`,
        description: 'A taxa de execução está abaixo de 60%. Foque em reduzir cancelamentos e acelerar a execução dos procedimentos vendidos.'
      });
    }
    
    return result;
  }, [yearTotals, comparisonChartData, departmentComparisonData, seasonalityData]);

  const formatCurrency = (value: number) => `R$ ${(value / 1000).toFixed(0)}k`;
  const formatFullCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatMillions = (value: number) => `R$ ${(value / 1000000).toFixed(2)}M`;

  const GrowthBadge = ({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) => {
    const sizeClasses = size === 'lg' ? 'text-base px-3 py-1' : '';
    
    if (value > 0) {
      return (
        <Badge className={`bg-emerald-500/20 text-emerald-500 border-emerald-500/30 gap-1 ${sizeClasses}`}>
          <ArrowUpRight className={size === 'lg' ? "w-4 h-4" : "w-3 h-3"} />
          +{value.toFixed(1)}%
        </Badge>
      );
    } else if (value < 0) {
      return (
        <Badge className={`bg-rose-500/20 text-rose-500 border-rose-500/30 gap-1 ${sizeClasses}`}>
          <ArrowDownRight className={size === 'lg' ? "w-4 h-4" : "w-3 h-3"} />
          {value.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className={`gap-1 ${sizeClasses}`}>
        <Minus className={size === 'lg' ? "w-4 h-4" : "w-3 h-3"} />
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

  const yoyGrowthRevenue = yearTotals[2024]?.revenue > 0 
    ? ((yearTotals[2025]?.revenue - yearTotals[2024]?.revenue) / yearTotals[2024]?.revenue) * 100 
    : 0;
  
  const yoyGrowthExecuted = yearTotals[2024]?.executed > 0 
    ? ((yearTotals[2025]?.executed - yearTotals[2024]?.executed) / yearTotals[2024]?.executed) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary" />
                Dashboard Histórico Completo
              </CardTitle>
              <CardDescription className="mt-1">
                Análise comparativa 2024 vs 2025 • Preparado para 2026
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">📊 Visão Geral</SelectItem>
                  <SelectItem value="departments">🏢 Por Departamento</SelectItem>
                  <SelectItem value="seasonality">📅 Sazonalidade</SelectItem>
                  <SelectItem value="insights">💡 Insights</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Year Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[2024, 2025, 2026].map(year => {
          const data = yearTotals[year] || { revenue: 0, executed: 0, quantity: 0 };
          const prevData = yearTotals[year - 1] || { revenue: 0, executed: 0, quantity: 0 };
          const growth = prevData.revenue > 0 ? ((data.revenue - prevData.revenue) / prevData.revenue) * 100 : 0;
          const is2026 = year === 2026;
          
          return (
            <Card key={year} className={`${is2026 ? 'border-dashed border-2 border-muted-foreground/30' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={is2026 ? "outline" : "default"} className={is2026 ? "text-muted-foreground" : ""}>
                    {year}
                  </Badge>
                  {year > 2024 && !is2026 && <GrowthBadge value={growth} />}
                  {is2026 && <Badge variant="outline" className="text-xs">Em breve</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {is2026 && data.revenue === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Aguardando dados de 2026</p>
                    <p className="text-xs text-muted-foreground mt-1">Os dados serão exibidos aqui quando disponíveis</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Vendido</span>
                        <span className="text-lg font-bold text-emerald-500">{formatMillions(data.revenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Executado</span>
                        <span className="text-lg font-bold text-blue-500">{formatMillions(data.executed)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Taxa Execução</span>
                        <span className="text-sm font-medium">
                          {data.revenue > 0 ? ((data.executed / data.revenue) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {viewMode === 'overview' && (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <GrowthBadge value={yoyGrowthRevenue} />
                </div>
                <p className="text-2xl font-bold">{formatMillions(yearTotals[2025]?.revenue || 0)}</p>
                <p className="text-xs text-muted-foreground">Vendido 2025</p>
                <p className="text-xs text-muted-foreground mt-1">
                  vs {formatMillions(yearTotals[2024]?.revenue || 0)} em 2024
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <GrowthBadge value={yoyGrowthExecuted} />
                </div>
                <p className="text-2xl font-bold">{formatMillions(yearTotals[2025]?.executed || 0)}</p>
                <p className="text-xs text-muted-foreground">Executado 2025</p>
                <p className="text-xs text-muted-foreground mt-1">
                  vs {formatMillions(yearTotals[2024]?.executed || 0)} em 2024
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold">
                  {departmentComparisonData[0]?.shortName || '-'}
                </p>
                <p className="text-xs text-muted-foreground">Dept. Líder 2025</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((departmentComparisonData[0]?.revenue2025 || 0) / (yearTotals[2025]?.revenue || 1) * 100).toFixed(1)}% do total
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">
                  {comparisonChartData.length > 0 
                    ? comparisonChartData.reduce((best, curr) => curr.revenue2025 > best.revenue2025 ? curr : best).monthName 
                    : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Melhor Mês 2025</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {comparisonChartData.length > 0 
                    ? formatMillions(comparisonChartData.reduce((best, curr) => curr.revenue2025 > best.revenue2025 ? curr : best).revenue2025) 
                    : 'R$ 0'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Comparativo de Vendas: 2024 vs 2025 vs 2026
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatFullCurrency(value), name]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue2024" name="2024" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue2025" name="2025" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue2026" name="2026" fill="#14b8a6" opacity={0.7} radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Executed Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Comparativo de Execução: 2024 vs 2025 vs 2026
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatFullCurrency(value), name]}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="executed2024" name="2024" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="executed2025" name="2025" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="executed2026" name="2026" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Growth Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Taxa de Crescimento Mensal (2024 → 2025)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Crescimento']} />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                    <Bar 
                      dataKey="growth2425" 
                      name="Crescimento" 
                      radius={[4, 4, 0, 0]}
                      fill="hsl(var(--primary))"
                    >
                      {comparisonChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.growth2425 >= 0 ? '#10b981' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalhamento Mensal Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[1000px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Mês</th>
                        <th className="text-right py-2 px-2">Vendido 2024</th>
                        <th className="text-right py-2 px-2">Vendido 2025</th>
                        <th className="text-right py-2 px-2">Var. Vendido</th>
                        <th className="text-right py-2 px-2">Exec. 2024</th>
                        <th className="text-right py-2 px-2">Exec. 2025</th>
                        <th className="text-right py-2 px-2 bg-teal-500/10">Vendido 2026</th>
                        <th className="text-right py-2 px-2 bg-teal-500/10">Exec. 2026</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonChartData.map((row, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2 font-medium">{row.fullMonthName}</td>
                          <td className="text-right py-2 px-2 text-muted-foreground">{formatFullCurrency(row.revenue2024)}</td>
                          <td className="text-right py-2 px-2">{formatFullCurrency(row.revenue2025)}</td>
                          <td className="text-right py-2 px-2">
                            <GrowthBadge value={row.growth2425} />
                          </td>
                          <td className="text-right py-2 px-2 text-muted-foreground">{formatFullCurrency(row.executed2024)}</td>
                          <td className="text-right py-2 px-2">{formatFullCurrency(row.executed2025)}</td>
                          <td className="text-right py-2 px-2 bg-teal-500/5">
                            {row.revenue2026 > 0 ? formatFullCurrency(row.revenue2026) : '-'}
                          </td>
                          <td className="text-right py-2 px-2 bg-teal-500/5">
                            {row.executed2026 > 0 ? formatFullCurrency(row.executed2026) : '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-muted/30">
                        <td className="py-2 px-2">TOTAL</td>
                        <td className="text-right py-2 px-2">{formatFullCurrency(yearTotals[2024]?.revenue || 0)}</td>
                        <td className="text-right py-2 px-2">{formatFullCurrency(yearTotals[2025]?.revenue || 0)}</td>
                        <td className="text-right py-2 px-2">
                          <GrowthBadge value={yoyGrowthRevenue} />
                        </td>
                        <td className="text-right py-2 px-2">{formatFullCurrency(yearTotals[2024]?.executed || 0)}</td>
                        <td className="text-right py-2 px-2">{formatFullCurrency(yearTotals[2025]?.executed || 0)}</td>
                        <td className="text-right py-2 px-2 bg-teal-500/10">{formatFullCurrency(yearTotals[2026]?.revenue || 0)}</td>
                        <td className="text-right py-2 px-2 bg-teal-500/10">{formatFullCurrency(yearTotals[2026]?.executed || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {viewMode === 'departments' && (
        <>
          {/* Department Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart 2024 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição por Departamento - 2024</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={departmentComparisonData.filter(d => d.revenue2024 > 0)}
                        dataKey="revenue2024"
                        nameKey="shortName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {departmentComparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart 2025 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuição por Departamento - 2025</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={departmentComparisonData.filter(d => d.revenue2025 > 0)}
                        dataKey="revenue2025"
                        nameKey="shortName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {departmentComparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Comparison Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Comparativo de Vendas por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentComparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="shortName" type="category" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue2024" name="2024" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="revenue2025" name="2025" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Department Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Análise Detalhada por Departamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[1100px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Departamento</th>
                        <th className="text-right py-2 px-2">Vendido 2024</th>
                        <th className="text-right py-2 px-2">Vendido 2025</th>
                        <th className="text-right py-2 px-2">Var. 24→25</th>
                        <th className="text-right py-2 px-2 bg-teal-500/10">Vendido 2026</th>
                        <th className="text-right py-2 px-2 bg-teal-500/10">Exec. 2026</th>
                        <th className="text-right py-2 px-2 bg-teal-500/10">Var. 25→26</th>
                        <th className="text-right py-2 px-2">% do Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentComparisonData.map((row, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }}></div>
                              <span className="font-medium">{row.shortName}</span>
                            </div>
                          </td>
                          <td className="text-right py-2 px-2 text-muted-foreground">{formatFullCurrency(row.revenue2024)}</td>
                          <td className="text-right py-2 px-2">{formatFullCurrency(row.revenue2025)}</td>
                          <td className="text-right py-2 px-2">
                            <GrowthBadge value={row.revenueGrowth} />
                          </td>
                          <td className="text-right py-2 px-2 bg-teal-500/5">
                            {row.revenue2026 > 0 ? formatFullCurrency(row.revenue2026) : '-'}
                          </td>
                          <td className="text-right py-2 px-2 bg-teal-500/5">
                            {row.executed2026 > 0 ? formatFullCurrency(row.executed2026) : '-'}
                          </td>
                          <td className="text-right py-2 px-2 bg-teal-500/5">
                            {row.revenue2026 > 0 ? <GrowthBadge value={row.revenueGrowth2526} /> : '-'}
                          </td>
                          <td className="text-right py-2 px-2">
                            {((row.revenue2025 / (yearTotals[2025]?.revenue || 1)) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {viewMode === 'seasonality' && (
        <>
          {/* Quarterly Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {seasonalityData.map((quarter, idx) => {
              const Icon = quarter.icon;
              return (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <GrowthBadge value={quarter.growth} />
                    </div>
                    <p className="text-sm font-medium mb-1">{quarter.name}</p>
                    <p className="text-lg font-bold">{formatMillions(quarter.revenue2025)}</p>
                    <p className="text-xs text-muted-foreground">
                      vs {formatMillions(quarter.revenue2024)} em 2024
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Seasonality Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Padrão de Sazonalidade
              </CardTitle>
              <CardDescription>
                Comparação trimestral para identificar períodos de alta e baixa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonalityData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue2024" name="Vendido 2024" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue2025" name="Vendido 2025" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue2026" name="Vendido 2026" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="executed2026" name="Executado 2026" fill="#0d9488" opacity={0.7} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Pattern */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Padrão Mensal (Média dos 2 anos)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue2024" name="2024" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="revenue2025" name="2025" stroke="hsl(var(--primary))" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Seasonality Insights */}
          <Card className="bg-gradient-to-r from-amber-500/5 to-amber-500/10 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Observações de Sazonalidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {seasonalityData.length > 0 ? (() => {
                const best = seasonalityData.reduce((a, b) => a.revenue2025 > b.revenue2025 ? a : b);
                const worst = seasonalityData.reduce((a, b) => a.revenue2025 < b.revenue2025 ? a : b);
                return (
                  <>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <strong>{best.name}</strong> é o período mais forte do ano, representando {((best.revenue2025 / (yearTotals[2025]?.revenue || 1)) * 100).toFixed(0)}% do faturamento anual.
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <strong>{worst.name}</strong> apresenta menor faturamento. Considere promoções especiais ou campanhas temáticas para este período.
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <strong>Junho</strong> historicamente é o mês mais fraco. Planeje ações de retenção e campanhas de inverno.
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <strong>Segundo semestre</strong> tende a ser mais forte. Prepare estoque e equipe para atender a demanda.
                    </p>
                  </>
                );
              })() : (
                <p className="text-muted-foreground">Carregando dados de sazonalidade...</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {viewMode === 'insights' && (
        <>
          {/* Strategic Insights */}
          <div className="space-y-4">
            {insights.map((insight, idx) => {
              const bgColors = {
                success: 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
                warning: 'bg-gradient-to-r from-rose-500/10 to-rose-500/5 border-rose-500/20',
                info: 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20',
                strategy: 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20',
              };
              const icons = {
                success: <TrendingUp className="w-5 h-5 text-emerald-500" />,
                warning: <AlertTriangle className="w-5 h-5 text-rose-500" />,
                info: <Lightbulb className="w-5 h-5 text-blue-500" />,
                strategy: <Zap className="w-5 h-5 text-amber-500" />,
              };
              
              return (
                <Card key={idx} className={bgColors[insight.type]}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {icons[insight.type]}
                      <div>
                        <p className="font-semibold">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recommendations for 2026 */}
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Recomendações para 2026
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-background/50 border">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Por Período
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• <strong>Jan-Mar:</strong> Campanhas de início de ano e resolução de metas pessoais</li>
                    <li>• <strong>Abr-Jun:</strong> Promoções de outono/inverno para contrariar sazonalidade baixa</li>
                    <li>• <strong>Jul-Set:</strong> Preparação para alta temporada de fim de ano</li>
                    <li>• <strong>Out-Dez:</strong> Maximizar vendas com Black Friday e promoções de Natal</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Por Departamento
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• <strong>Cirurgia Plástica:</strong> Manter como carro-chefe, expandir indicações</li>
                    <li>• <strong>Soroterapia:</strong> Alto crescimento - investir em marketing</li>
                    <li>• <strong>Harmonização:</strong> Potencial de crescimento com novos protocolos</li>
                    <li>• <strong>SPA/Estética:</strong> Desenvolver pacotes combinados para aumentar ticket</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <h4 className="font-semibold text-emerald-600 mb-2">Meta Sugerida para 2026</h4>
                <p className="text-sm text-muted-foreground">
                  Com base no crescimento de {yoyGrowthRevenue.toFixed(1)}% de 2024 para 2025, uma meta de crescimento de 15-20% para 2026 
                  representaria um faturamento entre <strong>{formatMillions((yearTotals[2025]?.revenue || 0) * 1.15)}</strong> e <strong>{formatMillions((yearTotals[2025]?.revenue || 0) * 1.2)}</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default HistoricalComparison;
