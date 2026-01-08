import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Flame, TrendingUp, CheckCircle2, 
  AlertTriangle, Phone, Sparkles, DollarSign 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInHours, startOfDay, format, endOfMonth, eachDayOfInterval, isWeekend, startOfMonth } from 'date-fns';
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

// Helper to get business days remaining in month
function getBusinessDaysRemaining(year: number, month: number): number {
  const today = new Date();
  const lastDay = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start: today, end: lastDay });
  return days.filter(d => !isWeekend(d)).length;
}

export function CRMDailyOverview() {
  const { user } = useAuth();
  const today = startOfDay(new Date());
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // All hooks MUST be called before any conditional returns
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Motivational messages that rotate daily
  const motivationalMessage = useMemo(() => {
    const messages = [
      "Hoje é dia de bater meta! 💪",
      "Cada lead é uma oportunidade de ouro! ✨",
      "Foco no cliente, resultado garantido! 🎯",
      "Você está a uma ligação do sucesso! 📞",
      "Quem persiste, conquista! 🏆",
      "Transforme objeções em vendas! 🚀",
      "Seu próximo fechamento está chegando! 💰",
      "Energia positiva atrai clientes! ⚡",
      "Hoje você vai surpreender! 🌟",
      "Venda com paixão, feche com razão! ❤️",
      "Cada não te aproxima do sim! 👊",
      "Seja a diferença que o cliente precisa! 🔥",
    ];
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return messages[dayOfYear % messages.length];
  }, []);

  // Fetch individual goal for this user
  const { data: goalData } = useQuery({
    queryKey: ['crm-daily-goal', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user) return null;
      
      const { data } = await supabase
        .from('individual_goals')
        .select('revenue_goal, meta2_goal, meta3_goal')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();
      
      return data;
    },
    enabled: !!user,
  });

  // Fetch today's revenue for this user
  const { data: todayRevenue } = useQuery({
    queryKey: ['crm-today-revenue', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const todayStr = format(today, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('revenue_records')
        .select('amount')
        .eq('user_id', user.id)
        .eq('date', todayStr);

      return data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    },
    enabled: !!user,
  });

  // Fetch month revenue for this user
  const { data: monthRevenue } = useQuery({
    queryKey: ['crm-month-revenue', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user) return 0;

      const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(today), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('revenue_records')
        .select('amount')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      return data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    },
    enabled: !!user,
  });

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

  // Calculate daily goal
  const monthlyGoal = goalData?.meta3_goal || goalData?.meta2_goal || goalData?.revenue_goal || 0;
  const remaining = Math.max(0, monthlyGoal - (monthRevenue || 0));
  const businessDaysLeft = getBusinessDaysRemaining(currentYear, currentMonth);
  const dailyGoal = businessDaysLeft > 0 ? remaining / businessDaysLeft : 0;
  const dailyProgress = dailyGoal > 0 ? Math.min(100, ((todayRevenue || 0) / dailyGoal) * 100) : 0;

  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-4 py-2 px-3 bg-muted/30 rounded-lg animate-pulse">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6 py-2 px-3 bg-gradient-to-r from-primary/5 via-background to-purple-500/5 rounded-lg border border-dashed">
      {/* Greeting + Motivational */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm">
          <span className="font-medium">{greeting}</span>
          <span className="text-muted-foreground"> · {format(new Date(), "d MMM", { locale: ptBR })} · </span>
          <span className="text-primary">{motivationalMessage}</span>
        </span>
      </div>

      <div className="hidden sm:block h-4 w-px bg-border" />

      {/* Daily Sales Goal */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "font-bold",
            dailyProgress >= 100 ? "text-green-600" : dailyProgress >= 50 ? "text-primary" : "text-orange-500"
          )}>
            R$ {((todayRevenue || 0) / 1000).toFixed(1)}k
          </span>
          <span className="text-xs text-muted-foreground">
            / {(dailyGoal / 1000).toFixed(1)}k
          </span>
          <Progress value={dailyProgress} className="w-12 h-1.5" />
        </div>
      </div>

      {/* Tasks */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">{stats.tasksDone}/{stats.tasksToday}</span>
        <span className="text-xs text-muted-foreground">tarefas</span>
      </div>

      {/* Leads Contacted */}
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-green-600">{stats.leadsContacted}</span>
        <span className="text-xs text-muted-foreground">contatos</span>
      </div>

      {/* Urgent Leads */}
      {stats.urgentLeads > 0 && (
        <Badge variant="outline" className="gap-1 border-orange-500/50 text-orange-500">
          <AlertTriangle className="w-3 h-3" />
          {stats.urgentLeads} urgentes
        </Badge>
      )}

      {/* Pipeline Value */}
      <div className="hidden lg:flex items-center gap-2 ml-auto">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-primary">
          R$ {(stats.totalPipelineValue / 1000).toFixed(0)}k
        </span>
        <span className="text-xs text-muted-foreground">pipeline</span>
      </div>

      {/* Streak Badge */}
      {stats.streak >= 3 && (
        <Badge className="gap-1 bg-gradient-to-r from-orange-500 to-red-500 border-0">
          <Flame className="w-3 h-3" />
          {stats.streak}d
        </Badge>
      )}
    </div>
  );
}
