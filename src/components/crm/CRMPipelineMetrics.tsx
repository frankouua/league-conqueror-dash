import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, Users, Target, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CRMPipelineMetricsProps {
  pipelineId: string;
}

export function CRMPipelineMetrics({ pipelineId }: CRMPipelineMetricsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['crm-pipeline-metrics', pipelineId],
    queryFn: async () => {
      // Fetch stages with leads
      const { data: stages } = await supabase
        .from('crm_stages')
        .select('id, name, color, order_index, is_win_stage, is_lost_stage')
        .eq('pipeline_id', pipelineId)
        .order('order_index');

      if (!stages) return null;

      // Fetch all leads for this pipeline
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('id, stage_id, created_at, won_at, lost_at, estimated_value, contract_value')
        .eq('pipeline_id', pipelineId);

      if (!leads) return null;

      // Fetch stage history for time calculations
      const { data: history } = await supabase
        .from('crm_lead_history')
        .select('lead_id, action_type, from_stage_id, to_stage_id, created_at')
        .eq('action_type', 'stage_change')
        .in('lead_id', leads.map(l => l.id));

      // Calculate metrics per stage
      const stageMetrics = stages.map(stage => {
        const stageLeads = leads.filter(l => l.stage_id === stage.id);
        const stageValue = stageLeads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);

        // Calculate average time in stage
        const stageTimes: number[] = [];
        (history || []).forEach(h => {
          if (h.from_stage_id === stage.id && h.to_stage_id) {
            const lead = leads.find(l => l.id === h.lead_id);
            if (lead) {
              // Find when lead entered this stage
              const enterEvent = (history || []).find(
                e => e.lead_id === h.lead_id && e.to_stage_id === stage.id
              );
              if (enterEvent) {
                const enter = new Date(enterEvent.created_at);
                const exit = new Date(h.created_at);
                const hours = (exit.getTime() - enter.getTime()) / (1000 * 60 * 60);
                if (hours > 0 && hours < 720) { // Max 30 days
                  stageTimes.push(hours);
                }
              }
            }
          }
        });

        const avgTime = stageTimes.length > 0 
          ? stageTimes.reduce((a, b) => a + b, 0) / stageTimes.length 
          : null;

        return {
          ...stage,
          count: stageLeads.length,
          value: stageValue,
          avgTimeHours: avgTime,
        };
      });

      // Calculate funnel conversion
      const totalLeads = leads.length;
      const wonLeads = leads.filter(l => l.won_at).length;
      const lostLeads = leads.filter(l => l.lost_at).length;
      const activeLeads = totalLeads - wonLeads - lostLeads;

      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
      const wonValue = leads.filter(l => l.won_at).reduce((acc, l) => acc + (l.contract_value || l.estimated_value || 0), 0);

      // Calculate velocity (average days to win)
      const wonWithTime = leads.filter(l => l.won_at && l.created_at);
      const velocities = wonWithTime.map(l => {
        const created = new Date(l.created_at);
        const won = new Date(l.won_at!);
        return (won.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      });
      const avgVelocity = velocities.length > 0 
        ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
        : null;

      return {
        stages: stageMetrics,
        totalLeads,
        activeLeads,
        wonLeads,
        lostLeads,
        conversionRate,
        wonValue,
        avgVelocityDays: avgVelocity,
      };
    },
    staleTime: 30000,
  });

  if (isLoading || !metrics) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-40 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const formatTime = (hours: number | null) => {
    if (!hours) return '-';
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Métricas do Funil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Conversão</p>
            <p className="text-lg font-bold text-primary">{metrics.conversionRate.toFixed(1)}%</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Ganhos</p>
            <p className="text-lg font-bold text-green-600">{metrics.wonLeads}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Valor Ganho</p>
            <p className="text-lg font-bold">R$ {(metrics.wonValue / 1000).toFixed(0)}k</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Velocidade</p>
            <p className="text-lg font-bold">{metrics.avgVelocityDays ? `${Math.round(metrics.avgVelocityDays)}d` : '-'}</p>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="space-y-2">
          <p className="text-sm font-medium mb-3">Distribuição por Estágio</p>
          {metrics.stages.filter(s => !s.is_lost_stage).map((stage, i) => {
            const percentage = metrics.totalLeads > 0 
              ? (stage.count / metrics.totalLeads) * 100 
              : 0;

            return (
              <div key={stage.id} className="flex items-center gap-3">
                <div className="w-24 truncate text-sm" style={{ color: stage.color }}>
                  {stage.name}
                </div>
                <div className="flex-1 relative">
                  <Progress 
                    value={percentage} 
                    className="h-6"
                    style={{ 
                      '--progress-background': `${stage.color}30`,
                      '--progress-foreground': stage.color 
                    } as any}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {stage.count} leads
                    </span>
                  </div>
                </div>
                <div className="w-16 text-right">
                  <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(stage.avgTimeHours)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottleneck Alert */}
        {metrics.stages.some(s => s.avgTimeHours && s.avgTimeHours > 72) && (
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-xs">
            <div className="flex items-center gap-2 text-orange-600">
              <Zap className="h-4 w-4" />
              <span className="font-medium">Possível gargalo detectado:</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {metrics.stages
                .filter(s => s.avgTimeHours && s.avgTimeHours > 72)
                .map(s => s.name)
                .join(', ')} tem tempo médio maior que 3 dias
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
