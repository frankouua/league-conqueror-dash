import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

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

export function DepartmentGoalCards({ month, year, filterDepartment }: DepartmentGoalCardsProps) {
  const now = new Date();
  const isCurrentPeriod = month === (now.getMonth() + 1) && year === now.getFullYear();
  const currentDay = isCurrentPeriod ? now.getDate() : new Date(year, month, 0).getDate();
  const totalDays = new Date(year, month, 0).getDate();
  const monthProgress = Math.round((currentDay / totalDays) * 100);

  // Fetch quantity goals
  const { data: quantityGoals, isLoading: loadingGoals } = useQuery({
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

  // Fetch revenue records to count quantity sold
  const { data: revenueRecords, isLoading: loadingRecords } = useQuery({
    queryKey: ["revenue-records-qty", month, year],
    queryFn: async () => {
      const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
      
      const { data, error } = await supabase
        .from("revenue_records")
        .select("department")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth);
      if (error) throw error;
      return data || [];
    },
  });

  // Process data into department cards
  const departmentCards = useMemo(() => {
    if (!quantityGoals || !revenueRecords) return [];

    // Count sales by department
    const salesByDept: Record<string, number> = {};
    revenueRecords.forEach((record) => {
      const rawDept = record.department || "";
      const mappedDept = DEPARTMENT_MAPPING[rawDept] || rawDept;
      salesByDept[mappedDept] = (salesByDept[mappedDept] || 0) + 1;
    });

    // Build cards for each department with goals
    const cards = quantityGoals
      .filter(goal => goal.quantity_goal > 0)
      .map((goal) => {
        const deptName = goal.department_name;
        const goalValue = goal.quantity_goal;
        const soldValue = salesByDept[deptName] || 0;
        
        // Calculate expected for current day
        const expectedValue = Math.round((goalValue / totalDays) * currentDay);
        const remaining = Math.max(0, goalValue - soldValue);
        const progressPercent = Math.min(100, Math.round((soldValue / goalValue) * 100));
        
        // Calculate pace difference
        const paceDiff = soldValue - expectedValue;
        const pacePercent = expectedValue > 0 ? Math.round((paceDiff / expectedValue) * 100) : 0;
        const isAbove = paceDiff >= 0;

        return {
          name: deptName,
          goal: goalValue,
          sold: soldValue,
          expected: expectedValue,
          remaining,
          progressPercent,
          paceDiff,
          pacePercent,
          isAbove,
          config: DEPARTMENT_CONFIG[deptName] || { icon: "📊", color: "from-gray-500/20 to-gray-600/10" },
        };
      })
      .filter(card => !filterDepartment || card.name === filterDepartment)
      .sort((a, b) => b.goal - a.goal);

    return cards;
  }, [quantityGoals, revenueRecords, currentDay, totalDays, filterDepartment]);

  if (loadingGoals || loadingRecords) {
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
        <p className="text-muted-foreground">Nenhuma meta de quantidade definida para este período.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Metas por Departamento (Quantidade)</h2>
        <span className="text-sm text-muted-foreground">{MONTH_NAMES[month - 1]} {year}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {departmentCards.map((card) => (
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

            {/* Big number display */}
            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground">{card.sold}</span>
                <span className="text-xl text-muted-foreground">/ {card.goal}</span>
              </div>
            </div>

            {/* Progress bar with indicators */}
            <div className="relative mb-3">
              <Progress value={card.progressPercent} className="h-2.5" />
              
              {/* Expected marker */}
              <div 
                className="absolute top-0 w-0.5 h-2.5 bg-foreground/40"
                style={{ left: `${Math.min(100, monthProgress)}%` }}
              />
            </div>

            {/* Progress labels */}
            <div className="flex items-center justify-between text-xs mb-4">
              <span className="text-muted-foreground flex items-center gap-1">
                📅 {monthProgress}% do mês decorrido
              </span>
              <span className={card.isAbove ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                {card.progressPercent}% da meta
              </span>
            </div>

            {/* Pace status */}
            <div className={`rounded-lg p-3 ${card.isAbove ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-rose-500/10 border border-rose-500/30"}`}>
              <div className="flex items-center gap-2">
                {card.isAbove ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
                <span className={`text-sm font-medium ${card.isAbove ? "text-emerald-500" : "text-rose-500"}`}>
                  {card.isAbove ? "Parabéns!" : "Atenção!"} Você está {Math.abs(card.pacePercent)}% {card.isAbove ? "acima" : "abaixo"} do esperado para o período.
                </span>
              </div>
            </div>

            {/* Additional info */}
            <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Esperado até hoje</p>
                <p className="font-semibold text-foreground">{card.expected}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Falta vender</p>
                <p className="font-semibold text-foreground">{card.remaining}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default DepartmentGoalCards;
