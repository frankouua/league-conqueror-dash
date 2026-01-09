import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User, Phone, Mail, MessageSquare, Clock, Calendar, Tag, Star,
  Sparkles, AlertTriangle, CheckCircle2, Circle, Plus, Send,
  ArrowRight, History, ListTodo, FileText, TrendingUp, Brain, Loader2,
  Edit2, Trash2, X, ClipboardCheck, MessagesSquare, PhoneCall
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { CRMLead, CRMStage, useCRMLeadDetail, useCRM, useCRMLeads, LeadTemperature } from '@/hooks/useCRM';
import { CRMLeadEditForm } from './CRMLeadEditForm';
import { CRMBANTDisplay } from './CRMBANTDisplay';
import { CRMQuickActions } from './CRMQuickActions';
import { CRMTransferDialog } from './CRMTransferDialog';
import { CRMLeadChecklist } from './CRMLeadChecklist';
import { CRMTemperatureBadge, CRMTemperatureSelector } from './CRMTemperatureBadge';
import { CRMInternalChat } from './CRMInternalChat';
import { CRMLeadInteractions } from './CRMLeadInteractions';
import { CRMLeadScriptSuggestions } from './CRMLeadScriptSuggestions';
import { CRMRealtimeScriptSuggestions } from './CRMRealtimeScriptSuggestions';
import { useToast } from '@/hooks/use-toast';

interface CRMLeadDetailProps {
  lead: CRMLead | null;
  open: boolean;
  onClose: () => void;
}

export function CRMLeadDetail({ lead: initialLead, open, onClose }: CRMLeadDetailProps) {
  const { toast } = useToast();
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
              /* Content Tabs */
              <Tabs defaultValue="checklist" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-3 sm:mx-6 mt-3 sm:mt-4 grid grid-cols-7 w-auto gap-0.5 sm:gap-1">
              <TabsTrigger value="checklist" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1 sm:px-2">
                <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Check</span>
              </TabsTrigger>
              <TabsTrigger value="overview" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1 sm:px-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Resumo</span>
              </TabsTrigger>
              <TabsTrigger value="interactions" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1 sm:px-2">
                <PhoneCall className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Contatos</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1 sm:px-2">
                <MessagesSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1 sm:px-2">
                <ListTodo className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Tarefas</span>
                {tasks.filter(t => !t.is_completed).length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 w-4 sm:h-5 sm:w-5 p-0 justify-center text-[8px] sm:text-[10px]">
                    {tasks.filter(t => !t.is_completed).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1 sm:px-2">
                <History className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Hist.</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1 sm:px-2">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">IA</span>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-3 sm:px-6 py-3 sm:py-4">
              {/* Checklist Tab */}
              <TabsContent value="checklist" className="m-0 space-y-3 sm:space-y-4">
                {lead && (
                  <>
                    {/* Script Suggestions based on stage */}
                    <CRMLeadScriptSuggestions lead={lead} compact />
                    
                    <CRMLeadChecklist 
                      lead={lead} 
                      stage={currentStage || null}
                      onSurgeryDateChange={() => {
                        // Refresh lead data
                      }}
                    />
                  </>
                )}
              </TabsContent>

              {/* Interactions Tab */}
              <TabsContent value="interactions" className="m-0 space-y-4">
                {lead && (
                  <>
                    {/* Real-time Script Suggestions */}
                    <CRMRealtimeScriptSuggestions 
                      leadId={lead.id}
                      leadName={lead.name}
                      currentIntention={lead.ai_intent}
                      stageKey={currentStage?.name?.toLowerCase().replace(/\s+/g, '_')}
                      temperature={lead.temperature}
                    />
                    
                    <CRMLeadInteractions leadId={lead.id} leadName={lead.name} />
                  </>
                )}
              </TabsContent>

              {/* Chat Tab */}
              <TabsContent value="chat" className="m-0 h-[350px] sm:h-[400px]">
                {lead && (
                  <CRMInternalChat leadId={lead.id} leadName={lead.name} />
                )}
              </TabsContent>

              {/* Overview Tab */}
              <TabsContent value="overview" className="m-0 space-y-3 sm:space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <Card>
                    <CardContent className="p-2 sm:p-3 text-center">
                      <p className="text-lg sm:text-2xl font-bold text-green-600">
                        {lead?.estimated_value
                          ? `R$ ${(lead.estimated_value / 1000).toFixed(0)}k`
                          : '-'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Valor Est.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-2 sm:p-3 text-center">
                      <p className="text-lg sm:text-2xl font-bold">{lead?.lead_score || 0}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Lead Score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-2 sm:p-3 text-center">
                      <p className="text-lg sm:text-2xl font-bold">{lead?.total_interactions || 0}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Interações</p>
                    </CardContent>
                  </Card>
                </div>

                {/* BANT Scores */}
                {lead && (lead.budget_score || lead.authority_score || lead.need_score || lead.timing_score) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Qualificação BANT</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CRMBANTDisplay
                        scores={{
                          budget: lead.budget_score || 0,
                          authority: lead.authority_score || 0,
                          need: lead.need_score || 0,
                          timing: lead.timing_score || 0,
                        }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Procedures of Interest */}
                {lead?.interested_procedures && lead.interested_procedures.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Procedimentos de Interesse</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {lead.interested_procedures.map((proc, i) => (
                          <Badge key={i} variant="outline">{proc}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Adicionar nota..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        size="icon"
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addNote.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {lead?.notes && (
                      <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        {lead.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tags */}
                {lead?.tags && lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="m-0 space-y-4">
                {/* New Task Form */}
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
                          <SelectTrigger className="w-32">
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
                          Criar Tarefa
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

                {/* Task List */}
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
                            task.priority === 'urgent' && "border-red-500 text-red-500",
                            task.priority === 'high' && "border-orange-500 text-orange-500",
                            task.priority === 'medium' && "border-yellow-500 text-yellow-500",
                            task.priority === 'low' && "border-gray-500 text-gray-500"
                          )}
                        >
                          {task.priority}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma tarefa criada
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="m-0">
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                  
                  {history.map((entry, i) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <Card>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{entry.title}</p>
                              {entry.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {entry.description}
                                </p>
                              )}
                              {entry.action_type === 'stage_change' && entry.from_stage && entry.to_stage && (
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                  <Badge variant="outline">{entry.from_stage.name}</Badge>
                                  <ArrowRight className="h-3 w-3" />
                                  <Badge variant="outline">{entry.to_stage.name}</Badge>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(entry.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          {entry.performed_by_profile && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {entry.performed_by_profile.full_name}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                  
                  {history.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum histórico registrado
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* AI Tab */}
              <TabsContent value="ai" className="m-0 space-y-4">
                {lead?.ai_analyzed_at ? (
                  <>
                    <Card className="border-primary/30 bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Resumo da IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{lead.ai_summary}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Analisado {formatDistanceToNow(new Date(lead.ai_analyzed_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </CardContent>
                    </Card>

                    {lead.ai_sentiment && (
                      <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-xl",
                            lead.ai_sentiment === 'positive' && "bg-green-500/20",
                            lead.ai_sentiment === 'neutral' && "bg-gray-500/20",
                            lead.ai_sentiment === 'negative' && "bg-red-500/20",
                            lead.ai_sentiment === 'mixed' && "bg-yellow-500/20"
                          )}>
                            {lead.ai_sentiment === 'positive' && '😊'}
                            {lead.ai_sentiment === 'neutral' && '😐'}
                            {lead.ai_sentiment === 'negative' && '😟'}
                            {lead.ai_sentiment === 'mixed' && '🤔'}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{lead.ai_sentiment}</p>
                            <p className="text-xs text-muted-foreground">Sentimento detectado</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {lead.ai_intent && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Intenção Detectada</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{lead.ai_intent}</p>
                        </CardContent>
                      </Card>
                    )}

                    {lead.ai_next_action && (
                      <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-yellow-600" />
                            Próxima Ação Sugerida
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{lead.ai_next_action}</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Lead ainda não analisado</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Clique em "Analisar com IA" para obter insights sobre este lead
                    </p>
                    <Button
                      onClick={() => analyzeLead.mutate()}
                      disabled={analyzeLead.isPending}
                      className="gap-2"
                    >
                      {analyzeLead.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Analisar com IA
                    </Button>
                  </div>
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
    </>
  );
}
