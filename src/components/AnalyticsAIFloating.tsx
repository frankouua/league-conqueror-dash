import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, X, Send, Trash2, User, TrendingUp, BarChart3, PieChart, Target, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

// Enhanced markdown formatter for beautiful AI responses
const formatMarkdown = (text: string): string => {
  let formatted = text;
  
  // Process tables first (more sophisticated handling)
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  formatted = formatted.replace(tableRegex, (match, header, body) => {
    const headerCells = header.split('|').filter((c: string) => c.trim());
    const headerRow = `<tr class="bg-violet-500/20">${headerCells.map((c: string) => `<th class="px-2 py-1.5 text-left font-bold text-xs border-b border-violet-500/30">${c.trim()}</th>`).join('')}</tr>`;
    
    const bodyRows = body.trim().split('\n').map((row: string, idx: number) => {
      const cells = row.split('|').filter((c: string) => c.trim());
      const bgClass = idx % 2 === 0 ? 'bg-violet-900/10' : 'bg-violet-900/5';
      return `<tr class="${bgClass}">${cells.map((c: string) => `<td class="px-2 py-1 text-xs border-b border-violet-500/10">${c.trim()}</td>`).join('')}</tr>`;
    }).join('');
    
    return `<div class="overflow-x-auto my-2 rounded-lg border border-violet-500/20"><table class="w-full text-xs">${headerRow}${bodyRows}</table></div>`;
  });
  
  // Simple table rows (without separator)
  formatted = formatted.replace(/\|(.+)\|/g, (match) => {
    if (match.includes('---')) return '';
    const cells = match.split('|').filter(c => c.trim());
    return `<tr class="border-b border-violet-500/10">${cells.map(c => `<td class="px-2 py-1 text-xs">${c.trim()}</td>`).join('')}</tr>`;
  });
  
  // Headers with emojis preserved
  formatted = formatted
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-violet-200 mt-3 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-violet-100 mt-4 mb-2 pb-1 border-b border-violet-500/30">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-violet-50 mt-4 mb-2">$1</h2>');
  
  // Horizontal rules
  formatted = formatted.replace(/^---$/gm, '<hr class="my-3 border-violet-500/20" />');
  
  // Bold with highlight
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="text-violet-200 font-semibold">$1</strong>');
  
  // Lists with better styling
  formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-3 mb-0.5 flex items-start gap-1 text-xs"><span class="text-violet-400 mt-0.5">•</span><span>$1</span></li>');
  formatted = formatted.replace(/^• (.+)$/gm, '<li class="ml-3 mb-0.5 flex items-start gap-1 text-xs"><span class="text-violet-400 mt-0.5">•</span><span>$1</span></li>');
  formatted = formatted.replace(/^\* (.+)$/gm, '<li class="ml-3 mb-0.5 flex items-start gap-1 text-xs"><span class="text-violet-400 mt-0.5">•</span><span>$1</span></li>');
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-3 mb-0.5 flex items-start gap-1 text-xs"><span class="text-violet-300 font-bold min-w-[1rem]">$1.</span><span>$2</span></li>');
  
  // Wrap consecutive list items in ul
  formatted = formatted.replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ul class="my-2 space-y-0.5">$1</ul>');
  
  // Line breaks
  formatted = formatted.replace(/\n\n/g, '</p><p class="mb-2 text-xs">');
  formatted = formatted.replace(/\n/g, '<br/>');
  
  return `<div class="prose prose-invert max-w-none text-xs"><p class="mb-2 text-xs">${formatted}</p></div>`;
};

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

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = messageText.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: userMessage }],
          }),
        }
      );

      if (!resp.ok) {
        let msg = 'Não foi possível processar sua solicitação';
        try {
          const err = await resp.json();
          msg = err?.error || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      if (!resp.body) throw new Error('Resposta vazia do servidor');

      // Create assistant placeholder
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let doneAll = false;

      while (!doneAll) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            doneAll = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  const next = [...prev];
                  next[next.length - 1] = { role: 'assistant', content: assistantSoFar };
                  return next;
                }
                return prev;
              });
            }
          } catch {
            // Incomplete JSON split across chunks: put back and wait for more
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Analytics AI error:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível processar sua solicitação',
        variant: 'destructive',
      });

      // Remove placeholder assistant message if it stayed empty
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    void sendMessage(prompt);
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
          "fixed bottom-4 right-20 sm:bottom-6 sm:right-24 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-50",
          "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
          "transition-all duration-300 hover:scale-110",
          isOpen && "hidden"
        )}
        title="Analytics AI - Análises Inteligentes"
      >
        <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Chat Panel - Responsive sizing */}
      {isOpen && (
        <Card className="fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[600px] md:w-[450px] md:h-[650px] shadow-2xl z-50 flex flex-col border-violet-200/50">
          <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-t-lg py-2 sm:py-3 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Brain className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base font-semibold truncate">Analytics AI</CardTitle>
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Análises inteligentes para gestores</p>
                </div>
              </div>
              <div className="flex gap-0.5 sm:gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                  onClick={handleExpandToFullScreen}
                  title="Expandir para tela cheia"
                >
                  <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                  onClick={clearMessages}
                  title="Limpar conversa"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-2 flex gap-1.5 sm:gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-white/20 text-white text-[10px] sm:text-xs px-1.5 sm:px-2">
                🔒 Gestores
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white text-[10px] sm:text-xs px-1.5 sm:px-2">
                📊 Tempo Real
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
                          "max-w-[85%] rounded-lg px-3 py-2",
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground text-sm'
                            : 'bg-muted'
                        )}
                      >
                        {msg.role === 'assistant' ? (
                          <div 
                            className="text-xs leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: formatMarkdown(msg.content || '...') 
                            }}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
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

            <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t bg-background">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre vendas, metas..."
                  disabled={isLoading}
                  className="flex-1 min-h-[40px] sm:min-h-[44px] max-h-[100px] sm:max-h-[120px] resize-none text-sm"
                  rows={1}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 h-10 w-10 sm:h-11 sm:w-11 shrink-0"
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
