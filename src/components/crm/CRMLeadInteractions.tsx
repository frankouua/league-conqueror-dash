import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageSquare, Phone, Mail, Video, Users, Globe,
  Plus, Send, Smile, Meh, Frown, Loader2, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CRMLeadInteractionsProps {
  leadId: string;
  leadName: string;
}

interface Interaction {
  id: string;
  lead_id: string;
  action_type: string;
  title: string | null;
  description: string | null;
  created_at: string;
  performed_by: string;
  metadata: {
    sentiment?: 'positive' | 'neutral' | 'negative';
    intent?: string;
    channel?: string;
  } | null;
}

const INTERACTION_TYPES = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-500' },
  { value: 'call', label: 'Ligação', icon: Phone, color: 'bg-blue-500' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-purple-500' },
  { value: 'video', label: 'Videochamada', icon: Video, color: 'bg-red-500' },
  { value: 'meeting', label: 'Reunião Presencial', icon: Users, color: 'bg-orange-500' },
  { value: 'other', label: 'Outro', icon: Globe, color: 'bg-gray-500' },
];

const SENTIMENTS = [
  { value: 'positive', label: 'Positivo', icon: Smile, color: 'text-green-500 bg-green-500/10' },
  { value: 'neutral', label: 'Neutro', icon: Meh, color: 'text-yellow-500 bg-yellow-500/10' },
  { value: 'negative', label: 'Negativo', icon: Frown, color: 'text-red-500 bg-red-500/10' },
];

const INTENTS = [
  'Interesse em procedimento',
  'Dúvidas sobre preços',
  'Agendamento de consulta',
  'Reclamação',
  'Solicitação de informações',
  'Follow-up',
  'Confirmação',
  'Cancelamento',
  'Reagendamento',
  'Outro',
];

export function CRMLeadInteractions({ leadId, leadName }: CRMLeadInteractionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: 'whatsapp',
    content: '',
    sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
    intent: '',
  });

  // Fetch interactions from crm_lead_history
  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ['crm-interactions', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_history')
        .select('*')
        .eq('lead_id', leadId)
        .in('action_type', ['whatsapp', 'call', 'email', 'video', 'meeting', 'other', 'note'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Interaction[];
    },
  });

  const createInteraction = useMutation({
    mutationFn: async (interaction: typeof newInteraction) => {
      const { error } = await supabase.from('crm_lead_history').insert({
        lead_id: leadId,
        action_type: interaction.type,
        title: `${INTERACTION_TYPES.find(t => t.value === interaction.type)?.label || 'Interação'} com ${leadName}`,
        description: interaction.content,
        performed_by: user!.id,
        metadata: {
          sentiment: interaction.sentiment,
          intent: interaction.intent,
          channel: interaction.type,
        },
      });
      if (error) throw error;

      // Update last_activity_at and total_interactions
      await supabase.from('crm_leads').update({
        last_activity_at: new Date().toISOString(),
        total_interactions: (await supabase
          .from('crm_lead_history')
          .select('id', { count: 'exact' })
          .eq('lead_id', leadId)).count || 0,
      }).eq('id', leadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-interactions', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      setNewInteraction({ type: 'whatsapp', content: '', sentiment: 'neutral', intent: '' });
      setIsDialogOpen(false);
      toast.success('Interação registrada!');
    },
    onError: () => toast.error('Erro ao registrar interação'),
  });

  const getTypeInfo = (type: string) => {
    return INTERACTION_TYPES.find(t => t.value === type) || INTERACTION_TYPES[5];
  };

  const getSentimentInfo = (sentiment?: string) => {
    return SENTIMENTS.find(s => s.value === sentiment) || SENTIMENTS[1];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">Interações</h4>
          <Badge variant="secondary">{interactions.length}</Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Interação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Interação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Channel Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Canal</label>
                <div className="grid grid-cols-3 gap-2">
                  {INTERACTION_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setNewInteraction(prev => ({ ...prev, type: type.value }))}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                          newInteraction.type === type.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white", type.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descreva a interação..."
                  value={newInteraction.content}
                  onChange={(e) => setNewInteraction(prev => ({ ...prev, content: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Sentiment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sentimento do Cliente</label>
                <div className="flex gap-2">
                  {SENTIMENTS.map((sentiment) => {
                    const Icon = sentiment.icon;
                    return (
                      <button
                        key={sentiment.value}
                        onClick={() => setNewInteraction(prev => ({ ...prev, sentiment: sentiment.value as any }))}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors flex-1",
                          newInteraction.sentiment === sentiment.value
                            ? cn("border-primary", sentiment.color)
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{sentiment.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intent */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Intenção Detectada</label>
                <Select
                  value={newInteraction.intent}
                  onValueChange={(v) => setNewInteraction(prev => ({ ...prev, intent: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENTS.map((intent) => (
                      <SelectItem key={intent} value={intent}>
                        {intent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <Button
                className="w-full"
                onClick={() => createInteraction.mutate(newInteraction)}
                disabled={!newInteraction.content.trim() || createInteraction.isPending}
              >
                {createInteraction.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Registrar Interação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Interactions List */}
      <ScrollArea className="h-[350px]">
        {interactions.length > 0 ? (
          <div className="space-y-3 pr-4">
            {interactions.map((interaction) => {
              const typeInfo = getTypeInfo(interaction.action_type);
              const Icon = typeInfo.icon;
              const metadata = interaction.metadata as any;
              const sentimentInfo = getSentimentInfo(metadata?.sentiment);
              const SentimentIcon = sentimentInfo.icon;

              return (
                <Card key={interaction.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0", typeInfo.color)}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{typeInfo.label}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(interaction.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>

                        {interaction.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {interaction.description}
                          </p>
                        )}

                        {/* Sentiment & Intent Tags */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {metadata?.sentiment && (
                            <Badge variant="outline" className={cn("text-xs gap-1", sentimentInfo.color)}>
                              <SentimentIcon className="h-3 w-3" />
                              {sentimentInfo.label}
                            </Badge>
                          )}
                          {metadata?.intent && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {metadata.intent}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma interação registrada</p>
            <p className="text-xs mt-1">Registre chamadas, WhatsApp, emails...</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
