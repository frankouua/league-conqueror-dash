import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Crown,
  Gem,
} from "lucide-react";

// Metas coletivas da clínica
const CLINIC_GOALS = {
  meta1: 2500000,
  meta2: 2700000,
  meta3: 3000000,
};

const GoalProgressDashboard = () => {
  const { user, profile } = useAuth();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`;

  // Fetch my individual goal
  const { data: myGoal } = useQuery({
    queryKey: ["my-goal-dashboard", currentMonth, currentYear, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch my revenue records
  const { data: myRevenueRecords } = useQuery({
    queryKey: ["my-revenue-dashboard", currentMonth, currentYear, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch team goals (for team total)
  const { data: teamGoals } = useQuery({
    queryKey: ["team-goals-dashboard", currentMonth, currentYear, profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*")
        .eq("team_id", profile.team_id)
        .eq("month", currentMonth)
        .eq("year", currentYear);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.team_id,
  });

  // Fetch team revenue records
  const { data: teamRevenueRecords } = useQuery({
    queryKey: ["team-revenue-dashboard", currentMonth, currentYear, profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .eq("team_id", profile.team_id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.team_id,
  });

  // Fetch all clinic revenue (for collective goals)
  const { data: allRevenueRecords } = useQuery({
    queryKey: ["all-revenue-dashboard", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate values
  const myRevenue = myRevenueRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const myGoalValue = Number(myGoal?.revenue_goal) || 0;
  const myMeta2Goal = Number(myGoal?.meta2_goal) || 0;
  const myMeta3Goal = Number(myGoal?.meta3_goal) || 0;

  const teamTotalGoal = teamGoals?.reduce((sum, g) => sum + Number(g.revenue_goal), 0) || 0;
  const teamRevenue = teamRevenueRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  const clinicRevenue = allRevenueRecords?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  // Percentages
  const myProgressPercent = myGoalValue > 0 ? Math.min((myRevenue / myGoalValue) * 100, 100) : 0;
  const myMeta2Percent = myMeta2Goal > 0 ? Math.min((myRevenue / myMeta2Goal) * 100, 100) : 0;
  const myMeta3Percent = myMeta3Goal > 0 ? Math.min((myRevenue / myMeta3Goal) * 100, 100) : 0;
  
  const teamProgressPercent = teamTotalGoal > 0 ? Math.min((teamRevenue / teamTotalGoal) * 100, 100) : 0;
  
  const clinicMeta1Percent = Math.min((clinicRevenue / CLINIC_GOALS.meta1) * 100, 100);
  const clinicMeta2Percent = Math.min((clinicRevenue / CLINIC_GOALS.meta2) * 100, 100);
  const clinicMeta3Percent = Math.min((clinicRevenue / CLINIC_GOALS.meta3) * 100, 100);

  const clinicMeta1Reached = clinicRevenue >= CLINIC_GOALS.meta1;
  const clinicMeta2Reached = clinicRevenue >= CLINIC_GOALS.meta2;
  const clinicMeta3Reached = clinicRevenue >= CLINIC_GOALS.meta3;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1).replace(".", ",")}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  const getRemainingValue = (current: number, goal: number) => {
    const remaining = goal - current;
    return remaining > 0 ? remaining : 0;
  };

  if (!myGoal) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-warning" />
            <div>
              <p className="font-semibold text-warning">Defina suas metas individuais</p>
              <p className="text-sm text-muted-foreground">
                Acesse a página de Metas para definir seus objetivos do mês
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Individual Progress */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Meu Progresso Individual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meta 1 - Main Goal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-5 h-5 ${myProgressPercent >= 100 ? "text-success" : "text-primary"}`} />
                <span className="font-medium">Meta 1 (Base)</span>
              </div>
              {myProgressPercent >= 100 ? (
                <Badge className="bg-success text-success-foreground">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Atingida!
                </Badge>
              ) : (
                <Badge variant="outline">{myProgressPercent.toFixed(1)}%</Badge>
              )}
            </div>
            <Progress value={myProgressPercent} className="h-4" />
            <div className="flex justify-between text-sm">
              <span className="text-success font-medium">{formatCurrency(myRevenue)}</span>
              <span className="text-muted-foreground">Meta: {formatCurrency(myGoalValue)}</span>
            </div>
            {myProgressPercent < 100 && (
              <p className="text-sm text-muted-foreground">
                Faltam <span className="text-foreground font-semibold">{formatCurrency(getRemainingValue(myRevenue, myGoalValue))}</span> para atingir
              </p>
            )}
          </div>

          {/* Meta 2 */}
          {myMeta2Goal > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className={`w-5 h-5 ${myMeta2Percent >= 100 ? "text-success" : "text-primary"}`} />
                  <span className="font-medium">Meta 2</span>
                </div>
                {myMeta2Percent >= 100 ? (
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Atingida!
                  </Badge>
                ) : (
                  <Badge variant="outline">{myMeta2Percent.toFixed(1)}%</Badge>
                )}
              </div>
              <Progress value={myMeta2Percent} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-success font-medium">{formatCurrency(myRevenue)}</span>
                <span className="text-muted-foreground">Meta: {formatCurrency(myMeta2Goal)}</span>
              </div>
              {myMeta2Percent < 100 && (
                <p className="text-sm text-muted-foreground">
                  Faltam <span className="text-foreground font-semibold">{formatCurrency(getRemainingValue(myRevenue, myMeta2Goal))}</span> para atingir
                </p>
              )}
            </div>
          )}

          {/* Meta 3 */}
          {myMeta3Goal > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gem className={`w-5 h-5 ${myMeta3Percent >= 100 ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium">Meta 3 (Suprema)</span>
                </div>
                {myMeta3Percent >= 100 ? (
                  <Badge className="bg-gradient-gold-shine text-primary-foreground">
                    🏆 Atingida!
                  </Badge>
                ) : (
                  <Badge variant="outline">{myMeta3Percent.toFixed(1)}%</Badge>
                )}
              </div>
              <Progress value={myMeta3Percent} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-success font-medium">{formatCurrency(myRevenue)}</span>
                <span className="text-muted-foreground">Meta: {formatCurrency(myMeta3Goal)}</span>
              </div>
              {myMeta3Percent < 100 && (
                <p className="text-sm text-muted-foreground">
                  Faltam <span className="text-foreground font-semibold">{formatCurrency(getRemainingValue(myRevenue, myMeta3Goal))}</span> para atingir
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-info" />
            Progresso da Minha Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Meta coletiva da equipe</span>
            {teamProgressPercent >= 100 ? (
              <Badge className="bg-success text-success-foreground">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Atingida!
              </Badge>
            ) : (
              <Badge variant="outline">{teamProgressPercent.toFixed(1)}%</Badge>
            )}
          </div>
          <Progress value={teamProgressPercent} className="h-4" />
          <div className="flex justify-between text-sm">
            <span className="text-success font-medium">{formatCurrency(teamRevenue)}</span>
            <span className="text-muted-foreground">Meta: {formatCurrency(teamTotalGoal)}</span>
          </div>
          {teamProgressPercent < 100 && (
            <p className="text-sm text-muted-foreground">
              Faltam <span className="text-foreground font-semibold">{formatCurrency(getRemainingValue(teamRevenue, teamTotalGoal))}</span> para a equipe atingir
            </p>
          )}
        </CardContent>
      </Card>

      {/* Clinic Collective Goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Metas Coletivas da Clínica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Faturamento atual da clínica</span>
              <span className="text-xl font-bold text-gradient-gold">{formatCurrency(clinicRevenue)}</span>
            </div>
            <Progress value={clinicMeta3Percent} className="h-2 mb-4" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Meta 1 */}
            <div
              className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                clinicMeta1Reached
                  ? "bg-success border-2 border-success"
                  : "bg-success/20 border-2 border-success/40"
              }`}
            >
              <p className="text-lg font-bold text-white">
                {formatShortCurrency(CLINIC_GOALS.meta1)}
              </p>
              <span className={`mt-1 text-xs ${clinicMeta1Reached ? "text-white" : "text-muted-foreground"}`}>
                {clinicMeta1Reached ? "✓ Atingida" : `${clinicMeta1Percent.toFixed(0)}%`}
              </span>
              <span className="mt-1 px-2 py-0.5 bg-primary/80 text-xs font-semibold rounded-full text-primary-foreground">
                +50 pts
              </span>
            </div>

            {/* Meta 2 */}
            <div
              className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                clinicMeta2Reached
                  ? "bg-success border-2 border-success"
                  : "bg-success/20 border-2 border-success/40"
              }`}
            >
              <p className="text-lg font-bold text-white">
                {formatShortCurrency(CLINIC_GOALS.meta2)}
              </p>
              <span className={`mt-1 text-xs ${clinicMeta2Reached ? "text-white" : "text-muted-foreground"}`}>
                {clinicMeta2Reached ? "✓ Atingida" : `${clinicMeta2Percent.toFixed(0)}%`}
              </span>
              <span className="mt-1 px-2 py-0.5 bg-primary/80 text-xs font-semibold rounded-full text-primary-foreground">
                +50 pts
              </span>
            </div>

            {/* Meta 3 */}
            <div
              className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                clinicMeta3Reached
                  ? "bg-gradient-gold-shine border-2 border-primary shadow-gold"
                  : "bg-secondary border-2 border-border"
              }`}
            >
              <p className={`text-lg font-bold ${clinicMeta3Reached ? "text-primary-foreground" : "text-foreground"}`}>
                {formatShortCurrency(CLINIC_GOALS.meta3)}
              </p>
              <span className={`mt-1 text-xs ${clinicMeta3Reached ? "text-primary-foreground" : "text-muted-foreground"}`}>
                {clinicMeta3Reached ? "🏆 Atingida" : `${clinicMeta3Percent.toFixed(0)}%`}
              </span>
              <span className={`mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                clinicMeta3Reached 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                +100 pts
              </span>
            </div>
          </div>

          {!clinicMeta1Reached && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Faltam <span className="text-foreground font-semibold">{formatCurrency(getRemainingValue(clinicRevenue, CLINIC_GOALS.meta1))}</span> para a Meta 1
            </p>
          )}
          {clinicMeta1Reached && !clinicMeta2Reached && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Faltam <span className="text-foreground font-semibold">{formatCurrency(getRemainingValue(clinicRevenue, CLINIC_GOALS.meta2))}</span> para a Meta 2
            </p>
          )}
          {clinicMeta2Reached && !clinicMeta3Reached && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Faltam <span className="text-foreground font-semibold">{formatCurrency(getRemainingValue(clinicRevenue, CLINIC_GOALS.meta3))}</span> para a Meta 3
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoalProgressDashboard;
