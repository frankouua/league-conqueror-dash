import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Brain, Sparkles, Target, AlertTriangle, TrendingUp, Loader2,
  ChevronDown, ChevronUp, Zap, Eye, MessageSquare, Phone,
  Calendar, FileText, Users, Heart, RefreshCcw, Clock,
  CheckCircle2, XCircle, Gift, Star, Lightbulb, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';
import { formatDistanceToNow, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMSalesCoachProactiveProps {
  lead: CRMLead;
  stageName?: string;
  history?: any[];
  tasks?: any[];
}

interface Opportunity {
  id: string;
  type: 'action' | 'alert' | 'opportunity' | 'insight';
  priority: 'high' | 'medium' | 'low';
  icon: React.ElementType;
  title: string;
  description: string;
  action?: string;
  actionFn?: () => void;
  points?: number;
}

export function CRMSalesCoachProactive({ 
  lead, 
  stageName, 
  history = [],
  tasks = [],
}: CRMSalesCoachProactiveProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // Fetch recent interactions
  const { data: recentInteractions = [] } = useQuery({
    queryKey: ['lead-interactions', lead.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('crm_chat_messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Fetch pending tasks
  const pendingTasks = tasks.filter(t => !t.is_completed);
  const overdueTasks = pendingTasks.filter(t => new Date(t.due_date) < new Date());

  // Calculate lead health metrics
  const leadHealth = useMemo(() => {
    const daysSinceLastActivity = lead.last_activity_at 
      ? differenceInDays(new Date(), new Date(lead.last_activity_at))
      : 999;
    
    const hoursSinceCreation = differenceInHours(new Date(), new Date(lead.created_at));
    const hasRecentContact = daysSinceLastActivity <= 3;
    const hasPhone = !!(lead.phone || lead.whatsapp);
    const hasEmail = !!lead.email;
    const hasInterests = (lead.interested_procedures?.length || 0) > 0;
    const hasNotes = !!(lead.notes || lead.ai_summary);
    const hasValue = (lead.estimated_value || 0) > 0;
    const responseRate = lead.total_interactions || 0;

    let score = 0;
    if (hasRecentContact) score += 20;
    if (hasPhone) score += 10;
    if (hasEmail) score += 10;
    if (hasInterests) score += 15;
    if (hasNotes) score += 10;
    if (hasValue) score += 15;
    if (responseRate > 0) score += Math.min(responseRate * 5, 20);

    return {
      score,
      daysSinceLastActivity,
      hoursSinceCreation,
      hasRecentContact,
      hasPhone,
      hasEmail,
      hasInterests,
      hasNotes,
      hasValue,
      responseRate,
    };
  }, [lead]);

  // Generate opportunities based on lead data
  const opportunities = useMemo<Opportunity[]>(() => {
    const opps: Opportunity[] = [];

    // 1. Stale lead alert
    if (lead.is_stale || leadHealth.daysSinceLastActivity > 7) {
      opps.push({
        id: 'stale',
        type: 'alert',
        priority: 'high',
        icon: AlertTriangle,
        title: 'Lead parado há muito tempo',
        description: `Sem contato há ${leadHealth.daysSinceLastActivity} dias. Risco de perder o lead.`,
        action: 'Fazer contato agora',
        points: 30,
      });
    }

    // 2. New lead without contact
    if (leadHealth.hoursSinceCreation < 24 && !leadHealth.hasRecentContact) {
      opps.push({
        id: 'new_lead',
        type: 'action',
        priority: 'high',
        icon: Zap,
        title: 'Lead novo! Contato rápido',
        description: 'Leads contactados nas primeiras 24h têm 7x mais chance de conversão.',
        action: 'Fazer primeiro contato',
        points: 50,
      });
    }

    // 3. Missing phone/email
    if (!leadHealth.hasPhone && !leadHealth.hasEmail) {
      opps.push({
        id: 'missing_contact',
        type: 'alert',
        priority: 'high',
        icon: Phone,
        title: 'Dados de contato incompletos',
        description: 'Sem telefone ou email cadastrado. Solicite os dados.',
        action: 'Completar cadastro',
      });
    }

    // 4. No interested procedures
    if (!leadHealth.hasInterests) {
      opps.push({
        id: 'no_interests',
        type: 'action',
        priority: 'medium',
        icon: FileText,
        title: 'Descobrir interesse',
        description: 'Identifique os procedimentos de interesse do paciente.',
        action: 'Mapear necessidades',
        points: 20,
      });
    }

    // 5. High value lead without recent contact
    if ((lead.estimated_value || 0) > 10000 && leadHealth.daysSinceLastActivity > 3) {
      opps.push({
        id: 'high_value',
        type: 'opportunity',
        priority: 'high',
        icon: TrendingUp,
        title: 'Oportunidade de alto valor',
        description: `Lead de R$ ${(lead.estimated_value || 0).toLocaleString('pt-BR')} precisa de atenção.`,
        action: 'Priorizar follow-up',
        points: 40,
      });
    }

    // 6. Overdue tasks
    if (overdueTasks.length > 0) {
      opps.push({
        id: 'overdue_tasks',
        type: 'alert',
        priority: 'high',
        icon: Clock,
        title: `${overdueTasks.length} tarefa(s) atrasada(s)`,
        description: 'Tarefas pendentes que passaram do prazo.',
        action: 'Ver tarefas',
      });
    }

    // 7. No negotiation value
    if (!leadHealth.hasValue && stageName?.toLowerCase().includes('proposta')) {
      opps.push({
        id: 'no_value',
        type: 'alert',
        priority: 'medium',
        icon: Target,
        title: 'Definir valor da negociação',
        description: 'Lead em proposta sem valor definido.',
        action: 'Adicionar valor',
      });
    }

    // 8. Good lead - suggest next step
    if (lead.lead_score && lead.lead_score >= 70 && !lead.won_at) {
      opps.push({
        id: 'hot_lead',
        type: 'opportunity',
        priority: 'high',
        icon: Sparkles,
        title: 'Lead quente!',
        description: 'Score alto - momento ideal para fechamento.',
        action: 'Fazer proposta final',
        points: 100,
      });
    }

    // 9. Won lead - cross-sell/referral opportunity
    if (lead.won_at) {
      opps.push({
        id: 'cross_sell',
        type: 'opportunity',
        priority: 'medium',
        icon: Gift,
        title: 'Oportunidade pós-venda',
        description: 'Cliente fechado - ative indicação ou cross-sell.',
        action: 'Ativar programa',
        points: 50,
      });
    }

    // 10. Lost lead - reactivation
    if (lead.lost_at) {
      const daysSinceLost = differenceInDays(new Date(), new Date(lead.lost_at));
      if (daysSinceLost >= 30) {
        opps.push({
          id: 'reactivation',
          type: 'opportunity',
          priority: 'low',
          icon: RefreshCcw,
          title: 'Candidato para reativação',
          description: `Perdido há ${daysSinceLost} dias. Tentar novamente?`,
          action: 'Reativar lead',
          points: 30,
        });
      }
    }

    // 11. Stage-specific opportunities
    if (stageName?.toLowerCase().includes('agendamento')) {
      opps.push({
        id: 'scheduling',
        type: 'action',
        priority: 'medium',
        icon: Calendar,
        title: 'Confirmar agendamento',
        description: 'Envie lembrete e confirme a data.',
        action: 'Enviar lembrete',
        points: 15,
      });
    }

    return opps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [lead, leadHealth, stageName, overdueTasks]);

  // Generate AI insight
  const generateInsight = useMutation({
    mutationFn: async () => {
      const context = `
        Lead: ${lead.name}
        Score: ${lead.lead_score || 0}/100
        Estágio: ${stageName || 'não definido'}
        Valor: R$ ${(lead.estimated_value || 0).toLocaleString('pt-BR')}
        Temperatura: ${lead.temperature || 'não definida'}
        Dias sem contato: ${leadHealth.daysSinceLastActivity}
        Total de interações: ${lead.total_interactions || 0}
        Procedimentos de interesse: ${lead.interested_procedures?.join(', ') || 'não definido'}
        Notas: ${lead.notes || 'sem notas'}
        Histórico recente: ${history.slice(0, 5).map(h => h.title).join(', ') || 'sem histórico'}
      `;

      const { data, error } = await supabase.functions.invoke('commercial-ai-assistant', {
        body: {
          context,
          question: `Analise este lead e dê:
1. Uma avaliação rápida do potencial (1 linha)
2. O principal risco/bloqueio (1 linha) 
3. A ação mais importante a fazer agora (1 linha específica)
4. Uma pergunta poderosa para usar na abordagem (1 frase)

Seja direto, prático e específico para o contexto comercial de clínica de estética.`,
        },
      });

      if (error) throw error;
      return data.response;
    },
    onSuccess: (data) => {
      setAiInsight(data);
    },
    onError: () => {
      toast.error('Erro ao gerar análise');
    },
  });

  // Auto-generate insight for priority leads
  useEffect(() => {
    if (opportunities.some(o => o.priority === 'high' && o.type === 'opportunity') && !aiInsight) {
      // Don't auto-generate to save API calls, but we could enable this
    }
  }, [opportunities, aiInsight]);

  const priorityColors = {
    high: 'border-red-500/50 bg-red-500/5 text-red-600',
    medium: 'border-yellow-500/50 bg-yellow-500/5 text-yellow-600',
    low: 'border-green-500/50 bg-green-500/5 text-green-600',
  };

  const typeIcons = {
    alert: AlertTriangle,
    action: Zap,
    opportunity: TrendingUp,
    insight: Lightbulb,
  };

  const highPriorityCount = opportunities.filter(o => o.priority === 'high').length;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Assistente de Vendas
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="h-5">
                {highPriorityCount} urgente{highPriorityCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateInsight.mutate()}
            disabled={generateInsight.isPending}
            className="gap-1 h-7"
          >
            {generateInsight.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Analisar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Health Score */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
          <div className="text-center min-w-[50px]">
            <div className={cn(
              "text-xl font-bold",
              leadHealth.score >= 70 ? "text-green-600" :
              leadHealth.score >= 40 ? "text-yellow-600" : "text-red-600"
            )}>
              {leadHealth.score}%
            </div>
            <div className="text-[10px] text-muted-foreground">Saúde</div>
          </div>
          <div className="flex-1 space-y-1">
            <Progress value={leadHealth.score} className="h-2" />
            <div className="flex gap-1 flex-wrap">
              {leadHealth.hasRecentContact && (
                <Badge variant="outline" className="text-[10px] h-4 bg-green-500/10 text-green-600">
                  <CheckCircle2 className="h-2 w-2 mr-0.5" /> Contato recente
                </Badge>
              )}
              {leadHealth.hasValue && (
                <Badge variant="outline" className="text-[10px] h-4 bg-blue-500/10 text-blue-600">
                  <TrendingUp className="h-2 w-2 mr-0.5" /> Valor definido
                </Badge>
              )}
              {!leadHealth.hasRecentContact && leadHealth.daysSinceLastActivity > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 bg-red-500/10 text-red-600">
                  <Clock className="h-2 w-2 mr-0.5" /> {leadHealth.daysSinceLastActivity}d sem contato
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* AI Insight */}
        {aiInsight && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm text-primary">Análise IA</span>
            </div>
            <div className="text-sm whitespace-pre-wrap text-muted-foreground">
              {aiInsight}
            </div>
          </div>
        )}

        {/* Opportunities List */}
        {opportunities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {opportunities.length} oportunidade{opportunities.length > 1 ? 's' : ''}
              </span>
              {opportunities.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Ver menos' : `Ver todas`}
                  {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              )}
            </div>

            <ScrollArea className={isExpanded ? "h-[300px]" : ""}>
              <div className="space-y-2">
                {(isExpanded ? opportunities : opportunities.slice(0, 3)).map((opp) => (
                  <div
                    key={opp.id}
                    className={cn(
                      "p-2 rounded-lg border transition-all hover:shadow-sm",
                      priorityColors[opp.priority]
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <opp.icon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{opp.title}</span>
                          {opp.points && (
                            <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                              +{opp.points}pts
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {opp.description}
                        </p>
                        {opp.action && (
                          <Button 
                            variant="link" 
                            className="h-auto p-0 text-xs mt-1"
                            onClick={opp.actionFn}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            {opp.action}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {opportunities.length === 0 && !aiInsight && (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Lead bem gerenciado!</p>
            <p className="text-xs">Continue o acompanhamento regular.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
