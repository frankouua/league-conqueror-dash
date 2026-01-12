import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, TrendingDown, Loader2, Building2 } from "lucide-react";
import lionessLogo from "@/assets/brasao-lioness-team.png";
import troiaLogo from "@/assets/brasao-troia-team.png";

interface DepartmentGoalCardsProps {
  month: number;
  year: number;
  filterDepartment?: string | null;
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
  "LUXSKIN": "Luxskin",
  "15 - LUXSKIN": "Luxskin",
};

// Department icons and colors
const DEPARTMENT_CONFIG: Record<string, { icon: string; color: string }> = {
  "Cirurgia Plástica": { icon: "🏥", color: "from-rose-500/20 to-rose-600/10" },
  "Consulta Cirurgia Plástica": { icon: "🎯", color: "from-amber-500/20 to-amber-600/10" },
  "Pós Operatório": { icon: "💊", color: "from-blue-500/20 to-blue-600/10" },
  "Soroterapia / Protocolos Nutricionais": { icon: "💉", color: "from-green-500/20 to-green-600/10" },
  "Harmonização Facial e Corporal": { icon: "✨", color: "from-purple-500/20 to-purple-600/10" },
  "Spa e Estética": { icon: "🧖", color: "from-pink-500/20 to-pink-600/10" },
  "Unique Travel Experience": { icon: "✈️", color: "from-cyan-500/20 to-cyan-600/10" },
  "Luxskin": { icon: "💎", color: "from-violet-500/20 to-violet-600/10" },
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return `R$ ${value.toLocaleString("pt-BR")}`;
};

export function DepartmentGoalCards({ month, year, filterDepartment }: DepartmentGoalCardsProps) {
  const now = new Date();
  const isCurrentPeriod = month === (now.getMonth() + 1) && year === now.getFullYear();
  const currentDay = isCurrentPeriod ? now.getDate() : new Date(year, month, 0).getDate();
  const totalDays = new Date(year, month, 0).getDate();
  const monthProgress = Math.round((currentDay / totalDays) * 100);

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch value goals (meta1 = main goal)
  const { data: valueGoals, isLoading: loadingValueGoals } = useQuery({
    queryKey: ["department-value-goals", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch quantity goals
  const { data: quantityGoals, isLoading: loadingQtyGoals } = useQuery({
    queryKey: ["department-quantity-goals", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_quantity_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch revenue records with team_id and amount
  const { data: revenueRecords, isLoading: loadingRecords } = useQuery({
    queryKey: ["revenue-records-dept-cards", month, year],
    queryFn: async () => {
      const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
      
      const { data, error } = await supabase
        .from("revenue_records")
        .select("department, amount, team_id")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth);
      if (error) throw error;
      return data || [];
    },
  });

  // Process data into department cards
  const { departmentCards, totals } = useMemo(() => {
    if (!valueGoals || !quantityGoals || !revenueRecords || !teams) {
      return { departmentCards: [], totals: null };
    }

    // Create team lookup
    const teamLookup: Record<string, string> = {};
    teams.forEach(t => { teamLookup[t.id] = t.name; });

    // Aggregate data by department
    const deptData: Record<string, {
      qtyGoal: number;
      valueGoal: number;
      qtySold: number;
      valueSold: number;
      teamBreakdown: Record<string, { qty: number; value: number }>;
    }> = {};

    // Initialize with goals
    quantityGoals.forEach(qg => {
      if (!deptData[qg.department_name]) {
        deptData[qg.department_name] = { qtyGoal: 0, valueGoal: 0, qtySold: 0, valueSold: 0, teamBreakdown: {} };
      }
      deptData[qg.department_name].qtyGoal = qg.quantity_goal;
    });

    valueGoals.forEach(vg => {
      if (!deptData[vg.department_name]) {
        deptData[vg.department_name] = { qtyGoal: 0, valueGoal: 0, qtySold: 0, valueSold: 0, teamBreakdown: {} };
      }
      deptData[vg.department_name].valueGoal = vg.meta3_goal; // Using meta3 (main goal)
    });

    // Aggregate sales
    revenueRecords.forEach((record) => {
      const rawDept = record.department || "";
      const mappedDept = DEPARTMENT_MAPPING[rawDept] || rawDept;
      const amount = Number(record.amount) || 0;
      const teamId = record.team_id || "";
      const teamName = teamLookup[teamId] || "Outro";

      if (!deptData[mappedDept]) {
        deptData[mappedDept] = { qtyGoal: 0, valueGoal: 0, qtySold: 0, valueSold: 0, teamBreakdown: {} };
      }
      
      deptData[mappedDept].qtySold += 1;
      deptData[mappedDept].valueSold += amount;
      
      if (!deptData[mappedDept].teamBreakdown[teamName]) {
        deptData[mappedDept].teamBreakdown[teamName] = { qty: 0, value: 0 };
      }
      deptData[mappedDept].teamBreakdown[teamName].qty += 1;
      deptData[mappedDept].teamBreakdown[teamName].value += amount;
    });

    // Build cards
    const cards = Object.entries(deptData)
      .filter(([name, data]) => data.qtyGoal > 0 || data.valueGoal > 0)
      .map(([name, data]) => {
        const qtyExpected = Math.round((data.qtyGoal / totalDays) * currentDay);
        const valueExpected = Math.round((data.valueGoal / totalDays) * currentDay);
        
        const qtyDiff = data.qtySold - qtyExpected;
        const valueDiff = data.valueSold - valueExpected;
        
        const qtyPercent = data.qtyGoal > 0 ? Math.round((data.qtySold / data.qtyGoal) * 100) : 0;
        const valuePercent = data.valueGoal > 0 ? Math.round((data.valueSold / data.valueGoal) * 100) : 0;
        
        const qtyPacePercent = qtyExpected > 0 ? Math.round((qtyDiff / qtyExpected) * 100) : 0;
        const valuePacePercent = valueExpected > 0 ? Math.round((valueDiff / valueExpected) * 100) : 0;

        return {
          name,
          qtyGoal: data.qtyGoal,
          qtySold: data.qtySold,
          qtyExpected,
          qtyRemaining: Math.max(0, data.qtyGoal - data.qtySold),
          qtyPercent,
          qtyPacePercent,
          qtyIsAbove: qtyDiff >= 0,
          valueGoal: data.valueGoal,
          valueSold: data.valueSold,
          valueExpected,
          valueRemaining: Math.max(0, data.valueGoal - data.valueSold),
          valuePercent,
          valuePacePercent,
          valueIsAbove: valueDiff >= 0,
          teamBreakdown: data.teamBreakdown,
          config: DEPARTMENT_CONFIG[name] || { icon: "📊", color: "from-gray-500/20 to-gray-600/10" },
        };
      })
      .filter(card => !filterDepartment || card.name === filterDepartment)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')); // Ordem alfabética

    // Calculate totals
    const totalQtyGoal = cards.reduce((sum, c) => sum + c.qtyGoal, 0);
    const totalQtySold = cards.reduce((sum, c) => sum + c.qtySold, 0);
    const totalValueGoal = cards.reduce((sum, c) => sum + c.valueGoal, 0);
    const totalValueSold = cards.reduce((sum, c) => sum + c.valueSold, 0);
    
    const totalQtyExpected = Math.round((totalQtyGoal / totalDays) * currentDay);
    const totalValueExpected = Math.round((totalValueGoal / totalDays) * currentDay);
    
    const totalQtyPace = totalQtyExpected > 0 ? Math.round(((totalQtySold - totalQtyExpected) / totalQtyExpected) * 100) : 0;
    const totalValuePace = totalValueExpected > 0 ? Math.round(((totalValueSold - totalValueExpected) / totalValueExpected) * 100) : 0;

    return {
      departmentCards: cards,
      totals: {
        qtyGoal: totalQtyGoal,
        qtySold: totalQtySold,
        qtyExpected: totalQtyExpected,
        qtyRemaining: Math.max(0, totalQtyGoal - totalQtySold),
        qtyPercent: totalQtyGoal > 0 ? Math.round((totalQtySold / totalQtyGoal) * 100) : 0,
        qtyPacePercent: totalQtyPace,
        qtyIsAbove: totalQtySold >= totalQtyExpected,
        valueGoal: totalValueGoal,
        valueSold: totalValueSold,
        valueExpected: totalValueExpected,
        valueRemaining: Math.max(0, totalValueGoal - totalValueSold),
        valuePercent: totalValueGoal > 0 ? Math.round((totalValueSold / totalValueGoal) * 100) : 0,
        valuePacePercent: totalValuePace,
        valueIsAbove: totalValueSold >= totalValueExpected,
      },
    };
  }, [valueGoals, quantityGoals, revenueRecords, teams, currentDay, totalDays, filterDepartment]);

  if (loadingValueGoals || loadingQtyGoals || loadingRecords) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (departmentCards.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma meta definida para este período.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Metas por Departamento</h2>
        <span className="text-sm text-muted-foreground">{MONTH_NAMES[month - 1]} {year}</span>
      </div>

      {/* Total Clinic Summary Card */}
      {totals && (
        <Card className="p-6 bg-gradient-to-br from-primary/20 to-amber-500/10 border-primary/30">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">Resultado Total UNIQUE</h3>
              <p className="text-xs text-muted-foreground">{MONTH_NAMES[month - 1]} {year} • Todos os departamentos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quantity Summary */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">{totals.qtySold}</span>
                <span className="text-lg text-muted-foreground">/ {totals.qtyGoal}</span>
                <span className="text-sm text-muted-foreground">procedimentos</span>
              </div>
              <Progress value={totals.qtyPercent} className="h-2" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{totals.qtyPercent}% da Meta 3</span>
                <span className="text-primary font-medium">
                  Esp (01-{String(currentDay).padStart(2, '0')}): {totals.qtyExpected}
                </span>
              </div>
            </div>

            {/* Value Summary */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground">{formatCurrency(totals.valueSold)}</span>
                <span className="text-lg text-muted-foreground">/ {formatCurrency(totals.valueGoal)}</span>
              </div>
              <Progress value={totals.valuePercent} className="h-2" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{totals.valuePercent}% da Meta 3</span>
                <span className="text-primary font-medium">
                  Esp (01-{String(currentDay).padStart(2, '0')}): {formatCurrency(totals.valueExpected)}
                </span>
              </div>
            </div>
          </div>

          {/* Pace Status */}
          <div className={`mt-4 rounded-lg p-3 ${totals.valueIsAbove ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}>
            <div className="flex items-center gap-2">
              {totals.valueIsAbove ? (
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-500" />
              )}
              <span className={`text-sm font-medium ${totals.valueIsAbove ? "text-emerald-500" : "text-rose-500"}`}>
                {totals.valueIsAbove ? "Parabéns!" : "Atenção!"} A clínica está {Math.abs(totals.valuePacePercent)}% {totals.valueIsAbove ? "acima" : "abaixo"} do esperado para o período.
              </span>
            </div>
          </div>
        </Card>
      )}
      
      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {departmentCards.map((card) => {
          const totalTeamQty = Object.values(card.teamBreakdown).reduce((sum, t) => sum + t.qty, 0);
          const totalTeamValue = Object.values(card.teamBreakdown).reduce((sum, t) => sum + t.value, 0);
          
          return (
            <Card 
              key={card.name}
              className={`p-5 bg-gradient-to-br ${card.config.color} border-border/50 hover:shadow-lg transition-shadow`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="text-2xl">{card.config.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground leading-tight">{card.name}</h3>
                  <p className="text-xs text-muted-foreground">{MONTH_NAMES[month - 1]} {year}</p>
                </div>
              </div>

              {/* Quantity Section */}
              <div className="mb-4 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-black text-foreground">{card.qtySold}</span>
                  <span className="text-lg text-muted-foreground">/ {card.qtyGoal}</span>
                </div>
                <Progress value={card.qtyPercent} className="h-2 mb-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{card.qtyPercent}% da Meta</span>
                  <span className="text-primary font-medium">Esp (01-{String(currentDay).padStart(2, '0')}): {card.qtyExpected}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Falta: {card.qtyRemaining}</div>
              </div>

              {/* Value Section */}
              <div className="mb-4 p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Valor (R$)</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-foreground">{formatCurrency(card.valueSold)}</span>
                  <span className="text-sm text-muted-foreground">/ {formatCurrency(card.valueGoal)}</span>
                </div>
                <Progress value={card.valuePercent} className="h-2 mb-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{card.valuePercent}% da Meta</span>
                  <span className="text-primary font-medium">Esp (01-{String(currentDay).padStart(2, '0')}): {formatCurrency(card.valueExpected)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Falta: {formatCurrency(card.valueRemaining)}</div>
              </div>

              {/* Team Breakdown */}
              {Object.keys(card.teamBreakdown).length > 0 && (
                <div className="mb-3 flex items-center gap-3 text-xs">
                  {Object.entries(card.teamBreakdown).map(([teamName, data]) => {
                    const qtyPct = totalTeamQty > 0 ? Math.round((data.qty / totalTeamQty) * 100) : 0;
                    const isLioness = teamName.toLowerCase().includes("lioness");
                    return (
                      <div key={teamName} className="flex items-center gap-1.5">
                        <img 
                          src={isLioness ? lionessLogo : troiaLogo} 
                          alt={teamName}
                          className="w-4 h-4"
                        />
                        <span className="text-muted-foreground">{qtyPct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Progress labels */}
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-muted-foreground">📅 {monthProgress}% do mês</span>
                <span className={card.valueIsAbove ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                  {card.valuePercent}% da meta
                </span>
              </div>

              {/* Pace status */}
              <div className={`rounded-lg p-2.5 ${card.valueIsAbove ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}>
                <div className="flex items-center gap-2">
                  {card.valueIsAbove ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-medium ${card.valueIsAbove ? "text-emerald-500" : "text-rose-500"}`}>
                    {Math.abs(card.valuePacePercent)}% {card.valueIsAbove ? "acima" : "abaixo"} do esperado
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default DepartmentGoalCards;
