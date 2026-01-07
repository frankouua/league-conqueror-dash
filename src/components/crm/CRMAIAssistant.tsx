import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Sparkles, Brain, Loader2, Send, MessageSquare,
  Target, TrendingUp, AlertTriangle, CheckCircle2,
  Copy, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CRMAIAssistantProps {
  leadContext?: {
    name: string;
    stage?: string;
    procedures?: string[];
    notes?: string;
    estimatedValue?: number;
    sentiment?: string;
  };
}

export function CRMAIAssistant({ leadContext }: CRMAIAssistantProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  // AI mutation for getting responses
  const aiMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const context = leadContext 
        ? `Contexto do lead: Nome: ${leadContext.name}, Estágio: ${leadContext.stage || 'N/A'}, 
           Procedimentos de interesse: ${leadContext.procedures?.join(', ') || 'N/A'},
           Valor estimado: R$ ${leadContext.estimatedValue || 'N/A'},
           Sentimento: ${leadContext.sentiment || 'N/A'},
           Anotações: ${leadContext.notes || 'Nenhuma'}`
        : '';

      const { data, error } = await supabase.functions.invoke('commercial-ai-assistant', {
        body: {
          message: userMessage,
          context: context,
          sellerName: profile?.full_name || 'Vendedor',
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
        },
      });

      if (error) throw error;
      return data.response || data.message || 'Desculpe, não consegui processar sua solicitação.';
    },
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
    },
    onError: (error) => {
      console.error('AI Error:', error);
      toast.error('Erro ao consultar IA');
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, houve um erro ao processar sua solicitação. Tente novamente.',
        timestamp: new Date(),
      }]);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    aiMutation.mutate(input.trim());
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const quickPrompts = [
    { label: 'Script de abertura', prompt: 'Me dê um script de abertura para primeiro contato com esse lead' },
    { label: 'Contornar objeção', prompt: 'Como contornar a objeção "está caro"?' },
    { label: 'Mensagem WhatsApp', prompt: 'Crie uma mensagem de WhatsApp para retomar contato' },
    { label: 'Proposta de valor', prompt: 'Qual a melhor proposta de valor para esse perfil de cliente?' },
  ];

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Assistente IA
            </CardTitle>
            <CardDescription>
              {leadContext 
                ? `Contexto: ${leadContext.name}` 
                : 'Tire dúvidas e receba sugestões de vendas'}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            GPT
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4 mb-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Brain className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">
                Olá! Como posso ajudar?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Faça perguntas sobre vendas, peça scripts ou tire dúvidas.
              </p>
              
              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2 justify-center">
                {quickPrompts.map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setInput(prompt.prompt);
                    }}
                  >
                    {prompt.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg p-3",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => copyToClipboard(message.content)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {aiMutation.isPending && (
                <div className="flex gap-3">
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="shrink-0 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Faça uma pergunta..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={aiMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || aiMutation.isPending}
            className="shrink-0"
          >
            {aiMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
