import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Trophy,
} from "lucide-react";

interface DailyGoalsPanelProps {
  month: number;
  year: number;
}

const DailyGoalsPanel = ({ month, year }: DailyGoalsPanelProps) => {
  const { profile, role } = useAuth();
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - currentDay);
  const businessDaysRemaining = Math.round(daysRemaining * 0.7);
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // Fetch individual goals
  const { data: individualGoals } = useQuery({
    queryKey: ["daily-individual-goals", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("individual_goals")
        .select("*, profiles!individual_goals_user_id_fkey(full_name, team_id)")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
  });

  // Fetch revenue records
  const { data: revenueRecords } = useQuery({
    queryKey: ["daily-revenue", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount, user_id, attributed_to_user_id, date")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's revenue separately
  const todayStr = now.toISOString().split("T")[0];
  const { data: todayRevenue } = useQuery({
    queryKey: ["daily-revenue-today", todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("amount, user_id, attributed_to_user_id")
        .eq("date", todayStr);
      if (error) throw error;
      return data;
    },
    enabled: isCurrentMonth,
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams-daily"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
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

  const sellersData = useMemo(() => {
    if (!individualGoals || !revenueRecords) return [];

    return individualGoals
      .filter((g) => g.revenue_goal && Number(g.revenue_goal) > 0)
      .map((goal) => {
        const monthlyGoal = Number(goal.revenue_goal) || 0;
        const monthRevenue = revenueRecords
          .filter((r) => r.user_id === goal.user_id || r.attributed_to_user_id === goal.user_id)
          .reduce((sum, r) => sum + Number(r.amount), 0);

        const todayRevenueAmount = isCurrentMonth
          ? (todayRevenue || [])
              .filter((r) => r.user_id === goal.user_id || r.attributed_to_user_id === goal.user_id)
              .reduce((sum, r) => sum + Number(r.amount), 0)
          : 0;

        const remaining = Math.max(0, monthlyGoal - monthRevenue);
        const dailyNeeded = businessDaysRemaining > 0 ? remaining / businessDaysRemaining : 0;
        const monthProgress = monthlyGoal > 0 ? (monthRevenue / monthlyGoal) * 100 : 0;
        const todayProgress = dailyNeeded > 0 ? (todayRevenueAmount / dailyNeeded) * 100 : 0;

        const team = teams?.find((t) => t.id === goal.team_id);
        const profile = (goal as any).profiles;

        // Calculate streak (consecutive days hitting daily goal)
        let streak = 0;
        const daysToCheck = Math.min(currentDay, 7);
        for (let i = 0; i < daysToCheck; i++) {
          const checkDate = new Date(year, month - 1, currentDay - i);
          const dateStr = checkDate.toISOString().split("T")[0];
          const dayRevenue = revenueRecords
            .filter(
              (r) =>
                (r.user_id === goal.user_id || r.attributed_to_user_id === goal.user_id) &&
                r.date === dateStr
            )
            .reduce((sum, r) => sum + Number(r.amount), 0);

          const expectedDaily = monthlyGoal / daysInMonth;
          if (dayRevenue >= expectedDaily * 0.8) {
            streak++;
          } else {
            break;
          }
        }

        return {
          userId: goal.user_id,
          name: profile?.full_name || "Vendedora",
          teamName: team?.name || "Sem equipe",
          teamId: goal.team_id,
          monthlyGoal,
          monthRevenue,
          remaining,
          dailyNeeded,
          todayRevenue: todayRevenueAmount,
          monthProgress: Math.min(monthProgress, 100),
          todayProgress: Math.min(todayProgress, 100),
          hitTodayGoal: todayRevenueAmount >= dailyNeeded,
          onTrack: monthProgress >= (currentDay / daysInMonth) * 100 * 0.9,
          streak,
        };
      })
      .sort((a, b) => b.monthProgress - a.monthProgress);
  }, [individualGoals, revenueRecords, todayRevenue, teams, businessDaysRemaining, currentDay, daysInMonth, isCurrentMonth, month, year]);

  // If user is not admin, filter to show only their data prominently
  const currentUserData = sellersData.find((s) => s.userId === profile?.user_id);
  const isAdmin = role === "admin";

  if (!isCurrentMonth) {
    return null; // Only show for current month
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Metas Diárias - Hoje
          <Badge variant="outline" className="ml-2">
            <Calendar className="w-3 h-3 mr-1" />
            {daysRemaining} dias restantes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current User Highlight (if not admin) */}
        {!isAdmin && currentUserData && (
          <div className={`p-4 rounded-xl border-2 ${
            currentUserData.hitTodayGoal 
              ? "bg-success/20 border-success" 
              : "bg-primary/10 border-primary/50"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {currentUserData.hitTodayGoal ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Target className="w-5 h-5 text-primary" />
                )}
                <span className="font-bold">Sua Meta de Hoje</span>
                {currentUserData.streak > 0 && (
                  <Badge className="bg-orange-500 gap-1">
                    <Flame className="w-3 h-3" />
                    {currentUserData.streak} dias
                  </Badge>
                )}
              </div>
              <Badge variant={currentUserData.onTrack ? "default" : "destructive"}>
                {currentUserData.onTrack ? "No ritmo" : "Atrás"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Meta Hoje</p>
                <p className="text-2xl font-black text-primary">
                  {formatCurrency(currentUserData.dailyNeeded)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fechado Hoje</p>
                <p className={`text-2xl font-black ${currentUserData.hitTodayGoal ? "text-success" : ""}`}>
                  {formatCurrency(currentUserData.todayRevenue)}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Progresso Hoje</span>
                <span className="font-bold">{currentUserData.todayProgress.toFixed(0)}%</span>
              </div>
              <Progress value={currentUserData.todayProgress} className="h-2" />
            </div>

            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mês: {formatCurrency(currentUserData.monthRevenue)}</span>
                <span className="font-medium">{currentUserData.monthProgress.toFixed(0)}% da meta</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Falta: {formatCurrency(currentUserData.remaining)} para bater a meta mensal
              </p>
            </div>
          </div>
        )}

        {/* All Sellers List (for admin or team view) */}
        {(isAdmin || !currentUserData) && sellersData.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {isAdmin ? "Todas as Vendedoras" : "Sua Equipe"}
            </p>
            {sellersData
              .filter((s) => isAdmin || s.teamId === profile?.team_id)
              .map((seller) => (
                <div
                  key={seller.userId}
                  className={`p-3 rounded-lg border ${
                    seller.hitTodayGoal
                      ? "bg-success/10 border-success/30"
                      : seller.onTrack
                      ? "bg-muted/30 border-border"
                      : "bg-destructive/10 border-destructive/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {seller.hitTodayGoal && <CheckCircle2 className="w-4 h-4 text-success" />}
                      {!seller.hitTodayGoal && !seller.onTrack && <AlertTriangle className="w-4 h-4 text-destructive" />}
                      <span className="font-medium text-sm">{seller.name}</span>
                      {seller.streak >= 3 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          {seller.streak}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {seller.teamName.replace(" Team", "")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Meta/dia:</span>
                      <p className="font-bold">{formatCurrency(seller.dailyNeeded)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hoje:</span>
                      <p className={`font-bold ${seller.hitTodayGoal ? "text-success" : ""}`}>
                        {formatCurrency(seller.todayRevenue)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mês:</span>
                      <p className="font-bold">{seller.monthProgress.toFixed(0)}%</p>
                    </div>
                  </div>

                  <Progress value={seller.todayProgress} className="h-1 mt-2" />
                </div>
              ))}
          </div>
        )}

        {sellersData.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma meta individual definida para este mês.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyGoalsPanel;
