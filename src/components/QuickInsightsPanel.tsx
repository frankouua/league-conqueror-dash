import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Target,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Users,
  DollarSign,
  Clock,
  Zap,
  Trophy,
  ArrowUp,
  ArrowDown,
  Bell,
  Loader2,
} from "lucide-react";

interface QuickInsightsProps {
  month: number;
  year: number;
}

interface SellerInsight {
  userId: string;
  name: string;
  teamName: string;
  position: string;
  meta1Goal: number;
  meta1Actual: number;
  meta1Percent: number;
  meta1Remaining: number;
  daysRemaining: number;
  dailyNeeded: number;
  status: "danger" | "warning" | "on-track" | "achieved";
  suggestion: string;
}

const POSITION_LABELS: Record<string, string> = {
  comercial_1_captacao: "SDR",
  comercial_2_closer: "Closer",
  comercial_3_experiencia: "CS",
  comercial_4_farmer: "Farmer",
  sdr: "SDR",
  coordenador: "Coord.",
  gerente: "Gerente",
  assistente: "Assist.",
  outro: "Outro",
};

export default function QuickInsightsPanel({ month, year }: QuickInsightsProps) {
  const { role } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  // Calculate days remaining in month
  const now = new Date();
  const endOfMonth = new Date(year, month, 0);
  const daysRemaining = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles
  const { data: profiles } = useQuery({
    queryKey: ["profiles-insights"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch predefined goals
  const { data: predefinedGoals } = useQuery({
    queryKey: ["predefined-goals-insights", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predefined_goals")
        .select("*")
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
  });

  // Fetch revenue
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const { data: revenueRecords } = useQuery({
    queryKey: ["revenue-insights", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

  // Build insights
  const insights = useMemo((): SellerInsight[] => {
    if (!profiles || !teams || !predefinedGoals) return [];

    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    return profiles
      .map((profile) => {
        const goal = predefinedGoals.find((g) => g.matched_user_id === profile.user_id);
        if (!goal) return null;

        const userRevenue =
          revenueRecords
            ?.filter((r) => r.user_id === profile.user_id)
            .reduce((sum, r) => sum + Number(r.amount), 0) || 0;

        const meta1Goal = Number(goal.meta1_goal);
        const remaining = Math.max(0, meta1Goal - userRevenue);
        const percent = meta1Goal > 0 ? Math.round((userRevenue / meta1Goal) * 100) : 0;
        const dailyNeeded = daysRemaining > 0 ? remaining / daysRemaining : remaining;

        let status: SellerInsight["status"] = "on-track";
        let suggestion = "";

        if (percent >= 100) {
          status = "achieved";
          suggestion = "Meta batida! Foque na Meta 2.";
        } else if (percent < 50 && daysRemaining < 15) {
          status = "danger";
          suggestion = `Urgente: Precisa ${formatCurrency(dailyNeeded)}/dia. Ação imediata necessária!`;
        } else if (percent < 70 && daysRemaining < 10) {
          status = "warning";
          suggestion = `Atenção: Acelerar vendas. Meta diária: ${formatCurrency(dailyNeeded)}.`;
        } else if (percent >= 80) {
          status = "on-track";
          suggestion = `Bom ritmo! Falta ${formatCurrency(remaining)}.`;
        } else {
          status = "on-track";
          suggestion = `Meta diária: ${formatCurrency(dailyNeeded)}.`;
        }

        return {
          userId: profile.user_id,
          name: profile.full_name.split(" ")[0],
          teamName: profile.team_id ? teamMap.get(profile.team_id) || "" : "",
          position: profile.position ? POSITION_LABELS[profile.position] || "" : "",
          meta1Goal,
          meta1Actual: userRevenue,
          meta1Percent: percent,
          meta1Remaining: remaining,
          daysRemaining,
          dailyNeeded,
          status,
          suggestion,
        };
      })
      .filter((i): i is SellerInsight => i !== null && i.meta1Goal > 0)
      .sort((a, b) => a.meta1Percent - b.meta1Percent);
  }, [profiles, teams, predefinedGoals, revenueRecords, daysRemaining]);

  const dangerCount = insights.filter((i) => i.status === "danger").length;
  const warningCount = insights.filter((i) => i.status === "warning").length;
  const achievedCount = insights.filter((i) => i.status === "achieved").length;

  // Generate strategic suggestions
  const strategicSuggestions = useMemo(() => {
    const suggestions: { icon: typeof Lightbulb; text: string; priority: "high" | "medium" | "low" }[] = [];

    if (dangerCount > 0) {
      suggestions.push({
        icon: AlertTriangle,
        text: `${dangerCount} vendedora${dangerCount > 1 ? "s" : ""} em situação crítica! Considere campanha relâmpago ou ação de recuperação.`,
        priority: "high",
      });
    }

    if (daysRemaining <= 5) {
      suggestions.push({
        icon: Clock,
        text: "Últimos dias do mês! Foque em fechamentos pendentes e follow-up de propostas.",
        priority: "high",
      });
    }

    if (daysRemaining <= 10 && daysRemaining > 5) {
      suggestions.push({
        icon: Zap,
        text: "Semana final! Hora de intensificar contatos e ofertas especiais.",
        priority: "medium",
      });
    }

    if (achievedCount > 0) {
      suggestions.push({
        icon: Trophy,
        text: `${achievedCount} já bateram Meta 1! Incentive a busca pela Meta 2 com bonificações.`,
        priority: "low",
      });
    }

    if (warningCount > 2) {
      suggestions.push({
        icon: Users,
        text: "Múltiplas vendedoras precisando de suporte. Considere reunião de alinhamento.",
        priority: "medium",
      });
    }

    return suggestions;
  }, [dangerCount, warningCount, achievedCount, daysRemaining]);

  // Trigger check critical sellers
  const triggerCheck = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-critical-sellers");
      if (error) throw error;
      toast({
        title: "Verificação concluída",
        description: `${data.critical} crítico(s), ${data.warning} em atenção. ${data.notificationsCreated} alertas criados.`,
      });
    } catch (error) {
      console.error("Error checking sellers:", error);
      toast({
        title: "Erro na verificação",
        description: "Não foi possível verificar as vendedoras.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (status: SellerInsight["status"]) => {
    switch (status) {
      case "danger": return "bg-red-500";
      case "warning": return "bg-amber-500";
      case "on-track": return "bg-blue-500";
      case "achieved": return "bg-green-500";
    }
  };

  const getStatusBg = (status: SellerInsight["status"]) => {
    switch (status) {
      case "danger": return "bg-red-500/10 border-red-500/30";
      case "warning": return "bg-amber-500/10 border-amber-500/30";
      case "on-track": return "bg-blue-500/10 border-blue-500/30";
      case "achieved": return "bg-green-500/10 border-green-500/30";
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Visão Rápida & Estratégias
          </div>
          <div className="flex items-center gap-2">
            {role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={triggerCheck}
                disabled={isChecking}
                className="text-xs h-7 gap-1"
              >
                {isChecking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Bell className="w-3 h-3" />
                )}
                Enviar Alertas
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {daysRemaining} dias
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
            <p className="text-2xl font-bold text-red-500">{dangerCount}</p>
            <p className="text-xs text-muted-foreground">Crítico</p>
          </div>
          <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-2xl font-bold text-amber-500">{warningCount}</p>
            <p className="text-xs text-muted-foreground">Atenção</p>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-2xl font-bold text-blue-500">{insights.filter(i => i.status === "on-track").length}</p>
            <p className="text-xs text-muted-foreground">No Ritmo</p>
          </div>
          <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-2xl font-bold text-green-500">{achievedCount}</p>
            <p className="text-xs text-muted-foreground">Meta ✓</p>
          </div>
        </div>

        {/* Strategic Suggestions */}
        {strategicSuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">💡 Sugestões de Ação:</p>
            {strategicSuggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border flex items-start gap-2 ${
                    suggestion.priority === "high"
                      ? "bg-red-500/10 border-red-500/30"
                      : suggestion.priority === "medium"
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-green-500/10 border-green-500/30"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 ${
                    suggestion.priority === "high"
                      ? "text-red-500"
                      : suggestion.priority === "medium"
                      ? "text-amber-500"
                      : "text-green-500"
                  }`} />
                  <p className="text-sm">{suggestion.text}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Seller Quick View */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">📊 Status por Vendedora:</p>
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {insights.map((seller) => (
                <div
                  key={seller.userId}
                  className={`p-3 rounded-lg border ${getStatusBg(seller.status)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(seller.status)}`} />
                      <span className="font-semibold text-sm">{seller.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {seller.position}
                      </Badge>
                    </div>
                    <span className="text-sm font-bold">{seller.meta1Percent}%</span>
                  </div>
                  <Progress value={Math.min(seller.meta1Percent, 100)} className="h-1.5 mb-1" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(seller.meta1Actual)} / {formatCurrency(seller.meta1Goal)}</span>
                    <span className="text-right">{seller.suggestion}</span>
                  </div>
                </div>
              ))}

              {insights.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma meta configurada para este período</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
