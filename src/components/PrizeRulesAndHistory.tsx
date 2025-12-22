import { Trophy, Medal, Crown, Gift, Plane, DollarSign, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

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

export default function PrizeRulesAndHistory() {
  const currentYear = new Date().getFullYear();
  
  const { data: prizes, isLoading } = useQuery({
    queryKey: ['team-prizes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_prizes')
        .select(`
          *,
          teams (name)
        `)
        .order('year', { ascending: false })
        .order('prize_type', { ascending: true })
        .order('period_month', { ascending: true });
      
      if (error) throw error;
      return data as TeamPrize[];
    },
  });

  // Group prizes by year
  const prizesByYear = prizes?.reduce((acc, prize) => {
    if (!acc[prize.year]) {
      acc[prize.year] = { monthly: [], semester: [], annual: [] };
    }
    acc[prize.year][prize.prize_type].push(prize);
    return acc;
  }, {} as Record<number, { monthly: TeamPrize[]; semester: TeamPrize[]; annual: TeamPrize[] }>);

  // Calculate team totals
  const teamTotals = prizes?.reduce((acc, prize) => {
    const teamName = prize.teams?.name || 'Desconhecido';
    if (!acc[teamName]) {
      acc[teamName] = 0;
    }
    acc[teamName] += Number(prize.amount);
    return acc;
  }, {} as Record<string, number>);

  const sortedTeams = teamTotals 
    ? Object.entries(teamTotals).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      {/* Prize Rules */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Sistema de Premiações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monthly */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">Premiação Mensal</h3>
                  <Badge className="bg-amber-500 text-black font-bold text-lg px-3">R$ 1.000</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">"O Ritmo da Vitória" - Para a equipe vencedora do mês</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                    <Award className="w-3 h-3 mr-1" />
                    Troféu Rotativo Ouro CPI
                  </Badge>
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                    <Gift className="w-3 h-3 mr-1" />
                    Pulseiras dos Campeões
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Semester */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/15 to-cyan-500/10 border border-blue-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Medal className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">Premiação Semestral</h3>
                  <Badge className="bg-blue-500 text-white font-bold text-lg px-3">R$ 5.000</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">"A Conquista da Elite" - Para a equipe que mais venceu rodadas no semestre</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                    <Medal className="w-3 h-3 mr-1" />
                    Medalhas de Elite
                  </Badge>
                  <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                    <Trophy className="w-3 h-3 mr-1" />
                    Troféu Elite CPI (fixo)
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Annual */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/10 border border-purple-500/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5 animate-pulse" />
            <div className="flex items-start gap-4 relative">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">Premiação Anual</h3>
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg px-3">R$ 10.000</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">"A Glória Suprema" - Para a equipe campeã do ano</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                    <Crown className="w-3 h-3 mr-1" />
                    Taça Suprema Unique League
                  </Badge>
                  <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                    <Award className="w-3 h-3 mr-1" />
                    Hall da Fama
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">
                      Prêmio Extra: Passagem aérea para viagem 2026
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Condição: Atingir META ANUAL da clínica (R$ 36.000.000)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prize History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Histórico de Premiações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !prizes || prizes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma premiação registrada ainda.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Team Totals */}
              {sortedTeams.length > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Total Acumulado por Equipe
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sortedTeams.map(([teamName, total], index) => (
                      <div 
                        key={teamName} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          index === 0 
                            ? 'bg-gradient-to-r from-primary/20 to-yellow-500/10 border border-primary/30' 
                            : 'bg-muted/50 border border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {index === 0 && <Crown className="w-4 h-4 text-primary" />}
                          <span className="font-semibold">{teamName}</span>
                        </div>
                        <span className={`text-xl font-black ${index === 0 ? 'text-primary' : 'text-foreground'}`}>
                          {formatCurrency(total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Prizes by Year */}
              {prizesByYear && Object.entries(prizesByYear)
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([year, yearPrizes]) => (
                  <div key={year} className="space-y-4">
                    <h4 className="font-bold text-lg text-primary">{year}</h4>
                    
                    {/* Monthly */}
                    {yearPrizes.monthly.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-muted-foreground">Mensais</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {yearPrizes.monthly.map((prize) => (
                            <div
                              key={prize.id}
                              className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20"
                            >
                              <p className="text-xs text-muted-foreground">{MONTH_NAMES[prize.period_month! - 1]}</p>
                              <p className="font-semibold text-amber-500">{prize.teams?.name}</p>
                              <Badge className="mt-1 bg-amber-500/20 text-amber-500 text-xs">
                                {formatCurrency(Number(prize.amount))}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Semester */}
                    {yearPrizes.semester.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Medal className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-muted-foreground">Semestrais</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {yearPrizes.semester.map((prize) => (
                            <div
                              key={prize.id}
                              className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border border-blue-500/20"
                            >
                              <p className="text-xs text-muted-foreground">{prize.period_semester}º Semestre</p>
                              <p className="font-semibold text-blue-400">{prize.teams?.name}</p>
                              <Badge className="mt-1 bg-blue-500/20 text-blue-400 text-xs">
                                {formatCurrency(Number(prize.amount))}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Annual */}
                    {yearPrizes.annual.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-medium text-muted-foreground">Anual</span>
                        </div>
                        {yearPrizes.annual.map((prize) => (
                          <div
                            key={prize.id}
                            className="p-4 rounded-xl bg-gradient-to-r from-purple-500/15 to-pink-500/10 border border-purple-500/30"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Campeão {year}</p>
                                <p className="text-lg font-bold text-purple-400">{prize.teams?.name}</p>
                                {prize.extra_rewards && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Plane className="w-3 h-3 text-green-500" />
                                    <span className="text-xs text-green-500">{prize.extra_rewards}</span>
                                  </div>
                                )}
                              </div>
                              <Badge className="bg-purple-500/20 text-purple-400 text-lg">
                                {formatCurrency(Number(prize.amount))}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
