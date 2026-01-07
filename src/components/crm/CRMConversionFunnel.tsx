import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, 
  Clock, Target, ArrowDown, CheckCircle2, XCircle,
  Percent, BarChart3, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  startOfMonth, endOfMonth, subMonths, format,
  startOfWeek, endOfWeek, startOfQuarter, endOfQuarter
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';

export function CRMConversionFunnel() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [pipelineId, setPipelineId] = useState<string>('all');

  // Get date range based on period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  // Fetch pipelines
  const { data: pipelines } = useQuery({
    queryKey: ['crm-pipelines-funnel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });

  // Fetch stages with lead counts
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ['crm-conversion-funnel', period, pipelineId, user?.id],
    queryFn: async () => {
      // Get all stages ordered
      let stagesQuery = supabase
        .from('crm_stages')
        .select('*')
        .order('order_index');
      
      if (pipelineId !== 'all') {
        stagesQuery = stagesQuery.eq('pipeline_id', pipelineId);
      }
      
      const { data: stages, error: stagesError } = await stagesQuery;
      if (stagesError) throw stagesError;

      // Get leads for the period
      let leadsQuery = supabase
        .from('crm_leads')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (pipelineId !== 'all') {
        leadsQuery = leadsQuery.eq('pipeline_id', pipelineId);
      }

      const { data: leads, error: leadsError } = await leadsQuery;
      if (leadsError) throw leadsError;

      // Get won leads
      const { data: wonLeads, error: wonError } = await supabase
        .from('crm_leads')
        .select('*')
        .not('won_at', 'is', null)
        .gte('won_at', start.toISOString())
        .lte('won_at', end.toISOString());
      if (wonError) throw wonError;

      // Get lost leads
      const { data: lostLeads, error: lostError } = await supabase
        .from('crm_leads')
        .select('*')
        .not('lost_at', 'is', null)
        .gte('lost_at', start.toISOString())
        .lte('lost_at', end.toISOString());
      if (lostError) throw lostError;

      // Build funnel data
      const totalLeads = leads?.length || 0;
      const funnelStages = stages?.map((stage, index) => {
        const stageLeads = leads?.filter(l => l.stage_id === stage.id) || [];
        const leadsPassed = leads?.filter(l => {
          const currentStage = stages.find(s => s.id === l.stage_id);
          return currentStage && currentStage.order_index >= stage.order_index;
        }) || [];
        
        return {
          name: stage.name,
          count: stageLeads.length,
          passedThrough: leadsPassed.length,
          conversionRate: totalLeads > 0 ? (leadsPassed.length / totalLeads) * 100 : 0,
          dropOffRate: index > 0 && stages[index - 1] ? 
            ((stages[index - 1] as any).passedCount - leadsPassed.length) / (stages[index - 1] as any).passedCount * 100 : 0,
          color: stage.color || '#6366f1',
          avgDays: 0,
        };
      }) || [];

      // Calculate conversion metrics
      const wonCount = wonLeads?.length || 0;
      const lostCount = lostLeads?.length || 0;
      const totalClosed = wonCount + lostCount;
      const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
      const totalWonValue = wonLeads?.reduce((acc, l) => acc + (l.contract_value || l.estimated_value || 0), 0) || 0;
      const avgTicket = wonCount > 0 ? totalWonValue / wonCount : 0;
      const overallConversion = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;

      return {
        stages: funnelStages,
        metrics: {
          totalLeads,
          wonCount,
          lostCount,
          winRate,
          totalWonValue,
          avgTicket,
          overallConversion,
        },
      };
    },
    enabled: !!user,
  });

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Funil de Conversão
          </h2>
          <p className="text-sm text-muted-foreground">
            Análise detalhada das taxas de conversão por estágio
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="last-month">Mês Anterior</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pipelineId} onValueChange={setPipelineId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Pipelines</SelectItem>
              {pipelines?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {funnelData?.metrics.totalLeads || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total de Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {funnelData?.metrics.wonCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Vendas Fechadas</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Percent className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {(funnelData?.metrics.winRate || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Taxa de Conversão</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  R$ {((funnelData?.metrics.avgTicket || 0) / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-muted-foreground">Ticket Médio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Visual Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil Visual</CardTitle>
            <CardDescription>Leads por estágio do pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelData?.stages.map((stage, index) => {
                const maxCount = Math.max(...(funnelData.stages.map(s => s.passedThrough) || [1]));
                const width = (stage.passedThrough / maxCount) * 100;
                
                return (
                  <div key={index} className="relative">
                    <div 
                      className="h-12 rounded-lg flex items-center justify-between px-4 transition-all"
                      style={{ 
                        width: `${Math.max(width, 20)}%`,
                        backgroundColor: `${stage.color}20`,
                        borderLeft: `4px solid ${stage.color}`,
                      }}
                    >
                      <span className="font-medium text-sm truncate">{stage.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {stage.passedThrough} leads
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {stage.conversionRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    {index < (funnelData.stages.length - 1) && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rates Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxa de Conversão por Estágio</CardTitle>
            <CardDescription>Percentual de leads que avançam</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={funnelData?.stages || []}
                  layout="vertical"
                >
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conversão']}
                  />
                  <Bar dataKey="conversionRate" radius={[0, 4, 4, 0]}>
                    {(funnelData?.stages || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lost Reasons Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            Análise de Perdas
          </CardTitle>
          <CardDescription>
            {funnelData?.metrics.lostCount || 0} leads perdidos no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-bold text-red-500">
                {funnelData?.metrics.lostCount || 0}
              </div>
              <div className="text-xs text-muted-foreground">Total Perdido</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-bold">
                {(100 - (funnelData?.metrics.winRate || 0)).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Taxa de Perda</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-bold text-amber-500">
                {((funnelData?.metrics.lostCount || 0) / Math.max(funnelData?.metrics.totalLeads || 1, 1) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">% do Pipeline</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-bold text-blue-500">
                {funnelData?.metrics.totalLeads 
                  ? Math.ceil((funnelData.metrics.totalLeads - funnelData.metrics.wonCount - funnelData.metrics.lostCount) / 
                    Math.max(funnelData.metrics.lostCount / 30, 1))
                  : 0}d
              </div>
              <div className="text-xs text-muted-foreground">Tempo Médio Perda</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
