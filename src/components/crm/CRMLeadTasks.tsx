import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, Calendar, Clock, CheckCircle2, Circle, 
  Phone, Mail, MessageSquare, Users, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CRMLeadTasksProps {
  leadId: string;
}

interface Task {
  id: string;
  title: string;
  task_type: string;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  priority: string | null;
  assigned_to: string;
}

const TASK_TYPES = [
  { value: 'call', label: 'Ligação', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'meeting', label: 'Reunião', icon: Users },
  { value: 'followup', label: 'Follow-up', icon: Clock },
];

export function CRMLeadTasks({ leadId }: CRMLeadTasksProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    task_type: 'followup',
    due_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['crm-tasks', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*')
        .eq('lead_id', leadId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (task: typeof newTask) => {
      const { error } = await supabase.from('crm_tasks').insert({
        lead_id: leadId,
        title: task.title,
        task_type: task.task_type,
        due_date: task.due_date,
        assigned_to: user!.id,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks', leadId] });
      setNewTask({ title: '', task_type: 'followup', due_date: format(new Date(), 'yyyy-MM-dd') });
      setShowNewTask(false);
      toast.success('Tarefa criada!');
    },
    onError: () => toast.error('Erro ao criar tarefa'),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('crm_tasks')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user!.id : null,
        })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks', leadId] });
    },
  });

  const pendingTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);

  const getTaskIcon = (type: string) => {
    const taskType = TASK_TYPES.find(t => t.value === type);
    return taskType?.icon || Clock;
  };

  const getStatusColor = (task: Task) => {
    if (task.is_completed) return 'text-muted-foreground line-through';
    if (isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))) return 'text-red-500';
    if (isToday(new Date(task.due_date))) return 'text-orange-500';
    return '';
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
          <h4 className="font-medium">Tarefas</h4>
          {pendingTasks.length > 0 && (
            <Badge variant="secondary">{pendingTasks.length} pendentes</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewTask(!showNewTask)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova
        </Button>
      </div>

      {/* New Task Form */}
      {showNewTask && (
        <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
          <Input
            placeholder="Título da tarefa..."
            value={newTask.title}
            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
          />
          <div className="flex gap-2">
            <Select
              value={newTask.task_type}
              onValueChange={(v) => setNewTask(prev => ({ ...prev, task_type: v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-3 w-3" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={() => createTask.mutate(newTask)}
              disabled={!newTask.title.trim() || createTask.isPending}
            >
              {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </Button>
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 ? (
        <div className="space-y-2">
          {pendingTasks.map(task => {
            const Icon = getTaskIcon(task.task_type);
            const isOverdue = isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
            const isDueToday = isToday(new Date(task.due_date));

            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-lg border transition-colors",
                  isOverdue && "border-red-500/50 bg-red-500/5",
                  isDueToday && "border-orange-500/50 bg-orange-500/5"
                )}
              >
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={(checked) => 
                    toggleTask.mutate({ taskId: task.id, completed: !!checked })
                  }
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className={cn("text-sm", getStatusColor(task))}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className={cn(isOverdue && "text-red-500", isDueToday && "text-orange-500")}>
                      {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Atrasada
                      </Badge>
                    )}
                    {isDueToday && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-orange-500">
                        Hoje
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !showNewTask && (
        <div className="py-6 text-center text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma tarefa pendente</p>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            {completedTasks.length} tarefa(s) concluída(s)
          </p>
          <div className="space-y-1">
            {completedTasks.slice(0, 3).map(task => (
              <div
                key={task.id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="line-through truncate">{task.title}</span>
              </div>
            ))}
            {completedTasks.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{completedTasks.length - 3} outras
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
