import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Send, Smile, Paperclip, Mic, Image, FileText, Video,
  MoreVertical, Phone, Search, Star, Archive, Trash2,
  Check, CheckCheck, Clock, AlertCircle, Bot, Sparkles,
  ChevronDown, X, Reply, Forward, Copy, Pin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';
import { CRMWhatsAppTemplates } from './CRMWhatsAppTemplates';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'me' | 'contact';
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  type: 'text' | 'image' | 'audio' | 'document' | 'video';
  replyTo?: string;
  aiAnalysis?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    intent: string;
    extractedData?: Record<string, string>;
    suggestedAction?: string;
  };
}

interface CRMWhatsAppChatProps {
  lead: CRMLead | null;
  open: boolean;
  onClose: () => void;
  onDataExtracted?: (data: Record<string, any>) => void;
  onSuggestAction?: (action: string) => void;
}

// Simulated messages for demo
const generateMockMessages = (leadName: string): Message[] => [
  {
    id: '1',
    content: `Olá! Vi que vocês fazem procedimentos estéticos. Tenho interesse em saber mais sobre harmonização facial.`,
    timestamp: new Date(Date.now() - 3600000 * 5),
    sender: 'contact',
    status: 'read',
    type: 'text',
    aiAnalysis: {
      sentiment: 'positive',
      intent: 'interesse_procedimento',
      extractedData: {
        procedimento_interesse: 'Harmonização Facial'
      },
      suggestedAction: 'Enviar informações sobre harmonização e valores'
    }
  },
  {
    id: '2',
    content: `Olá ${leadName.split(' ')[0]}! 😊 Obrigado pelo interesse! A Unique é especialista em harmonização facial. Posso te explicar melhor sobre os procedimentos disponíveis?`,
    timestamp: new Date(Date.now() - 3600000 * 4.5),
    sender: 'me',
    status: 'read',
    type: 'text'
  },
  {
    id: '3',
    content: `Sim, por favor! Quanto custa mais ou menos? E vocês parcelam?`,
    timestamp: new Date(Date.now() - 3600000 * 4),
    sender: 'contact',
    status: 'read',
    type: 'text',
    aiAnalysis: {
      sentiment: 'positive',
      intent: 'consulta_preco',
      extractedData: {
        interesse_parcelamento: 'Sim',
        sinal_compra: 'Alto - perguntou sobre preço'
      },
      suggestedAction: 'Enviar tabela de preços e condições de pagamento'
    }
  },
  {
    id: '4',
    content: `Temos várias opções! O valor varia de acordo com as áreas tratadas. Parcelamos em até 12x no cartão e também temos condições especiais à vista. Posso agendar uma avaliação gratuita para você conhecer a clínica?`,
    timestamp: new Date(Date.now() - 3600000 * 3.5),
    sender: 'me',
    status: 'read',
    type: 'text'
  },
  {
    id: '5',
    content: `Interessante! Trabalho durante a semana, mas sábado consigo ir. Vocês atendem sábado?`,
    timestamp: new Date(Date.now() - 3600000 * 2),
    sender: 'contact',
    status: 'read',
    type: 'text',
    aiAnalysis: {
      sentiment: 'positive',
      intent: 'agendar_consulta',
      extractedData: {
        disponibilidade: 'Sábados',
        ocupacao: 'Trabalha durante semana'
      },
      suggestedAction: 'Oferecer horários disponíveis no sábado'
    }
  }
];

export function CRMWhatsAppChat({
  lead,
  open,
  onClose,
  onDataExtracted,
  onSuggestAction
}: CRMWhatsAppChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load mock messages when lead changes
  useEffect(() => {
    if (lead) {
      setMessages(generateMockMessages(lead.name));
    }
  }, [lead]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      timestamp: new Date(),
      sender: 'me',
      status: 'pending',
      type: 'text',
      replyTo: replyingTo?.id
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setReplyingTo(null);

    // Simulate sending
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, status: 'sent' } : m)
      );
    }, 500);

    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, status: 'delivered' } : m)
      );
    }, 1000);
  };

  const handleSelectTemplate = (template: string) => {
    setNewMessage(template);
    setShowTemplates(false);
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
    }
  };

  const getLatestAIAnalysis = () => {
    const messagesWithAI = messages.filter(m => m.aiAnalysis);
    return messagesWithAI[messagesWithAI.length - 1]?.aiAnalysis;
  };

  const extractedData = messages
    .filter(m => m.aiAnalysis?.extractedData)
    .reduce((acc, m) => ({ ...acc, ...m.aiAnalysis?.extractedData }), {});

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-green-600 text-white">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-green-700 text-white">
              {lead.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{lead.name}</h3>
            <p className="text-xs text-green-100 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-300" />
              {lead.whatsapp || lead.phone || 'Sem WhatsApp'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-white hover:bg-green-700",
                showAIPanel && "bg-green-700"
              )}
              onClick={() => setShowAIPanel(!showAIPanel)}
            >
              <Bot className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2">
                  <Star className="h-4 w-4" />
                  Marcar como favorito
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Archive className="h-4 w-4" />
                  Arquivar conversa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Excluir conversa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* AI Panel */}
        {showAIPanel && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border-b space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Análise da IA
              </span>
            </div>

            {getLatestAIAnalysis() && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white dark:bg-background rounded border">
                  <span className="text-muted-foreground">Sentimento:</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-2",
                      getLatestAIAnalysis()?.sentiment === 'positive' && "border-green-500 text-green-600",
                      getLatestAIAnalysis()?.sentiment === 'neutral' && "border-yellow-500 text-yellow-600",
                      getLatestAIAnalysis()?.sentiment === 'negative' && "border-red-500 text-red-600"
                    )}
                  >
                    {getLatestAIAnalysis()?.sentiment === 'positive' ? '😊 Positivo' :
                      getLatestAIAnalysis()?.sentiment === 'neutral' ? '😐 Neutro' : '😔 Negativo'}
                  </Badge>
                </div>
                <div className="p-2 bg-white dark:bg-background rounded border">
                  <span className="text-muted-foreground">Intenção:</span>
                  <span className="ml-2 font-medium">
                    {getLatestAIAnalysis()?.intent?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}

            {Object.keys(extractedData).length > 0 && (
              <div className="p-2 bg-white dark:bg-background rounded border">
                <p className="text-xs text-muted-foreground mb-1">Dados extraídos:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {key.replace(/_/g, ' ')}: {value as string}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full text-xs"
                  onClick={() => onDataExtracted?.(extractedData)}
                >
                  Salvar no Lead
                </Button>
              </div>
            )}

            {getLatestAIAnalysis()?.suggestedAction && (
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded border border-green-300">
                <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                  💡 <strong>Próxima ação:</strong> {getLatestAIAnalysis()?.suggestedAction}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 bg-[#e5ddd5] dark:bg-background">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === 'me' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[75%] rounded-lg p-3 shadow-sm",
                    message.sender === 'me'
                      ? "bg-green-200 dark:bg-green-800 rounded-br-none"
                      : "bg-white dark:bg-muted rounded-bl-none"
                  )}
                >
                  {/* AI indicator for contact messages */}
                  {message.sender === 'contact' && message.aiAnalysis && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[250px]">
                        <p className="text-xs">
                          <strong>Sentimento:</strong> {message.aiAnalysis.sentiment}<br />
                          <strong>Intenção:</strong> {message.aiAnalysis.intent}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {format(message.timestamp, 'HH:mm', { locale: ptBR })}
                    </span>
                    {message.sender === 'me' && getStatusIcon(message.status)}
                  </div>

                  {/* Message actions on hover */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-8 top-0 h-6 w-6 opacity-0 hover:opacity-100 group-hover:opacity-100"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setReplyingTo(message)}>
                        <Reply className="h-4 w-4 mr-2" />
                        Responder
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Forward className="h-4 w-4 mr-2" />
                        Encaminhar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pin className="h-4 w-4 mr-2" />
                        Fixar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-muted rounded-lg p-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center gap-2">
            <div className="flex-1 text-xs">
              <span className="font-medium">Respondendo a:</span>
              <p className="text-muted-foreground truncate">{replyingTo.content}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 bg-muted/30 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTemplates(true)}
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem className="gap-2">
                  <Image className="h-4 w-4" />
                  Imagem
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documento
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Video className="h-4 w-4" />
                  Vídeo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              placeholder="Digite uma mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="flex-1"
            />
            {newMessage ? (
              <Button size="icon" onClick={handleSendMessage} className="bg-green-600 hover:bg-green-700">
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon">
                <Mic className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        {/* Templates Sheet */}
        <CRMWhatsAppTemplates
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={handleSelectTemplate}
          leadName={lead.name}
        />
      </SheetContent>
    </Sheet>
  );
}
