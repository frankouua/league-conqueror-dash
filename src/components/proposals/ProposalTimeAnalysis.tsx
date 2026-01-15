import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, ArrowRight, Calendar, TrendingDown } from 'lucide-react';

interface TimeAnalysisProps {
  avgConsultationToContract: number;
  avgContractToExecution: number;
  avgClosingTime: number;
}

export function ProposalTimeAnalysis({ 
  avgConsultationToContract, 
  avgContractToExecution,
  avgClosingTime 
}: TimeAnalysisProps) {
  const maxDays = Math.max(avgConsultationToContract, avgContractToExecution, 30);
  
  const stages = [
    {
      name: 'Consulta → Contrato',
      days: avgConsultationToContract,
      description: 'Tempo médio entre a primeira consulta e o fechamento do contrato',
      icon: Calendar,
      color: 'bg-blue-500',
      benchmark: 15, // Ideal benchmark
    },
    {
      name: 'Contrato → Execução',
      days: avgContractToExecution,
      description: 'Tempo médio entre a assinatura do contrato e a execução do procedimento',
      icon: ArrowRight,
      color: 'bg-green-500',
      benchmark: 30,
    },
  ];

  const getPerformanceLabel = (days: number, benchmark: number) => {
    const ratio = days / benchmark;
    if (ratio <= 0.8) return { label: 'Excelente', color: 'text-green-500' };
    if (ratio <= 1) return { label: 'No Alvo', color: 'text-blue-500' };
    if (ratio <= 1.3) return { label: 'Atenção', color: 'text-yellow-500' };
    return { label: 'Crítico', color: 'text-red-500' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Análise de Tempos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Cycle */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Ciclo Total de Venda</span>
            <span className="text-2xl font-bold">{avgClosingTime} dias</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tempo médio completo da consulta até a execução
          </p>
        </div>

        {/* Stage Breakdown */}
        {stages.map((stage) => {
          const performance = getPerformanceLabel(stage.days, stage.benchmark);
          
          return (
            <div key={stage.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <stage.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{stage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{stage.days} dias</span>
                  <span className={`text-xs font-medium ${performance.color}`}>
                    {performance.label}
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={Math.min((stage.days / maxDays) * 100, 100)} 
                  className="h-3"
                />
                {/* Benchmark indicator */}
                <div 
                  className="absolute top-0 h-3 w-0.5 bg-foreground/50"
                  style={{ left: `${(stage.benchmark / maxDays) * 100}%` }}
                  title={`Benchmark: ${stage.benchmark} dias`}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stage.description}</span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Ideal: {stage.benchmark}d
                </span>
              </div>
            </div>
          );
        })}

        {/* Tips */}
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="font-medium mb-1">💡 Dicas para reduzir tempos:</p>
          <ul className="text-muted-foreground text-xs space-y-1 list-disc list-inside">
            <li>Follow-up rápido após a consulta (dentro de 24h)</li>
            <li>Envio de proposta no mesmo dia da consulta</li>
            <li>Uso de urgência e escassez nas negociações</li>
            <li>Agendamento imediato após fechamento do contrato</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
