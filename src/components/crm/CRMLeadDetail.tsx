import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  User, Phone, Mail, MessageSquare, Clock, Calendar, Tag, Star,
  Sparkles, AlertTriangle, CheckCircle2, Circle, Plus, Send,
  ArrowRight, History, ListTodo, FileText, TrendingUp, Brain, Loader2
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
import { cn } from '@/lib/utils';
import { CRMLead, CRMStage, useCRMLeadDetail, useCRM } from '@/hooks/useCRM';

interface CRMLeadDetailProps {
  lead: CRMLead | null;
  open: boolean;
  onClose: () => void;
}

export function CRMLeadDetail({ lead: initialLead, open, onClose }: CRMLeadDetailProps) {
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

  const [newNote, setNewNote] = useState('');
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'medium' });
  const [showNewTask, setShowNewTask] = useState(false);

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

  if (!initialLead) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b bg-muted/30">
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <SheetTitle className="text-xl flex items-center gap-2">
                    {lead?.name || initialLead.name}
                    {lead?.is_priority && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                  </SheetTitle>
                  {lead?.source_detail && (
                    <p className="text-sm text-muted-foreground mt-1">
                      via {lead.source} • {lead.source_detail}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeLead.mutate()}
                  disabled={analyzeLead.isPending}
                  className="gap-2"
                >
                  {analyzeLead.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  Analisar com IA
                </Button>
              </div>
            </SheetHeader>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-4 mt-4">
              {lead?.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {lead.phone}
                </a>
              )}
              {lead?.whatsapp && (
                <a
                  href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-green-500 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {lead?.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {lead.email}
                </a>
              )}
            </div>

            {/* Stage Progress */}
            {currentStage && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge style={{ backgroundColor: currentStage.color, color: 'white' }}>
                    {currentStage.name}
                  </Badge>
                  {lead?.days_in_stage > 0 && (
                    <span className="text-xs text-muted-foreground">
                      há {lead.days_in_stage} dias neste estágio
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {pipelineStages.map((stage, i) => (
                    <div
                      key={stage.id}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        stage.order_index <= currentStage.order_index
                          ? "bg-primary"
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 grid grid-cols-4 w-auto">
              <TabsTrigger value="overview" className="gap-1">
                <FileText className="h-4 w-4" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1">
                <ListTodo className="h-4 w-4" />
                Tarefas
                {tasks.filter(t => !t.is_completed).length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                    {tasks.filter(t => !t.is_completed).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1">
                <Sparkles className="h-4 w-4" />
                IA
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6 py-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="m-0 space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {lead?.estimated_value
                          ? `R$ ${(lead.estimated_value / 1000).toFixed(0)}k`
                          : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">Valor Estimado</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{lead?.lead_score || 0}</p>
                      <p className="text-xs text-muted-foreground">Lead Score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold">{lead?.total_interactions || 0}</p>
                      <p className="text-xs text-muted-foreground">Interações</p>
                    </CardContent>
                  </Card>
                </div>

                {/* BANT Scores */}
                {lead && (lead.budget_score || lead.authority_score || lead.need_score || lead.timing_score) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Qualificação BANT</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-20">Budget</span>
                        <Progress value={(lead.budget_score || 0) * 10} className="flex-1" />
                        <span className="text-xs w-6 text-right">{lead.budget_score || 0}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-20">Authority</span>
                        <Progress value={(lead.authority_score || 0) * 10} className="flex-1" />
                        <span className="text-xs w-6 text-right">{lead.authority_score || 0}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-20">Need</span>
                        <Progress value={(lead.need_score || 0) * 10} className="flex-1" />
                        <span className="text-xs w-6 text-right">{lead.need_score || 0}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-20">Timing</span>
                        <Progress value={(lead.timing_score || 0) * 10} className="flex-1" />
                        <span className="text-xs w-6 text-right">{lead.timing_score || 0}</span>
                      </div>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
