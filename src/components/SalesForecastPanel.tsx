import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Loader2,
} from "lucide-react";

interface SalesForecastPanelProps {
  month: number;
  year: number;
}

interface ForecastMetrics {
  currentRevenue: number;
  projectedTotal: number;
  monthlyGoal: number;
  goalProgress: number;
  projectedGoalProgress: number;
  dailyAverage: number;
  businessDaysElapsed: number;
  businessDaysRemaining: number;
  sameMonthLastYear: number | null;
  yoyGrowth: number | null;
  historicalData: { month: number; year: number; revenue: number }[];
}

const SalesForecastPanel = ({ month, year }: SalesForecastPanelProps) => {
  const { profile, role } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastText, setForecastText] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);

  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const generateForecast = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("sales-forecast", {
        body: {
          month,
          year,
          teamId: role === "admin" ? undefined : profile?.team_id,
          userId: role === "admin" ? undefined : profile?.user_id,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Erro na previsão",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setForecastText(data.forecast);
      setMetrics(data.metrics);

      toast({
        title: "Previsão gerada!",
        description: "Análise de IA concluída com sucesso.",
      });
    } catch (error) {
      console.error("Forecast error:", error);
      toast({
        title: "Erro ao gerar previsão",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getGoalStatus = () => {
    if (!metrics) return null;
    const { projectedGoalProgress } = metrics;
    if (projectedGoalProgress >= 100) return { label: "Meta Garantida", color: "text-success bg-success/10", icon: CheckCircle2 };
    if (projectedGoalProgress >= 90) return { label: "Quase Lá", color: "text-amber-500 bg-amber-500/10", icon: Target };
    if (projectedGoalProgress >= 70) return { label: "Atenção", color: "text-orange-500 bg-orange-500/10", icon: AlertTriangle };
    return { label: "Risco", color: "text-destructive bg-destructive/10", icon: AlertTriangle };
  };

  const goalStatus = getGoalStatus();

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-info/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span>Previsão Inteligente</span>
            <Badge variant="outline" className="gap-1 text-xs">
              <Sparkles className="w-3 h-3" />
              IA
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateForecast}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isGenerating ? "Analisando..." : "Gerar Previsão"}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!forecastText && !isGenerating && (
          <div className="text-center py-8">
            <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-2">
              Clique em "Gerar Previsão" para analisar seus dados
            </p>
            <p className="text-xs text-muted-foreground">
              A IA analisará histórico, sazonalidade e tendências para prever o fechamento do mês
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <Brain className="w-16 h-16 text-primary animate-pulse" />
              <Sparkles className="w-6 h-6 absolute -top-1 -right-1 text-primary animate-bounce" />
            </div>
            <p className="text-muted-foreground">Analisando dados históricos...</p>
            <p className="text-xs text-muted-foreground mt-1">Calculando tendências e sazonalidade</p>
          </div>
        )}

        {metrics && (
          <div className="space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <BarChart3 className="w-3 h-3" />
                  Atual
                </div>
                <p className="text-lg font-bold">{formatCurrency(metrics.currentRevenue)}</p>
              </div>
              <div className="p-3 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Projeção
                </div>
                <p className="text-lg font-bold text-primary">{formatCurrency(metrics.projectedTotal)}</p>
              </div>
              {metrics.monthlyGoal > 0 && (
                <div className="p-3 rounded-xl bg-background/50 border border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Target className="w-3 h-3" />
                    Meta
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(metrics.monthlyGoal)}</p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Calendar className="w-3 h-3" />
                  Dias Úteis
                </div>
                <p className="text-lg font-bold">
                  {metrics.businessDaysElapsed}/{metrics.businessDaysElapsed + metrics.businessDaysRemaining}
                </p>
              </div>
            </div>

            {/* Goal Progress */}
            {metrics.monthlyGoal > 0 && goalStatus && (
              <div className={`p-4 rounded-xl border ${goalStatus.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <goalStatus.icon className="w-5 h-5" />
                    <span className="font-medium">Projeção vs Meta</span>
                  </div>
                  <Badge className={goalStatus.color}>{goalStatus.label}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso atual: {metrics.goalProgress.toFixed(0)}%</span>
                    <span>Projeção: {metrics.projectedGoalProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(metrics.projectedGoalProgress, 100)} className="h-3" />
                </div>
              </div>
            )}

            {/* Year over Year */}
            {metrics.sameMonthLastYear !== null && metrics.yoyGrowth !== null && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  {metrics.yoyGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-sm">vs. mesmo mês ano passado</span>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${metrics.yoyGrowth >= 0 ? "text-success" : "text-destructive"}`}>
                    {metrics.yoyGrowth >= 0 ? "+" : ""}{metrics.yoyGrowth.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(metrics.sameMonthLastYear)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis */}
        {forecastText && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-info/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Análise da IA</span>
            </div>
            <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {forecastText}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesForecastPanel;
