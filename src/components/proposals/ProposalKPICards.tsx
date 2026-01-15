import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, TrendingUp, DollarSign, Clock, 
  ArrowUp, ArrowDown, Minus 
} from 'lucide-react';

interface KPIs {
  totalProposals: number;
  closedProposals: number;
  conversionRate: number;
  totalContractedValue: number;
  avgClosingTime: number;
  avgConsultationToContract: number;
  avgContractToExecution: number;
}

interface ProposalKPICardsProps {
  kpis: KPIs;
  previousKpis?: KPIs;
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

function TrendIndicator({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null;
  
  const diff = current - previous;
  const percentChange = previous > 0 ? ((diff / previous) * 100) : 0;
  
  if (Math.abs(percentChange) < 1) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Minus className="h-3 w-3" /> Estável
      </span>
    );
  }
  
  if (percentChange > 0) {
    return (
      <span className="text-xs text-green-500 flex items-center gap-1">
        <ArrowUp className="h-3 w-3" /> +{percentChange.toFixed(1)}%
      </span>
    );
  }
  
  return (
    <span className="text-xs text-red-500 flex items-center gap-1">
      <ArrowDown className="h-3 w-3" /> {percentChange.toFixed(1)}%
    </span>
  );
}

export function ProposalKPICards({ kpis, previousKpis }: ProposalKPICardsProps) {
  const cards = [
    {
      title: 'Total Propostas',
      value: kpis.totalProposals.toString(),
      subtitle: `${kpis.closedProposals} fechadas`,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      previousValue: previousKpis?.totalProposals,
    },
    {
      title: 'Taxa Conversão',
      value: `${kpis.conversionRate.toFixed(1)}%`,
      subtitle: `${kpis.closedProposals}/${kpis.totalProposals}`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      previousValue: previousKpis?.conversionRate,
    },
    {
      title: 'Valor Contratado',
      value: formatCurrency(kpis.totalContractedValue),
      subtitle: `Média: ${formatCurrency(kpis.closedProposals > 0 ? kpis.totalContractedValue / kpis.closedProposals : 0)}`,
      icon: DollarSign,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      previousValue: previousKpis?.totalContractedValue,
    },
    {
      title: 'Tempo Médio',
      value: `${kpis.avgClosingTime} dias`,
      subtitle: `Consulta→Contrato: ${kpis.avgConsultationToContract}d`,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      previousValue: previousKpis?.avgClosingTime,
      invertTrend: true, // Lower is better
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                <TrendIndicator 
                  current={parseFloat(card.value.replace(/[^\d.-]/g, ''))} 
                  previous={card.previousValue} 
                />
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
