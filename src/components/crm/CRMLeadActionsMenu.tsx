import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  MessageSquare,
  Star,
  FileText,
  RefreshCcw,
  TrendingUp,
  Gift,
  Zap,
  Heart,
  Send,
  Loader2,
  ChevronDown,
  Phone,
  Mail,
  CalendarPlus,
  Stethoscope,
  ClipboardList,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CRMLead } from '@/hooks/useCRM';
import { useAuth } from '@/contexts/AuthContext';

interface CRMLeadActionsMenuProps {
  lead: CRMLead;
  compact?: boolean;
}

type ActionType = 
  | 'referral' 
  | 'testimonial' 
  | 'nps' 
  | 'form' 
  | 'protocol_recurrence' 
  | 'protocol_upgrade'
  | 'protocol_crosssell'
  | 'campaign'
  | 'ambassador';

interface ActionConfig {
  id: ActionType;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  points: number;
}

const ACTIONS: ActionConfig[] = [
  {
    id: 'referral',
    label: 'Ativar Indicação',
    icon: Users,
    description: 'Solicitar indicações de novos pacientes',
    color: 'text-blue-500',
    points: 50,
  },
  {
    id: 'testimonial',
    label: 'Pedir Depoimento',
    icon: MessageSquare,
    description: 'Solicitar depoimento do paciente',
    color: 'text-purple-500',
    points: 30,
  },
  {
    id: 'nps',
    label: 'Enviar NPS',
    icon: Star,
    description: 'Pesquisa de satisfação',
    color: 'text-yellow-500',
    points: 20,
  },
  {
    id: 'ambassador',
    label: 'Programa Embaixador',
    icon: Award,
    description: 'Convidar para programa de embaixadores',
    color: 'text-pink-500',
    points: 100,
  },
];

const PROTOCOLS: ActionConfig[] = [
  {
    id: 'protocol_recurrence',
    label: 'Protocolo de Recorrência',
    icon: RefreshCcw,
    description: 'Ativar acompanhamento periódico',
    color: 'text-green-500',
    points: 40,
  },
  {
    id: 'protocol_upgrade',
    label: 'Protocolo de Upgrade',
    icon: TrendingUp,
    description: 'Ofertar procedimento superior',
    color: 'text-orange-500',
    points: 60,
  },
  {
    id: 'protocol_crosssell',
    label: 'Protocolo Cross-Sell',
    icon: Gift,
    description: 'Ofertar procedimentos complementares',
    color: 'text-cyan-500',
    points: 50,
  },
];

const FORMS = [
  { id: 'pre_consultation', label: 'Pré-Consulta', icon: ClipboardList },
  { id: 'medical_history', label: 'Histórico Médico', icon: Stethoscope },
  { id: 'satisfaction', label: 'Satisfação', icon: Heart },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'interest', label: 'Interesse em Procedimentos', icon: FileText },
];

export function CRMLeadActionsMenu({ lead, compact = false }: CRMLeadActionsMenuProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<ActionConfig | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const executeAction = useMutation({
    mutationFn: async ({ action, message, channel }: { action: ActionConfig; message: string; channel: string }) => {
      // 1. Create action dispatch record
      const { data: dispatch, error: dispatchError } = await supabase
        .from('action_dispatches')
        .insert({
          lead_id: lead.id,
          action_type: action.id,
          channel,
          message_content: message,
          status: 'sent',
          sent_by: profile?.user_id,
          sent_at: new Date().toISOString(),
          points_earned: action.points,
        })
        .select()
        .single();

      if (dispatchError) throw dispatchError;

      // 2. Log to history
      await supabase.from('crm_lead_history').insert({
        lead_id: lead.id,
        action_type: 'action_sent',
        performed_by: profile?.user_id || '',
        title: action.label,
        description: `Ação "${action.label}" enviada via ${channel}`,
        metadata: { action_id: action.id, dispatch_id: dispatch.id },
      });

      // 3. Award gamification points
      await supabase.from('crm_gamification_points').insert({
        user_id: profile?.user_id,
        action_type: action.id,
        points: action.points,
        description: `${action.label} para ${lead.name}`,
        lead_id: lead.id,
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
      });

      // 4. Update lead activity
      await supabase
        .from('crm_leads')
        .update({
          last_activity_at: new Date().toISOString(),
          total_interactions: (lead.total_interactions || 0) + 1,
        })
        .eq('id', lead.id);

      return dispatch;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.action.label} enviado!`, {
        description: `+${variables.action.points} pontos`,
      });
      queryClient.invalidateQueries({ queryKey: ['crm-lead', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      setIsDialogOpen(false);
      setCustomMessage('');
      setSelectedAction(null);
    },
    onError: (error) => {
      console.error('Erro ao executar ação:', error);
      toast.error('Erro ao executar ação');
    },
  });

  const handleActionClick = (action: ActionConfig) => {
    setSelectedAction(action);
    // Generate default message based on action type
    const defaultMessages: Record<ActionType, string> = {
      referral: `Olá ${lead.name}! 👋\n\nEsperamos que esteja muito satisfeito(a) com seu procedimento!\n\nVocê conhece alguém que também gostaria de realizar um procedimento conosco? Indique amigos e ganhe benefícios exclusivos!\n\n🎁 Para cada indicação que fechar, você ganha [benefício].`,
      testimonial: `Olá ${lead.name}! 😊\n\nFicamos muito felizes com seu resultado!\n\nPoderia nos enviar um pequeno depoimento sobre sua experiência? Sua opinião é muito importante para nós e ajuda outras pessoas a conhecerem nosso trabalho.\n\n📝 Pode ser um texto curto ou um vídeo de até 1 minuto.`,
      nps: `Olá ${lead.name}!\n\nGostaríamos de saber: de 0 a 10, o quanto você recomendaria nossos serviços para um amigo ou familiar?\n\n⭐ Sua resposta nos ajuda a melhorar cada vez mais!`,
      form: `Olá ${lead.name}!\n\nPrecisamos de algumas informações adicionais. Por favor, preencha o formulário abaixo:\n\n📋 [Link do formulário]`,
      protocol_recurrence: `Olá ${lead.name}! 💝\n\nJá faz um tempo desde seu último procedimento e gostaríamos de saber como você está!\n\nQue tal agendar uma avaliação para manutenção dos resultados?\n\n📅 Temos horários disponíveis esta semana.`,
      protocol_upgrade: `Olá ${lead.name}! ✨\n\nTemos uma novidade especial para você!\n\nConhecendo seu histórico, acreditamos que você seria uma candidata ideal para [procedimento upgrade].\n\n💎 Gostaria de saber mais sobre essa oportunidade exclusiva?`,
      protocol_crosssell: `Olá ${lead.name}! 🌟\n\nVocê sabia que podemos potencializar ainda mais seus resultados?\n\nO procedimento [complementar] combina perfeitamente com o que você já fez e oferece benefícios adicionais.\n\n💫 Posso explicar mais detalhes?`,
      campaign: `Olá ${lead.name}!\n\n🎉 Temos uma condição especial para você!\n\n[Detalhes da campanha]\n\nVálido por tempo limitado. Aproveite!`,
      ambassador: `Olá ${lead.name}! 🏆\n\nVocê foi selecionado(a) para nosso Programa de Embaixadores!\n\nComo embaixador, você terá:\n✅ Descontos exclusivos\n✅ Acesso antecipado a lançamentos\n✅ Comissão por indicações\n\nGostaria de participar?`,
    };
    setCustomMessage(defaultMessages[action.id] || '');
    setIsDialogOpen(true);
  };

  const handleFormSend = async (formType: string, formLabel: string) => {
    const formAction: ActionConfig = {
      id: 'form',
      label: `Formulário: ${formLabel}`,
      icon: FileText,
      description: formLabel,
      color: 'text-blue-500',
      points: 15,
    };

    const formUrl = `${window.location.origin}/patient-form?leadId=${lead.id}&type=${formType}`;
    const message = `Olá ${lead.name}!\n\nPor favor, preencha o formulário abaixo:\n\n📋 ${formUrl}`;

    await executeAction.mutateAsync({
      action: formAction,
      message,
      channel: selectedChannel,
    });
  };

  const handleSendAction = () => {
    if (!selectedAction || !customMessage.trim()) return;
    executeAction.mutate({
      action: selectedAction,
      message: customMessage,
      channel: selectedChannel,
    });
  };

  const openWhatsApp = () => {
    if (!selectedAction) return;
    const phone = lead.whatsapp || lead.phone;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const encodedMessage = encodeURIComponent(customMessage);
      window.open(`https://wa.me/${fullPhone}?text=${encodedMessage}`, '_blank');
      // Also record the action
      executeAction.mutate({
        action: selectedAction,
        message: customMessage,
        channel: 'whatsapp',
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={compact ? "sm" : "default"} className="gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {!compact && "Ações"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Main Actions */}
          {ACTIONS.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
              className="gap-3 py-2"
            >
              <action.icon className={`h-4 w-4 ${action.color}`} />
              <div className="flex-1">
                <span className="text-sm font-medium">{action.label}</span>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <Badge variant="outline" className="text-xs">+{action.points}</Badge>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Forms Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Enviar Formulário
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {FORMS.map((form) => (
                <DropdownMenuItem
                  key={form.id}
                  onClick={() => handleFormSend(form.id, form.label)}
                  className="gap-2"
                >
                  <form.icon className="h-4 w-4" />
                  {form.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Protocols Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <RefreshCcw className="h-4 w-4 text-green-500" />
              Ativar Protocolo
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {PROTOCOLS.map((protocol) => (
                <DropdownMenuItem
                  key={protocol.id}
                  onClick={() => handleActionClick(protocol)}
                  className="gap-3 py-2"
                >
                  <protocol.icon className={`h-4 w-4 ${protocol.color}`} />
                  <div className="flex-1">
                    <span className="text-sm">{protocol.label}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">+{protocol.points}</Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction && <selectedAction.icon className={`h-5 w-5 ${selectedAction.color}`} />}
              {selectedAction?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Enviando para:</span>
              <Badge variant="secondary">{lead.name}</Badge>
              {selectedAction && (
                <Badge className="bg-green-500/20 text-green-600">
                  +{selectedAction.points} pontos
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label>Canal de Envio</Label>
              <Select value={selectedChannel} onValueChange={(v: any) => setSelectedChannel(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      E-mail
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-purple-500" />
                      SMS
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={8}
                placeholder="Digite sua mensagem..."
                className="font-sans"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedChannel === 'whatsapp' && (lead.whatsapp || lead.phone) && (
              <Button
                variant="outline"
                onClick={openWhatsApp}
                disabled={executeAction.isPending}
                className="gap-2 text-green-600 border-green-600 hover:bg-green-50"
              >
                <MessageSquare className="h-4 w-4" />
                Abrir WhatsApp
              </Button>
            )}
            <Button
              onClick={handleSendAction}
              disabled={executeAction.isPending || !customMessage.trim()}
              className="gap-2"
            >
              {executeAction.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Registrar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
