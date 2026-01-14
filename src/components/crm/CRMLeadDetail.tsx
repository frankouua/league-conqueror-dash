import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User, Phone, Mail, Star, Sparkles, AlertTriangle, CheckCircle2,
  Circle, Plus, Send, History, ListTodo, FileText, TrendingUp, Brain,
  Loader2, Edit2, Trash2, ClipboardCheck, PhoneCall, Trophy, ThumbsDown
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import { CRMLead, useCRMLeadDetail, useCRM, useCRMLeads } from '@/hooks/useCRM';
import { CRMLeadEditForm } from './CRMLeadEditForm';
import { CRMQuickActions } from './CRMQuickActions';
import { CRMTransferDialog } from './CRMTransferDialog';
import { CRMLeadChecklist } from './CRMLeadChecklist';
import { CRMLeadChecklistPanel } from './CRMLeadChecklistPanel';
import { CRMTemperatureBadge } from './CRMTemperatureBadge';
import { CRMInternalChat } from './CRMInternalChat';
import { CRMLeadInteractions } from './CRMLeadInteractions';
import { CRMLeadScriptSuggestions } from './CRMLeadScriptSuggestions';
import { CRMRealtimeScriptSuggestions } from './CRMRealtimeScriptSuggestions';
import { CRMLeadPersonalData } from './CRMLeadPersonalData';
import { CRMJourneyProtocolSuggestions } from './CRMJourneyProtocolSuggestions';
import { CRMLeadContracts } from './CRMLeadContracts';
import { CRMLeadTravel } from './CRMLeadTravel';
import { CRMLeadUTM } from './CRMLeadUTM';
import { CRMCoordinatorValidation } from './CRMCoordinatorValidation';
import { CRMLeadDischarge } from './CRMLeadDischarge';
import { CRMLostReasonDialog } from './CRMLostReasonDialog';
import { CRMWonDialog } from './CRMWonDialog';
import { CRMLeadSummary } from './CRMLeadSummary';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

type PriceItem = { name: string; price: number | null; promotional_price: number | null };

const formatCurrencyValue = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

function NegotiationValueCard({ lead }: { lead: CRMLead }) {
  // The estimated_value from the database is the source of truth
  // It's properly synced with procedures in CRMLeadEditForm
  const currentValue = lead.estimated_value || 0;
  const proceduresCount = lead.interested_procedures?.length || 0;
  const hasNegotiation = currentValue > 0 || proceduresCount > 0;

  if (!hasNegotiation) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Nenhuma oportunidade configurada</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Edite o lead para adicionar procedimentos de interesse
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-green-500/15 via-green-500/10 to-emerald-500/5 border-2 border-green-500/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Valor da Negociação</span>
        </div>
        <p className="text-3xl font-black text-green-600">
          {formatCurrencyValue(currentValue)}
        </p>
        {proceduresCount > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {proceduresCount} procedimento{proceduresCount > 1 ? 's' : ''} selecionado{proceduresCount > 1 ? 's' : ''}
          </p>
        )}
        {proceduresCount === 0 && currentValue > 0 && (
          <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Valor manual (sem procedimentos vinculados)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface CRMLeadDetailProps {
  lead: CRMLead | null;
  open: boolean;
  onClose: () => void;
}

export function CRMLeadDetail({ lead: initialLead, open, onClose }: CRMLeadDetailProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { stages } = useCRM();
  const {
    lead,
    history,
    tasks,
    leadLoading,
    addNote,
    createTask,
    completeTask,
    analyzeLead,
  } = useCRMLeadDetail(initialLead?.id || null);

  const { updateLead, deleteLead } = useCRMLeads(initialLead?.pipeline_id);

  const [newNote, setNewNote] = useState('');
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'medium' });
  const [showNewTask, setShowNewTask] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);

  const currentStage = stages.find(s => s.id === lead?.stage_id);
  const pipelineStages = stages.filter(s => s.pipeline_id === lead?.pipeline_id);

  const handleAddNote = () => {
    if (!newNote.trim() || !lead) return;
    addNote.mutate({ leadId: lead.id, note: newNote });
    setNewNote('');
  };

  const handleCreateTask = () => {
    if (!newTask.title.trim() || !newTask.due_date || !lead) return;
    createTask.mutate({
      title: newTask.title,
      due_date: newTask.due_date,
      priority: newTask.priority,
      task_type: 'follow_up',
    });
    setNewTask({ title: '', due_date: '', priority: 'medium' });
    setShowNewTask(false);
  };

  const handleTogglePriority = async () => {
    if (!lead) return;
    await updateLead.mutateAsync({
      id: lead.id,
      is_priority: !lead.is_priority,
    });
    toast({ title: lead.is_priority ? 'Prioridade removida' : 'Lead marcado como prioritário!' });
  };

  const handleDelete = async () => {
    if (!lead) return;
    await deleteLead.mutateAsync(lead.id);
    setShowDeleteDialog(false);
    onClose();
  };

  // Handle marking lead as WON
  const handleMarkWon = async (data: { contractValue: number; surgeryDate?: string; notes: string }) => {
    if (!lead) return;
    
    await updateLead.mutateAsync({
      id: lead.id,
      won_at: new Date().toISOString(),
      contract_value: data.contractValue,
      surgery_date: data.surgeryDate || null,
    });

    // Log to history
    await supabase.from('crm_lead_history').insert({
      lead_id: lead.id,
      action_type: 'won',
      performed_by: profile?.user_id,
      title: 'Venda Fechada!',
      description: `Valor: R$ ${data.contractValue.toLocaleString('pt-BR')}${data.notes ? ` - ${data.notes}` : ''}`,
    });

    toast({ title: '🎉 Venda registrada com sucesso!' });
    setShowWonDialog(false);
  };

  // Handle marking lead as LOST with reason
  const handleMarkLost = async (reasonId: string, reasonText: string, notes: string) => {
    if (!lead) return;
    
    await updateLead.mutateAsync({
      id: lead.id,
      lost_at: new Date().toISOString(),
      lost_reason: reasonText,
    });

    // Log to history
    await supabase.from('crm_lead_history').insert({
      lead_id: lead.id,
      action_type: 'lost',
      performed_by: profile?.user_id,
      title: 'Lead Perdido',
      description: `Motivo: ${reasonText}${notes ? ` - ${notes}` : ''}`,
    });

    toast({ title: 'Lead marcado como perdido' });
    setShowLostDialog(false);
  };

  if (!initialLead) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b bg-muted/30">
              <SheetHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-lg sm:text-xl flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="truncate">{lead?.name || initialLead.name}</span>
                      {lead?.temperature && (
                        <CRMTemperatureBadge 
                          temperature={lead.temperature} 
                          size="sm"
                        />
                      )}
                      {lead?.is_priority && <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-500 shrink-0" />}
                      {lead?.is_stale && (
                        <Badge variant="outline" className="border-orange-500 text-orange-500 text-[10px] sm:text-xs shrink-0">
                          <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                          Parado
                        </Badge>
                      )}
                    </SheetTitle>
                    {lead?.source && (
                      <p className="text-sm text-muted-foreground mt-1">
                        via {lead.source} {lead.source_detail && `• ${lead.source_detail}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="gap-1 h-8 px-2 sm:px-3"
                    >
                      <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Editar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzeLead.mutate()}
                      disabled={analyzeLead.isPending}
                      className="gap-1 h-8 px-2 sm:px-3"
                    >
                      {analyzeLead.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                      <span className="hidden sm:inline">IA</span>
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Quick Actions */}
              {lead && (
                <div className="mt-4 flex items-center justify-between">
                  <CRMQuickActions
                    lead={lead}
                    onTogglePriority={handleTogglePriority}
                    onDelete={() => setShowDeleteDialog(true)}
                    onTransfer={() => setShowTransferDialog(true)}
                    onMarkWon={() => setShowWonDialog(true)}
                    onMarkLost={() => setShowLostDialog(true)}
                  />
                  
                  {/* Contact Info - Stack on mobile */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="truncate max-w-[120px] sm:max-w-none">{lead.phone}</span>
                      </span>
                    )}
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className="truncate max-w-[120px] sm:max-w-[150px]">{lead.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Stage Progress */}
              {currentStage && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge style={{ backgroundColor: currentStage.color, color: 'white' }}>
                      {currentStage.name}
                    </Badge>
                    {lead?.days_in_stage !== undefined && lead.days_in_stage > 0 && (
                      <span className="text-xs text-muted-foreground">
                        há {lead.days_in_stage} dias neste estágio
                      </span>
                    )}
                    {lead?.ai_analyzed_at && (
                      <Badge variant="outline" className="border-purple-500 text-purple-500 text-xs ml-auto">
                        <Sparkles className="h-3 w-3 mr-1" />
                        IA
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {pipelineStages.map((stage) => (
                      <div
                        key={stage.id}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          (stage.order_index || 0) <= (currentStage.order_index || 0)
                            ? "bg-primary"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Edit Form or Content Tabs */}
            {isEditing ? (
              <ScrollArea className="flex-1 p-6">
                {lead ? (
                  <CRMLeadEditForm
                    lead={lead}
                    stages={pipelineStages}
                    onClose={() => setIsEditing(false)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </ScrollArea>
            ) : (
              /* Content Tabs - SIMPLIFIED: Only 5 main tabs */
              <Tabs defaultValue="resumo" className="flex-1 flex flex-col overflow-hidden">
            <div className="mx-3 sm:mx-6 mt-3 sm:mt-4">
              <TabsList className="grid grid-cols-5 w-full gap-1">
                <TabsTrigger value="resumo" className="gap-1 text-xs px-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Resumo</span>
                </TabsTrigger>
                <TabsTrigger value="checklist" className="gap-1 text-xs px-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Ações</span>
                </TabsTrigger>
                <TabsTrigger value="contatos" className="gap-1 text-xs px-2">
                  <PhoneCall className="h-4 w-4" />
                  <span className="hidden sm:inline">Contatos</span>
                </TabsTrigger>
                <TabsTrigger value="tarefas" className="gap-1 text-xs px-2 relative">
                  <ListTodo className="h-4 w-4" />
                  <span className="hidden sm:inline">Tarefas</span>
                  {tasks.filter(t => !t.is_completed).length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 justify-center text-[10px]">
                      {tasks.filter(t => !t.is_completed).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="mais" className="gap-1 text-xs px-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">+ Info</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-3 sm:px-6 py-3 sm:py-4">
              {/* RESUMO Tab - All key info in one place */}
              <TabsContent value="resumo" className="m-0 space-y-4">
                {/* Use lead if available, otherwise use initialLead for immediate display */}
                {(lead || initialLead) && (
                  <>
                    {/* NEGOTIATION VALUE - HIGHLIGHTED */}
                    {lead ? (
                      <NegotiationValueCard lead={lead} />
                    ) : (
                      <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm">Carregando valor...</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Quick Stats - Score, Interactions */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xl font-bold">{(lead || initialLead)?.lead_score || 0}</p>
                          <p className="text-xs text-muted-foreground">Score IA</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xl font-bold">{(lead || initialLead)?.total_interactions || 0}</p>
                          <p className="text-xs text-muted-foreground">Interações</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* AI Summary if available */}
                    {(lead || initialLead)?.ai_summary && (
                      <Card className="border-primary/30 bg-primary/5">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Resumo IA</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{(lead || initialLead)?.ai_summary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Next Action from AI */}
                    {(lead || initialLead)?.ai_next_action && (
                      <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium">Próxima Ação</span>
                          </div>
                          <p className="text-sm">{(lead || initialLead)?.ai_next_action}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Procedures of Interest - Now with prominence */}
                    {(lead || initialLead)?.interested_procedures && (lead || initialLead)!.interested_procedures!.length > 0 && (
                      <Card className="border-primary/30">
                        <CardContent className="p-3">
                          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Procedimentos em Negociação
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(lead || initialLead)!.interested_procedures!.map((proc, i) => (
                              <Badge key={i} className="bg-primary/10 text-primary border border-primary/30">
                                {proc}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Notes Section - ALWAYS VISIBLE with fallback to initialLead */}
                    <Card className="border-2 border-primary/20">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Observações / Notas
                        </p>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Adicionar observação..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="min-h-[60px]"
                          />
                          <Button
                            size="icon"
                            onClick={handleAddNote}
                            disabled={!newNote.trim() || addNote.isPending || !lead}
                            title={!lead ? "Aguarde carregar..." : "Enviar nota"}
                          >
                            {addNote.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {(lead || initialLead)?.notes && (
                          <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-2 max-h-32 overflow-y-auto border">
                            {(lead || initialLead)?.notes}
                          </div>
                        )}
                        {/* Recent notes from history */}
                        {history.filter(h => h.action_type === 'note').length > 0 && (
                          <div className="pt-2 space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">Notas recentes:</p>
                            {history
                              .filter(h => h.action_type === 'note')
                              .slice(0, 3)
                              .map((note) => (
                                <div key={note.id} className="text-xs bg-blue-500/10 rounded p-2 border-l-2 border-blue-500">
                                  <p className="font-medium text-blue-600">{note.title}</p>
                                  {note.description && (
                                    <p className="text-muted-foreground mt-1">{note.description}</p>
                                  )}
                                  <p className="text-muted-foreground/70 text-[10px] mt-1">
                                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}
                                  </p>
                                </div>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Personal Data - IMPORTANTE: NÃO passar leadEstimatedValue para evitar confusão */}
                    <CRMLeadPersonalData
                      leadCpf={(lead || initialLead)?.cpf || null}
                      leadProntuario={(lead || initialLead)?.prontuario || null}
                      patientDataId={(lead || initialLead)?.patient_data_id || null}
                      leadName={(lead || initialLead)?.name || ''}
                      // NÃO passar leadEstimatedValue - isso é valor de NEGOCIAÇÃO, não de VENDAS
                    />
                  </>
                )}
              </TabsContent>

              {/* CHECKLIST Tab - Actions and protocols */}
              <TabsContent value="checklist" className="m-0 space-y-4">
                {lead && (
                  <>
                    <CRMLeadChecklistPanel leadId={lead.id} />
                    <CRMJourneyProtocolSuggestions 
                      lead={lead} 
                      stageName={currentStage?.name}
                      compact
                    />
                    <CRMLeadScriptSuggestions lead={lead} compact />
                    <CRMLeadChecklist 
                      lead={lead} 
                      stage={currentStage || null}
                      onSurgeryDateChange={() => {}}
                    />
                  </>
                )}
              </TabsContent>

              {/* CONTATOS Tab - Interactions and chat */}
              <TabsContent value="contatos" className="m-0 space-y-4">
                {lead && (
                  <>
                    <CRMRealtimeScriptSuggestions 
                      leadId={lead.id}
                      leadName={lead.name}
                      currentIntention={lead.ai_intent}
                      stageKey={currentStage?.name?.toLowerCase().replace(/\s+/g, '_')}
                      temperature={lead.temperature}
                    />
                    <CRMLeadInteractions leadId={lead.id} leadName={lead.name} />
                    <div className="h-[300px]">
                      <CRMInternalChat leadId={lead.id} leadName={lead.name} />
                    </div>
                  </>
                )}
              </TabsContent>

              {/* TAREFAS Tab - Tasks */}
              <TabsContent value="tarefas" className="m-0 space-y-4">
                {showNewTask ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <Input
                        placeholder="Título da tarefa"
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="datetime-local"
                          value={newTask.due_date}
                          onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                          className="flex-1"
                        />
                        <Select
                          value={newTask.priority}
                          onValueChange={(v) => setNewTask(prev => ({ ...prev, priority: v }))}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleCreateTask} disabled={createTask.isPending}>
                          Criar
                        </Button>
                        <Button variant="outline" onClick={() => setShowNewTask(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button variant="outline" className="w-full gap-2" onClick={() => setShowNewTask(true)}>
                    <Plus className="h-4 w-4" />
                    Nova Tarefa
                  </Button>
                )}

                <div className="space-y-2">
                  {tasks.map(task => (
                    <Card key={task.id} className={cn(task.is_completed && "opacity-60")}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => !task.is_completed && completeTask.mutate(task.id)}
                        >
                          {task.is_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm", task.is_completed && "line-through")}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(task.due_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            task.priority === 'urgent' && "border-red-500 text-red-500",
                            task.priority === 'high' && "border-orange-500 text-orange-500"
                          )}
                        >
                          {task.priority === 'urgent' ? '🔥' : task.priority === 'high' ? '⚡' : ''}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma tarefa
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* MAIS Tab - Additional info collapsed */}
              <TabsContent value="mais" className="m-0 space-y-3">
                {lead && (
                  <>
                    {/* History - Agora mostra descrição das notas */}
                    <Card>
                      <CardHeader className="pb-2 pt-3 px-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Histórico Completo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {history.map((entry) => (
                            <div 
                              key={entry.id} 
                              className={cn(
                                "text-xs border-l-2 pl-2 py-1",
                                entry.action_type === 'note' 
                                  ? "border-blue-500 bg-blue-500/5" 
                                  : "border-primary/30"
                              )}
                            >
                              <div className="flex items-center gap-1">
                                {entry.action_type === 'note' && (
                                  <FileText className="h-3 w-3 text-blue-500" />
                                )}
                                <p className="font-medium">{entry.title}</p>
                              </div>
                              {/* Mostrar descrição/conteúdo da nota */}
                              {entry.description && (
                                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                                  {entry.description}
                                </p>
                              )}
                              <p className="text-muted-foreground/70 text-[10px] mt-1">
                                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                          ))}
                          {history.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">Sem histórico</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contracts */}
                    <CRMLeadContracts
                      leadId={lead.id}
                      leadName={lead.name}
                      leadEmail={lead.email}
                      leadPhone={lead.phone}
                    />

                    {/* Coordinator Validation */}
                    <CRMCoordinatorValidation leadId={lead.id} leadName={lead.name} />

                    {/* Travel */}
                    <CRMLeadTravel leadId={lead.id} />

                    {/* Discharge */}
                    <CRMLeadDischarge 
                      leadId={lead.id} 
                      leadName={lead.name}
                      dischargeData={{
                        future_letter_written: (lead as any).future_letter_written,
                        before_after_photo_delivered: (lead as any).before_after_photo_delivered,
                        unique_necklace_delivered: (lead as any).unique_necklace_delivered,
                        testimonial_collected: (lead as any).testimonial_collected,
                        google_review_requested: (lead as any).google_review_requested,
                        discharge_completed: (lead as any).discharge_completed,
                        discharge_completed_at: (lead as any).discharge_completed_at,
                      }}
                    />

                    {/* UTM Origin */}
                    <CRMLeadUTM 
                      utmData={{
                        utm_source: (lead as any).utm_source,
                        utm_medium: (lead as any).utm_medium,
                        utm_campaign: (lead as any).utm_campaign,
                        utm_term: (lead as any).utm_term,
                        utm_content: (lead as any).utm_content,
                        landing_page: (lead as any).landing_page,
                        referrer_url: (lead as any).referrer_url,
                      }}
                    />
                  </>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
            )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Transfer Dialog */}
    <CRMTransferDialog
      lead={lead}
      open={showTransferDialog}
      onClose={() => setShowTransferDialog(false)}
    />

    {/* Won Dialog */}
    {lead && (
      <CRMWonDialog
        open={showWonDialog}
        onClose={() => setShowWonDialog(false)}
        leadId={lead.id}
        leadName={lead.name}
        currentValue={lead.estimated_value || 0}
        procedures={lead.interested_procedures || []}
        onConfirm={handleMarkWon}
      />
    )}

    {/* Lost Reason Dialog */}
    {lead && (
      <CRMLostReasonDialog
        open={showLostDialog}
        onClose={() => setShowLostDialog(false)}
        leadId={lead.id}
        leadName={lead.name}
        onConfirm={handleMarkLost}
      />
    )}
    </>
  );
}
