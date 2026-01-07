import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Target,
  Trophy,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Medal,
  Award,
  Star,
  Calendar,
  Loader2,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PersonalGoalsByDepartmentProps {
  month: number;
  year: number;
}

interface DepartmentGoalData {
  department: string;
  meta1: number;
  meta2: number;
  meta3: number;
  realized: number;
  remaining: number;
  percentMeta1: number;
  percentMeta2: number;
  percentMeta3: number;
  achievedLevel: "none" | "meta1" | "meta2" | "meta3";
  suggestion: string;
}

export default function PersonalGoalsByDepartment({ month, year }: PersonalGoalsByDepartmentProps) {
  const { user, profile } = useAuth();
  const now = new Date();
  const endOfMonth = new Date(year, month, 0);
  const daysRemaining = differenceInDays(endOfMonth, now);
  const businessDaysRemaining = Math.ceil(daysRemaining * 0.71); // ~5/7 days are business days

  // Fetch predefined goals for this user
  const { data: predefinedGoals, isLoading: loadingGoals } = useQuery({
    queryKey: ["personal-predefined-goals", user?.id, month, year],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("matched_user_id", user.id)
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch revenue records for this month
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const { data: revenueRecords, isLoading: loadingRevenue } = useQuery({
    queryKey: ["personal-revenue-by-dept", user?.id, month, year],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .eq("attributed_to_user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return formatCurrency(value);
  };

  // Process data
  const departmentData: DepartmentGoalData[] = predefinedGoals?.map((goal) => {
    const deptRevenue = revenueRecords?.filter((r) => 
      r.department === goal.department || 
      r.department?.toLowerCase().includes(goal.department?.toLowerCase() || "")
    ) || [];
    const realized = deptRevenue.reduce((sum, r) => sum + Number(r.amount), 0);

    const meta1 = Number(goal.meta1_goal) || 0;
    const meta2 = Number(goal.meta2_goal) || 0;
    const meta3 = Number(goal.meta3_goal) || 0;

    const percentMeta1 = meta1 > 0 ? Math.round((realized / meta1) * 100) : 0;
    const percentMeta2 = meta2 > 0 ? Math.round((realized / meta2) * 100) : 0;
    const percentMeta3 = meta3 > 0 ? Math.round((realized / meta3) * 100) : 0;

    let achievedLevel: "none" | "meta1" | "meta2" | "meta3" = "none";
    if (realized >= meta3 && meta3 > 0) achievedLevel = "meta3";
    else if (realized >= meta2 && meta2 > 0) achievedLevel = "meta2";
    else if (realized >= meta1 && meta1 > 0) achievedLevel = "meta1";

    // Calculate remaining to next goal
    let remaining = 0;
    let targetMeta = meta1;
    if (achievedLevel === "none") {
      remaining = meta1 - realized;
      targetMeta = meta1;
    } else if (achievedLevel === "meta1") {
      remaining = meta2 - realized;
      targetMeta = meta2;
    } else if (achievedLevel === "meta2") {
      remaining = meta3 - realized;
      targetMeta = meta3;
    }

    // Generate suggestion
    let suggestion = "";
    const dailyNeeded = businessDaysRemaining > 0 ? remaining / businessDaysRemaining : remaining;
    
    if (achievedLevel === "meta3") {
      suggestion = "🏆 Parabéns! Você já atingiu a Meta 3! Continue mantendo o ritmo.";
    } else if (achievedLevel === "meta2") {
      suggestion = `Para atingir a Meta 3, venda mais ${formatCurrency(remaining)} (${formatCurrency(dailyNeeded)}/dia útil).`;
    } else if (achievedLevel === "meta1") {
      suggestion = `Para atingir a Meta 2, venda mais ${formatCurrency(remaining)} (${formatCurrency(dailyNeeded)}/dia útil).`;
    } else if (meta1 > 0) {
      suggestion = `Para atingir a Meta 1, venda mais ${formatCurrency(remaining)} (${formatCurrency(dailyNeeded)}/dia útil).`;
    } else {
      suggestion = "Sem meta definida para este departamento.";
    }

    return {
      department: goal.department || "Comercial",
      meta1,
      meta2,
      meta3,
      realized,
      remaining: Math.max(remaining, 0),
      percentMeta1,
      percentMeta2,
      percentMeta3,
      achievedLevel,
      suggestion,
    };
  }) || [];

  // Calculate totals
  const totals = departmentData.reduce(
    (acc, d) => ({
      meta1: acc.meta1 + d.meta1,
      meta2: acc.meta2 + d.meta2,
      meta3: acc.meta3 + d.meta3,
      realized: acc.realized + d.realized,
    }),
    { meta1: 0, meta2: 0, meta3: 0, realized: 0 }
  );

  const totalPercentMeta1 = totals.meta1 > 0 ? Math.round((totals.realized / totals.meta1) * 100) : 0;
  const totalPercentMeta2 = totals.meta2 > 0 ? Math.round((totals.realized / totals.meta2) * 100) : 0;
  const totalPercentMeta3 = totals.meta3 > 0 ? Math.round((totals.realized / totals.meta3) * 100) : 0;

  let totalAchievedLevel: "none" | "meta1" | "meta2" | "meta3" = "none";
  if (totals.realized >= totals.meta3 && totals.meta3 > 0) totalAchievedLevel = "meta3";
  else if (totals.realized >= totals.meta2 && totals.meta2 > 0) totalAchievedLevel = "meta2";
  else if (totals.realized >= totals.meta1 && totals.meta1 > 0) totalAchievedLevel = "meta1";

  const getAchievementBadge = (level: "none" | "meta1" | "meta2" | "meta3") => {
    switch (level) {
      case "meta3":
        return (
          <Badge className="bg-primary text-primary-foreground gap-1">
            <Trophy className="w-3 h-3" />
            Meta 3 ✓
          </Badge>
        );
      case "meta2":
        return (
          <Badge className="bg-success text-success-foreground gap-1">
            <Medal className="w-3 h-3" />
            Meta 2 ✓
          </Badge>
        );
      case "meta1":
        return (
          <Badge className="bg-amber-500 text-white gap-1">
            <Award className="w-3 h-3" />
            Meta 1 ✓
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <AlertTriangle className="w-3 h-3" />
            Pendente
          </Badge>
        );
    }
  };

  const getProgressColor = (percent: number, achieved: boolean) => {
    if (achieved) return "bg-success";
    if (percent >= 80) return "bg-amber-500";
    if (percent >= 50) return "bg-warning";
    return "bg-destructive/60";
  };

  if (loadingGoals || loadingRevenue) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Carregando metas...</span>
        </CardContent>
      </Card>
    );
  }

  if (!predefinedGoals || predefinedGoals.length === 0) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
          <h3 className="text-lg font-semibold mb-2">Sem metas definidas</h3>
          <p className="text-muted-foreground">
            Você não possui metas individuais definidas para {month}/{year}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Resumo */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Metas Pessoais de {profile?.full_name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {daysRemaining > 0 ? `${daysRemaining} dias restantes • ~${businessDaysRemaining} dias úteis` : "Mês encerrado"}
          </p>
        </CardHeader>
        <CardContent>
          {/* Resumo Total */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Meta 1 Total</p>
              <p className="text-lg font-bold">{formatCompact(totals.meta1)}</p>
              <Progress 
                value={Math.min(totalPercentMeta1, 100)} 
                className="h-1.5 mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">{totalPercentMeta1}%</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Meta 2 Total</p>
              <p className="text-lg font-bold">{formatCompact(totals.meta2)}</p>
              <Progress 
                value={Math.min(totalPercentMeta2, 100)} 
                className="h-1.5 mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">{totalPercentMeta2}%</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-xs text-primary mb-1">Meta 3 Total</p>
              <p className="text-lg font-bold text-primary">{formatCompact(totals.meta3)}</p>
              <Progress 
                value={Math.min(totalPercentMeta3, 100)} 
                className="h-1.5 mt-2" 
              />
              <p className="text-xs text-primary mt-1">{totalPercentMeta3}%</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/10 border border-success/30">
              <p className="text-xs text-success mb-1">Realizado</p>
              <p className="text-lg font-bold text-success">{formatCompact(totals.realized)}</p>
              <div className="mt-2">
                {getAchievementBadge(totalAchievedLevel)}
              </div>
            </div>
          </div>

          {/* Tabela por Departamento */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold min-w-[180px]">Departamento</TableHead>
                  <TableHead className="text-center font-bold w-[100px]">Meta 1</TableHead>
                  <TableHead className="text-center font-bold w-[100px]">Meta 2</TableHead>
                  <TableHead className="text-center font-bold w-[100px]">Meta 3</TableHead>
                  <TableHead className="text-center font-bold text-success w-[100px]">Realizado</TableHead>
                  <TableHead className="text-center font-bold w-[100px]">Progresso</TableHead>
                  <TableHead className="text-center font-bold w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentData.map((dept) => (
                  <TableRow key={dept.department} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <span className="capitalize">{dept.department}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className={dept.achievedLevel !== "none" ? "line-through text-muted-foreground" : ""}>
                          {formatCompact(dept.meta1)}
                        </span>
                        <span className="text-xs text-muted-foreground">{dept.percentMeta1}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className={["meta2", "meta3"].includes(dept.achievedLevel) ? "line-through text-muted-foreground" : ""}>
                          {formatCompact(dept.meta2)}
                        </span>
                        <span className="text-xs text-muted-foreground">{dept.percentMeta2}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-semibold ${dept.achievedLevel === "meta3" ? "line-through text-muted-foreground" : "text-primary"}`}>
                          {formatCompact(dept.meta3)}
                        </span>
                        <span className="text-xs text-primary">{dept.percentMeta3}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-success">
                        {formatCompact(dept.realized)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Progress 
                          value={Math.min(dept.percentMeta3, 100)} 
                          className={`h-2 ${getProgressColor(dept.percentMeta3, dept.achievedLevel === "meta3")}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getAchievementBadge(dept.achievedLevel)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sugestões para bater as metas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-warning" />
            Sugestões para Bater suas Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {departmentData.map((dept, index) => (
              <AccordionItem key={dept.department} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <span className="capitalize font-medium">{dept.department}</span>
                    {getAchievementBadge(dept.achievedLevel)}
                    {dept.achievedLevel !== "meta3" && dept.remaining > 0 && (
                      <span className="text-xs text-destructive ml-auto mr-4">
                        Faltam {formatCurrency(dept.remaining)}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pl-2">
                    {/* Progress bars for each meta */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-16">Meta 1:</span>
                        <Progress value={Math.min(dept.percentMeta1, 100)} className="h-2 flex-1" />
                        <span className={`text-sm font-medium w-20 text-right ${dept.achievedLevel !== "none" ? "text-success" : ""}`}>
                          {dept.percentMeta1}% {dept.achievedLevel !== "none" && "✓"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-16">Meta 2:</span>
                        <Progress value={Math.min(dept.percentMeta2, 100)} className="h-2 flex-1" />
                        <span className={`text-sm font-medium w-20 text-right ${["meta2", "meta3"].includes(dept.achievedLevel) ? "text-success" : ""}`}>
                          {dept.percentMeta2}% {["meta2", "meta3"].includes(dept.achievedLevel) && "✓"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm w-16 text-primary font-medium">Meta 3:</span>
                        <Progress value={Math.min(dept.percentMeta3, 100)} className="h-2 flex-1" />
                        <span className={`text-sm font-medium w-20 text-right ${dept.achievedLevel === "meta3" ? "text-primary" : ""}`}>
                          {dept.percentMeta3}% {dept.achievedLevel === "meta3" && "🏆"}
                        </span>
                      </div>
                    </div>

                    {/* Suggestion */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                        <p className="text-sm">{dept.suggestion}</p>
                      </div>
                    </div>

                    {/* Values breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="p-2 rounded bg-muted/30 text-center">
                        <p className="text-muted-foreground text-xs">Meta 1</p>
                        <p className="font-medium">{formatCurrency(dept.meta1)}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/30 text-center">
                        <p className="text-muted-foreground text-xs">Meta 2</p>
                        <p className="font-medium">{formatCurrency(dept.meta2)}</p>
                      </div>
                      <div className="p-2 rounded bg-primary/10 text-center">
                        <p className="text-primary text-xs">Meta 3</p>
                        <p className="font-medium text-primary">{formatCurrency(dept.meta3)}</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Dica geral */}
          {daysRemaining > 0 && totalAchievedLevel !== "meta3" && (
            <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Foco no final do mês!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalAchievedLevel === "none" 
                      ? `Você precisa vender ${formatCurrency(totals.meta1 - totals.realized)} para atingir a Meta 1.`
                      : totalAchievedLevel === "meta1"
                      ? `Você precisa vender mais ${formatCurrency(totals.meta2 - totals.realized)} para atingir a Meta 2.`
                      : `Você precisa vender mais ${formatCurrency(totals.meta3 - totals.realized)} para atingir a Meta 3.`
                    }
                    {" "}Isso representa{" "}
                    {formatCurrency(
                      (totalAchievedLevel === "none" 
                        ? (totals.meta1 - totals.realized)
                        : totalAchievedLevel === "meta1"
                        ? (totals.meta2 - totals.realized)
                        : (totals.meta3 - totals.realized)
                      ) / Math.max(businessDaysRemaining, 1)
                    )} por dia útil.
                  </p>
                </div>
              </div>
            </div>
          )}

          {totalAchievedLevel === "meta3" && (
            <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/30">
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-success">Parabéns! Você é um campeão! 🏆</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você atingiu todas as suas metas! Continue mantendo este excelente desempenho.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
