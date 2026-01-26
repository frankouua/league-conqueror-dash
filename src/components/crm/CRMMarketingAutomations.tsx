import { useState } from 'react';
import { 
  Zap, Plus, Play, Pause, Settings, Trash2, Copy, 
  Mail, MessageSquare, Phone, Bell, Clock, ArrowRight,
  Filter, Target, TrendingUp, Users, Sparkles, Check,
  ChevronDown, AlertCircle, Calendar, BarChart3
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AutomationTrigger {
  type: 'lead_created' | 'stage_changed' | 'tag_added' | 'score_reached' | 'time_in_stage' | 'no_activity';
  config: Record<string, any>;
}

interface AutomationAction {
  type: 'send_email' | 'send_whatsapp' | 'send_sms' | 'create_task' | 'add_tag' | 'change_stage' | 'notify_team' | 'ai_analyze';
  config: Record<string, any>;
  delay?: number; // minutes
}

interface Automation {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions?: Record<string, any>[];
  actions: AutomationAction[];
  stats: {
    executed: number;
    success: number;
    failed: number;
  };
  lastRun?: Date;
  createdAt: Date;
}

// Pre-built automation templates
const AUTOMATION_TEMPLATES = [
  {
    id: 'welcome_flow',
    name: 'Fluxo de Boas-vindas',
    description: 'Envia mensagem de boas-vindas quando novo lead entra',
    icon: Users,
    trigger: { type: 'lead_created' as const, config: {} },
    actions: [
      { type: 'send_whatsapp' as const, config: { template: 'welcome' }, delay: 0 },
      { type: 'create_task' as const, config: { title: 'Primeiro contato' }, delay: 5 },
      { type: 'ai_analyze' as const, config: {}, delay: 1 },
    ]
  },
  {
    id: 'followup_stale',
    name: 'Follow-up Lead Parado',
    description: 'Envia follow-up quando lead fica 3 dias sem atividade',
    icon: Clock,
    trigger: { type: 'no_activity' as const, config: { days: 3 } },
    actions: [
      { type: 'send_whatsapp' as const, config: { template: 'followup' }, delay: 0 },
      { type: 'notify_team' as const, config: { message: 'Lead parado precisa de atenção' }, delay: 0 },
    ]
  },
  {
    id: 'qualification_complete',
    name: 'Lead Qualificado',
    description: 'Ações quando lead atinge pontuação mínima de qualificação',
    icon: Target,
    trigger: { type: 'score_reached' as const, config: { minScore: 25 } },
    actions: [
      { type: 'add_tag' as const, config: { tag: 'Qualificado' }, delay: 0 },
      { type: 'send_email' as const, config: { template: 'qualification_complete' }, delay: 0 },
      { type: 'notify_team' as const, config: { message: 'Novo lead qualificado!' }, delay: 0 },
    ]
  },
  {
    id: 'stage_proposal',
    name: 'Proposta Enviada',
    description: 'Fluxo quando lead entra na etapa de proposta',
    icon: ArrowRight,
    trigger: { type: 'stage_changed' as const, config: { toStage: 'Proposta' } },
    actions: [
      { type: 'send_email' as const, config: { template: 'proposal_sent' }, delay: 0 },
      { type: 'create_task' as const, config: { title: 'Follow-up proposta', dueHours: 48 }, delay: 0 },
      { type: 'send_whatsapp' as const, config: { template: 'proposal_reminder' }, delay: 1440 }, // 24h
    ]
  },
  {
    id: 'won_celebration',
    name: 'Venda Fechada',
    description: 'Celebração e onboarding quando lead é convertido',
    icon: TrendingUp,
    trigger: { type: 'stage_changed' as const, config: { toStage: 'Ganho' } },
    actions: [
      { type: 'notify_team' as const, config: { message: '🎉 Nova venda fechada!' }, delay: 0 },
      { type: 'send_whatsapp' as const, config: { template: 'welcome_client' }, delay: 0 },
      { type: 'send_email' as const, config: { template: 'onboarding' }, delay: 60 },
      { type: 'create_task' as const, config: { title: 'Agendar procedimento' }, delay: 0 },
    ]
  },
];

// Mock automations
const mockAutomations: Automation[] = [
  {
    id: '1',
    name: 'Boas-vindas Automática',
    description: 'Envia WhatsApp de boas-vindas para novos leads',
    isActive: true,
    trigger: { type: 'lead_created', config: {} },
    actions: [
      { type: 'send_whatsapp', config: { template: 'welcome' }, delay: 0 },
      { type: 'ai_analyze', config: {}, delay: 1 },
    ],
    stats: { executed: 234, success: 228, failed: 6 },
    lastRun: new Date(Date.now() - 3600000),
    createdAt: new Date(Date.now() - 86400000 * 30),
  },
  {
    id: '2',
    name: 'Follow-up 48h',
    description: 'Envia lembrete quando lead fica 2 dias sem resposta',
    isActive: true,
    trigger: { type: 'no_activity', config: { days: 2 } },
    actions: [
      { type: 'send_whatsapp', config: { template: 'followup' }, delay: 0 },
      { type: 'create_task', config: { title: 'Ligar para lead' }, delay: 120 },
    ],
    stats: { executed: 156, success: 149, failed: 7 },
    lastRun: new Date(Date.now() - 7200000),
    createdAt: new Date(Date.now() - 86400000 * 15),
  },
  {
    id: '3',
    name: 'Notificação Lead Quente',
    description: 'Alerta equipe quando lead atinge score alto',
    isActive: false,
    trigger: { type: 'score_reached', config: { minScore: 30 } },
    actions: [
      { type: 'notify_team', config: { message: '🔥 Lead quente precisa de atenção!' }, delay: 0 },
      { type: 'add_tag', config: { tag: 'Hot Lead' }, delay: 0 },
    ],
    stats: { executed: 45, success: 45, failed: 0 },
    lastRun: new Date(Date.now() - 86400000),
    createdAt: new Date(Date.now() - 86400000 * 7),
  },
];

const triggerLabels: Record<string, { label: string; icon: React.ElementType }> = {
  lead_created: { label: 'Novo Lead', icon: Users },
  stage_changed: { label: 'Mudança de Etapa', icon: ArrowRight },
  tag_added: { label: 'Tag Adicionada', icon: Filter },
  score_reached: { label: 'Score Atingido', icon: Target },
  time_in_stage: { label: 'Tempo na Etapa', icon: Clock },
  no_activity: { label: 'Sem Atividade', icon: AlertCircle },
};

const actionLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  send_email: { label: 'Enviar E-mail', icon: Mail, color: 'bg-blue-100 text-blue-700' },
  send_whatsapp: { label: 'Enviar WhatsApp', icon: WhatsAppIcon, color: 'bg-green-100 text-green-700' },
  send_sms: { label: 'Enviar SMS', icon: Phone, color: 'bg-purple-100 text-purple-700' },
  create_task: { label: 'Criar Tarefa', icon: Check, color: 'bg-yellow-100 text-yellow-700' },
  add_tag: { label: 'Adicionar Tag', icon: Filter, color: 'bg-orange-100 text-orange-700' },
  change_stage: { label: 'Mudar Etapa', icon: ArrowRight, color: 'bg-indigo-100 text-indigo-700' },
  notify_team: { label: 'Notificar Equipe', icon: Bell, color: 'bg-red-100 text-red-700' },
  ai_analyze: { label: 'Analisar com IA', icon: Sparkles, color: 'bg-pink-100 text-pink-700' },
};

export function CRMMarketingAutomations() {
  const { toast } = useToast();
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);
  const [showNewAutomation, setShowNewAutomation] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof AUTOMATION_TEMPLATES[0] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleActive = (id: string) => {
    setAutomations(prev => prev.map(a => 
      a.id === id ? { ...a, isActive: !a.isActive } : a
    ));
    const automation = automations.find(a => a.id === id);
    toast({
      title: automation?.isActive ? 'Automação pausada' : 'Automação ativada',
      description: automation?.name,
    });
  };

  const handleDelete = (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
    setShowDeleteDialog(null);
    toast({ title: 'Automação removida' });
  };

  const handleDuplicate = (automation: Automation) => {
    const newAutomation: Automation = {
      ...automation,
      id: Date.now().toString(),
      name: `${automation.name} (cópia)`,
      isActive: false,
      stats: { executed: 0, success: 0, failed: 0 },
      createdAt: new Date(),
    };
    setAutomations(prev => [...prev, newAutomation]);
    toast({ title: 'Automação duplicada' });
  };

  const handleCreateFromTemplate = (template: typeof AUTOMATION_TEMPLATES[0]) => {
    const newAutomation: Automation = {
      id: Date.now().toString(),
      name: template.name,
      description: template.description,
      isActive: false,
      trigger: template.trigger,
      actions: template.actions,
      stats: { executed: 0, success: 0, failed: 0 },
      createdAt: new Date(),
    };
    setAutomations(prev => [...prev, newAutomation]);
    setShowNewAutomation(false);
    setSelectedTemplate(null);
    toast({ title: 'Automação criada!', description: 'Ative para começar a funcionar' });
  };

  const activeCount = automations.filter(a => a.isActive).length;
  const totalExecutions = automations.reduce((acc, a) => acc + a.stats.executed, 0);
  const successRate = automations.reduce((acc, a) => acc + a.stats.success, 0) / Math.max(totalExecutions, 1) * 100;

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Automações Ativas</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Execuções Totais</p>
                <p className="text-2xl font-bold">{totalExecutions}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-blue-600">{successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {automations.reduce((acc, a) => 
                    acc + a.stats.success * a.actions.filter(act => 
                      ['send_email', 'send_whatsapp', 'send_sms'].includes(act.type)
                    ).length, 0
                  )}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Automações de Marketing</h3>
        <Button onClick={() => setShowNewAutomation(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations.map((automation) => (
          <Collapsible
            key={automation.id}
            open={expandedId === automation.id}
            onOpenChange={() => setExpandedId(expandedId === automation.id ? null : automation.id)}
          >
            <Card className={cn(
              "transition-all",
              !automation.isActive && "opacity-60"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <div className="pt-1">
                    <Switch
                      checked={automation.isActive}
                      onCheckedChange={() => handleToggleActive(automation.id)}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{automation.name}</h4>
                      {automation.isActive ? (
                        <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                      ) : (
                        <Badge variant="secondary">Pausada</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {automation.description}
                    </p>
                    
                    {/* Trigger & Actions Preview */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="outline" className="gap-1">
                        {(() => {
                          const TriggerIcon = triggerLabels[automation.trigger.type]?.icon || Zap;
                          return <TriggerIcon className="h-3 w-3" />;
                        })()}
                        {triggerLabels[automation.trigger.type]?.label}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      {automation.actions.slice(0, 3).map((action, idx) => {
                        const actionInfo = actionLabels[action.type];
                        return (
                          <Badge key={idx} className={cn("gap-1", actionInfo?.color)}>
                            {(() => {
                              const ActionIcon = actionInfo?.icon || Zap;
                              return <ActionIcon className="h-3 w-3" />;
                            })()}
                            {actionInfo?.label}
                            {action.delay && action.delay > 0 && (
                              <span className="text-[10px]">+{action.delay}min</span>
                            )}
                          </Badge>
                        );
                      })}
                      {automation.actions.length > 3 && (
                        <Badge variant="secondary">+{automation.actions.length - 3}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{automation.stats.executed}</p>
                      <p className="text-xs text-muted-foreground">Execuções</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{automation.stats.success}</p>
                      <p className="text-xs text-muted-foreground">Sucesso</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-red-600">{automation.stats.failed}</p>
                      <p className="text-xs text-muted-foreground">Falhas</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          expandedId === automation.id && "rotate-180"
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(automation)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(automation.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                <CollapsibleContent className="mt-4 pt-4 border-t">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Trigger Details */}
                    <div>
                      <h5 className="font-medium text-sm mb-3">Gatilho</h5>
                      <Card className="bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const TriggerIcon = triggerLabels[automation.trigger.type]?.icon || Zap;
                              return <TriggerIcon className="h-5 w-5 text-primary" />;
                            })()}
                            <span className="font-medium">
                              {triggerLabels[automation.trigger.type]?.label}
                            </span>
                          </div>
                          {Object.keys(automation.trigger.config).length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              {JSON.stringify(automation.trigger.config, null, 2)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Actions Details */}
                    <div>
                      <h5 className="font-medium text-sm mb-3">Ações ({automation.actions.length})</h5>
                      <div className="space-y-2">
                        {automation.actions.map((action, idx) => {
                          const actionInfo = actionLabels[action.type];
                          return (
                            <Card key={idx} className="bg-muted/50">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("gap-1", actionInfo?.color)}>
                                      {(() => {
                                        const ActionIcon = actionInfo?.icon || Zap;
                                        return <ActionIcon className="h-3 w-3" />;
                                      })()}
                                      {actionInfo?.label}
                                    </Badge>
                                  </div>
                                  {action.delay && action.delay > 0 && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      +{action.delay >= 60 ? `${action.delay / 60}h` : `${action.delay}min`}
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Last Run Info */}
                  {automation.lastRun && (
                    <div className="mt-4 text-xs text-muted-foreground">
                      Última execução: {automation.lastRun.toLocaleString('pt-BR')}
                    </div>
                  )}
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* New Automation Dialog */}
      <Dialog open={showNewAutomation} onOpenChange={setShowNewAutomation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Automação</DialogTitle>
            <DialogDescription>
              Escolha um template ou crie do zero
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="grid md:grid-cols-2 gap-4 p-1">
              {AUTOMATION_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedTemplate?.id === template.id && "border-primary ring-1 ring-primary"
                  )}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <template.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.actions.map((action, idx) => {
                            const actionInfo = actionLabels[action.type];
                            return (
                              <Badge key={idx} variant="secondary" className="text-[10px]">
                                {actionInfo?.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAutomation(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedTemplate}
              onClick={() => selectedTemplate && handleCreateFromTemplate(selectedTemplate)}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Criar Automação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A automação será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
