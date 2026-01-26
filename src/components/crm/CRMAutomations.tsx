import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap, Plus, Play, Pause, Trash2, Edit, Clock, Bell,
  Send, Tag, UserPlus, ArrowRight, Loader2, Settings,
  Sparkles, AlertCircle, CheckCircle, Mail, MessageSquare,
  Phone, Calendar, RefreshCw, Star, ThermometerSun
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCRM } from "@/hooks/useCRM";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: Record<string, any> | null;
  actions: Record<string, any>[];
  pipeline_id: string | null;
  stage_id: string | null;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

const TRIGGER_TYPES = [
  { value: 'lead_created', label: 'Lead Criado', icon: UserPlus, description: 'Quando um novo lead é criado' },
  { value: 'stage_changed', label: 'Mudança de Estágio', icon: ArrowRight, description: 'Quando lead muda de estágio' },
  { value: 'lead_stale', label: 'Lead Parado', icon: Clock, description: 'Quando lead fica X dias sem atividade' },
  { value: 'tag_added', label: 'Tag Adicionada', icon: Tag, description: 'Quando uma tag específica é adicionada' },
  { value: 'schedule', label: 'Agendado', icon: Clock, description: 'Executar em horário específico' },
];

const ACTION_TYPES = [
  { value: 'send_whatsapp', label: 'Enviar WhatsApp', icon: WhatsAppIcon, color: 'text-green-500', hasMessage: true },
  { value: 'send_email', label: 'Enviar E-mail', icon: Mail, color: 'text-blue-500', hasMessage: true },
  { value: 'send_sms', label: 'Enviar SMS', icon: Phone, color: 'text-purple-500', hasMessage: true },
  { value: 'send_notification', label: 'Notificação Interna', icon: Bell, color: 'text-orange-500', hasMessage: true },
  { value: 'add_tag', label: 'Adicionar Tag', icon: Tag, color: 'text-cyan-500', hasConfig: true },
  { value: 'remove_tag', label: 'Remover Tag', icon: Tag, color: 'text-red-500', hasConfig: true },
  { value: 'move_stage', label: 'Mover Estágio', icon: ArrowRight, color: 'text-indigo-500', hasConfig: true },
  { value: 'create_task', label: 'Criar Tarefa', icon: CheckCircle, color: 'text-emerald-500', hasMessage: true },
  { value: 'schedule_followup', label: 'Agendar Follow-up', icon: Calendar, color: 'text-amber-500', hasConfig: true },
  { value: 'assign_user', label: 'Atribuir Responsável', icon: UserPlus, color: 'text-pink-500', hasConfig: true },
  { value: 'update_temperature', label: 'Atualizar Temperatura', icon: ThermometerSun, color: 'text-red-400', hasConfig: true },
  { value: 'add_points', label: 'Adicionar Pontos', icon: Star, color: 'text-yellow-500', hasConfig: true },
  { value: 'webhook', label: 'Webhook Externo', icon: RefreshCw, color: 'text-gray-500', hasConfig: true },
];

export function CRMAutomations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pipelines = [], stages = [], pipelinesLoading, stagesLoading } = useCRM();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'lead_created',
    trigger_config: {} as Record<string, any>,
    pipeline_id: 'all',
    stage_id: 'all',
    actions: [] as { type: string; config: Record<string, any> }[],
  });

  // Fetch automations
  const { data: automations = [], isLoading, error } = useQuery({
    queryKey: ['crm-automations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_automations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Automation[];
    },
    enabled: !!user,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        trigger_type: data.trigger_type,
        trigger_config: data.trigger_config,
        pipeline_id: data.pipeline_id === 'all' ? null : data.pipeline_id,
        stage_id: data.stage_id === 'all' ? null : data.stage_id,
        actions: data.actions,
        created_by: user?.id || '',
        is_active: true,
      };

      if (editingAutomation) {
        const { error } = await supabase
          .from('crm_automations')
          .update(payload)
          .eq('id', editingAutomation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_automations')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      toast.success(editingAutomation ? 'Automação atualizada!' : 'Automação criada!');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Toggle active
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('crm_automations')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_automations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      toast.success('Automação excluída!');
    },
  });

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingAutomation(null);
    setFormData({
      name: '',
      description: '',
      trigger_type: 'lead_created',
      trigger_config: {},
      pipeline_id: 'all',
      stage_id: 'all',
      actions: [],
    });
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || '',
      trigger_type: automation.trigger_type,
      trigger_config: automation.trigger_config || {},
      pipeline_id: automation.pipeline_id || 'all',
      stage_id: automation.stage_id || 'all',
      actions: (automation.actions as any) || [],
    });
    setShowCreateDialog(true);
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'add_tag', config: {} }],
    }));
  };

  const updateAction = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) => 
        i === index ? { ...a, [field]: value } : a
      ),
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const getTriggerInfo = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type) || TRIGGER_TYPES[0];
  };

  const getActionInfo = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type) || ACTION_TYPES[0];
  };

  // Error handling
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Automações
            </h3>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold mb-2">Erro ao carregar automações</h3>
            <p className="text-muted-foreground text-center mb-4">
              {(error as Error).message}
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['crm-automations'] })}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Automações
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure ações automáticas baseadas em eventos do CRM
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Automação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{automations.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {automations.filter(a => a.is_active).length}
            </p>
            <p className="text-sm text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {automations.reduce((sum, a) => sum + (a.run_count || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground">Execuções</p>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      {isLoading || pipelinesLoading || stagesLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma automação configurada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie automações para agilizar seu workflow
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Automação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {automations.map((automation) => {
              const triggerInfo = getTriggerInfo(automation.trigger_type);
              const TriggerIcon = triggerInfo.icon;

              return (
                <Card key={automation.id} className={!automation.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${automation.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                          <TriggerIcon className={`h-5 w-5 ${automation.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <h4 className="font-medium">{automation.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {triggerInfo.label} • {automation.actions?.length || 0} ações
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {automation.run_count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {automation.run_count} execuções
                          </Badge>
                        )}
                        <Switch
                          checked={automation.is_active}
                          onCheckedChange={(checked) => toggleActive.mutate({ id: automation.id, is_active: checked })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(automation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(automation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {editingAutomation ? 'Editar Automação' : 'Nova Automação'}
            </DialogTitle>
            <DialogDescription>
              Configure gatilhos e ações automáticas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Notificar lead parado"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o objetivo desta automação"
                rows={2}
              />
            </div>

            {/* Trigger */}
            <div className="space-y-2">
              <Label>Gatilho</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="h-4 w-4" />
                        {trigger.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pipeline/Stage Filter */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pipeline (opcional)</Label>
                <Select
                  value={formData.pipeline_id}
                  onValueChange={(v) => setFormData({ ...formData, pipeline_id: v, stage_id: 'all' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estágio (opcional)</Label>
                <Select
                  value={formData.stage_id}
                  onValueChange={(v) => setFormData({ ...formData, stage_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {stages
                      .filter(s => formData.pipeline_id === 'all' || s.pipeline_id === formData.pipeline_id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ações</Label>
                <Button size="sm" variant="outline" onClick={addAction} className="gap-1">
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              </div>
              
              {formData.actions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma ação configurada
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.actions.map((action, index) => {
                    const actionInfo = getActionInfo(action.type);
                    const ActionIcon = actionInfo.icon;
                    const actionDef = ACTION_TYPES.find(a => a.value === action.type);
                    
                    return (
                      <div key={index} className="p-3 rounded-lg border space-y-3">
                        <div className="flex items-center gap-2">
                          <ActionIcon className={`h-4 w-4 ${actionDef?.color || 'text-muted-foreground'}`} />
                          <Select
                            value={action.type}
                            onValueChange={(v) => updateAction(index, 'type', v)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                  <div className="flex items-center gap-2">
                                    <a.icon className={`h-4 w-4 ${a.color}`} />
                                    {a.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeAction(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Config fields based on action type */}
                        {(action.type === 'send_whatsapp' || action.type === 'send_email' || action.type === 'send_sms') && (
                          <div className="space-y-2 pl-6">
                            {action.type === 'send_email' && (
                              <Input
                                placeholder="Assunto do e-mail"
                                value={action.config?.subject || ''}
                                onChange={(e) => updateAction(index, 'config', { ...action.config, subject: e.target.value })}
                              />
                            )}
                            <Textarea
                              placeholder={`Mensagem ${action.type === 'send_email' ? 'do e-mail' : action.type === 'send_sms' ? 'SMS' : 'WhatsApp'}... Use {nome}, {procedimento}, {vendedor} para variáveis`}
                              value={action.config?.message || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, message: e.target.value })}
                              rows={2}
                            />
                          </div>
                        )}

                        {action.type === 'send_notification' && (
                          <div className="space-y-2 pl-6">
                            <Input
                              placeholder="Título da notificação"
                              value={action.config?.title || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, title: e.target.value })}
                            />
                            <Textarea
                              placeholder="Mensagem da notificação..."
                              value={action.config?.message || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, message: e.target.value })}
                              rows={2}
                            />
                          </div>
                        )}

                        {action.type === 'create_task' && (
                          <div className="space-y-2 pl-6">
                            <Input
                              placeholder="Título da tarefa"
                              value={action.config?.task_title || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, task_title: e.target.value })}
                            />
                            <Input
                              placeholder="Prazo em dias (ex: 1, 3, 7)"
                              type="number"
                              value={action.config?.due_days || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, due_days: parseInt(e.target.value) })}
                            />
                          </div>
                        )}

                        {(action.type === 'add_tag' || action.type === 'remove_tag') && (
                          <div className="pl-6">
                            <Input
                              placeholder="Nome da tag"
                              value={action.config?.tag || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, tag: e.target.value })}
                            />
                          </div>
                        )}

                        {action.type === 'move_stage' && (
                          <div className="pl-6">
                            <Select
                              value={action.config?.target_stage_id || ''}
                              onValueChange={(v) => updateAction(index, 'config', { ...action.config, target_stage_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o estágio" />
                              </SelectTrigger>
                              <SelectContent>
                                {stages.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {action.type === 'schedule_followup' && (
                          <div className="space-y-2 pl-6">
                            <Input
                              placeholder="Dias para follow-up (ex: 3)"
                              type="number"
                              value={action.config?.days || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, days: parseInt(e.target.value) })}
                            />
                            <Input
                              placeholder="Descrição do follow-up"
                              value={action.config?.description || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, description: e.target.value })}
                            />
                          </div>
                        )}

                        {action.type === 'update_temperature' && (
                          <div className="pl-6">
                            <Select
                              value={action.config?.temperature || ''}
                              onValueChange={(v) => updateAction(index, 'config', { ...action.config, temperature: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a temperatura" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hot">🔥 Quente</SelectItem>
                                <SelectItem value="warm">☀️ Morno</SelectItem>
                                <SelectItem value="cold">❄️ Frio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {action.type === 'add_points' && (
                          <div className="pl-6">
                            <Input
                              placeholder="Pontos a adicionar"
                              type="number"
                              value={action.config?.points || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, points: parseInt(e.target.value) })}
                            />
                          </div>
                        )}

                        {action.type === 'webhook' && (
                          <div className="space-y-2 pl-6">
                            <Input
                              placeholder="URL do webhook"
                              type="url"
                              value={action.config?.url || ''}
                              onChange={(e) => updateAction(index, 'config', { ...action.config, url: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={!formData.name || saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CRMAutomations;
