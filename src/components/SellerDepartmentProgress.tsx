import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface SellerDepartmentProgressProps {
  userId: string;
  month: number;
  year: number;
}

const SellerDepartmentProgress = ({ userId, month, year }: SellerDepartmentProgressProps) => {
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const currentDay = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Fetch department goals (revenue)
  const { data: departmentGoals = [] } = useQuery({
    queryKey: ["department-goals", month, year],
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

  // Fetch quantity goals
  const { data: quantityGoals = [] } = useQuery({
    queryKey: ["department-quantity-goals", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_quantity_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's revenue records
  const { data: revenueRecords = [] } = useQuery({
    queryKey: ["seller-revenue-by-dept", userId, month, year],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
      const { data, error } = await supabase
        .from("revenue_records")
        .select("department, amount")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch count of sellers to calculate individual share
  const { data: sellerCount = 1 } = useQuery({
    queryKey: ["seller-count-for-dept"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("predefined_goals")
        .select("*", { count: "exact", head: true })
        .eq("month", month)
        .eq("year", year)
        .not("matched_user_id", "is", null);
      if (error) throw error;
      return count || 1;
    },
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

  // Calculate individual share of goals
  const individualShareDivisor = Math.max(sellerCount, 1);

  // Build revenue department data
  const revenueDepartments: DepartmentData[] = departmentGoals.map((dg) => {
    const individualGoal = dg.meta1_goal / individualShareDivisor;
    return {
      name: SHORT_NAMES[dg.department_name] || dg.department_name,
      goal: individualGoal,
      sold: revenueByDept[dg.department_name] || 0,
    };
  }).filter(d => d.goal > 0);

  // Build quantity department data
  const quantityDepartments: DepartmentData[] = quantityGoals.map((qg) => {
    const individualGoal = Math.ceil(qg.quantity_goal / individualShareDivisor);
    return {
      name: SHORT_NAMES[qg.department_name] || qg.department_name,
      goal: individualGoal,
      sold: countByDept[qg.department_name] || 0,
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
    if (sold >= goal) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Meta!</Badge>;
    if (sold >= expected) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Acima</Badge>;
    if (sold >= expected * 0.8) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Abaixo</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Crítico</Badge>;
  };

  if (departmentGoals.length === 0 && quantityGoals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Revenue by Department */}
      {revenueDepartments.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-primary" />
              Progresso por Departamento (Faturamento)
              <Badge variant="outline" className="ml-2 text-[10px]">R$</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-right text-xs">Meta</TableHead>
                  <TableHead className="text-right text-xs">Vendido</TableHead>
                  <TableHead className="text-right text-xs">Falta</TableHead>
                  <TableHead className="text-center text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueDepartments.map((dept) => {
                  const expected = (dept.goal / totalDaysInMonth) * currentDay;
                  const remaining = Math.max(0, dept.goal - dept.sold);
                  return (
                    <TableRow key={dept.name} className="text-xs">
                      <TableCell className="font-medium py-1">{dept.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-1">
                        {formatCurrency(dept.goal)}
                      </TableCell>
                      <TableCell className="text-right font-semibold py-1">
                        {formatCurrency(dept.sold)}
                      </TableCell>
                      <TableCell className="text-right text-amber-400 py-1">
                        {formatCurrency(remaining)}
                      </TableCell>
                      <TableCell className="text-center py-1">
                        {getStatusBadge(dept.sold, dept.goal, expected)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 border-primary/30 bg-primary/5 text-xs">
                  <TableCell className="font-bold py-1">TOTAL</TableCell>
                  <TableCell className="text-right font-bold py-1">{formatCurrency(totalRevenueGoal)}</TableCell>
                  <TableCell className="text-right font-bold text-primary py-1">{formatCurrency(totalRevenueSold)}</TableCell>
                  <TableCell className="text-right font-bold text-amber-400 py-1">
                    {formatCurrency(Math.max(0, totalRevenueGoal - totalRevenueSold))}
                  </TableCell>
                  <TableCell className="text-center py-1">
                    {getStatusBadge(totalRevenueSold, totalRevenueGoal, (totalRevenueGoal / totalDaysInMonth) * currentDay)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Progresso: {revenueProgress.toFixed(1)}%</span>
                <span>Dia {currentDay}/{totalDaysInMonth}</span>
              </div>
              <Progress value={revenueProgress} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quantity by Department */}
      {quantityDepartments.length > 0 && (
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Hash className="w-4 h-4 text-primary" />
              Progresso por Departamento (Quantidade)
              <Badge variant="outline" className="ml-2 text-[10px]"># Qtd</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-right text-xs">Meta</TableHead>
                  <TableHead className="text-right text-xs">Vendido</TableHead>
                  <TableHead className="text-right text-xs">Falta</TableHead>
                  <TableHead className="text-center text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quantityDepartments.map((dept) => {
                  const expected = Math.ceil((dept.goal / totalDaysInMonth) * currentDay);
                  const remaining = Math.max(0, dept.goal - dept.sold);
                  return (
                    <TableRow key={dept.name} className="text-xs">
                      <TableCell className="font-medium py-1">{dept.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-1">{dept.goal}</TableCell>
                      <TableCell className="text-right font-semibold py-1">{dept.sold}</TableCell>
                      <TableCell className="text-right text-amber-400 py-1">{remaining}</TableCell>
                      <TableCell className="text-center py-1">
                        {getStatusBadge(dept.sold, dept.goal, expected)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 border-primary/30 bg-primary/5 text-xs">
                  <TableCell className="font-bold py-1">TOTAL</TableCell>
                  <TableCell className="text-right font-bold py-1">{totalQuantityGoal}</TableCell>
                  <TableCell className="text-right font-bold text-primary py-1">{totalQuantitySold}</TableCell>
                  <TableCell className="text-right font-bold text-amber-400 py-1">
                    {Math.max(0, totalQuantityGoal - totalQuantitySold)}
                  </TableCell>
                  <TableCell className="text-center py-1">
                    {getStatusBadge(totalQuantitySold, totalQuantityGoal, (totalQuantityGoal / totalDaysInMonth) * currentDay)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Progresso: {quantityProgress.toFixed(1)}%</span>
                <span>Dia {currentDay}/{totalDaysInMonth}</span>
              </div>
              <Progress value={quantityProgress} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SellerDepartmentProgress;
