import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  User, 
  Phone,
  Video,
  MapPin,
  Bell,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Target,
  Users,
  Megaphone,
  Briefcase,
  Filter,
  UserPlus,
  Mail,
  Check,
  XCircle,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, addWeeks, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Tipos de eventos unificados
type EventType = 'crm_task' | 'crm_followup' | 'campaign' | 'meeting' | 'goal_deadline' | 'call' | 'video' | 'custom' | 'reminder' | 'training';

interface UnifiedEvent {
  id: string;
  title: string;
  type: EventType;
  date: Date;
  endDate?: Date;
  time?: string;
  duration?: number;
  description?: string;
  completed: boolean;
  leadName?: string;
  leadId?: string;
  campaignId?: string;
  priority?: 'low' | 'medium' | 'high';
  source: 'crm' | 'campaign' | 'manual' | 'goal' | 'calendar';
  location?: string;
  isTeamEvent?: boolean;
  invitations?: Array<{
    userId: string;
    userName: string;
    status: 'pending' | 'accepted' | 'declined';
  }>;
  createdBy?: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  team_id: string;
}

const EVENT_CONFIG: Record<EventType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  crm_task: { label: 'Tarefa CRM', icon: CheckCircle, color: 'text-blue-500', bgColor: 'bg-blue-500' },
  crm_followup: { label: 'Follow-up', icon: Bell, color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
  campaign: { label: 'Campanha', icon: Megaphone, color: 'text-pink-500', bgColor: 'bg-pink-500' },
  meeting: { label: 'Reunião', icon: Users, color: 'text-green-500', bgColor: 'bg-green-500' },
  goal_deadline: { label: 'Prazo Meta', icon: Target, color: 'text-red-500', bgColor: 'bg-red-500' },
  call: { label: 'Ligação', icon: Phone, color: 'text-cyan-500', bgColor: 'bg-cyan-500' },
  video: { label: 'Videochamada', icon: Video, color: 'text-purple-500', bgColor: 'bg-purple-500' },
  custom: { label: 'Evento', icon: CalendarIcon, color: 'text-gray-500', bgColor: 'bg-gray-500' },
  reminder: { label: 'Lembrete', icon: Bell, color: 'text-orange-500', bgColor: 'bg-orange-500' },
  training: { label: 'Treinamento', icon: Briefcase, color: 'text-indigo-500', bgColor: 'bg-indigo-500' }
};

const FILTER_OPTIONS = [
  { id: 'crm_task', label: 'Tarefas CRM' },
  { id: 'crm_followup', label: 'Follow-ups' },
  { id: 'campaign', label: 'Campanhas' },
  { id: 'meeting', label: 'Reuniões' },
  { id: 'goal_deadline', label: 'Prazos de Metas' },
  { id: 'call', label: 'Ligações' },
  { id: 'video', label: 'Videochamadas' },
  { id: 'reminder', label: 'Lembretes' },
  { id: 'training', label: 'Treinamentos' },
  { id: 'custom', label: 'Outros' }
];

export function SellerUnifiedCalendar() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<EventType[]>(Object.keys(EVENT_CONFIG) as EventType[]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [inviteEntireTeam, setInviteEntireTeam] = useState(false);
  const [newEvent, setNewEvent] = useState<{
    type: EventType;
    priority: 'low' | 'medium' | 'high';
    title?: string;
    description?: string;
    time?: string;
    endTime?: string;
    location?: string;
  }>({
    type: 'meeting',
    priority: 'medium'
  });

  // Buscar membros do time para convites
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-calendar', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, team_id')
        .eq('team_id', profile.team_id)
        .neq('id', user?.id);
      
      if (error) throw error;
      return (data || []) as TeamMember[];
    },
    enabled: !!profile?.team_id
  });

  // Buscar eventos do calendário
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendar-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          calendar_event_invitations (
            user_id,
            status
          )
        `)
        .or(`created_by.eq.${user.id},is_team_event.eq.true`);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Buscar convites recebidos
  const { data: myInvitations = [] } = useQuery({
    queryKey: ['my-calendar-invitations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('calendar_event_invitations')
        .select(`
          *,
          calendar_events (*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Buscar tarefas do CRM
  const { data: crmTasks = [] } = useQuery({
    queryKey: ['crm-tasks-calendar', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, crm_leads(name)')
        .eq('assigned_to', user.id)
        .gte('due_date', format(addDays(new Date(), -30), 'yyyy-MM-dd'))
        .lte('due_date', format(addDays(new Date(), 60), 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Buscar campanhas ativas
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', format(new Date(), 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    }
  });

  // Mutation para criar evento
  const createEventMutation = useMutation({
    mutationFn: async (eventData: {
      title: string;
      description?: string;
      event_type: string;
      start_date: string;
      end_date?: string;
      location?: string;
      is_team_event: boolean;
      invitees: string[];
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Criar evento
      const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          event_type: eventData.event_type,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          location: eventData.location,
          is_team_event: eventData.is_team_event,
          created_by: user.id,
          team_id: profile?.team_id
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Criar convites
      if (eventData.invitees.length > 0) {
        const invitations = eventData.invitees.map(userId => ({
          event_id: event.id,
          user_id: userId,
          status: 'pending'
        }));

        const { error: invError } = await supabase
          .from('calendar_event_invitations')
          .insert(invitations);

        if (invError) throw invError;
      }

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Evento criado e convites enviados!');
      setShowNewEvent(false);
      resetNewEventForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar evento');
      console.error(error);
    }
  });

  // Mutation para responder convite
  const respondInvitationMutation = useMutation({
    mutationFn: async ({ invitationId, status }: { invitationId: string; status: 'accepted' | 'declined' }) => {
      const { error } = await supabase
        .from('calendar_event_invitations')
        .update({ 
          status, 
          responded_at: new Date().toISOString() 
        })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['my-calendar-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success(status === 'accepted' ? 'Convite aceito!' : 'Convite recusado');
    }
  });

  const resetNewEventForm = () => {
    setNewEvent({ type: 'meeting', priority: 'medium' });
    setSelectedInvitees([]);
    setInviteEntireTeam(false);
  };

  // Combinar todos os eventos
  const allEvents = useMemo<UnifiedEvent[]>(() => {
    const events: UnifiedEvent[] = [];

    // Adicionar eventos do calendário
    calendarEvents.forEach(event => {
      events.push({
        id: `cal-${event.id}`,
        title: event.title,
        type: event.event_type as EventType,
        date: new Date(event.start_date),
        endDate: event.end_date ? new Date(event.end_date) : undefined,
        description: event.description || undefined,
        completed: false,
        location: event.location || undefined,
        isTeamEvent: event.is_team_event,
        createdBy: event.created_by,
        source: 'calendar',
        invitations: (event.calendar_event_invitations || []).map((inv: any) => ({
          userId: inv.user_id,
          userName: teamMembers.find(m => m.id === inv.user_id)?.full_name || 'Usuário',
          status: inv.status
        }))
      });
    });

    // Adicionar eventos de convites (aceitos e pendentes - todos aparecem na agenda)
    myInvitations
      .filter(inv => inv.calendar_events)
      .forEach(inv => {
        const event = inv.calendar_events as any;
        // Evitar duplicatas
        if (!events.some(e => e.id === `cal-${event.id}` || e.id === `inv-${event.id}`)) {
          events.push({
            id: `inv-${event.id}`,
            title: inv.status === 'pending' ? `⏳ ${event.title}` : event.title,
            type: event.event_type as EventType,
            date: new Date(event.start_date),
            endDate: event.end_date ? new Date(event.end_date) : undefined,
            description: event.description || undefined,
            completed: false,
            location: event.location || undefined,
            source: 'calendar',
            priority: inv.status === 'pending' ? 'high' : 'medium'
          });
        }
      });

    // Adicionar tarefas do CRM
    crmTasks.forEach(task => {
      events.push({
        id: `crm-${task.id}`,
        title: task.title,
        type: task.task_type === 'follow_up' ? 'crm_followup' : task.task_type === 'call' ? 'call' : task.task_type === 'meeting' ? 'meeting' : 'crm_task',
        date: new Date(task.due_date),
        time: task.due_date.includes('T') ? format(new Date(task.due_date), 'HH:mm') : undefined,
        description: task.description || undefined,
        completed: task.is_completed || false,
        leadName: (task.crm_leads as any)?.name,
        leadId: task.lead_id,
        priority: task.priority as 'low' | 'medium' | 'high' || 'medium',
        source: 'crm'
      });
    });

    // Adicionar campanhas
    campaigns.forEach(campaign => {
      events.push({
        id: `campaign-${campaign.id}`,
        title: campaign.name,
        type: 'campaign',
        date: new Date(campaign.start_date),
        description: campaign.description || undefined,
        completed: false,
        campaignId: campaign.id,
        priority: 'high',
        source: 'campaign'
      });

      if (campaign.end_date !== campaign.start_date) {
        events.push({
          id: `campaign-end-${campaign.id}`,
          title: `Fim: ${campaign.name}`,
          type: 'campaign',
          date: new Date(campaign.end_date),
          description: `Término da campanha ${campaign.name}`,
          completed: false,
          campaignId: campaign.id,
          priority: 'medium',
          source: 'campaign'
        });
      }
    });

    return events.filter(e => activeFilters.includes(e.type));
  }, [calendarEvents, myInvitations, crmTasks, campaigns, activeFilters, teamMembers]);

  // Calcular datas da semana
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Calcular datas do mês
  const monthDates = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Eventos do dia selecionado
  const dayEvents = useMemo(() => {
    return allEvents
      .filter(e => isSameDay(e.date, selectedDate))
      .sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return 0;
      });
  }, [allEvents, selectedDate]);

  // Convites pendentes
  const pendingInvitations = myInvitations.filter(inv => inv.status === 'pending');

  const getEventsForDate = (date: Date) => {
    return allEvents.filter(e => isSameDay(e.date, date));
  };

  const handleToggleFilter = (type: EventType) => {
    setActiveFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleInviteeToggle = (userId: string) => {
    setSelectedInvitees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleInviteEntireTeam = (checked: boolean) => {
    setInviteEntireTeam(checked);
    if (checked) {
      setSelectedInvitees(teamMembers.map(m => m.id));
    } else {
      setSelectedInvitees([]);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title) {
      toast.error('Preencha o título do evento');
      return;
    }

    const startDateTime = newEvent.time 
      ? `${format(selectedDate, 'yyyy-MM-dd')}T${newEvent.time}:00`
      : format(selectedDate, 'yyyy-MM-dd');

    const endDateTime = newEvent.endTime 
      ? `${format(selectedDate, 'yyyy-MM-dd')}T${newEvent.endTime}:00`
      : undefined;

    createEventMutation.mutate({
      title: newEvent.title,
      description: newEvent.description,
      event_type: newEvent.type,
      start_date: startDateTime,
      end_date: endDateTime,
      location: newEvent.location,
      is_team_event: inviteEntireTeam,
      invitees: selectedInvitees
    });
  };

  const handleToggleComplete = async (event: UnifiedEvent) => {
    if (event.source === 'crm' && event.id.startsWith('crm-')) {
      const taskId = event.id.replace('crm-', '');
      const { error } = await supabase
        .from('crm_tasks')
        .update({ 
          is_completed: !event.completed,
          completed_at: !event.completed ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['crm-tasks-calendar'] });
        toast.success(event.completed ? 'Evento reaberto' : 'Evento concluído!');
      }
    }
  };

  const renderEventCard = (event: UnifiedEvent, compact = false) => {
    const config = EVENT_CONFIG[event.type];
    const Icon = config.icon;

    if (compact) {
      return (
        <div
          key={event.id}
          className={cn(
            "text-[10px] p-1 rounded truncate text-white",
            config.bgColor
          )}
          title={event.title}
        >
          {event.time && `${event.time} `}{event.title}
        </div>
      );
    }

    return (
      <div
        key={event.id}
        className={cn(
          "p-3 rounded-lg border flex items-start gap-3 transition-all",
          event.completed && "opacity-50 bg-muted/30"
        )}
      >
        <div className={cn("w-1 h-full rounded-full self-stretch min-h-[40px]", config.bgColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn("w-4 h-4", config.color)} />
            <span className={cn("font-medium text-sm", event.completed && "line-through")}>
              {event.title}
            </span>
            {event.priority === 'high' && (
              <Badge variant="destructive" className="text-[10px] h-4">Urgente</Badge>
            )}
            {event.isTeamEvent && (
              <Badge variant="secondary" className="text-[10px] h-4">
                <Users className="w-3 h-3 mr-1" />
                Time
              </Badge>
            )}
          </div>
          {event.leadName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              {event.leadName}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {event.location}
            </div>
          )}
          {event.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {event.time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {event.time}
                {event.duration && ` (${event.duration}min)`}
              </span>
            )}
            <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
          </div>
          {event.invitations && event.invitations.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <UserPlus className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {event.invitations.filter(i => i.status === 'accepted').length} confirmados
              </span>
            </div>
          )}
        </div>
        {event.source === 'crm' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => handleToggleComplete(event)}
          >
            <CheckCircle className={cn(
              "w-4 h-4",
              event.completed ? "text-green-500" : "text-muted-foreground"
            )} />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Pending Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {pendingInvitations.length} convite(s) pendente(s)
                </span>
              </div>
              <div className="flex gap-2">
                {pendingInvitations.slice(0, 2).map(inv => (
                  <div key={inv.id} className="flex items-center gap-2 bg-background rounded-lg px-3 py-1.5">
                    <span className="text-sm">
                      {(inv.calendar_events as any)?.title}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-green-500 hover:text-green-600"
                      onClick={() => respondInvitationMutation.mutate({ invitationId: inv.id, status: 'accepted' })}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-500 hover:text-red-600"
                      onClick={() => respondInvitationMutation.mutate({ invitationId: inv.id, status: 'declined' })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header com controles */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Meu Calendário
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                CRM, campanhas, reuniões e convites em um só lugar
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'day' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                >
                  Dia
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Mês
                </Button>
              </div>
              
              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-primary/10")}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filtros
              </Button>
              
              {/* Add Event */}
              <Button size="sm" onClick={() => setShowNewEvent(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Novo Evento
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Filters */}
        {showFilters && (
          <CardContent className="pt-0 pb-4">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map(filter => {
                const isActive = activeFilters.includes(filter.id as EventType);
                const config = EVENT_CONFIG[filter.id as EventType];
                return (
                  <button
                    key={filter.id}
                    onClick={() => handleToggleFilter(filter.id as EventType)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      isActive 
                        ? `${config.bgColor} text-white`
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Calendar Content */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Mini Calendar Sidebar */}
            <div className="w-[280px] flex-shrink-0 hidden lg:block">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md border pointer-events-auto"
                modifiers={{
                  hasEvents: allEvents.map(e => e.date)
                }}
                modifiersClassNames={{
                  hasEvents: 'bg-primary/10 font-bold'
                }}
              />
              
              {/* Quick Stats */}
              <div className="mt-4 space-y-2">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hoje</span>
                    <span className="font-medium">
                      {allEvents.filter(e => isToday(e.date)).length} eventos
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Esta semana</span>
                    <span className="font-medium">
                      {allEvents.filter(e => weekDates.some(d => isSameDay(d, e.date))).length} eventos
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pendentes</span>
                    <span className="font-medium text-amber-500">
                      {allEvents.filter(e => !e.completed && e.date <= new Date()).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              {/* Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    if (viewMode === 'week') setSelectedDate(addWeeks(selectedDate, -1));
                    else if (viewMode === 'month') setSelectedDate(addDays(startOfMonth(selectedDate), -1));
                    else setSelectedDate(addDays(selectedDate, -1));
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium">
                  {viewMode === 'day' && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  {viewMode === 'week' && `${format(weekDates[0], 'd MMM', { locale: ptBR })} - ${format(weekDates[6], 'd MMM yyyy', { locale: ptBR })}`}
                  {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    if (viewMode === 'week') setSelectedDate(addWeeks(selectedDate, 1));
                    else if (viewMode === 'month') setSelectedDate(addDays(endOfMonth(selectedDate), 1));
                    else setSelectedDate(addDays(selectedDate, 1));
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Day View */}
              {viewMode === 'day' && (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {dayEvents.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Nenhum evento para este dia</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => setShowNewEvent(true)}
                        >
                          Agendar agora
                        </Button>
                      </div>
                    ) : (
                      dayEvents.map(event => renderEventCard(event))
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Week View */}
              {viewMode === 'week' && (
                <div className="grid grid-cols-7 gap-2">
                  {weekDates.map((date) => {
                    const events = getEventsForDate(date);
                    const isSelected = isSameDay(date, selectedDate);
                    
                    return (
                      <div 
                        key={date.toISOString()}
                        className={cn(
                          "p-2 rounded-lg border min-h-[140px] cursor-pointer transition-colors",
                          isToday(date) && "border-primary",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => {
                          setSelectedDate(date);
                          setViewMode('day');
                        }}
                      >
                        <div className={cn(
                          "text-xs font-medium mb-2",
                          isToday(date) && "text-primary"
                        )}>
                          {format(date, 'EEE d', { locale: ptBR })}
                        </div>
                        <div className="space-y-1">
                          {events.slice(0, 4).map(event => renderEventCard(event, true))}
                          {events.length > 4 && (
                            <div className="text-[10px] text-muted-foreground text-center">
                              +{events.length - 4} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Month View */}
              {viewMode === 'month' && (
                <div className="grid grid-cols-7 gap-1">
                  {/* Header */}
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: (getDay(monthDates[0]) + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-20" />
                  ))}
                  
                  {/* Days */}
                  {monthDates.map((date) => {
                    const events = getEventsForDate(date);
                    const isSelected = isSameDay(date, selectedDate);
                    
                    return (
                      <div 
                        key={date.toISOString()}
                        className={cn(
                          "h-20 p-1 rounded border cursor-pointer transition-colors overflow-hidden",
                          isToday(date) && "border-primary",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => {
                          setSelectedDate(date);
                          setViewMode('day');
                        }}
                      >
                        <div className={cn(
                          "text-xs font-medium",
                          isToday(date) && "text-primary"
                        )}>
                          {format(date, 'd')}
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {events.slice(0, 2).map(event => {
                            const config = EVENT_CONFIG[event.type];
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  "text-[9px] px-1 rounded truncate text-white",
                                  config.bgColor
                                )}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                          {events.length > 2 && (
                            <div className="text-[9px] text-muted-foreground">
                              +{events.length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Event Dialog with Invitations */}
      <Dialog open={showNewEvent} onOpenChange={(open) => {
        setShowNewEvent(open);
        if (!open) resetNewEventForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Novo Evento
            </DialogTitle>
            <DialogDescription>
              Crie um evento e convide membros do seu time
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Select
                value={newEvent.type}
                onValueChange={(v) => setNewEvent(prev => ({ ...prev, type: v as EventType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">👥 Reunião</SelectItem>
                  <SelectItem value="call">📞 Ligação</SelectItem>
                  <SelectItem value="video">📹 Videochamada</SelectItem>
                  <SelectItem value="training">📚 Treinamento</SelectItem>
                  <SelectItem value="reminder">🔔 Lembrete</SelectItem>
                  <SelectItem value="custom">📅 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Reunião semanal do time"
                value={newEvent.title || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={newEvent.time || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Término</Label>
                <Input
                  type="time"
                  value={newEvent.endTime || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Local (opcional)</Label>
              <Input
                placeholder="Ex: Sala de reuniões, Link do Meet..."
                value={newEvent.location || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes do evento..."
                value={newEvent.description || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Team Invitations */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Convidar Participantes
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="invite-all"
                    checked={inviteEntireTeam}
                    onCheckedChange={(checked) => handleInviteEntireTeam(!!checked)}
                  />
                  <label htmlFor="invite-all" className="text-sm cursor-pointer">
                    Convidar time inteiro
                  </label>
                </div>
              </div>

              {teamMembers.length > 0 ? (
                <ScrollArea className="h-[150px] rounded-md border p-2">
                  <div className="space-y-2">
                    {teamMembers.map(member => (
                      <div 
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          selectedInvitees.includes(member.id) 
                            ? "bg-primary/10 border border-primary/30" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleInviteeToggle(member.id)}
                      >
                        <Checkbox
                          checked={selectedInvitees.includes(member.id)}
                          onCheckedChange={() => handleInviteeToggle(member.id)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.full_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{member.full_name}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum membro do time disponível para convidar
                </div>
              )}

              {selectedInvitees.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Send className="w-4 h-4" />
                  <span>{selectedInvitees.length} pessoa(s) receberão o convite</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEvent(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateEvent}
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? (
                'Criando...'
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Criar Evento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SellerUnifiedCalendar;
