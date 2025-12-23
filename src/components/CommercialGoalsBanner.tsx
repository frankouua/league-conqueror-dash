import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Target, TrendingUp, Users, Trophy, CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const CommercialGoalsBanner = () => {
  const { profile } = useAuth();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;

  // Fetch individual goal (confirmed)
  const { data: individualGoal, isLoading: goalLoading } = useQuery({
    queryKey: ["individual-goal-banner", profile?.user_id, currentMonth, currentYear],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      const { data, error } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("matched_user_id", profile.user_id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .eq("confirmed", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
  });

  // Fetch individual revenue
  const { data: individualRevenue } = useQuery({
    queryKey: ["individual-revenue-banner", profile?.user_id, currentMonth, currentYear],
    queryFn: async () => {
      if (!profile?.user_id) return 0;
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount")
        .eq("attributed_to_user_id", profile.user_id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    },
    enabled: !!profile?.user_id,
  });

  // Fetch department goals total
  const { data: departmentGoals, isLoading: deptLoading } = useQuery({
    queryKey: ["department-goals-banner", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_goals")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear);
      if (error) throw error;
      return data;
    },
  });

  // Fetch total commercial revenue
  const { data: totalRevenue } = useQuery({
    queryKey: ["total-revenue-banner", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    },
  });

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

  const totalDeptMeta1 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta1_goal), 0) || 0;
  const totalDeptMeta2 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta2_goal), 0) || 0;
  const totalDeptMeta3 = departmentGoals?.reduce((sum, g) => sum + Number(g.meta3_goal), 0) || 0;

  const individualMeta1 = individualGoal?.meta1_goal || 0;
  const individualMeta2 = individualGoal?.meta2_goal || 0;
  const individualMeta3 = individualGoal?.meta3_goal || 0;

  const currentIndividualRevenue = individualRevenue || 0;
  const currentTotalRevenue = totalRevenue || 0;

  const indProgress = getProgressPercent(currentIndividualRevenue, individualMeta1);
  const deptProgress = getProgressPercent(currentTotalRevenue, totalDeptMeta1);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const isLoading = goalLoading || deptLoading;

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-primary/20 to-yellow-500/10 border-2 border-primary/40 rounded-2xl p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 rounded-2xl p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      {/* Meta Individual */}
      <div className="bg-gradient-to-br from-primary/20 via-yellow-500/10 to-primary/5 border-2 border-primary/40 rounded-2xl p-6 shadow-[0_0_30px_rgba(212,175,55,0.15)] relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-yellow-600 shadow-lg">
              <Target className="h-6 w-6 text-background" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Minha Meta Individual</h3>
              <p className="text-sm text-muted-foreground">{monthNames[currentMonth - 1]} {currentYear}</p>
            </div>
          </div>

          {!individualGoal ? (
            <p className="text-muted-foreground text-sm">Nenhuma meta individual definida para este mês.</p>
          ) : (
            <>
              {/* Meta Values */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className={`p-3 rounded-xl text-center transition-all ${
                  currentIndividualRevenue >= individualMeta1 
                    ? "bg-success/30 border border-success" 
                    : "bg-background/50 border border-border"
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Meta 1</p>
                  <p className="text-sm font-bold text-success">{formatCurrency(individualMeta1)}</p>
                  {currentIndividualRevenue >= individualMeta1 && (
                    <CheckCircle2 className="h-4 w-4 text-success mx-auto mt-1" />
                  )}
                </div>
                <div className={`p-3 rounded-xl text-center transition-all ${
                  currentIndividualRevenue >= individualMeta2 
                    ? "bg-success/30 border border-success" 
                    : "bg-background/50 border border-border"
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Meta 2</p>
                  <p className="text-sm font-bold text-success">{formatCurrency(individualMeta2)}</p>
                  {currentIndividualRevenue >= individualMeta2 && (
                    <CheckCircle2 className="h-4 w-4 text-success mx-auto mt-1" />
                  )}
                </div>
                <div className={`p-3 rounded-xl text-center transition-all ${
                  currentIndividualRevenue >= individualMeta3 
                    ? "bg-gradient-to-br from-primary to-yellow-600 border border-primary" 
                    : "bg-background/50 border border-border"
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Meta 3</p>
                  <p className={`text-sm font-bold ${currentIndividualRevenue >= individualMeta3 ? "text-background" : "text-primary"}`}>
                    {formatCurrency(individualMeta3)}
                  </p>
                  {currentIndividualRevenue >= individualMeta3 && (
                    <Trophy className="h-4 w-4 text-background mx-auto mt-1" />
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-medium">Meu Faturamento</span>
                  </span>
                  <span className="font-bold text-primary">{formatCurrency(currentIndividualRevenue)}</span>
                </div>
                <Progress value={indProgress} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {indProgress}% da Meta 1 • Faltam {formatCurrency(Math.max(0, individualMeta1 - currentIndividualRevenue))}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta do Comercial (Departamento) */}
      <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/5 border-2 border-blue-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Meta Comercial (Equipe)</h3>
              <p className="text-sm text-muted-foreground">{monthNames[currentMonth - 1]} {currentYear}</p>
            </div>
          </div>

          {!departmentGoals || departmentGoals.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma meta do comercial definida para este mês.</p>
          ) : (
            <>
              {/* Meta Values */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className={`p-3 rounded-xl text-center transition-all ${
                  currentTotalRevenue >= totalDeptMeta1 
                    ? "bg-success/30 border border-success" 
                    : "bg-background/50 border border-border"
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Meta 1</p>
                  <p className="text-sm font-bold text-success">{formatCurrency(totalDeptMeta1)}</p>
                  {currentTotalRevenue >= totalDeptMeta1 && (
                    <CheckCircle2 className="h-4 w-4 text-success mx-auto mt-1" />
                  )}
                </div>
                <div className={`p-3 rounded-xl text-center transition-all ${
                  currentTotalRevenue >= totalDeptMeta2 
                    ? "bg-success/30 border border-success" 
                    : "bg-background/50 border border-border"
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Meta 2</p>
                  <p className="text-sm font-bold text-success">{formatCurrency(totalDeptMeta2)}</p>
                  {currentTotalRevenue >= totalDeptMeta2 && (
                    <CheckCircle2 className="h-4 w-4 text-success mx-auto mt-1" />
                  )}
                </div>
                <div className={`p-3 rounded-xl text-center transition-all ${
                  currentTotalRevenue >= totalDeptMeta3 
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-500" 
                    : "bg-background/50 border border-border"
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Meta 3</p>
                  <p className={`text-sm font-bold ${currentTotalRevenue >= totalDeptMeta3 ? "text-white" : "text-blue-500"}`}>
                    {formatCurrency(totalDeptMeta3)}
                  </p>
                  {currentTotalRevenue >= totalDeptMeta3 && (
                    <Trophy className="h-4 w-4 text-white mx-auto mt-1" />
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Faturamento Total</span>
                  </span>
                  <span className="font-bold text-blue-500">{formatCurrency(currentTotalRevenue)}</span>
                </div>
                <Progress value={deptProgress} className="h-3 [&>div]:bg-blue-500" />
                <p className="text-xs text-muted-foreground">
                  {deptProgress}% da Meta 1 • Faltam {formatCurrency(Math.max(0, totalDeptMeta1 - currentTotalRevenue))}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommercialGoalsBanner;
