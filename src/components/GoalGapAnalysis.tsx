import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Calculator,
  ArrowUp,
  Sparkles,
  Users,
  Building2,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { CLINIC_GOALS } from "@/constants/clinicGoals";
import { DEPARTMENTS, getDepartmentAvgTicket } from "@/constants/departments";
import { isSeller } from "@/constants/sellerPositions";

interface GoalGapAnalysisProps {
  month: number;
  year: number;
}

type MetaType = "meta1" | "meta2" | "meta3";

const GoalGapAnalysis = ({ month, year }: GoalGapAnalysisProps) => {
  const [selectedMeta, setSelectedMeta] = useState<MetaType>("meta3");
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - currentDay);
  const businessDaysRemaining = Math.round(daysRemaining * 0.7); // Approximation for business days
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Fetch department goals
  const { data: departmentGoals } = useQuery({
    queryKey: ["dept-goals-gap", month, year],
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
    queryKey: ["revenue-gap", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch executed records
  const { data: executedRecords } = useQuery({
    queryKey: ["executed-gap", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executed_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch cancellations
  const { data: cancellations } = useQuery({
    queryKey: ["cancellations-gap", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cancellations")
        .select("*")
        .gte("cancellation_request_date", startDate)
        .lte("cancellation_request_date", endDate)
        .in("status", ["cancelled_with_fine", "cancelled_no_fine", "credit_used"]);
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for individual analysis
  const { data: profiles } = useQuery({
    queryKey: ["profiles-gap"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams-gap"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch individual goals
  const { data: individualGoals } = useQuery({
    queryKey: ["individual-goals-gap", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year);
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
  const normalizeDepartmentName = (dept: string | null): string => {
    if (!dept) return "";
    const deptLower = dept.toLowerCase().trim();
    
    if (deptLower.startsWith("02") || (deptLower.includes("consulta") && deptLower.includes("cirurgia"))) {
      return "Consulta Cirurgia Plástica";
    }
    if (deptLower.startsWith("01") || (deptLower.includes("cirurgia") && deptLower.includes("plástica")) || deptLower === "cirurgia_plastica") {
      return "Cirurgia Plástica";
    }
    if (deptLower.startsWith("03") || deptLower.includes("pós") || (deptLower.includes("pos") && deptLower.includes("operat"))) {
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
    
    return dept;
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalSold = revenueRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const totalExecuted = executedRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const totalCancelled = cancellations?.reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;
    
    // Use department goals sum as the official meta if available
    const deptMeta1 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta1_goal), 0) || CLINIC_GOALS.META_1;
    const deptMeta2 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta2_goal), 0) || CLINIC_GOALS.META_2;
    const deptMeta3 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta3_goal), 0) || CLINIC_GOALS.META_3;

    // Net revenue (sold - cancelled)
    const netSold = totalSold - totalCancelled;

    const remainingMeta1 = Math.max(0, deptMeta1 - netSold);
    const remainingMeta2 = Math.max(0, deptMeta2 - netSold);
    const remainingMeta3 = Math.max(0, deptMeta3 - netSold);

    // Calculate daily averages needed
    const avgDailyNeededMeta1 = daysRemaining > 0 ? remainingMeta1 / daysRemaining : 0;
    const avgDailyNeededMeta2 = daysRemaining > 0 ? remainingMeta2 / daysRemaining : 0;
    const avgDailyNeededMeta3 = daysRemaining > 0 ? remainingMeta3 / daysRemaining : 0;

    // Current daily average
    const daysElapsed = currentDay;
    const currentDailyAvg = daysElapsed > 0 ? netSold / daysElapsed : 0;

    // Projection based on current pace
    const projectedTotal = currentDailyAvg * daysInMonth;

    // Average ticket calculation (from revenue records)
    const avgTicket = revenueRecords && revenueRecords.length > 0 
      ? totalSold / revenueRecords.length 
      : 15000; // Default average ticket

    // Procedures needed to hit goals
    const proceduresForMeta1 = avgTicket > 0 ? Math.ceil(remainingMeta1 / avgTicket) : 0;
    const proceduresForMeta2 = avgTicket > 0 ? Math.ceil(remainingMeta2 / avgTicket) : 0;
    const proceduresForMeta3 = avgTicket > 0 ? Math.ceil(remainingMeta3 / avgTicket) : 0;

    return {
      totalSold,
      totalExecuted,
      totalCancelled,
      netSold,
      deptMeta1,
      deptMeta2,
      deptMeta3,
      remainingMeta1,
      remainingMeta2,
      remainingMeta3,
      avgDailyNeededMeta1,
      avgDailyNeededMeta2,
      avgDailyNeededMeta3,
      currentDailyAvg,
      projectedTotal,
      avgTicket,
      proceduresForMeta1,
      proceduresForMeta2,
      proceduresForMeta3,
      percentMeta1: deptMeta1 > 0 ? (netSold / deptMeta1) * 100 : 0,
      percentMeta2: deptMeta2 > 0 ? (netSold / deptMeta2) * 100 : 0,
      percentMeta3: deptMeta3 > 0 ? (netSold / deptMeta3) * 100 : 0,
    };
  }, [revenueRecords, executedRecords, cancellations, departmentGoals, currentDay, daysInMonth, daysRemaining]);

  // Department breakdown with quantity metrics
  const departmentBreakdown = useMemo(() => {
    if (!departmentGoals || !revenueRecords) return [];

    return departmentGoals.map((goal) => {
      const deptRecords = revenueRecords.filter(
        (r) => normalizeDepartmentName(r.department) === goal.department_name
      );
      const deptRevenue = deptRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      const deptCount = deptRecords.length; // Quantidade vendida

      // Get selected meta value
      const metaValue = selectedMeta === "meta1" 
        ? Number(goal.meta1_goal) 
        : selectedMeta === "meta2" 
          ? Number(goal.meta2_goal) 
          : Number(goal.meta3_goal);

      const remaining = Math.max(0, metaValue - deptRevenue);
      const percent = metaValue > 0 ? (deptRevenue / metaValue) * 100 : 0;
      
      // Use fixed average ticket from constants (ticket médio anual)
      const avgTicket = getDepartmentAvgTicket(goal.department_name);
      
      // Calculate quantity metrics using fixed ticket
      const metaQtd = avgTicket > 0 ? Math.ceil(metaValue / avgTicket) : 0; // Meta em quantidade
      const faltaQtd = avgTicket > 0 ? Math.ceil(remaining / avgTicket) : 0; // Falta em quantidade
      const qtdPorDia = businessDaysRemaining > 0 ? faltaQtd / businessDaysRemaining : 0;

      return {
        name: goal.department_name,
        revenue: deptRevenue,
        count: deptCount, // Quantidade vendida
        meta1: Number(goal.meta1_goal),
        meta2: Number(goal.meta2_goal),
        meta3: Number(goal.meta3_goal),
        metaValue, // Meta selecionada
        remaining,
        percent: Math.min(percent, 100),
        status: percent >= 100 ? "atingida" : percent >= 70 ? "encaminhada" : "precisa_atenção",
        avgTicket,
        metaQtd, // Meta em quantidade de procedimentos
        faltaQtd, // Falta em quantidade
        qtdPorDia, // Quantidade por dia útil
      };
    }).sort((a, b) => a.percent - b.percent); // Sort by lowest percent first (priority)
  }, [departmentGoals, revenueRecords, businessDaysRemaining, selectedMeta]);

  // Position labels mapping
  const POSITION_LABELS: Record<string, string> = {
    comercial_1_captacao: "Comercial 1 - Captação",
    comercial_2_closer: "Comercial 2 - Closer",
    comercial_3_experiencia: "Comercial 3 - Experiência",
    comercial_4_farmer: "Comercial 4 - Farmer",
    sdr: "SDR",
    coordenador: "Coordenador(a)",
    gerente: "Gerente",
    assistente: "Assistente",
    outro: "Outro",
  };

  // Sellers grouped by position for team comparison
  const sellersGroupedByPosition = useMemo(() => {
    if (!profiles || !individualGoals || !revenueRecords || !teams) return [];

    // Build seller data with team info - only sellers (not coordinators/managers)
    const sellersData = profiles
      .filter((profile) => isSeller(profile.position))
      .map((profile) => {
        const goal = individualGoals.find((g) => g.user_id === profile.user_id);
        const goalValue = Number(goal?.revenue_goal) || 0;
        
        if (goalValue === 0) return null;

        const revenue = revenueRecords
          .filter((r) => r.user_id === profile.user_id || r.attributed_to_user_id === profile.user_id)
          .reduce((sum, r) => sum + Number(r.amount), 0);

        const remaining = Math.max(0, goalValue - revenue);
        const percent = goalValue > 0 ? (revenue / goalValue) * 100 : 0;
        const team = teams.find((t) => t.id === profile.team_id);

        return {
          id: profile.user_id,
          name: profile.full_name,
          position: profile.position || "outro",
          positionLabel: POSITION_LABELS[profile.position || "outro"] || "Outro",
          teamId: profile.team_id,
          teamName: team?.name || "Sem equipe",
          goal: goalValue,
          revenue,
          remaining,
          percent: Math.min(percent, 100),
          dailyNeeded: daysRemaining > 0 ? remaining / daysRemaining : 0,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // Group by position
    const positionGroups: Record<string, typeof sellersData> = {};
    sellersData.forEach((seller) => {
      const pos = seller.position;
      if (!positionGroups[pos]) {
        positionGroups[pos] = [];
      }
      positionGroups[pos].push(seller);
    });

    // Convert to array and sort by position priority
    const positionPriority = [
      "comercial_1_captacao",
      "comercial_2_closer",
      "comercial_3_experiencia",
      "comercial_4_farmer",
      "sdr",
      "coordenador",
      "gerente",
      "assistente",
      "outro",
    ];

    return positionPriority
      .filter((pos) => positionGroups[pos] && positionGroups[pos].length > 0)
      .map((pos) => ({
        position: pos,
        label: POSITION_LABELS[pos] || pos,
        sellers: positionGroups[pos].sort((a, b) => b.percent - a.percent), // Best performer first within group
      }));
  }, [profiles, individualGoals, revenueRecords, teams, daysRemaining]);

  // Legacy sellers analysis for fallback
  const sellersAnalysis = useMemo(() => {
    if (!profiles || !individualGoals || !revenueRecords) return [];

    return profiles
      .map((profile) => {
        const goal = individualGoals.find((g) => g.user_id === profile.user_id);
        const goalValue = Number(goal?.revenue_goal) || 0;
        
        if (goalValue === 0) return null;

        const revenue = revenueRecords
          .filter((r) => r.user_id === profile.user_id || r.attributed_to_user_id === profile.user_id)
          .reduce((sum, r) => sum + Number(r.amount), 0);

        const remaining = Math.max(0, goalValue - revenue);
        const percent = goalValue > 0 ? (revenue / goalValue) * 100 : 0;

        return {
          name: profile.full_name,
          goal: goalValue,
          revenue,
          remaining,
          percent: Math.min(percent, 100),
          dailyNeeded: daysRemaining > 0 ? remaining / daysRemaining : 0,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.percent - b.percent); // Sort by lowest percent first
  }, [profiles, individualGoals, revenueRecords, daysRemaining]);

  // Generate insights
  const insights = useMemo(() => {
    const tips: string[] = [];

    // Meta progress insight
    if (metrics.percentMeta1 >= 100) {
      tips.push("🎉 Meta 1 atingida! Foco total na Meta 2!");
    } else if (metrics.percentMeta1 >= 80) {
      tips.push(`📈 Faltam apenas ${formatCurrency(metrics.remainingMeta1)} para a Meta 1 - continue o ritmo!`);
    } else if (isCurrentMonth && currentDay > daysInMonth * 0.5 && metrics.percentMeta1 < 50) {
      tips.push("⚠️ Passamos da metade do mês e ainda não atingimos 50% da meta. Hora de intensificar!");
    }

    // Daily pace insight
    if (isCurrentMonth && metrics.currentDailyAvg > 0) {
      if (metrics.projectedTotal >= metrics.deptMeta3) {
        tips.push("🚀 No ritmo atual, vocês atingirão a META 3! Mantenham a energia!");
      } else if (metrics.projectedTotal >= metrics.deptMeta2) {
        tips.push("✨ Projeção indica META 2 alcançável no ritmo atual.");
      } else if (metrics.projectedTotal >= metrics.deptMeta1) {
        tips.push("📊 Ritmo atual deve garantir a META 1.");
      } else {
        const boost = ((metrics.deptMeta1 / metrics.projectedTotal) - 1) * 100;
        tips.push(`💪 Precisamos aumentar ${boost.toFixed(0)}% nas vendas diárias para bater a Meta 1.`);
      }
    }

    // Department insights
    const criticalDepts = departmentBreakdown.filter((d) => d.status === "precisa_atenção");
    if (criticalDepts.length > 0) {
      tips.push(`🎯 Departamentos que precisam de atenção: ${criticalDepts.map((d) => d.name).join(", ")}`);
    }

    // Procedures needed
    if (metrics.proceduresForMeta1 > 0 && metrics.proceduresForMeta1 <= 10) {
      tips.push(`💰 Apenas ${metrics.proceduresForMeta1} procedimento${metrics.proceduresForMeta1 > 1 ? "s" : ""} no ticket médio para bater a Meta 1!`);
    }

    return tips;
  }, [metrics, departmentBreakdown, isCurrentMonth, currentDay, daysInMonth]);

  const getStatusColor = (percent: number) => {
    if (percent >= 100) return "text-success";
    if (percent >= 70) return "text-amber-500";
    return "text-destructive";
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            <span>O Que Falta para Bater a Meta</span>
            {isCurrentMonth && (
              <Badge variant="outline" className="ml-2 gap-1">
                <Calendar className="w-3 h-3" />
                {daysRemaining} dias restantes
              </Badge>
            )}
          </div>
          {/* Meta Selector for Department Breakdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Calcular QTD por:</span>
            <ToggleGroup 
              type="single" 
              value={selectedMeta} 
              onValueChange={(value) => value && setSelectedMeta(value as MetaType)}
              className="border rounded-lg p-1 bg-muted/50"
            >
              <ToggleGroupItem value="meta1" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Meta 1
              </ToggleGroupItem>
              <ToggleGroupItem value="meta2" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Meta 2
              </ToggleGroupItem>
              <ToggleGroupItem value="meta3" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Meta 3
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Meta 1 */}
          <div className={`p-4 rounded-xl border-2 ${
            metrics.percentMeta1 >= 100 
              ? "bg-success/20 border-success" 
              : "bg-card border-border"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">META 1</span>
              {metrics.percentMeta1 >= 100 && <CheckCircle2 className="w-5 h-5 text-success" />}
            </div>
            <p className="text-xl font-bold mb-1">{formatCurrency(metrics.deptMeta1)}</p>
            <Progress value={Math.min(metrics.percentMeta1, 100)} className="h-2 mb-2" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fechado:</span>
                <span className="font-medium text-success">{formatCurrency(metrics.netSold)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faltam:</span>
                <span className={`font-bold ${metrics.remainingMeta1 > 0 ? "text-destructive" : "text-success"}`}>
                  {metrics.remainingMeta1 > 0 ? formatCurrency(metrics.remainingMeta1) : "✓ Atingida!"}
                </span>
              </div>
              {isCurrentMonth && metrics.remainingMeta1 > 0 && (
                <div className="flex justify-between pt-1 border-t border-border/50">
                  <span className="text-muted-foreground text-xs">Média/dia necessária:</span>
                  <span className="font-medium text-xs">{formatCurrency(metrics.avgDailyNeededMeta1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Meta 2 */}
          <div className={`p-4 rounded-xl border-2 ${
            metrics.percentMeta2 >= 100 
              ? "bg-success/20 border-success" 
              : "bg-card border-border"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">META 2</span>
              {metrics.percentMeta2 >= 100 && <CheckCircle2 className="w-5 h-5 text-success" />}
            </div>
            <p className="text-xl font-bold mb-1">{formatCurrency(metrics.deptMeta2)}</p>
            <Progress value={Math.min(metrics.percentMeta2, 100)} className="h-2 mb-2" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fechado:</span>
                <span className="font-medium text-success">{formatCurrency(metrics.netSold)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faltam:</span>
                <span className={`font-bold ${metrics.remainingMeta2 > 0 ? "text-amber-500" : "text-success"}`}>
                  {metrics.remainingMeta2 > 0 ? formatCurrency(metrics.remainingMeta2) : "✓ Atingida!"}
                </span>
              </div>
              {isCurrentMonth && metrics.remainingMeta2 > 0 && (
                <div className="flex justify-between pt-1 border-t border-border/50">
                  <span className="text-muted-foreground text-xs">Média/dia necessária:</span>
                  <span className="font-medium text-xs">{formatCurrency(metrics.avgDailyNeededMeta2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Meta 3 */}
          <div className={`p-4 rounded-xl border-2 ${
            metrics.percentMeta3 >= 100 
              ? "bg-gradient-gold-shine border-primary shadow-gold" 
              : "bg-card border-primary/50"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-semibold ${metrics.percentMeta3 >= 100 ? "text-primary-foreground" : "text-primary"}`}>
                META 3 (SUPREMA) 🏆
              </span>
              {metrics.percentMeta3 >= 100 && <CheckCircle2 className="w-5 h-5 text-primary-foreground" />}
            </div>
            <p className={`text-xl font-bold mb-1 ${metrics.percentMeta3 >= 100 ? "text-primary-foreground" : ""}`}>
              {formatCurrency(metrics.deptMeta3)}
            </p>
            <Progress value={Math.min(metrics.percentMeta3, 100)} className="h-2 mb-2" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className={metrics.percentMeta3 >= 100 ? "text-primary-foreground/70" : "text-muted-foreground"}>
                  Fechado:
                </span>
                <span className={`font-medium ${metrics.percentMeta3 >= 100 ? "text-primary-foreground" : "text-success"}`}>
                  {formatCurrency(metrics.netSold)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={metrics.percentMeta3 >= 100 ? "text-primary-foreground/70" : "text-muted-foreground"}>
                  Faltam:
                </span>
                <span className={`font-bold ${
                  metrics.percentMeta3 >= 100 ? "text-primary-foreground" : "text-primary"
                }`}>
                  {metrics.remainingMeta3 > 0 ? formatCurrency(metrics.remainingMeta3) : "🏆 CONQUISTADA!"}
                </span>
              </div>
              {isCurrentMonth && metrics.remainingMeta3 > 0 && (
                <div className="flex justify-between pt-1 border-t border-border/50">
                  <span className={metrics.percentMeta3 >= 100 ? "text-primary-foreground/70 text-xs" : "text-muted-foreground text-xs"}>
                    Média/dia necessária:
                  </span>
                  <span className={`font-medium text-xs ${metrics.percentMeta3 >= 100 ? "text-primary-foreground" : ""}`}>
                    {formatCurrency(metrics.avgDailyNeededMeta3)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Calculator className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="font-bold">{formatCurrency(metrics.avgTicket)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-success" />
            <p className="text-xs text-muted-foreground">Média/Dia Atual</p>
            <p className="font-bold">{formatCurrency(metrics.currentDailyAvg)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <ArrowUp className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-xs text-muted-foreground">Projeção Mês</p>
            <p className="font-bold">{formatCurrency(metrics.projectedTotal)}</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
            <p className="text-xs text-muted-foreground">Cancelamentos</p>
            <p className="font-bold text-destructive">{formatCurrency(metrics.totalCancelled)}</p>
          </div>
        </div>

        {/* Procedures Needed */}
        {metrics.remainingMeta1 > 0 && (
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              Procedimentos Necessários (Ticket Médio: {formatCurrency(metrics.avgTicket)})
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-success">{metrics.proceduresForMeta1}</p>
                <p className="text-xs text-muted-foreground">para Meta 1</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{metrics.proceduresForMeta2}</p>
                <p className="text-xs text-muted-foreground">para Meta 2</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{metrics.proceduresForMeta3}</p>
                <p className="text-xs text-muted-foreground">para Meta 3</p>
              </div>
            </div>
          </div>
        )}

        {/* Department Breakdown with Quantity */}
        {departmentBreakdown.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Por Departamento - Quantidade e Valores (Meta 3)
            </h4>
            
            {/* Summary Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary/30 bg-muted/30">
                    <th className="text-left py-2 px-2 font-bold">Departamento</th>
                    <th className="text-center py-2 px-2 font-bold text-blue-600">Meta QTD</th>
                    <th className="text-center py-2 px-2 font-bold text-emerald-600">Vendidos</th>
                    <th className="text-center py-2 px-2 font-bold text-destructive">Falta QTD</th>
                    <th className="text-center py-2 px-2 font-bold text-primary">Por Dia</th>
                    <th className="text-center py-2 px-2 font-bold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentBreakdown.map((dept) => (
                    <tr
                      key={dept.name}
                      className={`border-b border-border/50 hover:bg-muted/50 ${
                        dept.status === "atingida"
                          ? "bg-success/5"
                          : dept.status === "precisa_atenção"
                          ? "bg-destructive/5"
                          : ""
                      }`}
                    >
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          {dept.status === "atingida" && <CheckCircle2 className="w-4 h-4 text-success" />}
                          {dept.status === "precisa_atenção" && <AlertTriangle className="w-4 h-4 text-destructive" />}
                          <span className="font-medium truncate max-w-[150px]">{dept.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-600 font-bold">
                          {dept.metaQtd}
                        </span>
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 font-bold">
                          {dept.count}
                        </span>
                      </td>
                      <td className="text-center py-2 px-2">
                        {dept.faltaQtd > 0 ? (
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/20 text-destructive font-black text-lg">
                            {dept.faltaQtd}
                          </span>
                        ) : (
                          <span className="text-success font-bold">✓</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2">
                        {dept.faltaQtd > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-primary/20 text-primary font-bold">
                            {dept.qtdPorDia.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={`font-bold ${getStatusColor(dept.percent)}`}>
                          {dept.percent.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-primary/50 bg-primary/5 font-bold">
                    <td className="py-2 px-2">TOTAL</td>
                    <td className="text-center py-2 px-2 text-blue-600">
                      {departmentBreakdown.reduce((sum, d) => sum + d.metaQtd, 0)}
                    </td>
                    <td className="text-center py-2 px-2 text-emerald-600">
                      {departmentBreakdown.reduce((sum, d) => sum + d.count, 0)}
                    </td>
                    <td className="text-center py-2 px-2 text-destructive">
                      {departmentBreakdown.reduce((sum, d) => sum + d.faltaQtd, 0)}
                    </td>
                    <td className="text-center py-2 px-2 text-primary">
                      {(departmentBreakdown.reduce((sum, d) => sum + d.faltaQtd, 0) / Math.max(businessDaysRemaining, 1)).toFixed(1)}
                    </td>
                    <td className="text-center py-2 px-2">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Visual Cards for Critical Departments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {departmentBreakdown.filter(d => d.faltaQtd > 0).slice(0, 3).map((dept) => (
                <div
                  key={dept.name}
                  className="p-4 rounded-xl bg-gradient-to-br from-card to-muted/30 border-2 border-destructive/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm truncate">{dept.name.split(' ').slice(0, 2).join(' ')}</span>
                    <Badge variant="destructive" className="text-xs">
                      {dept.percent.toFixed(0)}%
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <div className="text-xl font-black text-blue-600">{dept.metaQtd}</div>
                      <div className="text-xs text-muted-foreground">Meta</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <div className="text-xl font-black text-emerald-600">{dept.count}</div>
                      <div className="text-xs text-muted-foreground">Vendidos</div>
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <div className="text-xl font-black text-destructive">{dept.faltaQtd}</div>
                      <div className="text-xs text-muted-foreground">Falta</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/20 border border-primary/50">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary text-sm">
                      {dept.qtdPorDia.toFixed(1)} por dia útil
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sellers Comparison by Position */}
        {sellersGroupedByPosition.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Comparativo por Cargo - Equipes
            </h4>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {sellersGroupedByPosition.map((group) => (
                <div key={group.position} className="space-y-2">
                  {/* Position Header */}
                  <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md">
                    <Badge variant="outline" className="text-xs font-semibold">
                      {group.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({group.sellers.length} {group.sellers.length === 1 ? "pessoa" : "pessoas"})
                    </span>
                  </div>
                  
                  {/* Sellers Grid - Side by Side for Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.sellers.map((seller, idx) => {
                      // Find if there's a counterpart in other team with same position
                      const hasCounterpart = group.sellers.length > 1;
                      const isTopPerformer = idx === 0 && hasCounterpart;
                      const isUnderperformer = idx === group.sellers.length - 1 && hasCounterpart && idx !== 0;
                      
                      return (
                        <div
                          key={seller.id}
                          className={`p-3 rounded-lg border transition-all ${
                            seller.percent >= 100
                              ? "bg-success/10 border-success/30"
                              : seller.percent >= 70
                              ? "bg-amber-500/10 border-amber-500/30"
                              : "bg-destructive/10 border-destructive/30"
                          } ${isTopPerformer ? "ring-2 ring-success/50" : ""}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {isTopPerformer && <span className="text-success">👑</span>}
                              <span className="font-medium text-sm">{seller.name}</span>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                seller.teamName.toLowerCase().includes("lioness") 
                                  ? "bg-amber-500/20 text-amber-600" 
                                  : "bg-blue-500/20 text-blue-600"
                              }`}
                            >
                              {seller.teamName.replace(" Team", "")}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-1">
                            <Progress value={seller.percent} className="h-2 flex-1" />
                            <span className={`text-sm font-bold min-w-[40px] text-right ${getStatusColor(seller.percent)}`}>
                              {seller.percent.toFixed(0)}%
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(seller.revenue)} / {formatCurrency(seller.goal)}</span>
                            {seller.remaining > 0 ? (
                              <span className="text-destructive font-medium">
                                Falta: {formatCurrency(seller.remaining)}
                              </span>
                            ) : (
                              <span className="text-success font-medium">✓ Meta atingida!</span>
                            )}
                          </div>
                          
                          {seller.remaining > 0 && isCurrentMonth && (
                            <div className="mt-1 pt-1 border-t border-border/50 text-xs text-primary">
                              ~{formatCurrency(seller.dailyNeeded)}/dia para bater meta
                            </div>
                          )}
                          
                          {/* Comparison insight if underperforming */}
                          {isUnderperformer && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs text-muted-foreground flex items-start gap-1">
                                <Lightbulb className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
                                <span>
                                  {group.sellers[0].percent - seller.percent > 20 
                                    ? `Diferença de ${(group.sellers[0].percent - seller.percent).toFixed(0)}% para ${group.sellers[0].name.split(' ')[0]}. Troca de experiências pode ajudar!`
                                    : `Próximo de ${group.sellers[0].name.split(' ')[0]}! Continue focada.`
                                  }
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights & Tips */}
        {insights.length > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-primary" />
              Insights & Sugestões
            </h4>
            <ul className="space-y-2">
              {insights.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalGapAnalysis;
