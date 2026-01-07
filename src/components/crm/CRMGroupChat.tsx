import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, 
  Bot, 
  Users, 
  MessageSquare, 
  Lightbulb,
  TrendingUp,
  Target,
  Sparkles,
  Pin,
  MoreVertical,
  Phone,
  Video,
  Search,
  Plus,
  AtSign,
  Hash
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatMessage {
  id: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
    isAI?: boolean;
  };
  content: string;
  timestamp: string;
  type: 'text' | 'ai_suggestion' | 'ai_insight' | 'system';
  reactions?: string[];
  isPinned?: boolean;
  mentions?: string[];
}

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  members: number;
  unreadCount: number;
  lastMessage: string;
  icon: 'team' | 'sales' | 'support' | 'general';
}

const mockGroups: ChatGroup[] = [
  { id: '1', name: 'Equipe Comercial', description: 'Discussões de vendas e estratégias', members: 8, unreadCount: 3, lastMessage: 'Ana: Fechei a venda!', icon: 'sales' },
  { id: '2', name: 'Pós-Venda & CS', description: 'Acompanhamento de pacientes', members: 5, unreadCount: 0, lastMessage: 'IA: Paciente Maria precisa de contato', icon: 'support' },
  { id: '3', name: 'Gestão & Metas', description: 'Alinhamentos e resultados', members: 4, unreadCount: 1, lastMessage: 'Carlos: Meta do mês atualizada', icon: 'team' },
  { id: '4', name: 'Campanhas Ativas', description: 'Discussão sobre campanhas', members: 12, unreadCount: 5, lastMessage: 'IA: Nova campanha iniciada', icon: 'general' },
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    sender: { id: '1', name: 'Ana Costa', avatar: 'AC' },
    content: 'Bom dia equipe! Alguém tem dicas para abordar leads de rinoplastia?',
    timestamp: '2025-01-07T08:30:00',
    type: 'text'
  },
  {
    id: '2',
    sender: { id: 'ai', name: 'Assistente IA', avatar: '🤖', isAI: true },
    content: '💡 **Dica para leads de Rinoplastia:**\n\n1. Pergunte sobre a motivação principal (estética vs funcional)\n2. Mencione que Dr. Roberto tem +500 procedimentos\n3. Ofereça avaliação presencial gratuita\n4. Use depoimentos de pacientes similares\n\nTaxa de conversão média: 32% | Ticket médio: R$ 18.500',
    timestamp: '2025-01-07T08:31:00',
    type: 'ai_suggestion',
    isPinned: true
  },
  {
    id: '3',
    sender: { id: '2', name: 'Carlos Lima', avatar: 'CL' },
    content: 'Ótima dica! Eu costumo também perguntar se já consultou outros profissionais',
    timestamp: '2025-01-07T08:35:00',
    type: 'text'
  },
  {
    id: '4',
    sender: { id: 'ai', name: 'Assistente IA', avatar: '🤖', isAI: true },
    content: '📊 **Insight do momento:**\n\nVocês têm 3 leads quentes aguardando retorno há mais de 24h. Prioridade:\n- Maria Silva (Score 92) - Interessada em Lipo\n- João Santos (Score 88) - Rinoplastia\n- Paula Oliveira (Score 85) - Mamoplastia',
    timestamp: '2025-01-07T09:00:00',
    type: 'ai_insight'
  },
  {
    id: '5',
    sender: { id: '3', name: 'Fernanda Souza', avatar: 'FS' },
    content: 'Pessoal, fechei a Maria Silva! R$ 22.000 em lipoaspiração 🎉',
    timestamp: '2025-01-07T10:15:00',
    type: 'text',
    reactions: ['🎉', '👏', '💪']
  },
  {
    id: '6',
    sender: { id: 'system', name: 'Sistema', avatar: '⚡' },
    content: '🏆 Fernanda Souza atingiu 85% da meta mensal!',
    timestamp: '2025-01-07T10:16:00',
    type: 'system'
  }
];

const getGroupIcon = (icon: string) => {
  switch (icon) {
    case 'sales': return <TrendingUp className="h-5 w-5 text-green-500" />;
    case 'support': return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case 'team': return <Users className="h-5 w-5 text-purple-500" />;
    default: return <Hash className="h-5 w-5 text-gray-500" />;
  }
};

export const CRMGroupChat = () => {
  const [groups] = useState<ChatGroup[]>(mockGroups);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup>(mockGroups[0]);
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: { id: 'me', name: 'Você', avatar: 'EU' },
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Simular resposta da IA se a mensagem contiver palavras-chave
    const keywords = ['dica', 'ajuda', 'como', 'estratégia', 'lead', 'venda', 'cliente'];
    const shouldAIRespond = keywords.some(k => newMessage.toLowerCase().includes(k));

    if (shouldAIRespond) {
      setIsAITyping(true);
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: { id: 'ai', name: 'Assistente IA', avatar: '🤖', isAI: true },
          content: generateAIResponse(newMessage),
          timestamp: new Date().toISOString(),
          type: 'ai_suggestion'
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsAITyping(false);
      }, 1500);
    }
  };

  const generateAIResponse = (message: string): string => {
    if (message.toLowerCase().includes('lead')) {
      return '💡 **Análise de Leads:**\n\nBaseado no seu histórico:\n- Melhor horário para contato: 10h-12h\n- Taxa de resposta WhatsApp: 78%\n- Tempo médio de decisão: 3-5 dias\n\nSugestão: Foque em leads com score acima de 70 primeiro.';
    }
    if (message.toLowerCase().includes('venda') || message.toLowerCase().includes('fechar')) {
      return '🎯 **Dicas de Fechamento:**\n\n1. Crie urgência (vagas limitadas)\n2. Ofereça condição especial de pagamento\n3. Mencione casos de sucesso recentes\n4. Agende a consulta antes de finalizar\n\nLembre-se: 60% dos fechamentos acontecem após o 5º contato!';
    }
    return '✨ **Sugestão:**\n\nBaseado na sua pergunta, recomendo revisar os protocolos de atendimento no menu de Guias. Posso ajudar com algo mais específico?';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
      {/* Lista de Grupos */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Grupos
            </CardTitle>
            <Button size="sm" variant="ghost">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar grupos..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[550px]">
            <div className="space-y-1">
              {groups.map(group => (
                <div
                  key={group.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedGroup.id === group.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex items-center gap-3">
                    {getGroupIcon(group.icon)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{group.name}</p>
                        {group.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {group.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{group.lastMessage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Principal */}
      <Card className="lg:col-span-3 flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getGroupIcon(selectedGroup.icon)}
              <div>
                <CardTitle className="text-lg">{selectedGroup.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedGroup.members} membros • {selectedGroup.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                IA Ativa
              </Badge>
              <Button size="sm" variant="ghost">
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <Video className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender.id === 'me' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className={message.sender.isAI ? 'bg-gradient-to-br from-purple-500 to-pink-500' : ''}>
                    <AvatarFallback className={message.sender.isAI ? 'text-lg' : ''}>
                      {message.sender.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${message.sender.id === 'me' ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.sender.id !== 'me' && (
                        <span className="font-medium text-sm">{message.sender.name}</span>
                      )}
                      {message.sender.isAI && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          IA
                        </Badge>
                      )}
                      {message.isPinned && (
                        <Pin className="h-3 w-3 text-orange-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.timestamp), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.type === 'ai_suggestion'
                          ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800'
                          : message.type === 'ai_insight'
                          ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200 dark:border-blue-800'
                          : message.type === 'system'
                          ? 'bg-green-500/10 border border-green-200 dark:border-green-800 text-center'
                          : message.sender.id === 'me'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {message.reactions.map((reaction, i) => (
                          <span key={i} className="text-sm bg-accent rounded-full px-2 py-0.5">
                            {reaction}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAITyping && (
                <div className="flex gap-3">
                  <Avatar className="bg-gradient-to-br from-purple-500 to-pink-500">
                    <AvatarFallback className="text-lg">🤖</AvatarFallback>
                  </Avatar>
                  <div className="p-3 rounded-lg bg-accent">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input de Mensagem */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost">
                <AtSign className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Digite sua mensagem... (A IA responde automaticamente)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              💡 A IA monitora a conversa e oferece insights automaticamente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
