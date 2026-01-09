import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Smile, Meh, Frown, TrendingUp, TrendingDown, 
  Users, MessageSquare, AlertTriangle, Target,
  Calendar, RefreshCw, Phone, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SentimentStats {
  positive: number;
  neutral: number;
  negative: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  total: number;
  top_intentions: Array<{ intention: string; count: number }>;
  negative_leads: Array<{
    id: string;
    name: string;
    phone: string;
    temperature: string;
    negative_count: number;
    last_negative_at: string;
  }>;
  daily_trend?: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#f59e0b',
  negative: '#ef4444'
};

const INTENTION_COLORS: Record<string, string> = {
  'Interesse': '#22c55e',
  'Dúvidas': '#3b82f6',
  'Agendamento': '#8b5cf6',
  'Negociação': '#f59e0b',
  'Objeção': '#ef4444',
  'Desistência': '#6b7280',
  'Retorno': '#06b6d4',
  'Outros': '#9ca3af'
};

interface CRMSentimentDashboardProps {
  onLeadClick?: (leadId: string) => void;
}

export function CRMSentimentDashboard({ onLeadClick }: CRMSentimentDashboardProps) {
  const [period, setPeriod] = useState('30');

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sentiment-stats', period],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));
      
      const { data, error } = await supabase.rpc('get_sentiment_stats_by_period', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) {
        console.error('Error fetching sentiment stats:', error);
        // Fallback to general stats
        const { data: fallbackData } = await supabase.rpc('get_sentiment_stats');
        return fallbackData as unknown as SentimentStats;
      }
      
      return data as unknown as SentimentStats;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const pieData = stats ? [
    { name: 'Positivo', value: stats.positive_count || 0, color: SENTIMENT_COLORS.positive },
    { name: 'Neutro', value: stats.neutral_count || 0, color: SENTIMENT_COLORS.neutral },
    { name: 'Negativo', value: stats.negative_count || 0, color: SENTIMENT_COLORS.negative }
  ] : [];

  const intentionData = stats?.top_intentions?.map(i => ({
    name: i.intention,
    value: i.count,
    color: INTENTION_COLORS[i.intention] || INTENTION_COLORS['Outros']
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard de Sentimentos</h2>
          <p className="text-sm text-muted-foreground">
            Análise automática de todas as interações com leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Positivo</p>
                <p className="text-2xl font-bold text-green-600">{stats?.positive || 0}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.positive_count || 0} interações
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Smile className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Neutro</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.neutral || 0}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.neutral_count || 0} interações
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Meh className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Negativo</p>
                <p className="text-2xl font-bold text-red-600">{stats?.negative || 0}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.negative_count || 0} interações
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Frown className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">interações analisadas</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Sentimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} interações`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma interação registrada</p>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Intentions Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Intenções Mais Comuns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {intentionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={intentionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {intentionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma intenção registrada</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend */}
      {stats?.daily_trend && stats.daily_trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendência Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                />
                <Line 
                  type="monotone" 
                  dataKey="positive" 
                  stroke={SENTIMENT_COLORS.positive} 
                  strokeWidth={2}
                  dot={false}
                  name="Positivo"
                />
                <Line 
                  type="monotone" 
                  dataKey="neutral" 
                  stroke={SENTIMENT_COLORS.neutral} 
                  strokeWidth={2}
                  dot={false}
                  name="Neutro"
                />
                <Line 
                  type="monotone" 
                  dataKey="negative" 
                  stroke={SENTIMENT_COLORS.negative} 
                  strokeWidth={2}
                  dot={false}
                  name="Negativo"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Negative Leads Alert */}
      <Card className="border-red-500/30 bg-red-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Leads que Precisam de Atenção Imediata
          </CardTitle>
          <CardDescription>
            Leads com mais interações negativas recentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.negative_leads && stats.negative_leads.length > 0 ? (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {stats.negative_leads.map((lead, index) => (
                  <div 
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => onLeadClick?.(lead.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-sm font-bold text-red-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            Última negativa: {formatDistanceToNow(new Date(lead.last_negative_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="gap-1">
                        <Frown className="h-3 w-3" />
                        {lead.negative_count} negativas
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Smile className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="font-medium text-green-600">Ótimas notícias!</p>
              <p className="text-sm">Nenhum lead com interações negativas no período</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending: WhatsApp Integration */}
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-muted-foreground">Integração WhatsApp</h3>
          <p className="text-sm text-muted-foreground mt-1">
            🔜 Em breve: Conexão direta com WhatsApp para análise automática de mensagens
          </p>
          <Badge variant="outline" className="mt-3">Pendente</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

export default CRMSentimentDashboard;
