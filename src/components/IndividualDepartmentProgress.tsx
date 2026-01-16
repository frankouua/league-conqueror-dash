import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Hash } from "lucide-react";

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

const SHORT_NAMES: Record<string, string> = {
  "Cirurgia Plástica": "Cirurgia",
  "Consulta Cirurgia Plástica": "Consulta",
  "Pós Operatório": "Pós-Op",
  "Soroterapia / Protocolos Nutricionais": "Soroterapia",
  "Harmonização Facial e Corporal": "Harmonia",
  "Spa e Estética": "Spa",
  "Unique Travel Experience": "Travel",
  "Luxskin": "Luxskin",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface DepartmentData {
  name: string;
  goal: number;
  sold: number;
}

const IndividualDepartmentProgress = () => {
  const { user } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Fetch individual seller department goals (metas individuais)
  const { data: sellerDeptGoals = [] } = useQuery({
    queryKey: ["seller-department-goals", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_department_goals")
        .select("*")
        .eq("user_id", user?.id)
        .eq("month", currentMonth)
        .eq("year", currentYear);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's revenue records
  const { data: revenueRecords = [] } = useQuery({
    queryKey: ["my-revenue-by-dept", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${lastDay}`;
      const { data, error } = await supabase
        .from("revenue_records")
        .select("department, amount")
        .eq("attributed_to_user_id", user?.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Process revenue data by department
  const revenueByDept: Record<string, number> = {};
  const countByDept: Record<string, number> = {};
  
  revenueRecords.forEach((r) => {
    const rawDept = r.department || "";
    const mappedDept = DEPARTMENT_MAPPING[rawDept] || null;
    if (mappedDept) {
      revenueByDept[mappedDept] = (revenueByDept[mappedDept] || 0) + (r.amount || 0);
      countByDept[mappedDept] = (countByDept[mappedDept] || 0) + 1;
    }
  });

  // Build revenue department data using individual seller goals
  const revenueDepartments: DepartmentData[] = sellerDeptGoals.map((sdg) => {
    return {
      name: SHORT_NAMES[sdg.department_name] || sdg.department_name,
      goal: sdg.meta1_goal || 0,
      sold: revenueByDept[sdg.department_name] || 0,
    };
  }).filter(d => d.goal > 0);

  // Build quantity department data using individual seller goals
  const quantityDepartments: DepartmentData[] = sellerDeptGoals.map((sdg) => {
    return {
      name: SHORT_NAMES[sdg.department_name] || sdg.department_name,
      goal: sdg.meta1_qty || 0,
      sold: countByDept[sdg.department_name] || 0,
    };
  }).filter(d => d.goal > 0);

  // Sort by goal descending
  revenueDepartments.sort((a, b) => b.goal - a.goal);
  quantityDepartments.sort((a, b) => b.goal - a.goal);

  // Calculate totals
  const totalRevenueGoal = revenueDepartments.reduce((s, d) => s + d.goal, 0);
  const totalRevenueSold = revenueDepartments.reduce((s, d) => s + d.sold, 0);
  const totalQuantityGoal = quantityDepartments.reduce((s, d) => s + d.goal, 0);
  const totalQuantitySold = quantityDepartments.reduce((s, d) => s + d.sold, 0);

  const revenueProgress = totalRevenueGoal > 0 ? (totalRevenueSold / totalRevenueGoal) * 100 : 0;
  const quantityProgress = totalQuantityGoal > 0 ? (totalQuantitySold / totalQuantityGoal) * 100 : 0;

  const getStatusBadge = (sold: number, goal: number, expected: number) => {
    if (sold >= goal) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Meta!</Badge>;
    if (sold >= expected) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Acima</Badge>;
    if (sold >= expected * 0.8) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Abaixo</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Crítico</Badge>;
  };

  const getPercentBadge = (sold: number, expected: number) => {
    if (expected === 0) return <Badge className="bg-muted text-muted-foreground">+0%</Badge>;
    const diff = ((sold - expected) / expected) * 100;
    if (diff >= 0) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">+{diff.toFixed(0)}%</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{diff.toFixed(0)}%</Badge>;
  };

  if (sellerDeptGoals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Revenue by Department */}
      {revenueDepartments.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4 text-primary" />
              Meu Progresso por Departamento (Faturamento)
              <Badge variant="outline" className="ml-2">R$</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Total: {formatCurrency(totalRevenueSold)} / {formatCurrency(totalRevenueGoal)}
              {getPercentBadge(totalRevenueSold, (totalRevenueGoal / totalDaysInMonth) * currentDay)}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Falta</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueDepartments.map((dept) => {
                  const expected = (dept.goal / totalDaysInMonth) * currentDay;
                  const remaining = Math.max(0, dept.goal - dept.sold);
                  return (
                    <TableRow key={dept.name}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(dept.goal)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatCurrency(dept.sold)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(expected)}
                      </TableCell>
                      <TableCell className="text-right text-amber-400">
                        {formatCurrency(remaining)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(dept.sold, dept.goal, expected)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 border-primary/30 bg-primary/5">
                  <TableCell className="font-bold"># TOTAL</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totalRevenueGoal)}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{formatCurrency(totalRevenueSold)}</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency((totalRevenueGoal / totalDaysInMonth) * currentDay)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-400">
                    {formatCurrency(Math.max(0, totalRevenueGoal - totalRevenueSold))}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(totalRevenueSold, totalRevenueGoal, (totalRevenueGoal / totalDaysInMonth) * currentDay)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso: {revenueProgress.toFixed(1)}%</span>
                <span>Dia {currentDay}/{totalDaysInMonth}</span>
              </div>
              <Progress value={revenueProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quantity by Department */}
      {quantityDepartments.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="w-4 h-4 text-primary" />
              Meu Progresso por Departamento (Quantidade)
              <Badge variant="outline" className="ml-2"># Qtd</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Total: {totalQuantitySold} / {totalQuantityGoal} procedimentos
              {getPercentBadge(totalQuantitySold, (totalQuantityGoal / totalDaysInMonth) * currentDay)}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Falta</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quantityDepartments.map((dept) => {
                  const expected = Math.ceil((dept.goal / totalDaysInMonth) * currentDay);
                  const remaining = Math.max(0, dept.goal - dept.sold);
                  return (
                    <TableRow key={dept.name}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{dept.goal}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{dept.sold}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{expected}</TableCell>
                      <TableCell className="text-right text-amber-400">{remaining}</TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(dept.sold, dept.goal, expected)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 border-primary/30 bg-primary/5">
                  <TableCell className="font-bold"># TOTAL</TableCell>
                  <TableCell className="text-right font-bold">{totalQuantityGoal}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{totalQuantitySold}</TableCell>
                  <TableCell className="text-right font-bold">
                    {Math.ceil((totalQuantityGoal / totalDaysInMonth) * currentDay)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-400">
                    {Math.max(0, totalQuantityGoal - totalQuantitySold)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(totalQuantitySold, totalQuantityGoal, (totalQuantityGoal / totalDaysInMonth) * currentDay)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso: {quantityProgress.toFixed(1)}%</span>
                <span>Dia {currentDay}/{totalDaysInMonth}</span>
              </div>
              <Progress value={quantityProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IndividualDepartmentProgress;
