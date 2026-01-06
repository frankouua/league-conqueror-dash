import { Trophy, Medal, Crown, Gift, Plane } from "lucide-react";
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
  teams: {
    name: string;
  };
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
};

interface PrizeHistoryCompactProps {
  year?: number;
  showTitle?: boolean;
}

import React from "react";

const PrizeHistoryCompact = React.forwardRef<HTMLDivElement, PrizeHistoryCompactProps>(
  ({ year = new Date().getFullYear(), showTitle = true }, ref) => {
  const { data: prizes, isLoading } = useQuery({
    queryKey: ['team-prizes', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_prizes')
        .select(`
          *,
          teams (name)
        `)
        .eq('year', year)
        .order('prize_type', { ascending: true })
        .order('period_month', { ascending: true })
        .order('period_semester', { ascending: true });
      
      if (error) throw error;
      return data as TeamPrize[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!prizes || prizes.length === 0) {
    return null;
  }

  const monthlyPrizes = prizes.filter(p => p.prize_type === 'monthly');
  const semesterPrizes = prizes.filter(p => p.prize_type === 'semester');
  const annualPrizes = prizes.filter(p => p.prize_type === 'annual');

  return (
    <div ref={ref} className="space-y-4">
      {showTitle && (
        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Gift className="w-4 h-4" />
          Premiações {year}
        </h4>
      )}

      {/* Monthly Prizes */}
      {monthlyPrizes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensais (R$ 1.000)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {monthlyPrizes.map((prize) => (
              <div
                key={prize.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {MONTH_NAMES[prize.period_month! - 1]}
                  </span>
                  <span className="text-sm font-semibold text-amber-500">
                    {prize.teams?.name}
                  </span>
                </div>
                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs">
                  {formatCurrency(Number(prize.amount))}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semester Prizes */}
      {semesterPrizes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Semestrais (R$ 5.000)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {semesterPrizes.map((prize) => (
              <div
                key={prize.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500/15 to-cyan-500/10 border border-blue-500/30"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {prize.period_semester}º Semestre
                  </span>
                  <span className="text-sm font-semibold text-blue-400">
                    {prize.teams?.name}
                  </span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  {formatCurrency(Number(prize.amount))}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual Prizes */}
      {annualPrizes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Anual (R$ 10.000)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {annualPrizes.map((prize) => (
              <div
                key={prize.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/10 border border-purple-500/40"
              >
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    Campeão {prize.year}
                  </span>
                  <span className="text-base font-bold text-purple-400">
                    {prize.teams?.name}
                  </span>
                  {prize.extra_rewards && (
                    <div className="flex items-center gap-1 mt-1">
                      <Plane className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">{prize.extra_rewards}</span>
                    </div>
                  )}
                </div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {formatCurrency(Number(prize.amount))}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

PrizeHistoryCompact.displayName = "PrizeHistoryCompact";

export default PrizeHistoryCompact;
