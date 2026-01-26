import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  Target,
  Zap,
  Video,
  Instagram,
  Star
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactPoint {
  id: string;
  leadName: string;
  leadId: string;
  type: 'call' | 'whatsapp' | 'email' | 'video' | 'instagram' | 'visit';
  scheduledFor: string;
  status: 'pending' | 'completed' | 'missed' | 'rescheduled';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  stage: string;
  assignedTo: string;
  notes?: string;
  outcome?: string;
  duration?: number;
}

interface ContactStats {
  total: number;
  completed: number;
  pending: number;
  missed: number;
  avgResponseTime: number;
  conversionRate: number;
}

const mockContactPoints: ContactPoint[] = [
  { id: '1', leadName: 'Maria Silva', leadId: 'l1', type: 'whatsapp', scheduledFor: '2025-01-07T09:00:00', status: 'pending', priority: 'urgent', stage: 'Proposta Enviada', assignedTo: 'Ana Costa', notes: 'Aguardando decisão sobre financiamento' },
  { id: '2', leadName: 'João Santos', leadId: 'l2', type: 'call', scheduledFor: '2025-01-07T10:00:00', status: 'completed', priority: 'high', stage: 'Agendamento', assignedTo: 'Carlos Lima', outcome: 'Consulta agendada para 10/01', duration: 8 },
  { id: '3', leadName: 'Paula Oliveira', leadId: 'l3', type: 'video', scheduledFor: '2025-01-07T11:00:00', status: 'pending', priority: 'high', stage: 'Qualificação', assignedTo: 'Fernanda Souza', notes: 'Apresentação de procedimentos' },
  { id: '4', leadName: 'Roberto Alves', leadId: 'l4', type: 'whatsapp', scheduledFor: '2025-01-07T14:00:00', status: 'pending', priority: 'medium', stage: 'Novo Lead', assignedTo: 'Ana Costa' },
  { id: '5', leadName: 'Carla Mendes', leadId: 'l5', type: 'email', scheduledFor: '2025-01-07T15:00:00', status: 'pending', priority: 'low', stage: 'Orçamento', assignedTo: 'Carlos Lima', notes: 'Enviar proposta detalhada' },
  { id: '6', leadName: 'Fernando Costa', leadId: 'l6', type: 'call', scheduledFor: '2025-01-06T16:00:00', status: 'missed', priority: 'high', stage: 'Follow-up', assignedTo: 'Fernanda Souza', notes: 'Não atendeu, reagendar' },
];

const mockStats: ContactStats = {
  total: 45,
  completed: 32,
  pending: 8,
  missed: 5,
  avgResponseTime: 2.5,
  conversionRate: 28
};

const contactTypeConfig = {
  call: { icon: Phone, label: 'Ligação', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  whatsapp: { icon: WhatsAppIcon, label: 'WhatsApp', color: 'text-green-500', bg: 'bg-green-500/10' },
  email: { icon: Mail, label: 'E-mail', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  video: { icon: Video, label: 'Vídeo', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  visit: { icon: Calendar, label: 'Visita', color: 'text-cyan-500', bg: 'bg-cyan-500/10' }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    default: return 'bg-blue-500';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return <Badge className="bg-green-500">Concluído</Badge>;
    case 'pending': return <Badge variant="outline">Pendente</Badge>;
    case 'missed': return <Badge variant="destructive">Perdido</Badge>;
    case 'rescheduled': return <Badge className="bg-blue-500">Reagendado</Badge>;
    default: return null;
  }
};

export const CRMContactPoints = () => {
  const [contacts] = useState<ContactPoint[]>(mockContactPoints);
  const [stats] = useState<ContactStats>(mockStats);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'missed'>('all');

  const filteredContacts = filter === 'all' 
    ? contacts 
    : contacts.filter(c => c.status === filter);

  const urgentContacts = contacts.filter(c => c.status === 'pending' && (c.priority === 'urgent' || c.priority === 'high'));

  return (
    <div className="space-y-6">
      {/* Header com Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Hoje</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Concluídos</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Perdidos</p>
              <p className="text-2xl font-bold">{stats.missed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tempo Resp.</p>
              <p className="text-2xl font-bold">{stats.avgResponseTime}h</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <TrendingUp className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversão</p>
              <p className="text-2xl font-bold">{stats.conversionRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Contatos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Pontos de Contato
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                >
                  Todos
                </Button>
                <Button 
                  size="sm" 
                  variant={filter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setFilter('pending')}
                >
                  Pendentes
                </Button>
                <Button 
                  size="sm" 
                  variant={filter === 'completed' ? 'default' : 'outline'}
                  onClick={() => setFilter('completed')}
                >
                  Concluídos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredContacts.map(contact => {
                  const config = contactTypeConfig[contact.type];
                  const Icon = config.icon;
                  const isOverdue = contact.status === 'pending' && new Date(contact.scheduledFor) < new Date();
                  
                    return (
                      <div 
                        key={contact.id}
                        className={`p-4 rounded-lg border transition-colors hover:bg-accent/50 ${
                          isOverdue ? 'border-red-500/50 bg-red-500/10' : 'bg-card'
                        }`}
                      >
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{contact.leadName}</p>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(contact.priority)}`} />
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(contact.status)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(contact.scheduledFor), "HH:mm", { locale: ptBR })}
                            </span>
                            <span>{config.label}</span>
                            <Badge variant="outline">{contact.stage}</Badge>
                          </div>
                          
                          {contact.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              📝 {contact.notes}
                            </p>
                          )}
                          
                          {contact.outcome && (
                            <p className="text-sm text-green-600 mt-2">
                              ✅ {contact.outcome}
                            </p>
                          )}
                        </div>

                        {contact.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Phone className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button size="sm">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Painel Lateral */}
        <div className="space-y-6">
          {/* Contatos Urgentes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Prioridade Máxima
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {urgentContacts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">Nenhum contato urgente!</p>
                  </div>
                ) : (
                  urgentContacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{contact.leadName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(contact.scheduledFor), "HH:mm", { locale: ptBR })} • {contactTypeConfig[contact.type].label}
                        </p>
                      </div>
                      <Button size="sm" variant="destructive" className="flex-shrink-0">
                        Agir
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Métricas de Canais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance por Canal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(contactTypeConfig).slice(0, 4).map(([key, config]) => {
                  const Icon = config.icon;
                  const channelContacts = contacts.filter(c => c.type === key);
                  const completed = channelContacts.filter(c => c.status === 'completed').length;
                  const total = channelContacts.length;
                  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                  
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <span className="text-sm font-medium">{rate}%</span>
                      </div>
                      <Progress value={rate} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Dicas da IA */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-500" />
                Dica da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                📊 Seus melhores horários de contato são entre <strong>10h-12h</strong> e <strong>14h-16h</strong>. 
                Leads contatados nesses horários têm <strong>40% mais chance</strong> de conversão.
              </p>
              <Button size="sm" variant="outline" className="mt-3 w-full">
                Ver Mais Insights
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
