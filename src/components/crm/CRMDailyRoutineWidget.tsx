import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow, isPast, startOfDay, endOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, CheckCircle2, AlertTriangle, Target, TrendingUp, 
  ListTodo, Calendar, ChevronDown, ChevronUp, Phone, MessageCircle,
  FileText, Users, Coffee, CheckSquare, Square
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { POSITION_DETAILS } from '@/constants/positionDetails';
import { toast } from 'sonner';

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

interface RoutineItem {
  id: string;
  time: string;
  activity: string;
  category: string;
  is_completed: boolean;
}

interface RoutineProgressRecord {
  id: string;
  user_id: string;
  routine_date: string;
  schedule_time: string;
  activity: string;
  category: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface CRMDailyRoutineWidgetProps {
  onLeadClick?: (leadId: string) => void;
  pipelineId?: string;
  pipelineType?: string;
}

// Map pipeline types to position keys for routine (prioritized over profile.position)
const PIPELINE_TO_POSITION_MAP: Record<string, string> = {
  'sdr': 'sdr',
  'social_selling': 'comercial_1_captacao',
  'inbound': 'comercial_1_captacao',
  'closer': 'comercial_2_closer',
  'vendas': 'comercial_2_closer',
  'cs': 'comercial_3_experiencia',
  'pos_venda': 'comercial_3_experiencia',
  'farmer': 'comercial_4_farmer',
  'recovery': 'comercial_4_farmer',
  'rfv_matrix': 'comercial_4_farmer',
  'coordinator': 'coordenador',
  'gerente': 'gerente',
};

// Map profile position types to POSITION_DETAILS keys (fallback)
const POSITION_MAP: Record<string, string> = {
  'sdr': 'sdr',
  'comercial_1': 'comercial_1_captacao',
  'comercial_1_captacao': 'comercial_1_captacao',
  'comercial_2': 'comercial_2_closer',
  'comercial_2_closer': 'comercial_2_closer',
  'closer': 'comercial_2_closer',
  'comercial_3': 'comercial_3_experiencia',
  'comercial_3_experiencia': 'comercial_3_experiencia',
  'experiencia': 'comercial_3_experiencia',
  'comercial_4': 'comercial_4_farmer',
  'comercial_4_farmer': 'comercial_4_farmer',
  'farmer': 'comercial_4_farmer',
  'coordenador': 'coordenador',
  'gerente': 'gerente',
};

const getCategoryIcon = (activity: string) => {
  const lower = activity.toLowerCase();
  if (lower.includes('ligaç') || lower.includes('ligar') || lower.includes('telefone')) 
    return Phone;
  if (lower.includes('whatsapp') || lower.includes('mensag')) 
    return MessageCircle;
  if (lower.includes('crm') || lower.includes('atualiza') || lower.includes('registr')) 
    return FileText;
  if (lower.includes('reunião') || lower.includes('equipe') || lower.includes('check')) 
    return Users;
  if (lower.includes('almoço') || lower.includes('pausa')) 
    return Coffee;
  return Calendar;
};

export function CRMDailyRoutineWidget({ onLeadClick, pipelineId, pipelineType }: CRMDailyRoutineWidgetProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isRoutineOpen, setIsRoutineOpen] = useState(true);
  const today = startOfDay(new Date());
  const endToday = endOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  // Determine position based on pipeline type first, then fallback to user profile
  const positionKey = useMemo(() => {
    if (pipelineType && PIPELINE_TO_POSITION_MAP[pipelineType]) {
      return PIPELINE_TO_POSITION_MAP[pipelineType];
    }
    const userPosition = profile?.position || 'sdr';
    return POSITION_MAP[userPosition] || 'sdr';
  }, [pipelineType, profile?.position]);

  const positionInfo = POSITION_DETAILS[positionKey];
  const dailySchedule = positionInfo?.dailySchedule || [];

  // Fetch routine progress for today - using raw query since table is new
  const { data: routineProgress = [] } = useQuery<RoutineProgressRecord[]>({
    queryKey: ['routine-progress', profile?.id, todayStr],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('daily_routine_progress')
        .select('*')
        .eq('user_id', profile.id)
        .eq('routine_date', todayStr);
      
      if (error) throw error;
      return (data || []) as RoutineProgressRecord[];
    },
    enabled: !!profile?.id,
  });

  // Initialize routine items from schedule
  const routineItems: RoutineItem[] = useMemo(() => {
    return dailySchedule.map((item, idx) => {
      const progress = routineProgress.find(
        p => p.schedule_time === item.time && p.activity === item.activity
      );
      return {
        id: progress?.id || `temp-${idx}`,
        time: item.time,
        activity: item.activity,
        category: 'geral',
        is_completed: progress?.is_completed || false,
      };
    });
  }, [dailySchedule, routineProgress]);

  // Toggle routine item completion
  const toggleRoutineMutation = useMutation({
    mutationFn: async ({ item, completed }: { item: RoutineItem; completed: boolean }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      
      const existing = routineProgress.find(
        p => p.schedule_time === item.time && p.activity === item.activity
      );
      
      if (existing) {
        const { error } = await (supabase as any)
          .from('daily_routine_progress')
          .update({ 
            is_completed: completed, 
            completed_at: completed ? new Date().toISOString() : null 
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('daily_routine_progress')
          .insert({
            user_id: profile.id,
            routine_date: todayStr,
            schedule_time: item.time,
            activity: item.activity,
            category: item.category,
            is_completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-progress'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar rotina');
    },
  });

  // Fetch today's lead tasks
  const { data: todayTasks = [], isLoading } = useQuery({
    queryKey: ['daily-routine-tasks', pipelineId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('lead_checklist_items')
        .select(`
          id, title, description, due_at, is_completed, is_overdue, order_index,
          lead:crm_leads!lead_checklist_items_lead_id_fkey(
            id, name, estimated_value, interested_procedures, assigned_to, pipeline_id
          )
        `)
        .gte('due_at', today.toISOString())
        .lte('due_at', addDays(endToday, 1).toISOString())
        .order('due_at', { ascending: true });

      if (error) throw error;

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
          due_date: item.due_at,
          is_completed: item.is_completed,
          is_overdue: item.is_overdue || (item.due_at && isPast(new Date(item.due_at)) && !item.is_completed),
          priority: 'medium',
          task_type: 'checklist',
          estimated_value: item.lead?.estimated_value,
          procedure: item.lead?.interested_procedures?.[0],
        })) as DailyTask[];
    },
    refetchInterval: 60000,
  });

  // Fetch next actions from leads
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

  // Combine tasks
  const allLeadTasks = useMemo(() => {
    const combined = [...todayTasks, ...nextActions];
    const seen = new Set<string>();
    return combined.filter(task => {
      const key = `${task.lead_id}-${task.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [todayTasks, nextActions]);

  // Stats
  const routineCompleted = routineItems.filter(r => r.is_completed).length;
  const routineTotal = routineItems.length;
  const routinePercent = routineTotal > 0 ? (routineCompleted / routineTotal) * 100 : 0;

  const leadTasksCompleted = allLeadTasks.filter(t => t.is_completed).length;
  const leadTasksOverdue = allLeadTasks.filter(t => t.is_overdue && !t.is_completed).length;
  const leadTasksPending = allLeadTasks.filter(t => !t.is_completed).length;
  const totalValue = allLeadTasks.reduce((acc, t) => acc + (t.estimated_value || 0), 0);

  const totalTasks = routineTotal + allLeadTasks.length;
  const totalCompleted = routineCompleted + leadTasksCompleted;
  const overallPercent = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Get current time slot
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const currentTimeNum = currentHour * 100 + currentMinute;

  const getTimeStatus = (timeSlot: string) => {
    const [start, end] = timeSlot.split(' - ');
    const startNum = parseInt(start.replace(':', ''));
    const endNum = parseInt(end?.replace(':', '') || '2359');
    
    if (currentTimeNum < startNum) return 'future';
    if (currentTimeNum >= startNum && currentTimeNum <= endNum) return 'current';
    return 'past';
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
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Rotina do Dia</h3>
            <Badge variant="outline" className="text-xs">
              {format(new Date(), "EEEE, dd/MM", { locale: ptBR })}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {positionInfo?.label || 'Comercial'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {leadTasksOverdue > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">{leadTasksOverdue} atrasadas</span>
              </div>
            )}
            {totalValue > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-medium">{formatCurrency(totalValue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="flex items-center gap-3">
          <Progress value={overallPercent} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">
            {totalCompleted}/{totalTasks} tarefas
          </span>
        </div>
      </div>

      {/* Fixed Daily Routine */}
      <Collapsible open={isRoutineOpen} onOpenChange={setIsRoutineOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto rounded-none border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Rotina Fixa do Cargo</span>
              <Badge variant="outline" className="text-xs">
                {routineCompleted}/{routineTotal}
              </Badge>
            </div>
            {isRoutineOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
            {routineItems.map((item) => {
              const status = getTimeStatus(item.time);
              const Icon = getCategoryIcon(item.activity);
              
              return (
                <div
                  key={item.id}
                  onClick={() => toggleRoutineMutation.mutate({ item, completed: !item.is_completed })}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all hover:bg-muted/50",
                    status === 'current' && !item.is_completed && "bg-primary/10 border border-primary/30",
                    status === 'past' && !item.is_completed && "opacity-60",
                    item.is_completed && "opacity-50"
                  )}
                >
                  {item.is_completed ? (
                    <CheckSquare className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs font-mono text-muted-foreground w-24 flex-shrink-0">
                    {item.time}
                  </span>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className={cn(
                    "text-sm flex-1",
                    item.is_completed && "line-through text-muted-foreground"
                  )}>
                    {item.activity}
                  </span>
                  {status === 'current' && !item.is_completed && (
                    <Badge className="text-xs">Agora</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Lead Tasks */}
      <div className="border-t">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Tarefas de Leads</span>
            <Badge variant={leadTasksPending > 0 ? "default" : "secondary"} className="text-xs">
              {leadTasksPending} pendentes
            </Badge>
          </div>
        </div>

        {allLeadTasks.length > 0 ? (
          <ScrollArea className="w-full">
            <div className="flex gap-2 px-3 pb-3">
              {allLeadTasks
                .filter(t => !t.is_completed)
                .sort((a, b) => {
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
                      "flex-shrink-0 w-48 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                      task.is_overdue && "border-destructive/50 bg-destructive/5",
                      task.priority === 'high' && !task.is_overdue && "border-yellow-500/50 bg-yellow-500/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-medium truncate flex-1">{task.lead_name}</p>
                      {task.is_overdue && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm line-clamp-2 mb-2">{task.title}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {isToday(new Date(task.due_date)) 
                            ? format(new Date(task.due_date), 'HH:mm')
                            : format(new Date(task.due_date), 'dd/MM')}
                        </span>
                      </div>
                      {task.estimated_value && task.estimated_value > 0 && (
                        <span className="font-medium text-green-600 text-xs">
                          {formatCurrency(task.estimated_value)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

              {leadTasksCompleted > 0 && (
                <div className="flex-shrink-0 w-32 p-3 rounded-lg border bg-green-500/5 border-green-500/30 flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mb-1" />
                  <p className="text-lg font-bold text-green-600">{leadTasksCompleted}</p>
                  <p className="text-xs text-muted-foreground text-center">concluídas</p>
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="px-3 pb-3 text-center text-muted-foreground">
            <p className="text-xs">Nenhuma tarefa de lead pendente</p>
          </div>
        )}
      </div>
    </div>
  );
}
