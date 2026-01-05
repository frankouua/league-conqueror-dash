import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Users,
  Stethoscope,
  DollarSign,
  CalendarDays,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ProceduresGoalTrackerProps {
  month: number;
  year: number;
}

// Calculate business days
const getBusinessDaysRemaining = (year: number, month: number): number => {
  const now = new Date();
  const endOfMonth = new Date(year, month, 0);
  let businessDays = 0;
  
  const startDate = new Date(Math.max(now.getTime(), new Date(year, month - 1, 1).getTime()));
  startDate.setHours(0, 0, 0, 0);
  
  const current = new Date(startDate);
  while (current <= endOfMonth) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return Math.max(businessDays, 1);
};

const ProceduresGoalTracker = ({ month, year }: ProceduresGoalTrackerProps) => {
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  const businessDaysRemaining = getBusinessDaysRemaining(year, month);
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // Fetch department goals
  const { data: departmentGoals } = useQuery({
    queryKey: ["proc-dept-goals", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
  });

  // Fetch revenue records
  const { data: revenueRecords } = useQuery({
    queryKey: ["proc-revenue", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount, department, date")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch cancellations
  const { data: cancellations } = useQuery({
    queryKey: ["proc-cancellations", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cancellations")
        .select("contract_value")
        .gte("cancellation_request_date", startDate)
        .lte("cancellation_request_date", endDate)
        .in("status", ["cancelled_with_fine", "cancelled_no_fine", "credit_used"]);
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

  // Normalize department names
  const normalizeDeptName = (dept: string | null): string => {
    if (!dept) return "Outros";
    const d = dept.toLowerCase().trim();
    
    if (d.includes("consulta") && d.includes("cirurgia")) return "Consultas Cirurgia";
    if (d.includes("cirurgia") && d.includes("plástica")) return "Cirurgia Plástica";
    if (d.includes("pós") || d.includes("pos")) return "Pós Operatório";
    if (d.includes("soro") || d.includes("nutri")) return "Soroterapia";
    if (d.includes("harmoni")) return "Harmonização";
    if (d.includes("spa") || d.includes("estét")) return "Spa & Estética";
    if (d.includes("travel")) return "Unique Travel";
    if (d.includes("luxskin")) return "Luxskin";
    
    return dept;
  };

  // Calculate procedure metrics
  const metrics = useMemo(() => {
    const totalSold = revenueRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const totalCancelled = cancellations?.reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;
    const netSold = totalSold - totalCancelled;
    const procedureCount = revenueRecords?.length || 0;

    // Calculate goals
    const meta1 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta1_goal), 0) || 3000000;
    const meta2 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta2_goal), 0) || 3500000;
    const meta3 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta3_goal), 0) || 4000000;

    // Calculate remaining
    const remaining1 = Math.max(0, meta1 - netSold);
    const remaining2 = Math.max(0, meta2 - netSold);
    const remaining3 = Math.max(0, meta3 - netSold);

    // Average ticket
    const avgTicket = procedureCount > 0 ? totalSold / procedureCount : 15000;

    // Procedures needed to hit goals
    const procsForMeta1 = avgTicket > 0 ? Math.ceil(remaining1 / avgTicket) : 0;
    const procsForMeta2 = avgTicket > 0 ? Math.ceil(remaining2 / avgTicket) : 0;
    const procsForMeta3 = avgTicket > 0 ? Math.ceil(remaining3 / avgTicket) : 0;

    // Daily breakdown
    const procsPerDayMeta1 = daysRemaining > 0 ? procsForMeta1 / daysRemaining : 0;
    const procsPerDayMeta2 = daysRemaining > 0 ? procsForMeta2 / daysRemaining : 0;
    const procsPerDayMeta3 = daysRemaining > 0 ? procsForMeta3 / daysRemaining : 0;

    // Value per day needed
    const valuePerDayMeta1 = daysRemaining > 0 ? remaining1 / daysRemaining : 0;
    const valuePerDayMeta2 = daysRemaining > 0 ? remaining2 / daysRemaining : 0;
    const valuePerDayMeta3 = daysRemaining > 0 ? remaining3 / daysRemaining : 0;

    // Business days breakdown
    const valuePerBusinessDay1 = businessDaysRemaining > 0 ? remaining1 / businessDaysRemaining : 0;
    const valuePerBusinessDay2 = businessDaysRemaining > 0 ? remaining2 / businessDaysRemaining : 0;
    const valuePerBusinessDay3 = businessDaysRemaining > 0 ? remaining3 / businessDaysRemaining : 0;

    const procsPerBusinessDay1 = businessDaysRemaining > 0 ? procsForMeta1 / businessDaysRemaining : 0;
    const procsPerBusinessDay2 = businessDaysRemaining > 0 ? procsForMeta2 / businessDaysRemaining : 0;
    const procsPerBusinessDay3 = businessDaysRemaining > 0 ? procsForMeta3 / businessDaysRemaining : 0;

    // Progress percentages
    const percent1 = meta1 > 0 ? Math.min((netSold / meta1) * 100, 100) : 0;
    const percent2 = meta2 > 0 ? Math.min((netSold / meta2) * 100, 100) : 0;
    const percent3 = meta3 > 0 ? Math.min((netSold / meta3) * 100, 100) : 0;

    return {
      totalSold,
      netSold,
      procedureCount,
      avgTicket,
      meta1, meta2, meta3,
      remaining1, remaining2, remaining3,
      procsForMeta1, procsForMeta2, procsForMeta3,
      procsPerDayMeta1, procsPerDayMeta2, procsPerDayMeta3,
      valuePerDayMeta1, valuePerDayMeta2, valuePerDayMeta3,
      valuePerBusinessDay1, valuePerBusinessDay2, valuePerBusinessDay3,
      procsPerBusinessDay1, procsPerBusinessDay2, procsPerBusinessDay3,
      percent1, percent2, percent3,
    };
  }, [revenueRecords, cancellations, departmentGoals, daysRemaining, businessDaysRemaining]);

  // Department breakdown
  const deptBreakdown = useMemo(() => {
    if (!departmentGoals || !revenueRecords) return [];

    return departmentGoals.map((goal) => {
      const deptName = goal.department_name;
      const deptRevenue = revenueRecords
        .filter((r) => r.department?.toLowerCase().includes(deptName.toLowerCase().split(" ")[0]) || 
                       normalizeDeptName(r.department) === deptName)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const deptCount = revenueRecords.filter(
        (r) => r.department?.toLowerCase().includes(deptName.toLowerCase().split(" ")[0]) ||
               normalizeDeptName(r.department) === deptName
      ).length;

      const meta1 = Number(goal.meta1_goal);
      const remaining = Math.max(0, meta1 - deptRevenue);
      const avgTicket = deptCount > 0 ? deptRevenue / deptCount : 15000;
      const procsNeeded = avgTicket > 0 ? Math.ceil(remaining / avgTicket) : 0;
      const percent = meta1 > 0 ? Math.min((deptRevenue / meta1) * 100, 100) : 0;

      return {
        name: deptName,
        shortName: deptName.split(" ").slice(0, 2).join(" "),
        revenue: deptRevenue,
        count: deptCount,
        meta: meta1,
        remaining,
        procsNeeded,
        avgTicket,
        percent,
        perDay: daysRemaining > 0 ? remaining / daysRemaining : 0,
        procsPerDay: daysRemaining > 0 ? procsNeeded / daysRemaining : 0,
      };
    }).filter(d => d.meta > 0).sort((a, b) => a.percent - b.percent);
  }, [departmentGoals, revenueRecords, daysRemaining]);

  return (
    <div className="space-y-6">
      {/* Main Summary Card */}
      <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/20">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="text-xl font-bold">O Que Falta para Bater a Meta</span>
                <p className="text-sm text-muted-foreground font-normal">
                  Visão clara de procedimentos e valores
                </p>
              </div>
            </div>
            {isCurrentMonth && (
              <div className="flex gap-2">
                <Badge className="gap-1 bg-primary/20 text-primary border-primary/30">
                  <Calendar className="w-3 h-3" />
                  {daysRemaining} dias
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {businessDaysRemaining} úteis
                </Badge>
              </div>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium">Fechado</span>
              </div>
              <p className="text-2xl font-black text-emerald-600">
                {formatCurrency(metrics.netSold)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Stethoscope className="w-4 h-4" />
                <span className="text-xs font-medium">Procedimentos</span>
              </div>
              <p className="text-2xl font-black text-blue-600">
                {metrics.procedureCount}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Ticket Médio</span>
              </div>
              <p className="text-2xl font-black text-purple-600">
                {formatCurrency(metrics.avgTicket)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs font-medium">Dias Restantes</span>
              </div>
              <p className="text-2xl font-black text-amber-600">
                {daysRemaining}
              </p>
            </div>
          </div>

          {/* Meta Cards - What's Missing */}
          {/* META 3 - MAIN HIGHLIGHT */}
          <div className={`col-span-full p-6 rounded-2xl border-4 transition-all ${
            metrics.percent3 >= 100 
              ? "bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border-emerald-500" 
              : "bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                  <Target className="w-8 h-8" />
                </div>
                <div>
                  <Badge className="bg-primary text-lg px-3 py-1 mb-1">
                    🎯 META 3 - NOSSO OBJETIVO
                  </Badge>
                  <p className="text-sm text-muted-foreground">A meta que queremos conquistar!</p>
                </div>
              </div>
              {metrics.percent3 >= 100 && (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-8 h-8" />
                  <span className="text-2xl font-black">CONQUISTADA!</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-background/80 border">
                <p className="text-xs text-muted-foreground mb-1">Objetivo</p>
                <p className="text-2xl font-black text-primary">{formatCurrency(metrics.meta3)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <p className="text-xs text-muted-foreground mb-1">Já Fechamos</p>
                <p className="text-2xl font-black text-emerald-600">{formatCurrency(metrics.netSold)}</p>
              </div>
              <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30">
                <p className="text-xs text-muted-foreground mb-1">Falta Fechar</p>
                <p className="text-2xl font-black text-destructive">
                  {metrics.remaining3 > 0 ? formatCurrency(metrics.remaining3) : "✓ Atingida!"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/20 border border-blue-500/30">
                <p className="text-xs text-muted-foreground mb-1">Procedimentos</p>
                <p className="text-2xl font-black text-blue-600">
                  {metrics.remaining3 > 0 ? metrics.procsForMeta3 : "✓"}
                </p>
              </div>
            </div>

            <Progress value={metrics.percent3} className="h-4 mb-2" />
            <div className="flex justify-between text-sm mb-4">
              <span className="text-muted-foreground">{metrics.percent3.toFixed(1)}% concluído</span>
              <span className="font-bold text-primary">{(100 - metrics.percent3).toFixed(1)}% restante</span>
            </div>

            {metrics.remaining3 > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-primary/30 border-2 border-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <span className="font-bold text-primary">FECHAR POR DIA ÚTIL</span>
                  </div>
                  <p className="text-4xl font-black text-primary mb-1">
                    {formatCurrency(metrics.valuePerBusinessDay3)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ou <span className="font-bold text-primary">{metrics.procsPerBusinessDay3.toFixed(1)} procedimentos</span>
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-amber-600">TEMPO RESTANTE</span>
                  </div>
                  <p className="text-4xl font-black text-amber-600 mb-1">
                    {businessDaysRemaining} dias úteis
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({daysRemaining} dias corridos)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Meta 1 & 2 - Secondary */}
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* META 1 - Small */}
            <div className={`p-4 rounded-xl border ${
              metrics.percent1 >= 100 
                ? "bg-emerald-500/10 border-emerald-500/50" 
                : "bg-card border-border"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">Meta 1</Badge>
                {metrics.percent1 >= 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{formatCurrency(metrics.meta1)}</span>
                <span className="text-sm">
                  {metrics.remaining1 > 0 ? (
                    <span className="text-muted-foreground">
                      Falta: <span className="font-bold text-foreground">{formatCurrency(metrics.remaining1)}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-bold">✓ Atingida</span>
                  )}
                </span>
              </div>
              <Progress value={metrics.percent1} className="h-1.5 mt-2" />
            </div>

            {/* META 2 - Small */}
            <div className={`p-4 rounded-xl border ${
              metrics.percent2 >= 100 
                ? "bg-emerald-500/10 border-emerald-500/50" 
                : "bg-card border-border"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">Meta 2</Badge>
                {metrics.percent2 >= 100 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{formatCurrency(metrics.meta2)}</span>
                <span className="text-sm">
                  {metrics.remaining2 > 0 ? (
                    <span className="text-muted-foreground">
                      Falta: <span className="font-bold text-foreground">{formatCurrency(metrics.remaining2)}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-bold">✓ Atingida</span>
                  )}
                </span>
              </div>
              <Progress value={metrics.percent2} className="h-1.5 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Breakdown - META 3 Focus */}
      {deptBreakdown.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              O Que Falta por Departamento
              <Badge className="ml-auto bg-primary/20 text-primary">Meta 3</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {deptBreakdown.map((dept) => (
                <div 
                  key={dept.name}
                  className={`p-4 rounded-xl border transition-all ${
                    dept.percent >= 100 
                      ? "bg-emerald-500/10 border-emerald-500/30" 
                      : dept.percent >= 70 
                      ? "bg-amber-500/5 border-amber-500/30" 
                      : "bg-destructive/5 border-destructive/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm truncate">{dept.shortName}</span>
                    <Badge variant="outline" className="text-xs">
                      {dept.percent.toFixed(0)}%
                    </Badge>
                  </div>
                  
                  <Progress value={dept.percent} className="h-1.5 mb-3" />
                  
                  {dept.remaining > 0 ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Falta (Meta 3):</span>
                        <span className="font-bold">{formatCurrency(dept.remaining)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Procedimentos:</span>
                        <span className="font-bold text-primary">{dept.procsNeeded}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border/50 mt-1">
                        <span className="text-muted-foreground">Por dia útil:</span>
                        <span className="font-bold text-primary">
                          {formatCurrency(dept.perDay)} ({dept.procsPerDay.toFixed(1)} proc.)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Meta 3 atingida!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProceduresGoalTracker;
