import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2, TrendingUp, Target, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENTS } from "@/constants/departments";
import { PaceBadge, PaceIndicator } from "@/components/PaceBadge";
import { calculatePaceMetrics } from "@/lib/paceAnalysis";
import { cn } from "@/lib/utils";

interface DepartmentGoalsCardProps {
  month: number;
  year: number;
  filterDepartment?: string | null;
}

const DepartmentGoalsCard = ({ month, year, filterDepartment }: DepartmentGoalsCardProps) => {
  const now = new Date();
  const currentDay = now.getDate();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // Gets correct last day of month
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const daysInMonth = lastDay;

  // Fetch department goals
  const { data: departmentGoalsRaw, isLoading: goalsLoading } = useQuery({
    queryKey: ["department-goals", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .order("meta1_goal", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Apply department filter
  const departmentGoals = useMemo(() => {
    if (!departmentGoalsRaw) return [];
    if (!filterDepartment) return departmentGoalsRaw;
    
    const deptInfo = DEPARTMENTS.find(d => d.key === filterDepartment);
    if (!deptInfo) return departmentGoalsRaw;
    
    return departmentGoalsRaw.filter(g => 
      g.department_name.toLowerCase().includes(deptInfo.label.toLowerCase()) ||
      g.department_name === deptInfo.name
    );
  }, [departmentGoalsRaw, filterDepartment]);

  // Fetch revenue records by department
  const { data: revenueByDepartment } = useQuery({
    queryKey: ["revenue-by-department", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("department, amount")
        .gte("date", startDate)
        .lte("date", endDate)
        .not("department", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Map various department name formats to goal department names
  // This handles codes like "01 - CIRURGIA PLÁSTICA", snake_case values, and original Portuguese names
  const normalizeDepartmentName = (dept: string | null): string => {
    if (!dept) return "";
    const deptLower = dept.toLowerCase().trim();
    
    // Map by code prefix or name - order matters (more specific first)
    // 02 - Consulta must come before 01 - Cirurgia (both contain "cirurgia")
    if (deptLower.startsWith("02") || (deptLower.includes("consulta") && deptLower.includes("cirurgia"))) {
      return "Consulta Cirurgia Plástica";
    }
    if (deptLower.startsWith("01") || (deptLower.includes("cirurgia") && deptLower.includes("plástica")) || deptLower === "cirurgia_plastica") {
      return "Cirurgia Plástica";
    }
    if (deptLower.startsWith("03") || deptLower.includes("pós") || deptLower.includes("pos") && deptLower.includes("operat")) {
      return "Pós Operatório";
    }
    if (deptLower.startsWith("04") || deptLower.includes("soroterapia") || deptLower.includes("protocolo") || deptLower.includes("nutricional")) {
      return "Soroterapia / Protocolos Nutricionais";
    }
    if (deptLower.startsWith("08") || deptLower.includes("harmoniza")) {
      return "Harmonização Facial e Corporal";
    }
    if (deptLower.startsWith("09") || deptLower.includes("spa") || deptLower.includes("estética") || deptLower.includes("estetica")) {
      return "Spa e Estética";
    }
    if (deptLower.startsWith("25") || deptLower.includes("travel") || deptLower.includes("unique")) {
      return "Unique Travel Experience";
    }
    if (deptLower.includes("luxskin")) {
      return "Luxskin";
    }
    
    // Return original if no match found
    return dept;
  };

  // Calculate revenue per department
  const getDepartmentRevenue = (departmentName: string) => {
    if (!revenueByDepartment) return 0;
    
    // Find matching revenue records
    const matchingRevenue = revenueByDepartment.filter(r => {
      const normalizedDept = normalizeDepartmentName(r.department);
      return normalizedDept === departmentName;
    });
    
    return matchingRevenue.reduce((sum, r) => sum + Number(r.amount), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProgressPercent = (actual: number, goal: number) => 
    goal > 0 ? Math.min(Math.round((actual / goal) * 100), 100) : 0;

  // Calculate totals
  const totalMeta1 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta1_goal), 0) || 0;
  const totalMeta2 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta2_goal), 0) || 0;
  const totalMeta3 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta3_goal), 0) || 0;
  const totalRevenue = revenueByDepartment?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  // Pace analysis
  const paceMetrics = isCurrentMonth 
    ? calculatePaceMetrics(totalMeta1, totalRevenue, currentDay, daysInMonth)
    : null;

  if (goalsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!departmentGoals || departmentGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Metas por Departamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma meta por departamento definida para este período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Metas por Departamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-xl border-2 transition-all ${
            totalRevenue >= totalMeta1 
              ? "bg-success/20 border-success" 
              : "bg-success/10 border-success/50"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">META 1</span>
              {totalRevenue >= totalMeta1 && <CheckCircle2 className="w-5 h-5 text-success" />}
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(totalMeta1)}</p>
            <Badge variant="secondary" className="mt-2">+50 pts</Badge>
          </div>
          
          <div className={`p-4 rounded-xl border-2 transition-all ${
            totalRevenue >= totalMeta2 
              ? "bg-success/20 border-success" 
              : "bg-success/10 border-success/50"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">META 2</span>
              {totalRevenue >= totalMeta2 && <CheckCircle2 className="w-5 h-5 text-success" />}
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(totalMeta2)}</p>
            <Badge variant="secondary" className="mt-2">+50 pts</Badge>
          </div>
          
          <div className={`p-4 rounded-xl border-2 transition-all ${
            totalRevenue >= totalMeta3 
              ? "bg-gradient-gold-shine border-primary shadow-gold" 
              : "bg-secondary border-border"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">META 3</span>
              {totalRevenue >= totalMeta3 && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </div>
            <p className={`text-xl font-bold ${totalRevenue >= totalMeta3 ? "text-primary-foreground" : "text-foreground"}`}>
              {formatCurrency(totalMeta3)}
            </p>
            <Badge variant={totalRevenue >= totalMeta3 ? "default" : "secondary"} className="mt-2">+100 pts</Badge>
          </div>
        </div>

        {/* Current Total Revenue with Pace Analysis */}
        <div className={cn(
          "p-4 rounded-xl border-2 transition-all",
          paceMetrics ? paceMetrics.bgColor : "bg-primary/10",
          paceMetrics ? paceMetrics.borderColor : "border-primary/30"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-medium">Faturamento Total Atual</span>
            </div>
            <div className="flex items-center gap-2">
              {isCurrentMonth && paceMetrics && (
                <PaceBadge
                  monthlyGoal={totalMeta1}
                  currentValue={totalRevenue}
                  currentDay={currentDay}
                  totalDaysInMonth={daysInMonth}
                />
              )}
              <span className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
          <Progress value={getProgressPercent(totalRevenue, totalMeta1)} className="h-3" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">
              {getProgressPercent(totalRevenue, totalMeta1)}% da Meta 1 | 
              Faltam {formatCurrency(Math.max(0, totalMeta1 - totalRevenue))} para Meta 1
            </p>
            {isCurrentMonth && paceMetrics && (
              <p className={cn("text-sm font-medium", paceMetrics.textColor)}>
                Esperado hoje: {formatCurrency(paceMetrics.expected)}
              </p>
            )}
          </div>
        </div>

        {/* Department Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                  Departamento
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">
                  Atual
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">
                  Meta 1
                </th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {departmentGoals.map((goal) => {
                const deptRevenue = getDepartmentRevenue(goal.department_name);
                const percent = getProgressPercent(deptRevenue, Number(goal.meta1_goal));
                const achieved = deptRevenue >= Number(goal.meta1_goal);
                
                return (
                  <tr key={goal.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {achieved ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <Target className="w-4 h-4 text-primary" />
                        )}
                        <span className="font-medium text-sm">{goal.department_name}</span>
                      </div>
                    </td>
                    <td className={`text-right py-3 px-2 text-sm font-medium ${achieved ? 'text-success' : 'text-foreground'}`}>
                      {formatCurrency(deptRevenue)}
                    </td>
                    <td className="text-right py-3 px-2 text-sm text-muted-foreground">
                      {formatCurrency(Number(goal.meta1_goal))}
                    </td>
                    <td className={`text-right py-3 px-2 text-sm font-bold ${
                      achieved ? 'text-success' : percent >= 70 ? 'text-amber-500' : 'text-destructive'
                    }`}>
                      {percent}%
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="bg-muted/50 font-bold">
                <td className="py-3 px-2 text-sm">TOTAL</td>
                <td className={`text-right py-3 px-2 text-sm ${totalRevenue >= totalMeta1 ? 'text-success' : 'text-foreground'}`}>
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="text-right py-3 px-2 text-sm text-muted-foreground">
                  {formatCurrency(totalMeta1)}
                </td>
                <td className={`text-right py-3 px-2 text-sm ${
                  totalRevenue >= totalMeta1 ? 'text-success' : getProgressPercent(totalRevenue, totalMeta1) >= 70 ? 'text-amber-500' : 'text-destructive'
                }`}>
                  {getProgressPercent(totalRevenue, totalMeta1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepartmentGoalsCard;
