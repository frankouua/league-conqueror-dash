import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Bell, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Phone,
  MessageSquare,
  Heart,
  Star,
  Camera,
  Stethoscope,
  Activity,
  Users,
  Bot,
  Send
} from "lucide-react";
import { format, addDays, differenceInDays, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostSalePatient {
  id: string;
  name: string;
  procedure: string;
  surgeryDate: string;
  currentStage: 'pos_imediato' | 'pos_recente' | 'pos_tardio' | 'alta_medica' | 'acompanhamento';
  assignedTo: string;
  phone: string;
  nextContact: string;
  contactHistory: ContactPoint[];
  alerts: Alert[];
  npsScore?: number;
  photosTaken: boolean;
  satisfactionLevel: 'excellent' | 'good' | 'neutral' | 'bad' | null;
}

interface ContactPoint {
  id: string;
  date: string;
  type: 'call' | 'whatsapp' | 'visit' | 'photo' | 'nps';
  notes: string;
  completedBy: string;
  status: 'completed' | 'scheduled' | 'missed';
}

interface Alert {
  id: string;
  type: 'contact_due' | 'photo_pending' | 'nps_pending' | 'follow_up' | 'high_priority';
  message: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const mockPatients: PostSalePatient[] = [
  {
    id: '1',
    name: 'Maria Silva',
    procedure: 'Rinoplastia',
    surgeryDate: '2025-01-02',
    currentStage: 'pos_recente',
    assignedTo: 'Ana Costa',
    phone: '11999887766',
    nextContact: '2025-01-08',
    photosTaken: false,
    satisfactionLevel: 'good',
    contactHistory: [
      { id: '1', date: '2025-01-03', type: 'call', notes: 'Paciente bem, sem dor', completedBy: 'Ana Costa', status: 'completed' },
      { id: '2', date: '2025-01-05', type: 'whatsapp', notes: 'Enviou foto do curativo', completedBy: 'Ana Costa', status: 'completed' },
    ],
    alerts: [
      { id: '1', type: 'photo_pending', message: 'Fotos de acompanhamento pendentes', dueDate: '2025-01-08', priority: 'medium' },
    ]
  },
  {
    id: '2',
    name: 'João Santos',
    procedure: 'Lipoaspiração',
    surgeryDate: '2024-12-28',
    currentStage: 'pos_tardio',
    assignedTo: 'Carlos Lima',
    phone: '11988776655',
    nextContact: '2025-01-07',
    photosTaken: true,
    satisfactionLevel: 'excellent',
    npsScore: 10,
    contactHistory: [
      { id: '1', date: '2024-12-29', type: 'call', notes: 'Orientações pós-op', completedBy: 'Carlos Lima', status: 'completed' },
      { id: '2', date: '2025-01-02', type: 'visit', notes: 'Retorno - retirada de pontos', completedBy: 'Dr. Roberto', status: 'completed' },
      { id: '3', date: '2025-01-05', type: 'nps', notes: 'NPS coletado: 10', completedBy: 'Carlos Lima', status: 'completed' },
    ],
    alerts: []
  },
  {
    id: '3',
    name: 'Paula Oliveira',
    procedure: 'Mamoplastia',
    surgeryDate: '2025-01-05',
    currentStage: 'pos_imediato',
    assignedTo: 'Ana Costa',
    phone: '11977665544',
    nextContact: '2025-01-06',
    photosTaken: false,
    satisfactionLevel: null,
    contactHistory: [],
    alerts: [
      { id: '1', type: 'contact_due', message: 'Primeiro contato pós-cirurgia', dueDate: '2025-01-06', priority: 'urgent' },
      { id: '2', type: 'follow_up', message: 'Verificar medicação e dor', dueDate: '2025-01-07', priority: 'high' },
    ]
  }
];

const stageConfig = {
  pos_imediato: { label: 'Pós-Op Imediato', color: 'bg-red-500', days: '0-3 dias' },
  pos_recente: { label: 'Pós-Op Recente', color: 'bg-orange-500', days: '4-14 dias' },
  pos_tardio: { label: 'Pós-Op Tardio', color: 'bg-yellow-500', days: '15-30 dias' },
  alta_medica: { label: 'Alta Médica', color: 'bg-green-500', days: '30+ dias' },
  acompanhamento: { label: 'Acompanhamento', color: 'bg-blue-500', days: 'Contínuo' }
};

export const CRMPostSaleFlow = () => {
  const [patients] = useState<PostSalePatient[]>(mockPatients);
  const [selectedPatient, setSelectedPatient] = useState<PostSalePatient | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'visit': return <Stethoscope className="h-4 w-4" />;
      case 'photo': return <Camera className="h-4 w-4" />;
      case 'nps': return <Star className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const pendingAlerts = patients.flatMap(p => p.alerts.map(a => ({ ...a, patientName: p.name, patientId: p.id })));
  const urgentCount = pendingAlerts.filter(a => a.priority === 'urgent' || a.priority === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header com Alertas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fluxo Pós-Venda</h2>
          <p className="text-muted-foreground">Acompanhamento completo de pacientes pós-procedimento</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {urgentCount} Alertas Urgentes
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Bell className="h-4 w-4" />
            {pendingAlerts.length} Pendências
          </Badge>
        </div>
      </div>

      {/* Pipeline Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pipeline de Pós-Venda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(stageConfig).map(([key, config]) => {
              const stagePatients = patients.filter(p => p.currentStage === key);
              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.color}`} />
                      <span className="font-medium text-sm">{config.label}</span>
                    </div>
                    <Badge variant="outline">{stagePatients.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.days}</p>
                  <div className="space-y-2 min-h-[200px]">
                    {stagePatients.map(patient => (
                      <Card 
                        key={patient.id} 
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <p className="font-medium text-sm">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">{patient.procedure}</p>
                        {patient.alerts.length > 0 && (
                          <Badge variant="destructive" className="mt-2 text-xs">
                            {patient.alerts.length} alerta(s)
                          </Badge>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              Alertas e Pendências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {pendingAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>Nenhuma pendência!</p>
                  </div>
                ) : (
                  pendingAlerts.map(alert => (
                    <div 
                      key={alert.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        const patient = patients.find(p => p.id === alert.patientId);
                        if (patient) setSelectedPatient(patient);
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(alert.priority)}`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.patientName} • {format(new Date(alert.dueDate), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant={alert.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {alert.priority}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Rotina do Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Rotina do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Contatos Agendados
                  </h4>
                  {patients
                    .filter(p => p.nextContact === format(new Date(), 'yyyy-MM-dd'))
                    .map(patient => (
                      <div key={patient.id} className="flex items-center justify-between p-2 rounded bg-accent/50">
                        <div>
                          <p className="font-medium text-sm">{patient.name}</p>
                          <p className="text-xs text-muted-foreground">{patient.procedure}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Fotos Pendentes
                  </h4>
                  {patients
                    .filter(p => !p.photosTaken && p.currentStage !== 'pos_imediato')
                    .map(patient => (
                      <div key={patient.id} className="flex items-center justify-between p-2 rounded bg-accent/50">
                        <div>
                          <p className="font-medium text-sm">{patient.name}</p>
                          <p className="text-xs text-muted-foreground">Cirurgia: {format(new Date(patient.surgeryDate), "dd/MM", { locale: ptBR })}</p>
                        </div>
                        <Button size="sm">Solicitar Fotos</Button>
                      </div>
                    ))}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    NPS Pendentes
                  </h4>
                  {patients
                    .filter(p => p.currentStage === 'alta_medica' && !p.npsScore)
                    .map(patient => (
                      <div key={patient.id} className="flex items-center justify-between p-2 rounded bg-accent/50">
                        <div>
                          <p className="font-medium text-sm">{patient.name}</p>
                          <p className="text-xs text-muted-foreground">{patient.procedure}</p>
                        </div>
                        <Button size="sm">Enviar NPS</Button>
                      </div>
                    ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes do Paciente Selecionado */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                {selectedPatient.name}
              </CardTitle>
              <Button variant="ghost" onClick={() => setSelectedPatient(null)}>Fechar</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Info do Paciente */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Procedimento</p>
                  <p className="font-medium">{selectedPatient.procedure}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data da Cirurgia</p>
                  <p className="font-medium">{format(new Date(selectedPatient.surgeryDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estágio Atual</p>
                  <Badge className={stageConfig[selectedPatient.currentStage].color}>
                    {stageConfig[selectedPatient.currentStage].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Responsável</p>
                  <p className="font-medium">{selectedPatient.assignedTo}</p>
                </div>
                {selectedPatient.npsScore && (
                  <div>
                    <p className="text-sm text-muted-foreground">NPS</p>
                    <Badge variant={selectedPatient.npsScore >= 9 ? 'default' : 'secondary'}>
                      {selectedPatient.npsScore}/10
                    </Badge>
                  </div>
                )}
              </div>

              {/* Histórico de Contatos */}
              <div className="space-y-4">
                <h4 className="font-medium">Histórico de Contatos</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {selectedPatient.contactHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum contato registrado</p>
                    ) : (
                      selectedPatient.contactHistory.map(contact => (
                        <div key={contact.id} className="flex items-start gap-2 p-2 rounded bg-accent/30">
                          {getContactIcon(contact.type)}
                          <div className="flex-1">
                            <p className="text-sm">{contact.notes}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(contact.date), "dd/MM", { locale: ptBR })} • {contact.completedBy}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Ações Rápidas */}
              <div className="space-y-4">
                <h4 className="font-medium">Ações Rápidas</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Ligar
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Fotos
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    NPS
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2 col-span-2">
                    <Stethoscope className="h-4 w-4" />
                    Agendar Retorno
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
