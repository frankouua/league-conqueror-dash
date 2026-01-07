import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Send, Smile, Paperclip, Mic, Image, FileText, Video,
  MoreVertical, Phone, Search, Star, Archive, Trash2,
  Check, CheckCheck, Clock, AlertCircle, Bot, Sparkles,
  ChevronDown, X, Reply, Forward, Copy, Pin, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';

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
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white shrink-0">
          <Avatar className="h-10 w-10 ring-2 ring-white/20">
            <AvatarFallback className="bg-white/20 text-white font-bold">
              {lead.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate text-base">{lead.name}</h3>
            <p className="text-xs text-white/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
              {lead.whatsapp || lead.phone || 'Sem WhatsApp'}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9">
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-white hover:bg-white/10 h-9 w-9",
                showAIPanel && "bg-white/20"
              )}
              onClick={() => setShowAIPanel(!showAIPanel)}
            >
              <Bot className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Star className="h-4 w-4" />
                  Marcar como favorito
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Archive className="h-4 w-4" />
                  Arquivar conversa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                  Excluir conversa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AI Panel - Redesigned */}
        {showAIPanel && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40 border-b space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium text-purple-900 dark:text-purple-100">
                  Análise da IA
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-purple-600 hover:text-purple-700"
                onClick={() => setShowAIPanel(false)}
              >
                Ocultar
              </Button>
            </div>

            {getLatestAIAnalysis() && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white dark:bg-background rounded-lg border shadow-sm">
                  <span className="text-xs text-muted-foreground block mb-1">Sentimento:</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium",
                      getLatestAIAnalysis()?.sentiment === 'positive' && "border-green-500 text-green-600 bg-green-50",
                      getLatestAIAnalysis()?.sentiment === 'neutral' && "border-yellow-500 text-yellow-600 bg-yellow-50",
                      getLatestAIAnalysis()?.sentiment === 'negative' && "border-red-500 text-red-600 bg-red-50"
                    )}
                  >
                    {getLatestAIAnalysis()?.sentiment === 'positive' ? '😊 Positivo' :
                      getLatestAIAnalysis()?.sentiment === 'neutral' ? '😐 Neutro' : '😔 Negativo'}
                  </Badge>
                </div>
                <div className="p-3 bg-white dark:bg-background rounded-lg border shadow-sm">
                  <span className="text-xs text-muted-foreground block mb-1">Intenção:</span>
                  <span className="text-sm font-medium capitalize">
                    {getLatestAIAnalysis()?.intent?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}

            {Object.keys(extractedData).length > 0 && (
              <div className="p-3 bg-white dark:bg-background rounded-lg border shadow-sm">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Dados extraídos:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-xs py-1">
                      <span className="text-muted-foreground mr-1">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-medium">{value as string}</span>
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => onDataExtracted?.(extractedData)}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Salvar no Lead
                </Button>
              </div>
            )}

            {getLatestAIAnalysis()?.suggestedAction && (
              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    💡
                  </span>
                  <span>
                    <strong className="block text-xs uppercase tracking-wide mb-0.5">Próxima ação:</strong>
                    {getLatestAIAnalysis()?.suggestedAction}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="space-y-4 max-w-lg mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex group",
                  message.sender === 'me' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "relative max-w-[85%] rounded-2xl p-3 shadow-md",
                    message.sender === 'me'
                      ? "bg-gradient-to-br from-green-400 to-green-500 text-white rounded-br-sm"
                      : "bg-white dark:bg-slate-800 rounded-bl-sm"
                  )}
                >
                  {/* AI indicator for contact messages */}
                  {message.sender === 'contact' && message.aiAnalysis && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[250px] bg-popover">
                        <p className="text-xs">
                          <strong>Sentimento:</strong> {message.aiAnalysis.sentiment}<br />
                          <strong>Intenção:</strong> {message.aiAnalysis.intent}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <p className={cn(
                    "text-sm whitespace-pre-wrap break-words leading-relaxed",
                    message.sender === 'me' ? "text-white" : "text-foreground"
                  )}>
                    {message.content}
                  </p>
                  <div className={cn(
                    "flex items-center justify-end gap-1 mt-1.5",
                    message.sender === 'me' ? "text-white/70" : "text-muted-foreground"
                  )}>
                    <span className="text-[10px]">
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
                        className={cn(
                          "absolute -right-10 top-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                          "hover:bg-muted rounded-full"
                        )}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => setReplyingTo(message)} className="cursor-pointer">
                        <Reply className="h-4 w-4 mr-2" />
                        Responder
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Forward className="h-4 w-4 mr-2" />
                        Encaminhar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
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
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm p-4 shadow-md">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center gap-2 shrink-0">
            <div className="w-1 h-10 bg-green-500 rounded-full" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-green-600">Respondendo</span>
              <p className="text-sm text-muted-foreground truncate">{replyingTo.content}</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setReplyingTo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 bg-background border-t shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full hover:bg-muted"
              onClick={() => {/* Template selection placeholder */}}
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-full hover:bg-muted">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover">
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Image className="h-4 w-4" />
                  Imagem
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  Documento
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Video className="h-4 w-4" />
                  Vídeo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex-1 relative">
              <Input
                placeholder="Digite uma mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="pr-10 rounded-full bg-muted/50 border-muted focus-visible:ring-green-500"
              />
            </div>
            {newMessage ? (
              <Button 
                size="icon" 
                onClick={handleSendMessage} 
                className="shrink-0 h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 shadow-md"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-full hover:bg-muted">
                <Mic className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
