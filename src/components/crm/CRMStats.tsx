import { TrendingUp, Users, DollarSign, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCRMStats } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';

interface CRMStatsProps {
  pipelineId?: string;
}

export function CRMStats({ pipelineId }: CRMStatsProps) {
  const { data: stats, isLoading } = useCRMStats(pipelineId);

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatValueK = (value: number) => {
    const valueInK = Math.round(value / 1000);
    return valueInK.toLocaleString('pt-BR');
  };

  const statCards = [
    {
      label: 'Total de Leads',
      value: stats.totalLeads.toLocaleString('pt-BR'),
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Valor em Pipeline',
      value: `R$ ${formatValueK(stats.totalValue)}k`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Taxa de Conversão',
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Ganhos',
      value: stats.wonLeads.toLocaleString('pt-BR'),
      subValue: stats.wonValue > 0 ? `R$ ${formatValueK(stats.wonValue)}k` : null,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Perdidos',
      value: stats.lostLeads,
      icon: Clock,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
    },
    {
      label: 'Leads Parados',
      value: stats.staleLeads,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      highlight: stats.staleLeads > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat, i) => (
        <Card
          key={i}
          className={cn(
            "transition-all hover:shadow-md",
            stat.highlight && "border-orange-500/50"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1.5 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stat.value}</span>
              {stat.subValue && (
                <span className="text-xs text-muted-foreground">{stat.subValue}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
