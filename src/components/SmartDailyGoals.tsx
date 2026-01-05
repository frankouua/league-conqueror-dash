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
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Clock,
  BarChart3,
} from "lucide-react";

interface SmartDailyGoalsProps {
  month: number;
  year: number;
}

// Calculate actual business days (excluding weekends)
const getBusinessDaysRemaining = (year: number, month: number): number => {
  const now = new Date();
  const endOfMonth = new Date(year, month, 0);
  let businessDays = 0;
  
  const startDate = new Date(Math.max(now.getTime(), new Date(year, month - 1, 1).getTime()));
  startDate.setHours(0, 0, 0, 0);
  
  const current = new Date(startDate);
  while (current <= endOfMonth) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays;
};

const getBusinessDaysElapsed = (year: number, month: number): number => {
  const now = new Date();
  const monthStart = new Date(year, month - 1, 1);
  let businessDays = 0;
  
  const current = new Date(monthStart);
  while (current < now && current.getMonth() === month - 1) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays;
};

const getTotalBusinessDaysInMonth = (year: number, month: number): number => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  let businessDays = 0;
  
  const current = new Date(monthStart);
  while (current <= monthEnd) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays;
};

const SmartDailyGoals = ({ month, year }: SmartDailyGoalsProps) => {
  const { profile, role } = useAuth();
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const businessDaysRemaining = getBusinessDaysRemaining(year, month);
  const businessDaysElapsed = getBusinessDaysElapsed(year, month);
  const totalBusinessDays = getTotalBusinessDaysInMonth(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const todayStr = now.toISOString().split("T")[0];

  // Fetch all necessary data
  const { data: individualGoals } = useQuery({
    queryKey: ["smart-goals", month, year],
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

  const { data: revenueRecords } = useQuery({
    queryKey: ["smart-revenue", month, year],
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

  const { data: todayRevenue } = useQuery({
    queryKey: ["smart-today", todayStr],
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

  const { data: teams } = useQuery({
    queryKey: ["teams-smart"],
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

        // Smart calculations
        const remaining = Math.max(0, monthlyGoal - monthRevenue);
        const dailyNeeded = businessDaysRemaining > 0 ? remaining / businessDaysRemaining : remaining;
        const monthProgress = monthlyGoal > 0 ? (monthRevenue / monthlyGoal) * 100 : 0;
        
        // Daily average based on actual business days worked
        const dailyAverage = businessDaysElapsed > 0 ? monthRevenue / businessDaysElapsed : 0;
        
        // Projected end-of-month based on current pace
        const projectedTotal = dailyAverage * totalBusinessDays;
        const projectedProgress = monthlyGoal > 0 ? (projectedTotal / monthlyGoal) * 100 : 0;
        
        // Ideal daily rate (what they should have closed per day if perfect)
        const idealDailyRate = monthlyGoal / totalBusinessDays;
        
        // How much behind/ahead they are
        const expectedByNow = idealDailyRate * businessDaysElapsed;
        const variance = monthRevenue - expectedByNow;
        const variancePercent = expectedByNow > 0 ? (variance / expectedByNow) * 100 : 0;
        
        // Performance score (0-100)
        const performanceScore = Math.min(100, Math.max(0, 50 + variancePercent));
        
        // Status determination
        let status: "excellent" | "good" | "warning" | "critical";
        if (monthProgress >= 100 || (projectedProgress >= 100 && variancePercent >= 0)) {
          status = "excellent";
        } else if (projectedProgress >= 90 || variancePercent >= -10) {
          status = "good";
        } else if (projectedProgress >= 70 || variancePercent >= -25) {
          status = "warning";
        } else {
          status = "critical";
        }

        const team = teams?.find((t) => t.id === goal.team_id);
        const profileData = (goal as any).profiles;

        // Calculate streak
        let streak = 0;
        const currentDay = now.getDate();
        for (let i = 0; i < Math.min(currentDay, 10); i++) {
          const checkDate = new Date(year, month - 1, currentDay - i);
          const dayOfWeek = checkDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;
          
          const dateStr = checkDate.toISOString().split("T")[0];
          const dayRevenue = revenueRecords
            .filter((r) => (r.user_id === goal.user_id || r.attributed_to_user_id === goal.user_id) && r.date === dateStr)
            .reduce((sum, r) => sum + Number(r.amount), 0);

          if (dayRevenue >= idealDailyRate * 0.7) {
            streak++;
          } else {
            break;
          }
        }

        return {
          userId: goal.user_id,
          name: profileData?.full_name || "Vendedora",
          teamName: team?.name || "Sem equipe",
          teamId: goal.team_id,
          monthlyGoal,
          monthRevenue,
          remaining,
          dailyNeeded,
          dailyAverage,
          idealDailyRate,
          projectedTotal,
          projectedProgress,
          todayRevenue: todayRevenueAmount,
          monthProgress,
          variance,
          variancePercent,
          performanceScore,
          status,
          streak,
          hitTodayGoal: todayRevenueAmount >= dailyNeeded,
        };
      })
      .sort((a, b) => b.monthProgress - a.monthProgress);
  }, [individualGoals, revenueRecords, todayRevenue, teams, businessDaysRemaining, businessDaysElapsed, totalBusinessDays, isCurrentMonth, month, year]);

  const currentUserData = sellersData.find((s) => s.userId === profile?.user_id);
  const isAdmin = role === "admin";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-success bg-success/10 border-success/30";
      case "good": return "text-info bg-info/10 border-info/30";
      case "warning": return "text-amber-500 bg-amber-500/10 border-amber-500/30";
      case "critical": return "text-destructive bg-destructive/10 border-destructive/30";
      default: return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "excellent": return "Excelente";
      case "good": return "Bom";
      case "warning": return "Atenção";
      case "critical": return "Crítico";
      default: return status;
    }
  };

  if (!isCurrentMonth) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span>Metas Diárias Inteligentes</span>
          </div>
          <Badge variant="outline" className="gap-1">
            <Calendar className="w-3 h-3" />
            {businessDaysRemaining} dias úteis restantes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current User Smart Card */}
        {!isAdmin && currentUserData && (
          <div className={`p-5 rounded-2xl border-2 ${getStatusColor(currentUserData.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-6 h-6" />
                <span className="font-bold text-lg">Seu Plano de Hoje</span>
              </div>
              <div className="flex items-center gap-2">
                {currentUserData.streak >= 2 && (
                  <Badge className="bg-orange-500 gap-1">
                    <Flame className="w-3 h-3" />
                    {currentUserData.streak} dias
                  </Badge>
                )}
                <Badge className={getStatusColor(currentUserData.status)}>
                  {getStatusLabel(currentUserData.status)}
                </Badge>
              </div>
            </div>

            {/* Main Goal Display */}
            <div className="text-center py-4 mb-4 rounded-xl bg-background/50">
              <p className="text-sm text-muted-foreground mb-1">Para bater a meta, feche HOJE:</p>
              <p className="text-4xl font-black text-primary">
                {formatCurrency(currentUserData.dailyNeeded)}
              </p>
              {currentUserData.todayRevenue > 0 && (
                <p className="text-sm mt-2">
                  Já fechou: <span className="font-bold text-success">{formatCurrency(currentUserData.todayRevenue)}</span>
                  {currentUserData.hitTodayGoal && <CheckCircle2 className="w-4 h-4 inline ml-1 text-success" />}
                </p>
              )}
            </div>

            {/* Smart Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <BarChart3 className="w-3 h-3" />
                  Média Diária Atual
                </div>
                <p className="text-lg font-bold">{formatCurrency(currentUserData.dailyAverage)}</p>
                <p className="text-xs text-muted-foreground">
                  Ideal: {formatCurrency(currentUserData.idealDailyRate)}
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  {currentUserData.variance >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  Projeção Final
                </div>
                <p className="text-lg font-bold">{formatCurrency(currentUserData.projectedTotal)}</p>
                <p className={`text-xs ${currentUserData.projectedProgress >= 100 ? "text-success" : "text-muted-foreground"}`}>
                  {currentUserData.projectedProgress.toFixed(0)}% da meta
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Progresso Mensal</span>
                <span className="font-bold">{currentUserData.monthProgress.toFixed(0)}%</span>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(currentUserData.monthProgress, 100)}%` }}
                />
                {/* Expected marker */}
                <div 
                  className="absolute top-0 h-full w-0.5 bg-foreground/50"
                  style={{ left: `${(businessDaysElapsed / totalBusinessDays) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatCurrency(currentUserData.monthRevenue)}</span>
                <span>Meta: {formatCurrency(currentUserData.monthlyGoal)}</span>
              </div>
            </div>

            {/* Variance Alert */}
            {currentUserData.variance < 0 && (
              <div className="mt-3 p-2 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs">
                  Você está <span className="font-bold">{formatCurrency(Math.abs(currentUserData.variance))}</span> atrás do esperado. 
                  Aumente o ritmo para {formatCurrency(currentUserData.dailyNeeded)}/dia.
                </p>
              </div>
            )}
            {currentUserData.variance > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success shrink-0" />
                <p className="text-xs">
                  Você está <span className="font-bold">{formatCurrency(currentUserData.variance)}</span> acima do esperado! Continue assim!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Team/Admin View */}
        {(isAdmin || !currentUserData) && sellersData.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Visão Geral da Equipe
            </p>
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {sellersData
                .filter((s) => isAdmin || s.teamId === profile?.team_id)
                .map((seller) => (
                  <div
                    key={seller.userId}
                    className={`p-3 rounded-xl border ${getStatusColor(seller.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {seller.status === "excellent" && <CheckCircle2 className="w-4 h-4" />}
                        {seller.status === "critical" && <AlertTriangle className="w-4 h-4" />}
                        <span className="font-medium">{seller.name}</span>
                        {seller.streak >= 3 && (
                          <Badge variant="secondary" className="text-xs gap-1 px-1.5">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {seller.streak}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {seller.teamName.replace(" Team", "")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Meta/dia</span>
                        <p className="font-bold">{formatCurrency(seller.dailyNeeded)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hoje</span>
                        <p className={`font-bold ${seller.hitTodayGoal ? "text-success" : ""}`}>
                          {formatCurrency(seller.todayRevenue)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Projeção</span>
                        <p className={`font-bold ${seller.projectedProgress >= 100 ? "text-success" : ""}`}>
                          {seller.projectedProgress.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mês</span>
                        <p className="font-bold">{seller.monthProgress.toFixed(0)}%</p>
                      </div>
                    </div>

                    <Progress value={seller.monthProgress} className="h-1 mt-2" />
                  </div>
                ))}
            </div>
          </div>
        )}

        {sellersData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma meta individual definida para este mês.</p>
            <p className="text-sm">Configure as metas em Metas Individuais.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartDailyGoals;
