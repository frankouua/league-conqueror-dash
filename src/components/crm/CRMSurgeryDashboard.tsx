import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, addDays, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, User, Phone,
  MessageSquare, FileCheck, ChevronRight, Bell, Stethoscope,
  CalendarDays, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CRMLead } from '@/hooks/useCRM';

interface SurgeryLead extends CRMLead {
  daysUntilSurgery: number;
  urgencyLevel: 'critical' | 'urgent' | 'soon' | 'scheduled' | 'past';
}

export function CRMSurgeryDashboard() {
  const [view, setView] = useState<'today' | 'week' | 'upcoming'>('today');

  // Fetch leads with surgery dates
  const { data: surgeryLeads = [], isLoading } = useQuery({
    queryKey: ['crm-surgery-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .not('surgery_date', 'is', null)
        .order('surgery_date', { ascending: true });

      if (error) throw error;

      // Get assigned profiles
      const userIds = [...new Set((data || []).map(l => l.assigned_to).filter(Boolean))];
      let profileMap = new Map();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      return (data || []).map(lead => {
        const surgeryDate = new Date(lead.surgery_date);
        const today = new Date();
        const daysUntil = differenceInDays(surgeryDate, today);

        let urgencyLevel: SurgeryLead['urgencyLevel'] = 'scheduled';
        if (daysUntil < 0) urgencyLevel = 'past';
        else if (daysUntil === 0) urgencyLevel = 'critical';
        else if (daysUntil <= 3) urgencyLevel = 'urgent';
        else if (daysUntil <= 7) urgencyLevel = 'soon';

        return {
          ...lead,
          assigned_profile: lead.assigned_to ? profileMap.get(lead.assigned_to) : null,
          daysUntilSurgery: daysUntil,
          urgencyLevel,
        } as SurgeryLead;
      });
    },
  });

  // Filter leads based on view
  const filteredLeads = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    return surgeryLeads.filter(lead => {
      const surgeryDate = new Date(lead.surgery_date!);

      switch (view) {
        case 'today':
          return isToday(surgeryDate);
        case 'week':
          return surgeryDate >= weekStart && surgeryDate <= weekEnd;
        case 'upcoming':
          return differenceInDays(surgeryDate, today) >= 0;
        default:
          return true;
      }
    });
  }, [surgeryLeads, view]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    return {
      todayCount: surgeryLeads.filter(l => isToday(new Date(l.surgery_date!))).length,
      tomorrowCount: surgeryLeads.filter(l => isTomorrow(new Date(l.surgery_date!))).length,
      weekCount: surgeryLeads.filter(l => {
        const d = new Date(l.surgery_date!);
        return differenceInDays(d, today) >= 0 && differenceInDays(d, today) <= 7;
      }).length,
      criticalCount: surgeryLeads.filter(l => l.urgencyLevel === 'critical' || l.urgencyLevel === 'urgent').length,
      withoutExams: surgeryLeads.filter(l => !l.pre_surgery_checklist_completed && l.daysUntilSurgery >= 0 && l.daysUntilSurgery <= 7).length,
    };
  }, [surgeryLeads]);

  const getUrgencyColor = (urgency: SurgeryLead['urgencyLevel']) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'urgent': return 'bg-orange-500';
      case 'soon': return 'bg-yellow-500';
      case 'past': return 'bg-muted';
      default: return 'bg-blue-500';
    }
  };

  const getUrgencyLabel = (urgency: SurgeryLead['urgencyLevel'], days: number) => {
    switch (urgency) {
      case 'critical': return '🚨 HOJE';
      case 'urgent': return `⚠️ Em ${days} dias`;
      case 'soon': return `Em ${days} dias`;
      case 'past': return `Há ${Math.abs(days)} dias`;
      default: return `Em ${days} dias`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={cn(stats.todayCount > 0 && "border-red-500 bg-red-500/10")}>
          <CardContent className="p-4 text-center">
            <Stethoscope className={cn("w-6 h-6 mx-auto mb-2", stats.todayCount > 0 ? "text-red-500" : "text-muted-foreground")} />
            <p className={cn("text-3xl font-bold", stats.todayCount > 0 && "text-red-500")}>{stats.todayCount}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-3xl font-bold">{stats.tomorrowCount}</p>
            <p className="text-xs text-muted-foreground">Amanhã</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CalendarDays className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-3xl font-bold">{stats.weekCount}</p>
            <p className="text-xs text-muted-foreground">Esta Semana</p>
          </CardContent>
        </Card>

        <Card className={cn(stats.criticalCount > 0 && "border-orange-500 bg-orange-500/10")}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={cn("w-6 h-6 mx-auto mb-2", stats.criticalCount > 0 ? "text-orange-500" : "text-muted-foreground")} />
            <p className={cn("text-3xl font-bold", stats.criticalCount > 0 && "text-orange-500")}>{stats.criticalCount}</p>
            <p className="text-xs text-muted-foreground">Urgentes</p>
          </CardContent>
        </Card>

        <Card className={cn(stats.withoutExams > 0 && "border-yellow-500 bg-yellow-500/10")}>
          <CardContent className="p-4 text-center">
            <FileCheck className={cn("w-6 h-6 mx-auto mb-2", stats.withoutExams > 0 ? "text-yellow-500" : "text-muted-foreground")} />
            <p className={cn("text-3xl font-bold", stats.withoutExams > 0 && "text-yellow-500")}>{stats.withoutExams}</p>
            <p className="text-xs text-muted-foreground">Sem Checklist</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Banner */}
      {(stats.todayCount > 0 || stats.withoutExams > 0) && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-red-500 animate-pulse" />
              <div className="flex-1">
                {stats.todayCount > 0 && (
                  <p className="text-sm font-medium text-red-500">
                    🚨 {stats.todayCount} cirurgia(s) agendada(s) para HOJE!
                  </p>
                )}
                {stats.withoutExams > 0 && (
                  <p className="text-sm text-yellow-600">
                    ⚠️ {stats.withoutExams} paciente(s) sem checklist pré-operatório completo
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Cirurgias Agendadas
              </CardTitle>
              <CardDescription>
                Acompanhamento de todos os procedimentos cirúrgicos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList className="mb-4">
              <TabsTrigger value="today" className="gap-1">
                Hoje
                {stats.todayCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                    {stats.todayCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="week">Esta Semana</TabsTrigger>
              <TabsTrigger value="upcoming">Próximas</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma cirurgia agendada para este período</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeads.map(lead => (
                    <Card 
                      key={lead.id} 
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-all",
                        lead.urgencyLevel === 'critical' && "border-red-500 bg-red-500/5",
                        lead.urgencyLevel === 'urgent' && "border-orange-500 bg-orange-500/5"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Urgency Indicator */}
                          <div className={cn(
                            "w-2 h-12 rounded-full",
                            getUrgencyColor(lead.urgencyLevel)
                          )} />

                          {/* Patient Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">{lead.name}</h4>
                              <Badge variant={lead.urgencyLevel === 'critical' ? 'destructive' : 'outline'}>
                                {getUrgencyLabel(lead.urgencyLevel, lead.daysUntilSurgery)}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(new Date(lead.surgery_date!), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              {lead.surgery_location && (
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="w-3.5 h-3.5" />
                                  {lead.surgery_location}
                                </span>
                              )}
                              {lead.assigned_profile && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {lead.assigned_profile.full_name}
                                </span>
                              )}
                            </div>

                            {/* Checklist Status */}
                            <div className="flex items-center gap-2 mt-2">
                              {lead.pre_surgery_checklist_completed ? (
                                <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Pré-op OK
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-600 gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Pré-op Pendente
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2">
                            {lead.whatsapp && (
                              <Button size="icon" variant="ghost" className="text-green-600">
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            )}
                            {lead.phone && (
                              <Button size="icon" variant="ghost">
                                <Phone className="w-4 h-4" />
                              </Button>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
