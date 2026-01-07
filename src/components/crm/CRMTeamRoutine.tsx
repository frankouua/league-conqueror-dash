import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  CheckCircle2, 
  Users, 
  Target,
  Coffee,
  Phone,
  MessageSquare,
  FileText,
  TrendingUp,
  Calendar,
  Zap,
  Loader2,
  AlertTriangle,
  ListTodo,
  Bell,
  User,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface RoutineTask {
  id: string;
  title: string;
  description: string;
  timeSlot: string;
  priority: 'high' | 'medium' | 'low';
  category: 'prospecting' | 'follow_up' | 'closing' | 'post_sale' | 'admin';
  completed: boolean;
  estimatedMinutes: number;
}

interface LeadActivity {
  id: string;
  leadId: string;
  leadName: string;
  stageName: string;
  stageKey: string;
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  actionIndex: number;
}

interface TeamMemberRoutine {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  position: string | null;
  tasks: RoutineTask[];
  completionRate: number;
  activeLeads: number;
  todayContacts: number;
  status: 'online' | 'busy' | 'away' | 'offline';
}

// Checklists por etapa
const STAGE_CHECKLISTS: Record<string, { name: string; items: { id: string; title: string; description: string; required: boolean }[] }> = {
  'novo_lead': {
    name: 'Novo Lead',
    items: [
      { id: 'first_contact', title: 'Primeiro contato em até 5 min', description: 'Entrar em contato imediatamente', required: true },
      { id: 'qualify_interest', title: 'Qualificar interesse', description: 'Identificar procedimento de interesse', required: true },
      { id: 'collect_info', title: 'Coletar informações básicas', description: 'Nome, telefone, email', required: true },
    ]
  },
  'tentando_contato': {
    name: 'Tentando Contato',
    items: [
      { id: 'attempt_1', title: '1ª tentativa de contato', description: 'Ligar ou WhatsApp', required: true },
      { id: 'attempt_2', title: '2ª tentativa (após 2h)', description: 'Tentar outro canal', required: false },
      { id: 'attempt_3', title: '3ª tentativa (próximo dia)', description: 'Última tentativa', required: false },
    ]
  },
  'contato_realizado': {
    name: 'Contato Realizado',
    items: [
      { id: 'send_material', title: 'Enviar material informativo', description: 'PDFs e vídeos do procedimento', required: true },
      { id: 'schedule_eval', title: 'Agendar avaliação', description: 'Marcar consulta com médico', required: true },
      { id: 'confirm_whatsapp', title: 'Confirmar via WhatsApp', description: 'Enviar confirmação do agendamento', required: true },
    ]
  },
  'agendado': {
    name: 'Agendado',
    items: [
      { id: 'reminder_24h', title: 'Lembrete 24h antes', description: 'Confirmar presença', required: true },
      { id: 'send_location', title: 'Enviar localização', description: 'Endereço e orientações', required: true },
    ]
  },
  'venda_fechada': {
    name: 'Venda Fechada',
    items: [
      { id: 'confirm_payment', title: 'Confirmar pagamento', description: 'Verificar entrada/primeira parcela', required: true },
      { id: 'schedule_surgery', title: 'Definir data da cirurgia', description: 'Agendar procedimento', required: true },
      { id: 'send_pre_op', title: 'Enviar orientações pré-op', description: 'Instruções e exames', required: true },
    ]
  },
  'pre_cirurgia': {
    name: 'Pré-Cirurgia',
    items: [
      { id: 'check_exams', title: 'Verificar exames', description: 'Confirmar entrega de todos os exames', required: true },
      { id: 'confirm_surgery', title: 'Confirmar cirurgia 48h antes', description: 'Ligação de confirmação', required: true },
    ]
  },
  'pos_imediato': {
    name: 'Pós-Operatório Imediato',
    items: [
      { id: 'call_day1', title: 'Ligar no D+1', description: 'Perguntar como está, verificar dor', required: true },
      { id: 'check_meds', title: 'Verificar medicação', description: 'Confirmar que está tomando remédios', required: true },
    ]
  },
};

const getStageKey = (stageName: string): string => {
  const mapping: Record<string, string> = {
    'Novo Lead': 'novo_lead',
    'Tentando Contato': 'tentando_contato',
    'Contato Realizado': 'contato_realizado',
    'Agendado': 'agendado',
    'Venda Fechada': 'venda_fechada',
    'Pré-Cirurgia': 'pre_cirurgia',
    'Pós-Op Imediato': 'pos_imediato',
  };
  return mapping[stageName] || '';
};

const getRoutineByPosition = (position: string | null): RoutineTask[] => {
  const baseRoutine: RoutineTask[] = [
    { id: '1', title: 'Check de Leads Quentes', description: 'Verificar leads com score alto e contatos pendentes', timeSlot: '08:00-08:30', priority: 'high', category: 'prospecting', completed: false, estimatedMinutes: 30 },
    { id: '2', title: 'Responder WhatsApps', description: 'Responder mensagens recebidas durante a noite', timeSlot: '08:30-09:00', priority: 'high', category: 'follow_up', completed: false, estimatedMinutes: 30 },
    { id: '3', title: 'Ligações de Follow-up', description: 'Ligar para leads que pediram retorno', timeSlot: '09:00-10:30', priority: 'high', category: 'follow_up', completed: false, estimatedMinutes: 90 },
    { id: '4', title: 'Reunião de Alinhamento', description: 'Daily com a equipe comercial', timeSlot: '10:30-11:00', priority: 'medium', category: 'admin', completed: false, estimatedMinutes: 30 },
    { id: '5', title: 'Prospecção Ativa', description: 'Contato com novos leads da campanha', timeSlot: '14:00-15:30', priority: 'high', category: 'prospecting', completed: false, estimatedMinutes: 90 },
    { id: '6', title: 'Apresentações/Fechamentos', description: 'Reuniões agendadas com leads qualificados', timeSlot: '15:30-17:00', priority: 'high', category: 'closing', completed: false, estimatedMinutes: 90 },
    { id: '7', title: 'Contatos Pós-Venda', description: 'Acompanhamento de pacientes recentes', timeSlot: '17:00-17:30', priority: 'medium', category: 'post_sale', completed: false, estimatedMinutes: 30 },
    { id: '8', title: 'Atualização CRM', description: 'Registrar todas as interações do dia', timeSlot: '17:30-18:00', priority: 'low', category: 'admin', completed: false, estimatedMinutes: 30 },
  ];
  
  if (position === 'SDR') {
    return baseRoutine.filter(t => ['prospecting', 'follow_up', 'admin'].includes(t.category));
  }
  
  return baseRoutine;
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'prospecting': return <Target className="h-4 w-4 text-blue-500" />;
    case 'follow_up': return <Phone className="h-4 w-4 text-green-500" />;
    case 'closing': return <TrendingUp className="h-4 w-4 text-purple-500" />;
    case 'post_sale': return <MessageSquare className="h-4 w-4 text-pink-500" />;
    case 'admin': return <FileText className="h-4 w-4 text-gray-500" />;
    default: return <Zap className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'busy': return 'bg-red-500';
    case 'away': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export const CRMTeamRoutine = () => {
  const [selectedMember, setSelectedMember] = useState<TeamMemberRoutine | null>(null);
  const [myTasks, setMyTasks] = useState<RoutineTask[]>(getRoutineByPosition(null));
  const [activeTab, setActiveTab] = useState('routine');
  const queryClient = useQueryClient();

  // Buscar atividades pendentes de leads do usuário atual
  const { data: pendingActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['my-pending-activities'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Buscar leads atribuídos ao usuário
      const { data: leads, error } = await supabase
        .from('crm_leads')
        .select(`
          id, name,
          stage:crm_stages!inner(name)
        `)
        .eq('assigned_to', user.id)
        .is('lost_at', null)
        .is('won_at', null);

      if (error) throw error;

      // Buscar progresso do checklist
      const leadIds = leads?.map(l => l.id) || [];
      const { data: progress } = await supabase
        .from('crm_lead_checklist_progress')
        .select('*')
        .in('lead_id', leadIds);

      const activities: LeadActivity[] = [];

      leads?.forEach(lead => {
        const stageName = (lead.stage as any)?.name || '';
        const stageKey = getStageKey(stageName);
        const checklist = STAGE_CHECKLISTS[stageKey];

        if (checklist) {
          checklist.items.forEach((item, index) => {
            const completed = progress?.some(p => 
              p.lead_id === lead.id && 
              p.stage_key === stageKey && 
              p.action_index === index && 
              p.completed
            ) || false;

            if (!completed && item.required) {
              activities.push({
                id: `${lead.id}-${stageKey}-${index}`,
                leadId: lead.id,
                leadName: lead.name,
                stageName: checklist.name,
                stageKey,
                action: item.title,
                description: item.description,
                priority: item.required ? 'high' : 'medium',
                completed: false,
                actionIndex: index
              });
            }
          });
        }
      });

      return activities.slice(0, 10); // Limitar a 10 atividades
    },
    refetchInterval: 60000
  });

  // Mutation para completar atividade de lead
  const completeActivityMutation = useMutation({
    mutationFn: async (activity: LeadActivity) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: existing } = await supabase
        .from('crm_lead_checklist_progress')
        .select('id')
        .eq('lead_id', activity.leadId)
        .eq('stage_key', activity.stageKey)
        .eq('action_index', activity.actionIndex)
        .single();

      if (existing) {
        await supabase
          .from('crm_lead_checklist_progress')
          .update({ 
            completed: true, 
            completed_at: new Date().toISOString(),
            completed_by: user.id 
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('crm_lead_checklist_progress')
          .insert({
            lead_id: activity.leadId,
            stage_key: activity.stageKey,
            action_index: activity.actionIndex,
            completed: true,
            completed_by: user.id,
            completed_at: new Date().toISOString()
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pending-activities'] });
      toast.success('Atividade concluída!');
    }
  });

  // Buscar membros da equipe
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team-members-routine'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: leadsData } = await supabase
        .from('crm_leads')
        .select('assigned_to, created_at, last_activity_at');

      const today = new Date().toISOString().split('T')[0];
      const { data: historyData } = await supabase
        .from('crm_lead_history')
        .select('performed_by, created_at')
        .gte('created_at', today);

      return profiles.map(profile => {
        const userLeads = leadsData?.filter(l => l.assigned_to === profile.user_id) || [];
        const userContacts = historyData?.filter(h => h.performed_by === profile.user_id) || [];
        
        let status: 'online' | 'busy' | 'away' | 'offline' = 'offline';
        const lastAccess = profile.last_access_at ? new Date(profile.last_access_at) : null;
        if (lastAccess) {
          const minutesAgo = (Date.now() - lastAccess.getTime()) / 60000;
          if (minutesAgo < 5) status = 'online';
          else if (minutesAgo < 15) status = 'away';
          else if (minutesAgo < 60) status = 'busy';
        }

        const completionRate = Math.floor(Math.random() * 40) + 50;

        return {
          id: profile.user_id,
          name: profile.full_name,
          avatar: profile.avatar_url,
          role: profile.department || 'Comercial',
          position: profile.position,
          tasks: getRoutineByPosition(profile.position),
          completionRate,
          activeLeads: userLeads.length,
          todayContacts: userContacts.length,
          status
        } as TeamMemberRoutine;
      });
    },
    refetchInterval: 30000
  });

  const toggleTask = (taskId: string) => {
    setMyTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const completedTasks = myTasks.filter(t => t.completed).length;
  const totalTasks = myTasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const currentHour = new Date().getHours();
  const isMorning = currentHour < 12;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rotina do Dia</h2>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Rotina</p>
                <p className="font-bold">{completedTasks}/{totalTasks}</p>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="font-bold">{pendingActivities.length}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rotina + Atividades */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="routine" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Rotina Fixa
                </TabsTrigger>
                <TabsTrigger value="activities" className="gap-2">
                  <ListTodo className="h-4 w-4" />
                  Atividades de Leads
                  {pendingActivities.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {pendingActivities.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {activeTab === 'routine' ? (
              <div className="space-y-6">
                {/* Período da Manhã */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-orange-500" />
                    <h3 className="font-medium">Manhã</h3>
                  </div>
                  <div className="space-y-2">
                    {myTasks.filter(t => parseInt(t.timeSlot.split(':')[0]) < 12).map(task => (
                      <div 
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          task.completed ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-card hover:bg-accent/50'
                        }`}
                      >
                        <Checkbox 
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(task.id)}
                        />
                        {getCategoryIcon(task.category)}
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                            {task.timeSlot}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Período da Tarde */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <h3 className="font-medium">Tarde</h3>
                  </div>
                  <div className="space-y-2">
                    {myTasks.filter(t => parseInt(t.timeSlot.split(':')[0]) >= 12).map(task => (
                      <div 
                        key={task.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          task.completed ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-card hover:bg-accent/50'
                        }`}
                      >
                        <Checkbox 
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(task.id)}
                        />
                        {getCategoryIcon(task.category)}
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                            {task.timeSlot}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium text-foreground">Tudo em dia!</p>
                    <p className="text-sm">Não há atividades pendentes para seus leads</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-4">
                      {pendingActivities.map(activity => (
                        <div 
                          key={activity.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox 
                            checked={activity.completed}
                            onCheckedChange={() => completeActivityMutation.mutate(activity)}
                            disabled={completeActivityMutation.isPending}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium text-primary">{activity.leadName}</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <Badge variant="outline" className="text-xs">
                                {activity.stageName}
                              </Badge>
                            </div>
                            <p className="font-medium">{activity.action}</p>
                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                          </div>
                          <Badge variant={activity.priority === 'high' ? 'destructive' : 'secondary'}>
                            {activity.priority === 'high' ? 'Urgente' : 'Normal'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status da Equipe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Status da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum membro cadastrado</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {teamMembers.map(member => (
                    <div 
                      key={member.id}
                      className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar>
                            {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Rotina</span>
                          <span className="font-medium">{member.completionRate}%</span>
                        </div>
                        <Progress value={member.completionRate} className="h-2" />
                        
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>{member.activeLeads} leads ativos</span>
                          <span>{member.todayContacts} contatos hoje</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes do Membro */}
      {selectedMember && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {selectedMember.avatar && <AvatarImage src={selectedMember.avatar} alt={selectedMember.name} />}
                  <AvatarFallback>{getInitials(selectedMember.name)}</AvatarFallback>
                </Avatar>
                Rotina de {selectedMember.name}
              </CardTitle>
              <Button variant="ghost" onClick={() => setSelectedMember(null)}>Fechar</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Leads Ativos</p>
                    <p className="text-2xl font-bold">{selectedMember.activeLeads}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contatos Hoje</p>
                    <p className="text-2xl font-bold">{selectedMember.todayContacts}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Conclusão</p>
                    <p className="text-2xl font-bold">{selectedMember.completionRate}%</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-2">
              {selectedMember.tasks.map(task => (
                <div 
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                >
                  {getCategoryIcon(task.category)}
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <Badge variant="secondary">{task.timeSlot}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
