import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  AlertCircle,
  Calendar,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface TeamMemberRoutine {
  id: string;
  name: string;
  avatar: string;
  role: string;
  tasks: RoutineTask[];
  completionRate: number;
  activeLeads: number;
  todayContacts: number;
  status: 'online' | 'busy' | 'away' | 'offline';
}

const morningRoutine: RoutineTask[] = [
  { id: '1', title: 'Check de Leads Quentes', description: 'Verificar leads com score alto e contatos pendentes', timeSlot: '08:00-08:30', priority: 'high', category: 'prospecting', completed: false, estimatedMinutes: 30 },
  { id: '2', title: 'Responder WhatsApps', description: 'Responder mensagens recebidas durante a noite', timeSlot: '08:30-09:00', priority: 'high', category: 'follow_up', completed: false, estimatedMinutes: 30 },
  { id: '3', title: 'Ligações de Follow-up', description: 'Ligar para leads que pediram retorno', timeSlot: '09:00-10:30', priority: 'high', category: 'follow_up', completed: false, estimatedMinutes: 90 },
  { id: '4', title: 'Reunião de Alinhamento', description: 'Daily com a equipe comercial', timeSlot: '10:30-11:00', priority: 'medium', category: 'admin', completed: false, estimatedMinutes: 30 },
];

const afternoonRoutine: RoutineTask[] = [
  { id: '5', title: 'Prospecção Ativa', description: 'Contato com novos leads da campanha', timeSlot: '14:00-15:30', priority: 'high', category: 'prospecting', completed: false, estimatedMinutes: 90 },
  { id: '6', title: 'Apresentações/Fechamentos', description: 'Reuniões agendadas com leads qualificados', timeSlot: '15:30-17:00', priority: 'high', category: 'closing', completed: false, estimatedMinutes: 90 },
  { id: '7', title: 'Contatos Pós-Venda', description: 'Acompanhamento de pacientes recentes', timeSlot: '17:00-17:30', priority: 'medium', category: 'post_sale', completed: false, estimatedMinutes: 30 },
  { id: '8', title: 'Atualização CRM', description: 'Registrar todas as interações do dia', timeSlot: '17:30-18:00', priority: 'low', category: 'admin', completed: false, estimatedMinutes: 30 },
];

const mockTeamMembers: TeamMemberRoutine[] = [
  { id: '1', name: 'Ana Costa', avatar: 'AC', role: 'Consultora Sênior', tasks: [...morningRoutine, ...afternoonRoutine], completionRate: 75, activeLeads: 28, todayContacts: 12, status: 'online' },
  { id: '2', name: 'Carlos Lima', avatar: 'CL', role: 'Consultor', tasks: [...morningRoutine, ...afternoonRoutine], completionRate: 60, activeLeads: 22, todayContacts: 8, status: 'busy' },
  { id: '3', name: 'Fernanda Souza', avatar: 'FS', role: 'Consultora', tasks: [...morningRoutine, ...afternoonRoutine], completionRate: 90, activeLeads: 31, todayContacts: 15, status: 'online' },
];

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

export const CRMTeamRoutine = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMemberRoutine[]>(mockTeamMembers);
  const [selectedMember, setSelectedMember] = useState<TeamMemberRoutine | null>(null);
  const [myTasks, setMyTasks] = useState<RoutineTask[]>([...morningRoutine, ...afternoonRoutine]);

  const toggleTask = (taskId: string) => {
    setMyTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const completedTasks = myTasks.filter(t => t.completed).length;
  const totalTasks = myTasks.length;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

  const currentHour = new Date().getHours();
  const isMorning = currentHour < 12;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rotina da Equipe</h2>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="font-bold">{completedTasks}/{totalTasks}</p>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-bold">{isMorning ? 'Manhã' : 'Tarde'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Minha Rotina */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Minha Rotina de Hoje
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
                <Progress value={completionPercentage} className="w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                        <p className="text-xs text-muted-foreground mt-1">{task.estimatedMinutes}min</p>
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
                        <p className="text-xs text-muted-foreground mt-1">{task.estimatedMinutes}min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                          <AvatarFallback>{member.avatar}</AvatarFallback>
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
                  <AvatarFallback>{selectedMember.avatar}</AvatarFallback>
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
                  className="flex items-center gap-3 p-2 rounded bg-accent/30"
                >
                  {getCategoryIcon(task.category)}
                  <span className="flex-1">{task.title}</span>
                  <Badge variant="outline">{task.timeSlot}</Badge>
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
