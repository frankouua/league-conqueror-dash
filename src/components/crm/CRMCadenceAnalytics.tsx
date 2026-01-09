import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Clock, Timer, TrendingUp, Calendar, Phone, 
  AlertTriangle, CheckCircle2, RefreshCw, BarChart3,
  Zap, Target, Activity, Sun, Moon, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface CadenceMetrics {
  tempo_medio_resposta_minutos: number;
  numero_interacoes_dia: number;
  tempo_entre_interacoes_media_horas: number;
  melhor_horario_resposta: number;
  taxa_resposta_24h: number;
  total_interacoes: number;
  primeira_interacao: string;
  ultima_interacao: string;
  dias_ativos: number;
}

interface SellerCadenceSummary {
  total_leads_ativos: number;
  media_interacoes_por_lead: number;
  tempo_medio_resposta_geral: number;
  leads_sem_contato_24h: number;
  leads_sem_contato_48h: number;
  melhor_horario_geral: number;
  pior_horario_geral: number;
  taxa_resposta_geral: number;
}

interface HourDistribution {
  hora: number;
  total_interacoes: number;
  percentual: number;
}

interface CRMCadenceAnalyticsProps {
  leadId?: string;
  compact?: boolean;
}

export function CRMCadenceAnalytics({ leadId, compact = false }: CRMCadenceAnalyticsProps) {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<'individual' | 'team'>('individual');

  // Fetch lead-specific cadence metrics
  const { data: leadMetrics, isLoading: leadLoading } = useQuery({
    queryKey: ['cadence-metrics', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .rpc('calculate_cadence_metrics', { p_lead_id: leadId });
      if (error) throw error;
      return data?.[0] as CadenceMetrics | null;
    },
    enabled: !!leadId,
  });

  // Fetch seller cadence summary
  const { data: sellerSummary, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ['seller-cadence-summary', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .rpc('get_seller_cadence_summary', { p_seller_id: user.id });
      if (error) throw error;
      return data?.[0] as SellerCadenceSummary | null;
    },
    enabled: !!user?.id && !leadId,
  });

  // Fetch hour distribution
  const { data: hourDistribution } = useQuery({
    queryKey: ['hour-distribution', leadId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_interaction_hour_distribution', { 
          p_lead_id: leadId || null,
          p_seller_id: leadId ? null : user?.id 
        });
      if (error) throw error;
      return (data as HourDistribution[]) || [];
    },
    enabled: !!user?.id || !!leadId,
  });

  // Format hour for display
  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  // Get hour quality color
  const getHourQuality = (hour: number, bestHour: number) => {
    const diff = Math.abs(hour - bestHour);
    if (diff <= 1) return 'bg-green-500';
    if (diff <= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Prepare chart data for hour distribution
  const hourChartData = Array.from({ length: 24 }, (_, i) => {
    const hourData = hourDistribution?.find(h => h.hora === i);
    return {
      hora: formatHour(i),
      interacoes: hourData?.total_interacoes || 0,
      percentual: hourData?.percentual || 0,
    };
  }).filter(h => {
    // Only show business hours (7-21) for cleaner chart
    const hourNum = parseInt(h.hora.split(':')[0]);
    return hourNum >= 7 && hourNum <= 21;
  });

  const isLoading = leadLoading || summaryLoading;
  const metrics = leadId ? leadMetrics : null;
  const summary = !leadId ? sellerSummary : null;

  // Compact view for lead detail
  if (compact && leadId) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Análise de Cadência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : metrics ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-primary">
                    {metrics.tempo_medio_resposta_minutos}min
                  </p>
                  <p className="text-xs text-muted-foreground">Tempo médio resposta</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-green-500">
                    {metrics.taxa_resposta_24h}%
                  </p>
                  <p className="text-xs text-muted-foreground">Resposta em 24h</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Melhor horário:</span>
                <Badge variant="outline">
                  {formatHour(metrics.melhor_horario_resposta)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Interações/dia:</span>
                <span className="font-medium">{metrics.numero_interacoes_dia}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total interações:</span>
                <span className="font-medium">{metrics.total_interacoes}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Sem dados de interação
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full dashboard view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="w-6 h-6 text-primary" />
            Análise de Cadência
          </h2>
          <p className="text-muted-foreground">
            Métricas de tempo de resposta e engajamento
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedView} onValueChange={(v) => setSelectedView(v as 'individual' | 'team')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Meus Leads</SelectItem>
              <SelectItem value="team">Equipe</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {summary?.tempo_medio_resposta_geral || 0}
                      <span className="text-sm font-normal text-muted-foreground"> min</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Tempo médio resposta</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {summary?.taxa_resposta_geral || 0}
                      <span className="text-sm font-normal text-muted-foreground">%</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Taxa resposta 24h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Activity className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {summary?.media_interacoes_por_lead || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Interações/lead</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Users className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {summary?.total_leads_ativos || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Leads ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className={cn(
              "border-l-4",
              (summary?.leads_sem_contato_24h || 0) > 0 
                ? "border-l-yellow-500 bg-yellow-500/5" 
                : "border-l-green-500 bg-green-500/5"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(summary?.leads_sem_contato_24h || 0) > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">Leads sem contato 24h</p>
                      <p className="text-sm text-muted-foreground">
                        {(summary?.leads_sem_contato_24h || 0) > 0 
                          ? 'Ação necessária!' 
                          : 'Tudo em dia!'
                        }
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-3xl font-bold",
                    (summary?.leads_sem_contato_24h || 0) > 0 ? "text-yellow-500" : "text-green-500"
                  )}>
                    {summary?.leads_sem_contato_24h || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-l-4",
              (summary?.leads_sem_contato_48h || 0) > 0 
                ? "border-l-red-500 bg-red-500/5" 
                : "border-l-green-500 bg-green-500/5"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(summary?.leads_sem_contato_48h || 0) > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">Leads sem contato 48h</p>
                      <p className="text-sm text-muted-foreground">
                        {(summary?.leads_sem_contato_48h || 0) > 0 
                          ? 'Risco de perda!' 
                          : 'Tudo em dia!'
                        }
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-3xl font-bold",
                    (summary?.leads_sem_contato_48h || 0) > 0 ? "text-red-500" : "text-green-500"
                  )}>
                    {summary?.leads_sem_contato_48h || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hour Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Distribuição de Interações por Horário
              </CardTitle>
              <CardDescription>
                Identifique os melhores horários para contato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="hora" 
                      className="text-xs" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar 
                      dataKey="interacoes" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Interações"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Best/Worst Hours Summary */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Sun className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Melhor Horário</p>
                    <p className="text-lg font-bold text-green-500">
                      {formatHour(summary?.melhor_horario_geral || 9)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Moon className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Evitar</p>
                    <p className="text-lg font-bold text-red-500">
                      {formatHour(summary?.pior_horario_geral || 18)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Dicas para Melhorar sua Cadência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <Target className="w-6 h-6 text-blue-500 mb-2" />
                  <h4 className="font-medium mb-1">Responda Rápido</h4>
                  <p className="text-sm text-muted-foreground">
                    Leads respondidos em até 5 minutos têm 21x mais chance de conversão.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <Calendar className="w-6 h-6 text-green-500 mb-2" />
                  <h4 className="font-medium mb-1">Horário Ideal</h4>
                  <p className="text-sm text-muted-foreground">
                    Entre em contato às {formatHour(summary?.melhor_horario_geral || 10)} para melhores resultados.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <Phone className="w-6 h-6 text-purple-500 mb-2" />
                  <h4 className="font-medium mb-1">Follow-up Consistente</h4>
                  <p className="text-sm text-muted-foreground">
                    Mantenha {Math.max(2, Math.round(summary?.media_interacoes_por_lead || 3))}+ interações por lead para aumentar conversões.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
