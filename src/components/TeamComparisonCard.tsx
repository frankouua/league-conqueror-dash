import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Star, Zap, DollarSign, Scale, Calendar } from "lucide-react";
import { useFilteredTeamScores, PeriodFilter } from "@/hooks/useFilteredTeamScores";
import { Skeleton } from "@/components/ui/skeleton";
import brasaoLioness from "@/assets/brasao-lioness-team.png";
import brasaoTroia from "@/assets/brasao-troia-team.png";

const periodLabels: Record<PeriodFilter, string> = {
  month: "Este Mês",
  semester: "Semestre",
  year: "Este Ano",
  all: "Geral",
};

const TeamComparisonCard = () => {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const { teams, isLoading } = useFilteredTeamScores(period);

  const team1 = teams[0];
  const team2 = teams[1];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPoints = (value: number) => {
    return value.toLocaleString("pt-BR");
  };

  const getPercentage = (value1: number, value2: number) => {
    const total = value1 + value2;
    if (total === 0) return { p1: 50, p2: 50 };
    return {
      p1: (value1 / total) * 100,
      p2: (value2 / total) * 100,
    };
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border overflow-hidden">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!team1 || !team2) {
    return null;
  }

  const metrics = [
    {
      label: "Pontuação Total",
      value1: team1.totalPoints,
      value2: team2.totalPoints,
      icon: TrendingUp,
      format: formatPoints,
      highlight: true,
    },
    {
      label: "Faturamento",
      value1: team1.totalRevenue,
      value2: team2.totalRevenue,
      icon: DollarSign,
      format: formatCurrency,
    },
    {
      label: "Pontos de Receita",
      value1: team1.revenuePoints,
      value2: team2.revenuePoints,
      icon: DollarSign,
      format: formatPoints,
    },
    {
      label: "Pontos de Qualidade",
      value1: team1.qualityPoints,
      value2: team2.qualityPoints,
      icon: Star,
      format: formatPoints,
    },
    {
      label: "Modificadores (Cards)",
      value1: team1.modifierPoints,
      value2: team2.modifierPoints,
      icon: Zap,
      format: formatPoints,
      showSign: true,
    },
  ];

  return (
    <Card className="bg-gradient-card border-border overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Scale className="w-5 h-5 text-primary" />
            Comparação Lado a Lado
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(Object.keys(periodLabels) as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>Exibindo: {periodLabels[period]}</span>
        </div>

        {/* Team Headers */}
        <div className="grid grid-cols-3 gap-4 text-center items-center">
          <div className="flex items-center gap-2">
            <img 
              src={team1.name.toLowerCase().includes("lioness") ? brasaoLioness : brasaoTroia} 
              alt={team1.name}
              className="w-8 h-8 object-contain"
            />
            <span className="text-sm font-semibold text-primary truncate">
              {team1.name}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">VS</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm font-semibold text-primary truncate">
              {team2.name}
            </span>
            <img 
              src={team2.name.toLowerCase().includes("lioness") ? brasaoLioness : brasaoTroia} 
              alt={team2.name}
              className="w-8 h-8 object-contain"
            />
          </div>
        </div>

        {/* Metrics */}
        {metrics.map((metric, index) => {
          const { p1, p2 } = getPercentage(
            Math.abs(metric.value1),
            Math.abs(metric.value2)
          );
          const team1Winning = metric.value1 > metric.value2;
          const team2Winning = metric.value2 > metric.value1;
          const isTied = metric.value1 === metric.value2;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <metric.icon className="w-4 h-4 text-muted-foreground" />
                <span
                  className={`text-sm ${
                    metric.highlight
                      ? "font-bold text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {metric.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                {/* Team 1 Value */}
                <div className="text-left">
                  <span
                    className={`text-sm font-bold ${
                      team1Winning
                        ? "text-green-500"
                        : isTied
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {metric.showSign && metric.value1 > 0 ? "+" : ""}
                    {metric.format(metric.value1)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 h-full transition-all duration-500 ${
                      team1Winning
                        ? "bg-gradient-to-r from-green-500 to-green-400"
                        : "bg-gradient-to-r from-primary/60 to-primary/40"
                    }`}
                    style={{ width: `${p1}%` }}
                  />
                  <div
                    className={`absolute right-0 h-full transition-all duration-500 ${
                      team2Winning
                        ? "bg-gradient-to-l from-green-500 to-green-400"
                        : "bg-gradient-to-l from-primary/60 to-primary/40"
                    }`}
                    style={{ width: `${p2}%` }}
                  />
                  {/* Center divider */}
                  <div className="absolute left-1/2 top-0 w-0.5 h-full bg-background/50 -translate-x-1/2" />
                </div>

                {/* Team 2 Value */}
                <div className="text-right">
                  <span
                    className={`text-sm font-bold ${
                      team2Winning
                        ? "text-green-500"
                        : isTied
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {metric.showSign && metric.value2 > 0 ? "+" : ""}
                    {metric.format(metric.value2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {team1.totalPoints > team2.totalPoints
                ? `${team1.name} lidera por ${formatPoints(
                    team1.totalPoints - team2.totalPoints
                  )} pts`
                : team2.totalPoints > team1.totalPoints
                ? `${team2.name} lidera por ${formatPoints(
                    team2.totalPoints - team1.totalPoints
                  )} pts`
                : "Empate total!"}
            </span>
            <span className="text-primary font-medium">
              Diferença:{" "}
              {formatPoints(Math.abs(team1.totalPoints - team2.totalPoints))} pts
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamComparisonCard;
