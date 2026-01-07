import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, Phone, MessageSquare, Calendar, Clock,
  AlertTriangle, TrendingUp, Target, ArrowRight,
  CheckCircle2, Loader2, Brain, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SmartSuggestion {
  id: string;
  leadId: string;
  leadName: string;
  type: 'followup' | 'urgent' | 'opportunity' | 'reactivation' | 'upsell';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  icon: React.ElementType;
  estimatedValue?: number;
  dueDate?: string;
}

export function CRMSmartSuggestions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [completedSuggestions, setCompletedSuggestions] = useState<Set<string>>(new Set());

  // Fetch leads and generate suggestions
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['crm-smart-suggestions', user?.id],
    queryFn: async () => {
      // Get user's leads
      const { data: leads, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id)
        .is('won_at', null)
        .is('lost_at', null)
        .order('last_activity_at', { ascending: true });
      
      if (error) throw error;

      const suggestions: SmartSuggestion[] = [];
      const now = new Date();

      leads?.forEach((lead) => {
        const lastActivity = lead.last_activity_at ? new Date(lead.last_activity_at) : new Date(lead.created_at);
        const daysSinceActivity = differenceInDays(now, lastActivity);
        const hoursSinceActivity = differenceInHours(now, lastActivity);

        // Stale leads - urgent follow-up
        if (lead.is_stale || daysSinceActivity > 3) {
          suggestions.push({
            id: `stale-${lead.id}`,
            leadId: lead.id,
            leadName: lead.name,
            type: 'urgent',
            title: `${lead.name} está parado há ${daysSinceActivity} dias`,
            description: 'Lead sem interação pode esfriar. Entre em contato para manter o interesse.',
            priority: 'high',
            action: 'Ligar agora',
            icon: AlertTriangle,
            estimatedValue: lead.estimated_value || undefined,
          });
        }

        // Priority leads without recent contact
        if (lead.is_priority && hoursSinceActivity > 24) {
          suggestions.push({
            id: `priority-${lead.id}`,
            leadId: lead.id,
            leadName: lead.name,
            type: 'followup',
            title: `Lead prioritário ${lead.name} precisa de atenção`,
            description: 'Leads prioritários devem ter contato diário. Não deixe esfriar!',
            priority: 'high',
            action: 'Enviar mensagem',
            icon: Zap,
            estimatedValue: lead.estimated_value || undefined,
          });
        }

        // High value leads
        if ((lead.estimated_value || 0) >= 15000 && daysSinceActivity > 2) {
          suggestions.push({
            id: `highvalue-${lead.id}`,
            leadId: lead.id,
            leadName: lead.name,
            type: 'opportunity',
            title: `Oportunidade de R$ ${((lead.estimated_value || 0) / 1000).toFixed(0)}k com ${lead.name}`,
            description: 'Lead de alto valor merece atendimento VIP. Agende uma ligação!',
            priority: 'high',
            action: 'Agendar ligação',
            icon: TrendingUp,
            estimatedValue: lead.estimated_value || undefined,
          });
        }

        // Leads with good BANT scores
        if ((lead.lead_score || 0) >= 25 && daysSinceActivity > 1) {
          suggestions.push({
            id: `qualified-${lead.id}`,
            leadId: lead.id,
            leadName: lead.name,
            type: 'opportunity',
            title: `${lead.name} está bem qualificado (Score: ${lead.lead_score})`,
            description: 'Lead com boa pontuação BANT. Ótimo momento para avançar!',
            priority: 'medium',
            action: 'Apresentar proposta',
            icon: Target,
            estimatedValue: lead.estimated_value || undefined,
          });
        }

        // Leads with procedures interested
        if (lead.interested_procedures?.length && daysSinceActivity > 1) {
          suggestions.push({
            id: `interest-${lead.id}`,
            leadId: lead.id,
            leadName: lead.name,
            type: 'upsell',
            title: `${lead.name} tem interesse em ${lead.interested_procedures[0]}`,
            description: 'Envie informações específicas sobre o procedimento de interesse.',
            priority: 'medium',
            action: 'Enviar protocolo',
            icon: Brain,
            estimatedValue: lead.estimated_value || undefined,
          });
        }
      });

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    },
    enabled: !!user,
  });

  const markComplete = (suggestionId: string) => {
    setCompletedSuggestions(prev => new Set([...prev, suggestionId]));
    toast.success('Ação marcada como concluída!');
  };

  const handleAction = async (suggestion: SmartSuggestion) => {
    // Update last activity
    await supabase
      .from('crm_leads')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', suggestion.leadId);
    
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    markComplete(suggestion.id);
  };

  const filteredSuggestions = suggestions.filter(s => !completedSuggestions.has(s.id));

  const priorityColors = {
    high: 'border-red-500/30 bg-red-500/5',
    medium: 'border-amber-500/30 bg-amber-500/5',
    low: 'border-green-500/30 bg-green-500/5',
  };

  const priorityBadges = {
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Sugestões Inteligentes
            </CardTitle>
            <CardDescription>
              Ações recomendadas para hoje baseadas em seus leads
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Target className="w-3 h-3" />
            {filteredSuggestions.length} ações
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Parabéns! Tudo em dia!</p>
            <p className="text-sm">Você completou todas as ações sugeridas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuggestions.slice(0, 8).map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <div
                  key={suggestion.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all hover:shadow-md",
                    priorityColors[suggestion.priority]
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      suggestion.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                      suggestion.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-green-500/10 text-green-500'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {suggestion.title}
                        </h4>
                        <Badge variant="outline" className={cn("text-xs shrink-0", priorityBadges[suggestion.priority])}>
                          {suggestion.priority === 'high' ? 'Urgente' : 
                           suggestion.priority === 'medium' ? 'Importante' : 'Normal'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {suggestion.estimatedValue && (
                            <Badge variant="secondary" className="text-xs">
                              R$ {(suggestion.estimatedValue / 1000).toFixed(0)}k
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markComplete(suggestion.id)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAction(suggestion)}
                            className="gap-1"
                          >
                            {suggestion.action}
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
