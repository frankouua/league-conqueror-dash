import { useState, useMemo } from 'react';
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
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, addWeeks, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';

interface CalendarEvent {
  id: string;
  title: string;
  leadId?: string;
  leadName?: string;
  type: 'call' | 'meeting' | 'video' | 'task' | 'followup';
  date: Date;
  time: string;
  duration: number; // minutes
  location?: string;
  notes?: string;
  completed: boolean;
  reminder?: number; // minutes before
}

interface CRMCalendarIntegrationProps {
  leads?: CRMLead[];
  onScheduleCall?: (lead: CRMLead, date: Date) => void;
}

// Sample events
const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Ligação de follow-up',
    leadName: 'Maria Silva',
    type: 'call',
    date: new Date(),
    time: '10:00',
    duration: 30,
    completed: false,
    reminder: 15,
  },
  {
    id: '2',
    title: 'Reunião de apresentação',
    leadName: 'João Santos',
    type: 'meeting',
    date: new Date(),
    time: '14:30',
    duration: 60,
    location: 'Sala de reuniões',
    completed: false,
    reminder: 30,
  },
  {
    id: '3',
    title: 'Consulta inicial',
    leadName: 'Ana Costa',
    type: 'video',
    date: addDays(new Date(), 1),
    time: '09:00',
    duration: 45,
    completed: false,
  },
];

export function CRMCalendarIntegration({ leads = [], onScheduleCall }: CRMCalendarIntegrationProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'call',
    duration: 30,
    reminder: 15,
  });

  // Get week dates
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Events for selected date
  const todayEvents = useMemo(() => {
    return events.filter(e => isSameDay(e.date, selectedDate));
  }, [events, selectedDate]);

  // Get event type icon
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'meeting': return MapPin;
      case 'video': return Video;
      case 'task': return CheckCircle;
      case 'followup': return Bell;
      default: return CalendarIcon;
    }
  };

  // Get event type color
  const getEventColor = (type: string) => {
    switch (type) {
      case 'call': return 'bg-blue-500';
      case 'meeting': return 'bg-green-500';
      case 'video': return 'bg-purple-500';
      case 'task': return 'bg-orange-500';
      case 'followup': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.time) {
      toast.error('Preencha título e horário');
      return;
    }

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title || '',
      leadId: newEvent.leadId,
      leadName: newEvent.leadName,
      type: newEvent.type as CalendarEvent['type'] || 'call',
      date: selectedDate,
      time: newEvent.time || '09:00',
      duration: newEvent.duration || 30,
      location: newEvent.location,
      notes: newEvent.notes,
      completed: false,
      reminder: newEvent.reminder,
    };

    setEvents(prev => [...prev, event]);
    setShowNewEvent(false);
    setNewEvent({ type: 'call', duration: 30, reminder: 15 });
    toast.success('Evento criado com sucesso!');
  };

  const handleToggleComplete = (eventId: string) => {
    setEvents(prev => prev.map(e => 
      e.id === eventId ? { ...e, completed: !e.completed } : e
    ));
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    toast.success('Evento removido');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Calendário de Atividades
            </CardTitle>
            <CardDescription>
              Agende ligações, reuniões e follow-ups
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
            </div>
            <Button size="sm" className="gap-2" onClick={() => setShowNewEvent(true)}>
              <Plus className="w-4 h-4" />
              Agendar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Calendar Sidebar */}
          <div className="w-[280px] flex-shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md border"
              modifiers={{
                hasEvents: events.map(e => e.date),
              }}
              modifiersClassNames={{
                hasEvents: 'bg-primary/10 font-bold',
              }}
            />
            
            {/* Quick Stats */}
            <div className="mt-4 space-y-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hoje</span>
                  <span className="font-medium">{events.filter(e => isToday(e.date)).length} eventos</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Esta semana</span>
                  <span className="font-medium">
                    {events.filter(e => weekDates.some(d => isSameDay(d, e.date))).length} eventos
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="flex-1">
            {viewMode === 'week' && (
              <div className="flex items-center justify-between mb-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium">
                  {format(weekDates[0], 'd MMM', { locale: ptBR })} - {format(weekDates[6], 'd MMM yyyy', { locale: ptBR })}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {viewMode === 'day' ? (
              <div>
                <h3 className="font-medium mb-4">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {todayEvents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum evento para este dia</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => setShowNewEvent(true)}
                        >
                          Agendar agora
                        </Button>
                      </div>
                    ) : (
                      todayEvents.map((event) => {
                        const Icon = getEventIcon(event.type);
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "p-3 rounded-lg border flex items-start gap-3 transition-all",
                              event.completed && "opacity-50 bg-muted/30"
                            )}
                          >
                            <div className={cn(
                              "w-1 h-full rounded-full self-stretch",
                              getEventColor(event.type)
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <span className={cn(
                                  "font-medium",
                                  event.completed && "line-through"
                                )}>
                                  {event.title}
                                </span>
                              </div>
                              {event.leadName && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  {event.leadName}
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {event.time} ({event.duration}min)
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleToggleComplete(event.id)}
                              >
                                <CheckCircle className={cn(
                                  "w-4 h-4",
                                  event.completed ? "text-green-500" : "text-muted-foreground"
                                )} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((date) => {
                  const dayEvents = events.filter(e => isSameDay(e.date, date));
                  const isSelected = isSameDay(date, selectedDate);
                  
                  return (
                    <div 
                      key={date.toISOString()}
                      className={cn(
                        "p-2 rounded-lg border min-h-[120px] cursor-pointer transition-colors",
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
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "text-[10px] p-1 rounded truncate",
                              getEventColor(event.type),
                              "text-white"
                            )}
                          >
                            {event.time} {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{dayEvents.length - 3} mais
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

        {/* New Event Dialog */}
        <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>
                Agende uma ligação, reunião ou tarefa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(v) => setNewEvent(prev => ({ ...prev, type: v as CalendarEvent['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Ligação</SelectItem>
                    <SelectItem value="meeting">📍 Reunião presencial</SelectItem>
                    <SelectItem value="video">📹 Videochamada</SelectItem>
                    <SelectItem value="task">✅ Tarefa</SelectItem>
                    <SelectItem value="followup">🔔 Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ex: Ligação de apresentação"
                  value={newEvent.title || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {leads.length > 0 && (
                <div className="space-y-2">
                  <Label>Lead</Label>
                  <Select
                    value={newEvent.leadId}
                    onValueChange={(v) => {
                      const lead = leads.find(l => l.id === v);
                      setNewEvent(prev => ({ 
                        ...prev, 
                        leadId: v,
                        leadName: lead?.name 
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um lead (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={newEvent.time || ''}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Select
                    value={newEvent.duration?.toString()}
                    onValueChange={(v) => setNewEvent(prev => ({ ...prev, duration: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Local (opcional)</Label>
                <Input
                  placeholder="Ex: Sala de reuniões"
                  value={newEvent.location || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Lembrete</Label>
                <Select
                  value={newEvent.reminder?.toString()}
                  onValueChange={(v) => setNewEvent(prev => ({ ...prev, reminder: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem lembrete</SelectItem>
                    <SelectItem value="5">5 min antes</SelectItem>
                    <SelectItem value="15">15 min antes</SelectItem>
                    <SelectItem value="30">30 min antes</SelectItem>
                    <SelectItem value="60">1 hora antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Notas sobre o evento..."
                  value={newEvent.notes || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewEvent(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateEvent}>
                Criar Agendamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
