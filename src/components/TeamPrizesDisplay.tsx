import { Trophy, Medal, Award, Plane, Gift, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamPrize {
  id: string;
  team_id: string;
  prize_type: 'monthly' | 'semester' | 'annual';
  period_month: number | null;
  period_semester: number | null;
  year: number;
  amount: number;
  items: string[] | null;
  extra_rewards: string | null;
  notes: string | null;
  awarded_at: string;
  teams: {
    name: string;
  };
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
};

const getPrizeIcon = (type: string) => {
  switch (type) {
    case 'monthly':
      return <Trophy className="w-5 h-5" />;
    case 'semester':
      return <Medal className="w-5 h-5" />;
    case 'annual':
      return <Crown className="w-5 h-5" />;
    default:
      return <Award className="w-5 h-5" />;
  }
};

const getPrizeLabel = (prize: TeamPrize) => {
  switch (prize.prize_type) {
    case 'monthly':
      return `${MONTH_NAMES[prize.period_month! - 1]} ${prize.year}`;
    case 'semester':
      return `${prize.period_semester}º Semestre ${prize.year}`;
    case 'annual':
      return `Anual ${prize.year}`;
    default:
      return prize.year.toString();
  }
};

const getPrizeTypeName = (type: string) => {
  switch (type) {
    case 'monthly':
      return 'Mensal';
    case 'semester':
      return 'Semestral';
    case 'annual':
      return 'Anual';
    default:
      return type;
  }
};

const getPrizeGradient = (type: string) => {
  switch (type) {
    case 'monthly':
      return 'from-amber-500/20 to-yellow-500/20 border-amber-500/30';
    case 'semester':
      return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
    case 'annual':
      return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
    default:
      return 'from-primary/20 to-primary/10 border-primary/30';
  }
};

const getPrizeTextColor = (type: string) => {
  switch (type) {
    case 'monthly':
      return 'text-amber-500';
    case 'semester':
      return 'text-blue-400';
    case 'annual':
      return 'text-purple-400';
    default:
      return 'text-primary';
  }
};

export default function TeamPrizesDisplay() {
  const { data: prizes, isLoading } = useQuery({
    queryKey: ['team-prizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_prizes')
        .select(`
          *,
          teams (name)
        `)
        .order('year', { ascending: false })
        .order('awarded_at', { ascending: false });
      
      if (error) throw error;
      return data as TeamPrize[];
    },
  });

  // Calculate totals per team
  const teamTotals = prizes?.reduce((acc, prize) => {
    const teamName = prize.teams?.name || 'Unknown';
    if (!acc[teamName]) {
      acc[teamName] = { monthly: 0, semester: 0, annual: 0, total: 0 };
    }
    acc[teamName][prize.prize_type] += Number(prize.amount);
    acc[teamName].total += Number(prize.amount);
    return acc;
  }, {} as Record<string, { monthly: number; semester: number; annual: number; total: number }>);

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Premiações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prizes || prizes.length === 0) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Premiações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma premiação registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Premiações Conquistadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Totals */}
        {teamTotals && Object.keys(teamTotals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(teamTotals).map(([teamName, totals]) => (
              <div
                key={teamName}
                className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{teamName}</h3>
                  <span className="text-2xl font-black text-gradient-gold">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {totals.monthly > 0 && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                      <Trophy className="w-3 h-3 mr-1" />
                      Mensal: {formatCurrency(totals.monthly)}
                    </Badge>
                  )}
                  {totals.semester > 0 && (
                    <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                      <Medal className="w-3 h-3 mr-1" />
                      Semestral: {formatCurrency(totals.semester)}
                    </Badge>
                  )}
                  {totals.annual > 0 && (
                    <Badge variant="outline" className="text-purple-400 border-purple-500/30">
                      <Crown className="w-3 h-3 mr-1" />
                      Anual: {formatCurrency(totals.annual)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prize History */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Histórico de Premiações
          </h4>
          <div className="grid gap-3">
            {prizes.map((prize) => (
              <div
                key={prize.id}
                className={`p-4 rounded-xl bg-gradient-to-br ${getPrizeGradient(prize.prize_type)} border`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-background/50 ${getPrizeTextColor(prize.prize_type)}`}>
                      {getPrizeIcon(prize.prize_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{prize.teams?.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {getPrizeTypeName(prize.prize_type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getPrizeLabel(prize)}
                      </p>
                      {prize.items && prize.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {prize.items.map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Gift className="w-3 h-3 mr-1" />
                              {item}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {prize.extra_rewards && (
                        <div className="mt-2">
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Plane className="w-3 h-3 mr-1" />
                            {prize.extra_rewards}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-black ${getPrizeTextColor(prize.prize_type)}`}>
                      {formatCurrency(Number(prize.amount))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
