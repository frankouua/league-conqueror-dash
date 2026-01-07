import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Brain, Sparkles, Target, MessageSquare, Lightbulb,
  CheckCircle2, AlertTriangle, TrendingUp, Loader2,
  ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CRMSalesCoachProps {
  leadId: string;
  leadName: string;
  leadScore?: number;
  stage?: string;
  notes?: string;
  procedures?: string[];
  sentiment?: string;
  bantScores?: {
    budget: number;
    authority: number;
    need: number;
    timing: number;
  };
}

interface CoachingTip {
  category: string;
  icon: React.ElementType;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

export function CRMSalesCoach({
  leadId,
  leadName,
  leadScore = 0,
  stage,
  notes,
  procedures,
  sentiment,
  bantScores,
}: CRMSalesCoachProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiTips, setAiTips] = useState<string | null>(null);

  // Generate coaching tips based on lead data
  const coachingTips: CoachingTip[] = [];

  // Score-based tips
  if (leadScore < 30) {
    coachingTips.push({
      category: 'qualificação',
      icon: Target,
      title: 'Lead precisa de mais qualificação',
      description: 'Faça perguntas abertas para entender melhor as necessidades e o momento de compra.',
      priority: 'high',
      action: 'Agendar call de descoberta',
    });
  }

  // BANT-based tips
  if (bantScores) {
    if (bantScores.budget < 5) {
      coachingTips.push({
        category: 'budget',
        icon: AlertTriangle,
        title: 'Validar orçamento',
        description: 'Explore as opções de pagamento e financiamento disponíveis. Apresente o ROI do investimento.',
        priority: 'high',
        action: 'Apresentar condições de pagamento',
      });
    }
    if (bantScores.authority < 5) {
      coachingTips.push({
        category: 'decisão',
        icon: MessageSquare,
        title: 'Identificar decisor',
        description: 'Descubra se há outras pessoas envolvidas na decisão e como incluí-las no processo.',
        priority: 'medium',
        action: 'Mapear stakeholders',
      });
    }
    if (bantScores.timing < 5) {
      coachingTips.push({
        category: 'urgência',
        icon: Zap,
        title: 'Criar senso de urgência',
        description: 'Explore eventos ou datas importantes que possam motivar a decisão.',
        priority: 'medium',
        action: 'Descobrir timeline do cliente',
      });
    }
  }

  // Sentiment-based tips
  if (sentiment === 'negative') {
    coachingTips.push({
      category: 'objeção',
      icon: AlertTriangle,
      title: 'Tratar objeções',
      description: 'O lead demonstrou sentimento negativo. Identifique a causa e trabalhe as objeções com empatia.',
      priority: 'high',
      action: 'Ligar para entender preocupações',
    });
  }

  // Stage-based tips
  if (stage?.toLowerCase().includes('proposta')) {
    coachingTips.push({
      category: 'fechamento',
      icon: TrendingUp,
      title: 'Momento de fechar',
      description: 'Lead está na fase de proposta. Use técnicas de fechamento e crie urgência.',
      priority: 'high',
      action: 'Fazer pergunta de fechamento',
    });
  }

  // General tips
  if (coachingTips.length === 0) {
    coachingTips.push({
      category: 'acompanhamento',
      icon: CheckCircle2,
      title: 'Lead bem qualificado',
      description: 'Continue o acompanhamento regular e mantenha o relacionamento aquecido.',
      priority: 'low',
      action: 'Seguir processo padrão',
    });
  }

  const generateAITips = useMutation({
    mutationFn: async () => {
      const context = `
        Lead: ${leadName}
        Score: ${leadScore}/100
        Estágio: ${stage || 'não definido'}
        Procedimentos de interesse: ${procedures?.join(', ') || 'não definido'}
        Sentimento: ${sentiment || 'neutro'}
        BANT: Budget ${bantScores?.budget || 0}, Authority ${bantScores?.authority || 0}, Need ${bantScores?.need || 0}, Timing ${bantScores?.timing || 0}
        Notas: ${notes || 'sem notas'}
      `;

      const { data, error } = await supabase.functions.invoke('commercial-ai-assistant', {
        body: {
          context,
          question: 'Dê 3 dicas práticas e específicas para avançar este lead no funil de vendas. Seja direto e acionável.',
        },
      });

      if (error) throw error;
      return data.response;
    },
    onSuccess: (data) => {
      setAiTips(data);
      toast.success('Dicas geradas com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao gerar dicas');
    },
  });

  const priorityColors = {
    high: 'border-red-500/50 bg-red-500/5',
    medium: 'border-yellow-500/50 bg-yellow-500/5',
    low: 'border-green-500/50 bg-green-500/5',
  };

  const priorityBadges = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Sales Coach IA
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAITips.mutate()}
            disabled={generateAITips.isPending}
            className="gap-1"
          >
            {generateAITips.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar Dicas IA
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Lead Score Overview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className="text-center">
            <div className="text-2xl font-bold">{leadScore}</div>
            <div className="text-[10px] text-muted-foreground">Score</div>
          </div>
          <Progress 
            value={leadScore} 
            className="flex-1 h-2"
          />
          <div className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            leadScore >= 70 ? "bg-green-500/20 text-green-600" :
            leadScore >= 40 ? "bg-yellow-500/20 text-yellow-600" :
            "bg-red-500/20 text-red-600"
          )}>
            {leadScore >= 70 ? 'Quente' : leadScore >= 40 ? 'Morno' : 'Frio'}
          </div>
        </div>

        {/* Coaching Tips */}
        <div className="space-y-2">
          {coachingTips.slice(0, isExpanded ? undefined : 2).map((tip, index) => (
            <div 
              key={index} 
              className={cn(
                "p-3 rounded-lg border transition-all hover:shadow-sm",
                priorityColors[tip.priority]
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-1.5 rounded-full",
                  priorityBadges[tip.priority]
                )}>
                  <tip.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{tip.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {tip.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tip.description}</p>
                  {tip.action && (
                    <Button variant="link" className="h-auto p-0 text-xs mt-1">
                      → {tip.action}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {coachingTips.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver mais {coachingTips.length - 2} dicas
              </>
            )}
          </Button>
        )}

        {/* AI Generated Tips */}
        {aiTips && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Dicas Personalizadas IA</span>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {aiTips}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
