import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Users, Building2, CheckCircle2, XCircle, Medal } from "lucide-react";

interface GoalAchievementSummaryProps {
  month: number;
  year: number;
}

interface SellerAchievement {
  name: string;
  revenue: number;
  meta1: number;
  meta2: number;
  meta3: number;
  achievedLevel: 0 | 1 | 2 | 3;
}

interface DepartmentAchievement {
  name: string;
  revenue: number;
  meta1: number;
  meta2: number;
  meta3: number;
  achievedLevel: 0 | 1 | 2 | 3;
}

const GoalAchievementSummary = ({ month, year }: GoalAchievementSummaryProps) => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Fetch predefined goals with matched users (deduped by matched_user_id)
  const { data: sellerGoals } = useQuery({
    queryKey: ["seller-goals-summary", month, year],
    queryFn: async () => {
      const { data: goals, error: goalsError } = await supabase
        .from("predefined_goals")
        .select("first_name, meta1_goal, meta2_goal, meta3_goal, matched_user_id")
        .eq("month", month)
        .eq("year", year)
        .not("matched_user_id", "is", null);
      if (goalsError) throw goalsError;

      const userIds = goals?.map(g => g.matched_user_id).filter(Boolean) as string[];
      const uniqueUserIds = Array.from(new Set(userIds));

      const { data: profiles, error: profilesError } = uniqueUserIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", uniqueUserIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      // Aggregate: if there are multiple goal rows for the same seller, sum metas
      const byUser = new Map<string, { matched_user_id: string; full_name: string; meta1_goal: number; meta2_goal: number; meta3_goal: number }>();

      (goals || []).forEach((g) => {
        const userId = g.matched_user_id as string;
        const current = byUser.get(userId);
        const fullName = profiles?.find(p => p.user_id === userId)?.full_name || (g.first_name as string) || "Sem nome";

        byUser.set(userId, {
          matched_user_id: userId,
          full_name: fullName,
          meta1_goal: (current?.meta1_goal || 0) + Number(g.meta1_goal || 0),
          meta2_goal: (current?.meta2_goal || 0) + Number(g.meta2_goal || 0),
          meta3_goal: (current?.meta3_goal || 0) + Number(g.meta3_goal || 0),
        });
      });

      return Array.from(byUser.values());
    },
  });

  // Fetch revenue by user
  const { data: revenueByUser } = useQuery({
    queryKey: ["revenue-by-user-summary", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("attributed_to_user_id, amount")
        .gte("date", startDate)
        .lte("date", endDate)
        .not("attributed_to_user_id", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch department goals
  const { data: departmentGoals } = useQuery({
    queryKey: ["department-goals-summary", month, year],
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

  // Fetch revenue by department
  const { data: revenueByDepartment } = useQuery({
    queryKey: ["revenue-by-dept-summary", month, year],
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

  // Normalize department names
  const normalizeDepartmentName = (dept: string | null): string => {
    if (!dept) return "";
    const deptLower = dept.toLowerCase().trim();
    
    if (deptLower.startsWith("02") || (deptLower.includes("consulta") && deptLower.includes("cirurgia"))) {
      return "Consulta Cirurgia Plástica";
    }
    if (deptLower.startsWith("01") || (deptLower.includes("cirurgia") && deptLower.includes("plástica"))) {
      return "Cirurgia Plástica";
    }
    if (deptLower.startsWith("03") || (deptLower.includes("pós") || deptLower.includes("pos")) && deptLower.includes("operat")) {
      return "Pós Operatório";
    }
    if (deptLower.startsWith("04") || deptLower.includes("soroterapia") || deptLower.includes("protocolo")) {
      return "Soroterapia / Protocolos Nutricionais";
    }
    if (deptLower.startsWith("08") || deptLower.includes("harmoniza")) {
      return "Harmonização Facial e Corporal";
    }
    if (deptLower.startsWith("09") || deptLower.includes("spa") || deptLower.includes("estética")) {
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

  // Calculate seller achievements
  const sellerAchievements: SellerAchievement[] = (sellerGoals || []).map((goal: any) => {
    const meta1 = Number(goal.meta1_goal || 0);
    const meta2 = Number(goal.meta2_goal || 0);
    const meta3 = Number(goal.meta3_goal || 0);

    const userRevenue = (revenueByUser || [])
      .filter(r => r.attributed_to_user_id === goal.matched_user_id)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    let achievedLevel: 0 | 1 | 2 | 3 = 0;
    if (meta3 > 0 && userRevenue >= meta3) achievedLevel = 3;
    else if (meta2 > 0 && userRevenue >= meta2) achievedLevel = 2;
    else if (meta1 > 0 && userRevenue >= meta1) achievedLevel = 1;

    return {
      name: goal.full_name || "Sem nome",
      revenue: userRevenue,
      meta1,
      meta2,
      meta3,
      achievedLevel,
    };
  }).sort((a, b) => b.achievedLevel - a.achievedLevel || b.revenue - a.revenue);

  // Calculate department achievements
  const departmentAchievements: DepartmentAchievement[] = (departmentGoals || []).map((goal) => {
    const deptRevenue = (revenueByDepartment || [])
      .filter(r => normalizeDepartmentName(r.department) === goal.department_name)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    
    let achievedLevel: 0 | 1 | 2 | 3 = 0;
    if (deptRevenue >= Number(goal.meta3_goal)) achievedLevel = 3;
    else if (deptRevenue >= Number(goal.meta2_goal)) achievedLevel = 2;
    else if (deptRevenue >= Number(goal.meta1_goal)) achievedLevel = 1;

    return {
      name: goal.department_name,
      revenue: deptRevenue,
      meta1: Number(goal.meta1_goal),
      meta2: Number(goal.meta2_goal),
      meta3: Number(goal.meta3_goal),
      achievedLevel,
    };
  }).sort((a, b) => b.achievedLevel - a.achievedLevel || b.revenue - a.revenue);

  // Count achievements
  const sellersMeta3 = sellerAchievements.filter(s => s.achievedLevel === 3).length;
  const sellersMeta2 = sellerAchievements.filter(s => s.achievedLevel === 2).length;
  const sellersMeta1 = sellerAchievements.filter(s => s.achievedLevel === 1).length;
  const sellersNone = sellerAchievements.filter(s => s.achievedLevel === 0).length;

  const deptsMeta3 = departmentAchievements.filter(d => d.achievedLevel === 3).length;
  const deptsMeta2 = departmentAchievements.filter(d => d.achievedLevel === 2).length;
  const deptsMeta1 = departmentAchievements.filter(d => d.achievedLevel === 1).length;
  const deptsNone = departmentAchievements.filter(d => d.achievedLevel === 0).length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getAchievementBadge = (level: 0 | 1 | 2 | 3) => {
    switch (level) {
      case 3:
        return (
          <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold gap-1 shadow-lg">
            <Trophy className="w-3 h-3" />
            META 3
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 font-bold gap-1">
            <Medal className="w-3 h-3" />
            META 2
          </Badge>
        );
      case 1:
        return (
          <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold gap-1">
            <CheckCircle2 className="w-3 h-3" />
            META 1
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <XCircle className="w-3 h-3" />
            Não atingiu
          </Badge>
        );
    }
  };

  const getProgressBar = (revenue: number, meta1: number, meta2: number, meta3: number) => {
    const percent = meta1 > 0 ? Math.min((revenue / meta1) * 100, 150) : 0;
    const meta2Pos = meta1 > 0 ? (meta2 / meta1) * 100 : 0;
    const meta3Pos = meta1 > 0 ? (meta3 / meta1) * 100 : 0;
    
    return (
      <div className="relative h-2 bg-muted rounded-full overflow-visible mt-1">
        {/* Progress bar */}
        <div 
          className={`absolute h-full rounded-full transition-all ${
            percent >= meta3Pos ? 'bg-gradient-to-r from-green-500 to-yellow-400' :
            percent >= meta2Pos ? 'bg-gradient-to-r from-green-500 to-green-400' :
            percent >= 100 ? 'bg-green-500' :
            percent >= 70 ? 'bg-amber-500' : 'bg-red-400'
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
        {/* Meta markers */}
        <div className="absolute top-0 h-full w-0.5 bg-green-600" style={{ left: '100%' }} title="Meta 1" />
        {meta2Pos <= 150 && (
          <div className="absolute top-0 h-full w-0.5 bg-blue-500" style={{ left: `${Math.min(meta2Pos, 100)}%` }} title="Meta 2" />
        )}
        {meta3Pos <= 150 && (
          <div className="absolute top-0 h-full w-0.5 bg-yellow-500" style={{ left: `${Math.min(meta3Pos, 100)}%` }} title="Meta 3" />
        )}
      </div>
    );
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="w-6 h-6 text-primary" />
          Resumo de Metas Atingidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-400/20 to-amber-500/20 border border-yellow-500/30 text-center">
            <p className="text-2xl font-bold text-yellow-600">{sellersMeta3 + deptsMeta3}</p>
            <p className="text-xs text-muted-foreground">Meta 3 🏆</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-300/20 to-gray-400/20 border border-gray-400/30 text-center">
            <p className="text-2xl font-bold text-gray-600">{sellersMeta2 + deptsMeta2}</p>
            <p className="text-xs text-muted-foreground">Meta 2 🥈</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-600/20 to-amber-700/20 border border-amber-600/30 text-center">
            <p className="text-2xl font-bold text-amber-700">{sellersMeta1 + deptsMeta1}</p>
            <p className="text-xs text-muted-foreground">Meta 1 🥉</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
            <p className="text-2xl font-bold text-muted-foreground">{sellersNone + deptsNone}</p>
            <p className="text-xs text-muted-foreground">Em progresso</p>
          </div>
        </div>

        {/* Sellers Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Vendedoras</h3>
            <Badge variant="outline" className="ml-auto">{sellerAchievements.length} total</Badge>
          </div>
          <div className="space-y-2">
            {sellerAchievements.map((seller, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border transition-all ${
                  seller.achievedLevel === 3 ? 'bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border-yellow-500/30' :
                  seller.achievedLevel >= 1 ? 'bg-success/5 border-success/30' :
                  'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    {seller.achievedLevel === 3 && <span className="text-lg">🏆</span>}
                    {seller.achievedLevel === 2 && <span className="text-lg">🥈</span>}
                    {seller.achievedLevel === 1 && <span className="text-lg">🥉</span>}
                    <span className="font-medium truncate">{seller.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${seller.achievedLevel > 0 ? 'text-success' : 'text-foreground'}`}>
                      {formatCurrency(seller.revenue)}
                    </span>
                    {getAchievementBadge(seller.achievedLevel)}
                  </div>
                </div>
                {getProgressBar(seller.revenue, seller.meta1, seller.meta2, seller.meta3)}
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Meta 1: {formatCurrency(seller.meta1)}</span>
                  <span>{Math.round((seller.revenue / seller.meta1) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Departments Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Departamentos</h3>
            <Badge variant="outline" className="ml-auto">{departmentAchievements.length} total</Badge>
          </div>
          <div className="space-y-2">
            {departmentAchievements.map((dept, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border transition-all ${
                  dept.achievedLevel === 3 ? 'bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border-yellow-500/30' :
                  dept.achievedLevel >= 1 ? 'bg-success/5 border-success/30' :
                  'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    {dept.achievedLevel === 3 && <span className="text-lg">🏆</span>}
                    {dept.achievedLevel === 2 && <span className="text-lg">🥈</span>}
                    {dept.achievedLevel === 1 && <span className="text-lg">🥉</span>}
                    <span className="font-medium truncate">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${dept.achievedLevel > 0 ? 'text-success' : 'text-foreground'}`}>
                      {formatCurrency(dept.revenue)}
                    </span>
                    {getAchievementBadge(dept.achievedLevel)}
                  </div>
                </div>
                {getProgressBar(dept.revenue, dept.meta1, dept.meta2, dept.meta3)}
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Meta 1: {formatCurrency(dept.meta1)}</span>
                  <span>{Math.round((dept.revenue / dept.meta1) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoalAchievementSummary;
