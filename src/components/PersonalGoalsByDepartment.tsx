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
  AlertTriangle,
  Medal,
  Award,
  Loader2,
} from "lucide-react";
import { differenceInDays } from "date-fns";

interface PersonalGoalsByDepartmentProps {
  month: number;
  year: number;
}

// Map database department strings to department_goals names
const DEPARTMENT_MAPPING: Record<string, string> = {
  "01 - CIRURGIA PLÁSTICA": "Cirurgia Plástica",
  "02 - CONSULTA CIRURGIA PLÁSTICA": "Consulta Cirurgia Plástica",
  "03 - PÓS OPERATÓRIO": "Pós Operatório",
  "04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS": "Soroterapia / Protocolos Nutricionais",
  "05 - RETORNO": "Retorno",
  "06 - RETOQUE - CIRURGIA PLÁSTICA": "Cirurgia Plástica",
  "08 - HARMONIZAÇÃO FACIAL E CORPORAL": "Harmonização Facial e Corporal",
  "09 - SPA E ESTÉTICA": "Spa e Estética",
  "16 - OUTROS": "Unique Travel Experience",
  "25 - UNIQUE TRAVEL EXPERIENCE": "Unique Travel Experience",
  "25 -UNIQUE TRAVEL EXPERIENCE": "Unique Travel Experience",
  "21 - PRODUTOS LUXSKIN": "Luxskin",
  "LUXSKIN": "Luxskin",
  "15 - LUXSKIN": "Luxskin",
};

interface DepartmentGoalData {
  department: string;
  meta1: number;
  meta2: number;
  meta3: number;
  realized: number;
  percentMeta1: number;
  percentMeta2: number;
  percentMeta3: number;
  achievedLevel: "none" | "meta1" | "meta2" | "meta3";
}

export default function PersonalGoalsByDepartment({ month, year }: PersonalGoalsByDepartmentProps) {
  const { user, profile } = useAuth();
  const now = new Date();
  const endOfMonth = new Date(year, month, 0);
  const daysRemaining = differenceInDays(endOfMonth, now);
  const businessDaysRemaining = Math.ceil(daysRemaining * 0.71);

  // Fetch seller's individual department goals from seller_department_goals table
  const { data: sellerDeptGoals = [], isLoading: loadingDeptGoals } = useQuery({
    queryKey: ["seller-department-goals", user?.id, month, year],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("seller_department_goals")
        .select("*")
        .eq("user_id", user.id)
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

  const { data: revenueRecords = [], isLoading: loadingRevenue } = useQuery({
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return formatCurrency(value);
  };

  // Process revenue by department
  const revenueByDept: Record<string, number> = {};
  revenueRecords.forEach((r) => {
    const rawDept = r.department || "";
    const mappedDept = DEPARTMENT_MAPPING[rawDept] || rawDept;
    revenueByDept[mappedDept] = (revenueByDept[mappedDept] || 0) + (r.amount || 0);
  });

  // Build department data from seller's individual goals
  const departmentData: DepartmentGoalData[] = sellerDeptGoals.map((dg) => {
    const meta1 = Number(dg.meta1_goal) || 0;
    const meta2 = Number(dg.meta2_goal) || 0;
    const meta3 = Number(dg.meta3_goal) || 0;
    const realized = revenueByDept[dg.department_name] || 0;

    const percentMeta1 = meta1 > 0 ? Math.round((realized / meta1) * 100) : 0;
    const percentMeta2 = meta2 > 0 ? Math.round((realized / meta2) * 100) : 0;
    const percentMeta3 = meta3 > 0 ? Math.round((realized / meta3) * 100) : 0;

    let achievedLevel: "none" | "meta1" | "meta2" | "meta3" = "none";
    if (realized >= meta3 && meta3 > 0) achievedLevel = "meta3";
    else if (realized >= meta2 && meta2 > 0) achievedLevel = "meta2";
    else if (realized >= meta1 && meta1 > 0) achievedLevel = "meta1";

    return {
      department: dg.department_name,
      meta1,
      meta2,
      meta3,
      realized,
      percentMeta1,
      percentMeta2,
      percentMeta3,
      achievedLevel,
    };
  }).filter(d => d.meta3 > 0).sort((a, b) => b.meta3 - a.meta3);

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

  if (loadingDeptGoals || loadingRevenue) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Carregando metas...</span>
        </CardContent>
      </Card>
    );
  }

  if (sellerDeptGoals.length === 0) {
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
            Metas por Departamento - {profile?.full_name}
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
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getAchievementBadge(dept.achievedLevel)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/30 font-bold border-t-2">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span>{formatCompact(totals.meta1)}</span>
                      <span className="text-xs text-muted-foreground">{totalPercentMeta1}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span>{formatCompact(totals.meta2)}</span>
                      <span className="text-xs text-muted-foreground">{totalPercentMeta2}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-primary">{formatCompact(totals.meta3)}</span>
                      <span className="text-xs text-primary">{totalPercentMeta3}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-success">{formatCompact(totals.realized)}</span>
                  </TableCell>
                  <TableCell>
                    <Progress value={Math.min(totalPercentMeta3, 100)} className="h-2" />
                  </TableCell>
                  <TableCell className="text-center">
                    {getAchievementBadge(totalAchievedLevel)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
