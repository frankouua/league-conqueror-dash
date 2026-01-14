import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, Circle, Clock, AlertTriangle, Plus, 
  Loader2, ListTodo, ChevronDown, ChevronUp, Trash2,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  lead_id: string;
  template_id: string | null;
  stage_id: string | null;
  title: string;
  description: string | null;
  is_custom: boolean;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  due_at: string | null;
  is_overdue: boolean;
  order_index: number;
  stage?: {
    name: string;
    color: string;
  };
}

interface CRMLeadChecklistPanelProps {
  leadId: string;
  currentStageId?: string;
  compact?: boolean;
}

export function CRMLeadChecklistPanel({ leadId, currentStageId, compact = false }: CRMLeadChecklistPanelProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Fetch checklist items for this lead
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['lead-checklist', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_checklist_items')
        .select(`
          *,
          stage:stage_id(name, color)
        `)
        .eq('lead_id', leadId)
        .order('stage_id')
        .order('order_index');

      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: !!leadId,
  });

  // Toggle completion
  const toggleComplete = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('lead_checklist_items')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? profile?.user_id : null,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-checklist', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar tarefa', description: error.message, variant: 'destructive' });
    },
  });

  // Add custom task
  const addTask = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from('lead_checklist_items')
        .insert({
          lead_id: leadId,
          stage_id: currentStageId,
          title,
          is_custom: true,
          order_index: items.length,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewTaskTitle('');
      queryClient.invalidateQueries({ queryKey: ['lead-checklist', leadId] });
      toast({ title: 'Tarefa adicionada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar tarefa', description: error.message, variant: 'destructive' });
    },
  });

  // Delete custom task
  const deleteTask = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('lead_checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-checklist', leadId] });
      toast({ title: 'Tarefa removida!' });
    },
  });

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask.mutate(newTaskTitle.trim());
    }
  };

  // Calculate stats
  const totalTasks = items.length;
  const completedTasks = items.filter(i => i.is_completed).length;
  const overdueTasks = items.filter(i => i.is_overdue).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Group items by stage
  const groupedByStage = items.reduce((acc, item) => {
    const stageKey = item.stage?.name || 'Sem estágio';
    if (!acc[stageKey]) {
      acc[stageKey] = { items: [], color: item.stage?.color || '#666' };
    }
    acc[stageKey].items.push(item);
    return acc;
  }, {} as Record<string, { items: ChecklistItem[]; color: string }>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />
                  Checklist
                  {overdueTasks > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {overdueTasks} atrasada(s)
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {completedTasks}/{totalTasks}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              {totalTasks > 0 && (
                <Progress value={progressPercent} className="h-1.5 mt-2" />
              )}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhuma tarefa definida para este estágio.
                </p>
              ) : (
                items.slice(0, 5).map((item) => (
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleComplete.mutate({ itemId: item.id, completed: !item.is_completed })}
                    onDelete={item.is_custom ? () => deleteTask.mutate(item.id) : undefined}
                    isLoading={toggleComplete.isPending}
                  />
                ))
              )}
              {items.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{items.length - 5} tarefas...
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Checklist do Lead
          </CardTitle>
          <div className="flex items-center gap-3">
            {overdueTasks > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {overdueTasks} atrasada(s)
              </Badge>
            )}
            <span className="text-sm font-medium">
              {completedTasks}/{totalTasks} ({progressPercent}%)
            </span>
          </div>
        </div>
        {totalTasks > 0 && (
          <Progress value={progressPercent} className="h-2 mt-2" />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new task */}
        <div className="flex gap-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Adicionar tarefa personalizada..."
            className="text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <Button
            size="sm"
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim() || addTask.isPending}
          >
            {addTask.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Tasks grouped by stage */}
        {Object.keys(groupedByStage).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma tarefa definida. Adicione tarefas personalizadas ou configure templates de checklist no admin.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByStage).map(([stageName, { items: stageItems, color }]) => (
              <div key={stageName} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium text-muted-foreground">{stageName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({stageItems.filter(i => i.is_completed).length}/{stageItems.length})
                  </span>
                </div>
                <div className="space-y-1 pl-4 border-l-2" style={{ borderColor: color }}>
                  {stageItems.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleComplete.mutate({ itemId: item.id, completed: !item.is_completed })}
                      onDelete={item.is_custom ? () => deleteTask.mutate(item.id) : undefined}
                      isLoading={toggleComplete.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onToggle: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

function ChecklistItemRow({ item, onToggle, onDelete, isLoading }: ChecklistItemRowProps) {
  const isOverdue = !item.is_completed && item.due_at && isPast(new Date(item.due_at));

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group",
        item.is_completed && "opacity-60",
        isOverdue && !item.is_completed && "bg-destructive/10"
      )}
    >
      <button
        onClick={onToggle}
        disabled={isLoading}
        className="mt-0.5 flex-shrink-0"
      >
        {item.is_completed ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className={cn("h-4 w-4", isOverdue ? "text-destructive" : "text-muted-foreground")} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-tight",
          item.is_completed && "line-through text-muted-foreground"
        )}>
          {item.title}
        </p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
        )}
        {item.due_at && (
          <div className={cn(
            "flex items-center gap-1 text-xs mt-1",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {item.is_completed 
              ? `Concluída ${formatDistanceToNow(new Date(item.completed_at!), { addSuffix: true, locale: ptBR })}`
              : isOverdue
                ? `Atrasada há ${formatDistanceToNow(new Date(item.due_at), { locale: ptBR })}`
                : `Prazo: ${format(new Date(item.due_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`
            }
          </div>
        )}
      </div>
      {item.is_custom && onDelete && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
