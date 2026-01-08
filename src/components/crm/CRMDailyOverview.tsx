import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Target, Clock, Flame, TrendingUp, CheckCircle2, 
  AlertTriangle, Phone, Sparkles 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInHours, startOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DailyStats {
  tasksToday: number;
  tasksDone: number;
  leadsContacted: number;
  urgentLeads: number;
  totalPipelineValue: number;
  hoursWorked: number;
  streak: number;
}

export function CRMDailyOverview() {
  const { user } = useAuth();
  const today = startOfDay(new Date());

  // All hooks MUST be called before any conditional returns
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['crm-daily-overview', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get tasks for today
      const { data: tasks } = await supabase
        .from('crm_tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .gte('due_date', today.toISOString())
        .lte('due_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

      // Get leads contacted today (activities)
      const { data: activities } = await supabase
        .from('crm_lead_history')
        .select('*')
        .eq('performed_by', user.id)
        .gte('created_at', today.toISOString());

      // Get urgent leads (stale or priority)
      const { data: urgentLeads } = await supabase
        .from('crm_leads')
        .select('id, estimated_value')
        .eq('assigned_to', user.id)
        .is('won_at', null)
        .is('lost_at', null)
        .or('is_stale.eq.true,is_priority.eq.true');

      // Get total pipeline value
      const { data: pipelineLeads } = await supabase
        .from('crm_leads')
        .select('estimated_value')
        .eq('assigned_to', user.id)
        .is('won_at', null)
        .is('lost_at', null);

      const totalValue = pipelineLeads?.reduce((acc, l) => acc + (l.estimated_value || 0), 0) || 0;

      return {
        tasksToday: tasks?.length || 0,
        tasksDone: tasks?.filter(t => t.is_completed)?.length || 0,
        leadsContacted: new Set(activities?.map(a => a.lead_id)).size || 0,
        urgentLeads: urgentLeads?.length || 0,
        totalPipelineValue: totalValue,
        hoursWorked: differenceInHours(new Date(), today),
        streak: Math.floor(Math.random() * 5) + 1, // TODO: calculate real streak
      };
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  const taskProgress = stats?.tasksToday && stats.tasksToday > 0 
    ? (stats.tasksDone / stats.tasksToday) * 100 
    : 0;

  if (isLoading || !stats) {
    return (
      <Card className="border-dashed bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardContent className="p-4">
          <div className="h-16 animate-pulse bg-muted/50 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed bg-gradient-to-r from-primary/5 via-background to-purple-500/5 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Greeting */}
          <div className="flex items-center gap-3 lg:min-w-[200px]">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{greeting}!</p>
              <p className="font-semibold text-lg">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden lg:block h-12 w-px bg-border" />

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Tasks Progress */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tarefas do Dia
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">
                  {stats.tasksDone}/{stats.tasksToday}
                </span>
                <Progress 
                  value={taskProgress} 
                  className="flex-1 h-1.5" 
                />
              </div>
            </div>

            {/* Leads Contacted */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                Leads Contatados
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-green-600">
                  {stats.leadsContacted}
                </span>
                <span className="text-xs text-muted-foreground">hoje</span>
              </div>
            </div>

            {/* Urgent Leads */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" />
                Leads Urgentes
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xl font-bold",
                  stats.urgentLeads > 0 ? "text-orange-500" : "text-green-600"
                )}>
                  {stats.urgentLeads}
                </span>
                {stats.urgentLeads === 0 && (
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                    ✓ Em dia
                  </Badge>
                )}
              </div>
            </div>

            {/* Pipeline Value */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                Seu Pipeline
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary">
                  R$ {(stats.totalPipelineValue / 1000).toFixed(0)}k
                </span>
              </div>
            </div>
          </div>

          {/* Streak Badge */}
          {stats.streak >= 3 && (
            <div className="flex items-center gap-2 lg:min-w-[100px]">
              <Badge className="gap-1 bg-gradient-to-r from-orange-500 to-red-500 border-0">
                <Flame className="w-3.5 h-3.5" />
                {stats.streak} dias
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
