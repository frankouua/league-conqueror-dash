import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfDay, addDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, AlertTriangle, TrendingUp, ChevronRight, CheckCircle2, Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { POSITION_DETAILS } from '@/constants/positionDetails';

interface CRMRoutineCompactBarProps {
  pipelineId?: string;
  pipelineType?: string;
  onViewDetails: () => void;
}

// Map pipeline types to position keys for routine
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

// Map profile positions to POSITION_DETAILS keys
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

export function CRMRoutineCompactBar({ pipelineId, pipelineType, onViewDetails }: CRMRoutineCompactBarProps) {
  const { profile } = useAuth();
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

  // Fetch routine progress
  const { data: routineProgress = [] } = useQuery({
    queryKey: ['routine-progress-compact', profile?.id, todayStr],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('daily_routine_progress')
        .select('*')
        .eq('user_id', profile.id)
        .eq('routine_date', todayStr);
      
      if (error) return [];
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch today's lead tasks count
  const { data: leadTasksData } = useQuery({
    queryKey: ['routine-lead-tasks-compact', pipelineId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { pending: 0, overdue: 0, totalValue: 0 };

      // Fetch checklist tasks
      const { data: tasks } = await supabase
        .from('lead_checklist_items')
        .select(`
          id, is_completed, is_overdue, due_at,
          lead:crm_leads!lead_checklist_items_lead_id_fkey(
            id, estimated_value, assigned_to, pipeline_id
          )
        `)
        .gte('due_at', today.toISOString())
        .lte('due_at', addDays(endToday, 1).toISOString());

      // Fetch next actions
      let nextActionsQuery = supabase
        .from('crm_leads')
        .select('id, next_action_date, estimated_value')
        .eq('assigned_to', user.id)
        .not('next_action', 'is', null)
        .gte('next_action_date', today.toISOString())
        .lte('next_action_date', addDays(endToday, 1).toISOString());

      if (pipelineId) {
        nextActionsQuery = nextActionsQuery.eq('pipeline_id', pipelineId);
      }

      const { data: nextActions } = await nextActionsQuery;

      const filteredTasks = (tasks || []).filter((item: any) => {
        const lead = item.lead;
        if (!lead) return false;
        if (pipelineId && lead.pipeline_id !== pipelineId) return false;
        return lead.assigned_to === user.id;
      });

      const pendingTasks = filteredTasks.filter((t: any) => !t.is_completed);
      const overdueTasks = filteredTasks.filter((t: any) => t.is_overdue && !t.is_completed);
      
      const overdueActions = (nextActions || []).filter((l: any) => 
        isPast(new Date(l.next_action_date))
      );

      const totalValue = [
        ...filteredTasks.map((t: any) => t.lead?.estimated_value || 0),
        ...(nextActions || []).map((l: any) => l.estimated_value || 0)
      ].reduce((acc, val) => acc + val, 0);

      return {
        pending: pendingTasks.length + (nextActions?.length || 0),
        overdue: overdueTasks.length + overdueActions.length,
        totalValue
      };
    },
    refetchInterval: 60000,
  });

  // Calculate stats
  const routineCompleted = useMemo(() => {
    return dailySchedule.filter((item: any) => 
      routineProgress.some((p: any) => 
        p.schedule_time === item.time && 
        p.activity === item.activity && 
        p.is_completed
      )
    ).length;
  }, [dailySchedule, routineProgress]);

  const routineTotal = dailySchedule.length;
  const routinePercent = routineTotal > 0 ? Math.round((routineCompleted / routineTotal) * 100) : 0;
  
  const pending = leadTasksData?.pending || 0;
  const overdue = leadTasksData?.overdue || 0;
  const totalValue = leadTasksData?.totalValue || 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <div className="bg-card border rounded-lg px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
      {/* Left: Progress summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium hidden sm:inline">Rotina:</span>
          <div className="flex items-center gap-2">
            <Progress value={routinePercent} className="h-2 w-16 sm:w-24" />
            <span className="text-xs text-muted-foreground">
              {routineCompleted}/{routineTotal}
            </span>
          </div>
        </div>

        {/* Position/Pipeline info */}
        <Badge variant="outline" className="text-xs hidden md:flex">
          {positionInfo?.label || 'Comercial'}
        </Badge>

        {/* Pending tasks */}
        {pending > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{pending} pendentes</span>
          </div>
        )}

        {/* Overdue indicator */}
        {overdue > 0 && (
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            {overdue} atrasadas
          </Badge>
        )}

        {/* Total value */}
        {totalValue > 0 && (
          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{formatCurrency(totalValue)}</span>
          </div>
        )}
      </div>

      {/* Right: View details button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="gap-1.5 h-7 text-xs"
        onClick={onViewDetails}
      >
        <span className="hidden sm:inline">Ver Rotina Completa</span>
        <span className="sm:hidden">Detalhes</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
