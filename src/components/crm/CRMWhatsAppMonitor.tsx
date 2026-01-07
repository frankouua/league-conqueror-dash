import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Bot, 
  Sparkles, 
  User, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Eye,
  Edit,
  RefreshCw,
  Send,
  TrendingUp,
  Target,
  Clock,
  FileText,
  UserPlus,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppMessage {
  id: string;
  sender: 'client' | 'seller';
  senderName: string;
  content: string;
  timestamp: string;
  extractedData?: ExtractedData[];
  aiAnalysis?: AIAnalysis;
}

interface ExtractedData {
  field: string;
  value: string;
  confidence: number;
  applied: boolean;
}

interface AIAnalysis {
  intent: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  stage_suggestion?: string;
  urgency: 'low' | 'medium' | 'high';
  next_actions: string[];
  objections?: string[];
  buying_signals?: string[];
}

interface AIAction {
  id: string;
  type: 'data_extracted' | 'stage_change' | 'task_created' | 'alert' | 'suggestion';
  description: string;
  timestamp: string;
  status: 'pending' | 'applied' | 'dismissed';
  details?: any;
}

interface ConversationThread {
  id: string;
  leadName: string;
  leadId: string;
  phone: string;
  sellerName: string;
  sellerId: string;
  currentStage: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  aiScore: number;
  messages: WhatsAppMessage[];
  aiActions: AIAction[];
  extractedProfile: Record<string, any>;
}

const mockConversations: ConversationThread[] = [
  {
    id: '1',
    leadName: 'Maria Silva',
    leadId: 'l1',
    phone: '11999887766',
    sellerName: 'Ana Costa',
    sellerId: 's1',
    currentStage: 'Qualificação',
    lastMessage: 'Sim, tenho interesse na rinoplastia!',
    lastMessageTime: '2025-01-07T10:30:00',
    unreadCount: 3,
    aiScore: 85,
    extractedProfile: {
      nome: 'Maria Silva',
      idade: '32 anos',
      procedimento_interesse: 'Rinoplastia',
      orcamento: 'R$ 15.000 - R$ 20.000',
      disponibilidade: 'Março 2025',
      motivacao: 'Estética e respiração'
    },
    messages: [
      {
        id: '1',
        sender: 'seller',
        senderName: 'Ana Costa',
        content: 'Olá Maria! Tudo bem? Vi que você preencheu nosso formulário sobre rinoplastia. Posso te ajudar?',
        timestamp: '2025-01-07T09:00:00'
      },
      {
        id: '2',
        sender: 'client',
        senderName: 'Maria Silva',
        content: 'Oi Ana! Sim, tenho muito interesse. Tenho 32 anos e sempre quis corrigir meu nariz, tanto pela estética quanto por problemas de respiração.',
        timestamp: '2025-01-07T09:15:00',
        extractedData: [
          { field: 'idade', value: '32 anos', confidence: 95, applied: true },
          { field: 'procedimento_interesse', value: 'Rinoplastia', confidence: 98, applied: true },
          { field: 'motivacao', value: 'Estética e respiração', confidence: 90, applied: true }
        ],
        aiAnalysis: {
          intent: 'Alta intenção de compra',
          sentiment: 'positive',
          urgency: 'medium',
          next_actions: ['Agendar avaliação', 'Enviar portfólio de casos'],
          buying_signals: ['Interesse antigo', 'Motivo funcional + estético']
        }
      },
      {
        id: '3',
        sender: 'seller',
        senderName: 'Ana Costa',
        content: 'Que legal, Maria! O Dr. Roberto é especialista em rinoplastia funcional e estética. Você tem alguma ideia de orçamento ou período preferido?',
        timestamp: '2025-01-07T09:30:00'
      },
      {
        id: '4',
        sender: 'client',
        senderName: 'Maria Silva',
        content: 'Pensei em algo entre 15 e 20 mil. E gostaria de fazer em março se possível, por causa das férias do trabalho.',
        timestamp: '2025-01-07T10:00:00',
        extractedData: [
          { field: 'orcamento', value: 'R$ 15.000 - R$ 20.000', confidence: 92, applied: true },
          { field: 'disponibilidade', value: 'Março 2025', confidence: 88, applied: true }
        ],
        aiAnalysis: {
          intent: 'Planejamento concreto',
          sentiment: 'positive',
          urgency: 'high',
          stage_suggestion: 'Agendamento',
          next_actions: ['Confirmar agendamento de avaliação', 'Verificar agenda de março'],
          buying_signals: ['Orçamento definido', 'Data planejada', 'Organizou férias']
        }
      },
      {
        id: '5',
        sender: 'client',
        senderName: 'Maria Silva',
        content: 'Sim, tenho interesse na rinoplastia! Quando posso agendar uma avaliação?',
        timestamp: '2025-01-07T10:30:00',
        aiAnalysis: {
          intent: 'Solicitação de agendamento',
          sentiment: 'positive',
          urgency: 'high',
          stage_suggestion: 'Agendamento',
          next_actions: ['URGENTE: Agendar avaliação imediatamente'],
          buying_signals: ['Pediu agendamento proativamente']
        }
      }
    ],
    aiActions: [
      { id: '1', type: 'data_extracted', description: 'Dados do lead extraídos automaticamente', timestamp: '2025-01-07T09:15:00', status: 'applied', details: { fields: ['idade', 'procedimento', 'motivação'] } },
      { id: '2', type: 'data_extracted', description: 'Orçamento e disponibilidade identificados', timestamp: '2025-01-07T10:00:00', status: 'applied', details: { fields: ['orçamento', 'disponibilidade'] } },
      { id: '3', type: 'stage_change', description: 'Mover para "Agendamento" - cliente solicitou avaliação', timestamp: '2025-01-07T10:30:00', status: 'pending', details: { from: 'Qualificação', to: 'Agendamento' } },
      { id: '4', type: 'task_created', description: 'Tarefa criada: Agendar avaliação com Maria Silva', timestamp: '2025-01-07T10:30:00', status: 'pending' },
      { id: '5', type: 'suggestion', description: 'Sugestão: Verificar agenda de março para cirurgia', timestamp: '2025-01-07T10:00:00', status: 'pending' }
    ]
  }
];

export const CRMWhatsAppMonitor = () => {
  const [conversations] = useState<ConversationThread[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<ConversationThread | null>(mockConversations[0]);
  const [aiMode, setAiMode] = useState<'monitor' | 'actions' | 'profile'>('monitor');

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'data_extracted': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'stage_change': return <ArrowRight className="h-4 w-4 text-purple-500" />;
      case 'task_created': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'suggestion': return <Sparkles className="h-4 w-4 text-pink-500" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-500" />
            Monitor WhatsApp com IA
          </h2>
          <p className="text-muted-foreground">
            A IA monitora conversas, extrai dados e automatiza ações
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Bot className="h-4 w-4" />
            IA Ativa
          </Badge>
          <Badge className="bg-green-500 flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {conversations.length} Conversas
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
        {/* Lista de Conversas */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conversas Ativas</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-accent/50 border border-transparent'
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{conv.leadName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{conv.leadName}</p>
                          <p className="text-xs text-muted-foreground">{conv.sellerName}</p>
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">{conv.currentStage}</Badge>
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        <span className="text-xs font-medium">{conv.aiScore}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat + Análise IA */}
        {selectedConversation && (
          <>
            {/* Conversa */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {selectedConversation.leadName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedConversation.leadName}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {selectedConversation.phone}
                        <span>•</span>
                        <span>Vendedor: {selectedConversation.sellerName}</span>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-purple-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Score: {selectedConversation.aiScore}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[550px] p-4">
                  <div className="space-y-4">
                    {selectedConversation.messages.map(message => (
                      <div key={message.id} className="space-y-2">
                        {/* Mensagem */}
                        <div className={`flex ${message.sender === 'seller' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                            message.sender === 'seller' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-accent'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">{message.senderName}</span>
                              <span className="text-xs opacity-70">
                                {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>

                        {/* Dados Extraídos pela IA */}
                        {message.extractedData && message.extractedData.length > 0 && (
                          <div className="ml-4 p-2 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="h-4 w-4 text-blue-500" />
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                Dados Extraídos Automaticamente
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {message.extractedData.map((data, i) => (
                                <Badge 
                                  key={i} 
                                  variant="secondary" 
                                  className={`text-xs ${data.applied ? 'bg-green-500/20' : ''}`}
                                >
                                  {data.applied && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {data.field}: {data.value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Análise da IA */}
                        {message.aiAnalysis && (
                          <div className="ml-4 p-2 rounded-lg bg-purple-500/10 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="h-4 w-4 text-purple-500" />
                              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                Análise IA
                              </span>
                              <Badge variant="outline" className={`text-xs ${getSentimentColor(message.aiAnalysis.sentiment)}`}>
                                {message.aiAnalysis.sentiment}
                              </Badge>
                            </div>
                            <p className="text-xs mb-2">
                              <strong>Intenção:</strong> {message.aiAnalysis.intent}
                            </p>
                            {message.aiAnalysis.buying_signals && (
                              <div className="mb-2">
                                <span className="text-xs text-green-600">
                                  🔥 Sinais de compra: {message.aiAnalysis.buying_signals.join(', ')}
                                </span>
                              </div>
                            )}
                            {message.aiAnalysis.stage_suggestion && (
                              <div className="flex items-center gap-2 p-2 rounded bg-purple-500/20">
                                <ArrowRight className="h-4 w-4 text-purple-500" />
                                <span className="text-xs font-medium">
                                  Sugestão: Mover para "{message.aiAnalysis.stage_suggestion}"
                                </span>
                                <Button size="sm" variant="secondary" className="ml-auto h-6 text-xs">
                                  Aplicar
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Painel IA */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <Tabs value={aiMode} onValueChange={(v) => setAiMode(v as typeof aiMode)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="monitor" className="flex-1 text-xs">Ações</TabsTrigger>
                    <TabsTrigger value="profile" className="flex-1 text-xs">Perfil</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[550px]">
                  {aiMode === 'monitor' && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        Ações da IA
                      </h4>
                      {selectedConversation.aiActions.map(action => (
                        <div 
                          key={action.id}
                          className={`p-3 rounded-lg border ${
                            action.status === 'applied' 
                              ? 'bg-green-500/10 border-green-200' 
                              : action.status === 'pending'
                              ? 'bg-yellow-500/10 border-yellow-200'
                              : 'bg-gray-500/10'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {getActionIcon(action.type)}
                            <div className="flex-1">
                              <p className="text-sm">{action.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(action.timestamp), "HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            {action.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </Button>
                              </div>
                            )}
                            {action.status === 'applied' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="pt-4 border-t">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                          <Target className="h-4 w-4 text-blue-500" />
                          Próximas Ações Sugeridas
                        </h4>
                        <div className="space-y-2">
                          <Button size="sm" variant="outline" className="w-full justify-start gap-2">
                            <Calendar className="h-4 w-4" />
                            Agendar Avaliação
                          </Button>
                          <Button size="sm" variant="outline" className="w-full justify-start gap-2">
                            <Send className="h-4 w-4" />
                            Enviar Portfólio
                          </Button>
                          <Button size="sm" variant="outline" className="w-full justify-start gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Mover para Agendamento
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {aiMode === 'profile' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        Perfil Extraído pela IA
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(selectedConversation.extractedProfile).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-2 rounded bg-accent/50">
                            <span className="text-sm text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm font-medium">{value as string}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Análise do Lead
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Score de Qualificação</span>
                            <span className="font-bold text-green-500">{selectedConversation.aiScore}%</span>
                          </div>
                          <Progress value={selectedConversation.aiScore} className="h-2" />
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Button className="w-full gap-2">
                          <UserPlus className="h-4 w-4" />
                          Atualizar Lead no CRM
                        </Button>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
