import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isTomorrow, isPast, startOfDay, endOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, CheckCircle2, AlertTriangle, Phone, Calendar, 
  ChevronRight, Target, TrendingUp, ListTodo, Star
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface DailyTask {
  id: string;
  lead_id: string;
  lead_name: string;
  title: string;
  due_date: string;
  is_completed: boolean;
  is_overdue: boolean;
  priority: string;
  task_type: string;
  estimated_value?: number;
  procedure?: string;
}

interface CRMDailyRoutineWidgetProps {
  onLeadClick?: (leadId: string) => void;
  pipelineId?: string;
}

export function CRMDailyRoutineWidget({ onLeadClick, pipelineId }: CRMDailyRoutineWidgetProps) {
  const today = startOfDay(new Date());
  const endToday = endOfDay(new Date());

  // Fetch today's tasks from checklist items
  const { data: todayTasks = [], isLoading } = useQuery({
    queryKey: ['daily-routine-tasks', pipelineId],
    queryFn: async () => {
      // Get user's assigned leads' checklist items for today
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('lead_checklist_items')
        .select(`
          id,
          title,
          due_date,
          is_completed,
          is_overdue,
          priority,
          task_type,
          lead:crm_leads!lead_checklist_items_lead_id_fkey(
            id,
            name,
            estimated_value,
            interested_procedures,
            assigned_to,
            pipeline_id
          )
        `)
        .gte('due_date', today.toISOString())
        .lte('due_date', addDays(endToday, 1).toISOString())
        .order('due_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      // Filter by user's assigned leads and pipeline
      return (data || [])
        .filter((item: any) => {
          const lead = item.lead;
          if (!lead) return false;
          if (pipelineId && lead.pipeline_id !== pipelineId) return false;
          return lead.assigned_to === user.id;
        })
        .map((item: any) => ({
          id: item.id,
          lead_id: item.lead?.id,
          lead_name: item.lead?.name || 'Lead',
          title: item.title,
          due_date: item.due_date,
          is_completed: item.is_completed,
          is_overdue: item.is_overdue,
          priority: item.priority || 'medium',
          task_type: item.task_type || 'follow_up',
          estimated_value: item.lead?.estimated_value,
          procedure: item.lead?.interested_procedures?.[0],
        })) as DailyTask[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Also fetch next actions from leads
  const { data: nextActions = [] } = useQuery({
    queryKey: ['daily-next-actions', pipelineId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('crm_leads')
        .select('id, name, next_action, next_action_date, estimated_value, interested_procedures')
        .eq('assigned_to', user.id)
        .not('next_action', 'is', null)
        .gte('next_action_date', today.toISOString())
        .lte('next_action_date', addDays(endToday, 1).toISOString())
        .order('next_action_date', { ascending: true });

      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((lead: any) => ({
        id: `action-${lead.id}`,
        lead_id: lead.id,
        lead_name: lead.name,
        title: lead.next_action,
        due_date: lead.next_action_date,
        is_completed: false,
        is_overdue: isPast(new Date(lead.next_action_date)),
        priority: 'high',
        task_type: 'next_action',
        estimated_value: lead.estimated_value,
        procedure: lead.interested_procedures?.[0],
      })) as DailyTask[];
    },
    refetchInterval: 60000,
  });

  // Combine and deduplicate tasks
  const allTasks = useMemo(() => {
    const combined = [...todayTasks, ...nextActions];
    const seen = new Set<string>();
    return combined.filter(task => {
      const key = `${task.lead_id}-${task.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [todayTasks, nextActions]);

  const completedCount = allTasks.filter(t => t.is_completed).length;
  const overdueCount = allTasks.filter(t => t.is_overdue && !t.is_completed).length;
  const pendingCount = allTasks.filter(t => !t.is_completed && !t.is_overdue).length;
  const totalValue = allTasks.reduce((acc, t) => acc + (t.estimated_value || 0), 0);
  const progressPercent = allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0 
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-8 bg-muted rounded w-full" />
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header Stats */}
      <div className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Sua Rotina Hoje</h3>
            <Badge variant="outline" className="text-xs">
              {format(new Date(), "EEEE, dd/MM", { locale: ptBR })}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">{overdueCount} atrasadas</span>
              </div>
            )}
            {totalValue > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-medium">{formatCurrency(totalValue)} em negociação</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount}/{allTasks.length} tarefas
          </span>
        </div>
      </div>

      {/* Task Cards Horizontal Scroll */}
      {allTasks.length > 0 ? (
        <ScrollArea className="w-full">
          <div className="flex gap-2 p-3">
            {allTasks
              .filter(t => !t.is_completed)
              .sort((a, b) => {
                // Priority: overdue first, then by due date
                if (a.is_overdue && !b.is_overdue) return -1;
                if (!a.is_overdue && b.is_overdue) return 1;
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
              })
              .slice(0, 10)
              .map(task => (
                <div
                  key={task.id}
                  onClick={() => onLeadClick?.(task.lead_id)}
                  className={cn(
                    "flex-shrink-0 w-56 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                    task.is_overdue && "border-destructive/50 bg-destructive/5",
                    task.priority === 'high' && !task.is_overdue && "border-yellow-500/50 bg-yellow-500/5"
                  )}
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{task.lead_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.procedure || 'Procedimento não definido'}
                      </p>
                    </div>
                    {task.is_overdue && (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>

                  {/* Task Title */}
                  <p className="text-sm font-medium line-clamp-2 mb-2">{task.title}</p>

                  {/* Task Footer */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {isToday(new Date(task.due_date)) 
                          ? format(new Date(task.due_date), 'HH:mm')
                          : isTomorrow(new Date(task.due_date))
                            ? 'Amanhã'
                            : format(new Date(task.due_date), 'dd/MM')}
                      </span>
                    </div>
                    {task.estimated_value && (
                      <span className="font-medium text-green-600">
                        {formatCurrency(task.estimated_value)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

            {/* Completed summary card */}
            {completedCount > 0 && (
              <div className="flex-shrink-0 w-40 p-3 rounded-lg border bg-green-500/5 border-green-500/30 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-6 w-6 text-green-500 mb-1" />
                <p className="text-lg font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-muted-foreground">concluídas hoje</p>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="p-6 text-center text-muted-foreground">
          <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma tarefa pendente para hoje!</p>
          <p className="text-xs mt-1">As tarefas aparecem conforme você avança os leads no pipeline</p>
        </div>
      )}
    </div>
  );
}
