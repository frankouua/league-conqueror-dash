import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, X, Send, Trash2, Bot, User, TrendingUp, BarChart3, PieChart, Target, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: 'Análise de vendas', prompt: 'Analise as vendas deste mês comparando com o mês anterior' },
  { icon: BarChart3, label: 'Performance por equipe', prompt: 'Qual equipe está performando melhor esse mês?' },
  { icon: PieChart, label: 'Procedimentos top', prompt: 'Quais são os procedimentos mais vendidos?' },
  { icon: Target, label: 'Análise de metas', prompt: 'Como está o progresso das metas da clínica?' },
];

export function AnalyticsAIFloating() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleExpandToFullScreen = () => {
    setIsOpen(false);
    navigate('/admin?tab=analytics-ai');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('analytics-ai', {
        body: { 
          messages: [...messages, { role: 'user', content: userMessage }]
        }
      });

      if (response.error) throw new Error(response.error.message);

      const reader = response.data?.getReader?.();
      if (!reader) {
        // Non-streaming response
        if (response.data?.choices?.[0]?.message?.content) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: response.data.choices[0].message.content 
          }]);
        }
        return;
      }

      // Streaming response
      const decoder = new TextDecoder();
      let assistantMessage = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('Analytics AI error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar sua solicitação',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    
    // Trigger the AI call
    (async () => {
      setIsLoading(true);
      try {
        const response = await supabase.functions.invoke('analytics-ai', {
          body: { messages: [...messages, { role: 'user', content: prompt }] }
        });

        if (response.error) throw new Error(response.error.message);

        const reader = response.data?.getReader?.();
        if (!reader) {
          if (response.data?.choices?.[0]?.message?.content) {
            setMessages(prev => [...prev, { role: 'assistant', content: response.data.choices[0].message.content }]);
          }
          return;
        }

        const decoder = new TextDecoder();
        let assistantMessage = '';
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
                  return updated;
                });
              }
            } catch {}
          }
        }
      } catch (error) {
        console.error('Analytics AI error:', error);
        toast({ title: 'Erro', description: 'Não foi possível processar', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const clearMessages = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <>
      {/* Floating Button - Purple for Analytics AI */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-24 h-14 w-14 rounded-full shadow-lg z-50",
          "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
          "transition-all duration-300 hover:scale-110",
          isOpen && "hidden"
        )}
        title="Analytics AI - Análises Inteligentes"
      >
        <Brain className="h-6 w-6" />
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[450px] h-[650px] shadow-2xl z-50 flex flex-col border-violet-200/50">
          <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-t-lg py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Analytics AI</CardTitle>
                  <p className="text-xs text-white/80">Análises inteligentes para gestores</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handleExpandToFullScreen}
                  title="Expandir para tela cheia"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={clearMessages}
                  title="Limpar conversa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-2 flex gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                🔒 Exclusivo Gestores
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                📊 Dados em Tempo Real
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center text-muted-foreground py-6">
                    <Brain className="h-12 w-12 mx-auto mb-3 text-violet-500/50" />
                    <p className="font-medium">Olá, Gestor! 📊</p>
                    <p className="text-sm mt-1">
                      Sou sua IA de análises. Posso analisar vendas, metas, equipes e muito mais.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium px-1">Análises rápidas:</p>
                    <div className="grid gap-2">
                      {QUICK_PROMPTS.map((item, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className="justify-start h-auto py-2 px-3 text-left text-sm hover:bg-violet-50 hover:border-violet-200"
                          onClick={() => handleQuickPrompt(item.prompt)}
                        >
                          <item.icon className="h-4 w-4 mr-2 text-violet-500 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="h-7 w-7 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                          <Brain className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex gap-2 justify-start">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-3 border-t bg-background">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre vendas, metas, equipes..."
                  disabled={isLoading}
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 h-11 w-11"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
