import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, TrendingUp, Clock } from 'lucide-react';
import { SellerStats } from '@/hooks/useProposalAnalytics';

interface ProposalSellerRankingProps {
  sellerStats: SellerStats[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export function ProposalSellerRanking({ sellerStats }: ProposalSellerRankingProps) {
  const maxConversion = Math.max(...sellerStats.map(s => s.conversionRate), 1);
  
  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-gray-400';
      case 2: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const getConversionBadge = (rate: number) => {
    if (rate >= 50) return { variant: 'default' as const, label: 'Excelente' };
    if (rate >= 35) return { variant: 'secondary' as const, label: 'Bom' };
    if (rate >= 20) return { variant: 'outline' as const, label: 'Regular' };
    return { variant: 'destructive' as const, label: 'Baixo' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Ranking por Vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sellerStats.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nenhum dado de vendedor disponível
          </div>
        ) : (
          <div className="space-y-4">
            {sellerStats.slice(0, 10).map((seller, index) => {
              const badge = getConversionBadge(seller.conversionRate);
              
              return (
                <div key={seller.sellerId || seller.sellerName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8">
                        {index < 3 ? (
                          <Trophy className={`h-5 w-5 ${getMedalColor(index)}`} />
                        ) : (
                          <span className="text-sm text-muted-foreground font-medium">
                            {index + 1}º
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{seller.sellerName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{seller.totalProposals} propostas</span>
                          <span>•</span>
                          <span>{seller.closedProposals} fechadas</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="font-bold">{seller.conversionRate.toFixed(1)}%</span>
                        <Badge variant={badge.variant} className="text-xs">
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatCurrency(seller.totalValue)}</span>
                        {seller.avgClosingDays > 0 && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{seller.avgClosingDays}d</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={(seller.conversionRate / maxConversion) * 100} 
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
