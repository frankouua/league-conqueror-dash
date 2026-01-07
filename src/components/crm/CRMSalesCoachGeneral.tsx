import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Brain, Sparkles, Target, MessageSquare, Lightbulb,
  CheckCircle2, AlertTriangle, TrendingUp, Loader2,
  ChevronDown, ChevronUp, Zap, Trophy, Clock, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CoachingInsight {
  category: string;
  icon: React.ElementType;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  metric?: number;
}

export function CRMSalesCoachGeneral() {
  const { user, profile } = useAuth();
  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  // Fetch general CRM metrics for coaching
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['crm-coach-metrics', user?.id],
    queryFn: async () => {
      // Get all leads
      const { data: allLeads, error: leadsError } = await supabase
        .from('crm_leads')
        .select('*');
      
      if (leadsError) throw leadsError;

      // Get user's leads
      const { data: myLeads, error: myLeadsError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id);
      
      if (myLeadsError) throw myLeadsError;

      // Calculate metrics
      const staleLeads = myLeads?.filter(l => l.is_stale) || [];
      const priorityLeads = myLeads?.filter(l => l.is_priority) || [];
      const wonLeads = myLeads?.filter(l => l.won_at) || [];
      const lostLeads = myLeads?.filter(l => l.lost_at) || [];
      const aiAnalyzed = myLeads?.filter(l => l.ai_analyzed_at) || [];
      const highValueLeads = myLeads?.filter(l => (l.estimated_value || 0) >= 10000) || [];
      const qualifiedLeads = myLeads?.filter(l => (l.lead_score || 0) >= 25) || [];

      // Calculate win rate
      const closedLeads = wonLeads.length + lostLeads.length;
      const winRate = closedLeads > 0 ? (wonLeads.length / closedLeads) * 100 : 0;

      // Average time in stage
      const avgDaysInStage = myLeads?.reduce((acc, l) => acc + (l.days_in_stage || 0), 0) / (myLeads?.length || 1);

      // Total pipeline value
      const pipelineValue = myLeads?.reduce((acc, l) => acc + (l.estimated_value || 0), 0) || 0;

      return {
        totalLeads: myLeads?.length || 0,
        staleLeads: staleLeads.length,
        priorityLeads: priorityLeads.length,
        wonLeads: wonLeads.length,
        lostLeads: lostLeads.length,
        winRate,
        avgDaysInStage,
        pipelineValue,
        aiAnalyzedCount: aiAnalyzed.length,
        highValueCount: highValueLeads.length,
        qualifiedCount: qualifiedLeads.length,
      };
    },
    enabled: !!user,
  });

  // Generate dynamic coaching insights based on metrics
  const generateInsights = (): CoachingInsight[] => {
    if (!metrics) return [];

    const insights: CoachingInsight[] = [];

    // Stale leads warning
    if (metrics.staleLeads > 0) {
      insights.push({
        category: 'Urgente',
        icon: AlertTriangle,
        title: `${metrics.staleLeads} leads parados precisam de atenção`,
        description: 'Leads parados por muito tempo têm menor chance de conversão. Entre em contato hoje!',
        priority: 'high',
        action: 'Ligar para leads parados',
        metric: metrics.staleLeads,
      });
    }

    // Win rate insights
    if (metrics.winRate < 20 && metrics.wonLeads + metrics.lostLeads >= 5) {
      insights.push({
        category: 'Conversão',
        icon: Target,
        title: 'Taxa de conversão precisa melhorar',
        description: `Sua taxa atual é ${metrics.winRate.toFixed(0)}%. Foque em qualificar melhor os leads antes de avançar.`,
        priority: 'high',
        action: 'Revisar critérios de qualificação',
        metric: metrics.winRate,
      });
    } else if (metrics.winRate >= 30) {
      insights.push({
        category: 'Parabéns',
        icon: Trophy,
        title: 'Excelente taxa de conversão!',
        description: `Sua taxa de ${metrics.winRate.toFixed(0)}% está acima da média. Continue assim!`,
        priority: 'low',
        metric: metrics.winRate,
      });
    }

    // Priority leads
    if (metrics.priorityLeads > 0) {
      insights.push({
        category: 'Prioridade',
        icon: Zap,
        title: `${metrics.priorityLeads} leads prioritários`,
        description: 'Leads marcados como prioridade têm maior potencial. Dê atenção especial a eles.',
        priority: 'medium',
        action: 'Focar em leads prioritários',
        metric: metrics.priorityLeads,
      });
    }

    // Pipeline value insights
    if (metrics.pipelineValue > 50000) {
      insights.push({
        category: 'Oportunidade',
        icon: TrendingUp,
        title: `R$ ${(metrics.pipelineValue / 1000).toFixed(0)}k em pipeline`,
        description: 'Você tem um pipeline valioso. Foque em fechar os negócios qualificados!',
        priority: 'medium',
        metric: metrics.pipelineValue,
      });
    }

    // AI analysis suggestion
    if (metrics.aiAnalyzedCount < metrics.totalLeads * 0.5 && metrics.totalLeads > 3) {
      insights.push({
        category: 'IA',
        icon: Sparkles,
        title: 'Use a IA para analisar mais leads',
        description: 'A análise de IA ajuda a identificar intenções e próximos passos. Analise seus leads!',
        priority: 'low',
        action: 'Analisar leads com IA',
        metric: metrics.aiAnalyzedCount,
      });
    }

    // Average days in stage
    if (metrics.avgDaysInStage > 7) {
      insights.push({
        category: 'Velocidade',
        icon: Clock,
        title: 'Leads ficando muito tempo em estágios',
        description: `Média de ${metrics.avgDaysInStage.toFixed(0)} dias por estágio. Tente acelerar o processo!`,
        priority: 'medium',
        action: 'Acelerar follow-ups',
        metric: metrics.avgDaysInStage,
      });
    }

    // High value leads
    if (metrics.highValueCount > 0) {
      insights.push({
        category: 'Alto Valor',
        icon: TrendingUp,
        title: `${metrics.highValueCount} leads de alto valor`,
        description: 'Leads com ticket alto merecem atenção diferenciada e atendimento premium.',
        priority: 'high',
        action: 'Priorizar atendimento VIP',
        metric: metrics.highValueCount,
      });
    }

    // No leads warning
    if (metrics.totalLeads === 0) {
      insights.push({
        category: 'Início',
        icon: Users,
        title: 'Comece a adicionar leads!',
        description: 'Importe leads do RFV ou adicione manualmente para começar a gerenciar seu pipeline.',
        priority: 'high',
        action: 'Importar leads',
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const insights = generateInsights();

  const priorityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Coach de Vendas
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Lightbulb className="w-3 h-3" />
            {insights.length} dicas
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Insights personalizados para {profile?.full_name || 'você'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold">{metrics?.totalLeads || 0}</div>
            <div className="text-xs text-muted-foreground">Leads</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">{metrics?.wonLeads || 0}</div>
            <div className="text-xs text-muted-foreground">Ganhos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-500">{metrics?.winRate?.toFixed(0) || 0}%</div>
            <div className="text-xs text-muted-foreground">Taxa</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">
              {(metrics?.pipelineValue || 0) >= 1000 
                ? `${((metrics?.pipelineValue || 0) / 1000).toFixed(0)}k` 
                : metrics?.pipelineValue || 0}
            </div>
            <div className="text-xs text-muted-foreground">Pipeline</div>
          </div>
        </div>

        {/* Coaching Insights */}
        {insights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="font-medium">Tudo em ordem!</p>
            <p className="text-sm">Nenhuma ação pendente no momento.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <Collapsible
                  key={index}
                  open={expandedTip === index}
                  onOpenChange={() => setExpandedTip(expandedTip === index ? null : index)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between p-3 h-auto hover:bg-muted/50",
                        priorityColors[insight.priority]
                      )}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-2 rounded-lg bg-background/50">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{insight.title}</div>
                          <div className="text-xs opacity-70">{insight.category}</div>
                        </div>
                      </div>
                      {expandedTip === index ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="pt-2 pl-12 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                      {insight.action && (
                        <Button size="sm" variant="outline" className="gap-2">
                          <Target className="w-3 h-3" />
                          {insight.action}
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
