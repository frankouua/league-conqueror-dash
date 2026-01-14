import { useState, useRef, useEffect, forwardRef, memo } from 'react';
import { MessageCircle, X, Send, Trash2, Sparkles, Target, TrendingUp, Lightbulb, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCommercialAssistant } from '@/hooks/useCommercialAssistant';
import { cn } from '@/lib/utils';

const QUICK_PROMPTS = [
  { icon: Target, label: 'Quebrar objeção', prompt: 'O lead disse que vai pensar. Como quebro essa objeção?' },
  { icon: TrendingUp, label: 'Estratégia de meta', prompt: 'Preciso de uma estratégia para bater minha meta esse mês. O que você sugere?' },
  { icon: Lightbulb, label: 'Script de follow-up', prompt: 'Me dê um script de follow-up para um lead que não responde há 3 dias.' },
  { icon: Sparkles, label: 'Motivação', prompt: 'Estou desmotivado hoje. Me ajuda a recuperar a energia para vender?' },
];

const CommercialAssistantComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, error, sendMessage, clearMessages, sellerContext } = useCommercialAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* Floating Button - Responsive positioning */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-50",
          "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
          "transition-all duration-300 hover:scale-110",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>

      {/* Chat Panel - Responsive sizing */}
      {isOpen && (
        <Card className="fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[550px] md:w-[400px] md:h-[600px] shadow-2xl z-50 flex flex-col border-amber-200/50">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg py-2 sm:py-3 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base font-semibold truncate">Assistente Comercial</CardTitle>
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Seu coach de vendas IA</p>
                </div>
              </div>
              <div className="flex gap-0.5 sm:gap-1 shrink-0">
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
            
            {/* Seller Context - Compact on mobile */}
            {sellerContext && sellerContext.monthlyGoal && sellerContext.monthlyGoal > 0 && (
              <div className="mt-2 flex gap-1.5 sm:gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-white/20 text-white text-[10px] sm:text-xs px-1.5 sm:px-2">
                  Meta: R$ {(sellerContext.monthlyGoal / 1000).toFixed(0)}k
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white text-[10px] sm:text-xs px-1.5 sm:px-2">
                  {sellerContext.progress?.toFixed(0)}%
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white text-[10px] sm:text-xs px-1.5 sm:px-2">
                  {sellerContext.daysRemaining}d
                </Badge>
              </div>
            )}
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center text-muted-foreground py-6">
                    <Bot className="h-12 w-12 mx-auto mb-3 text-amber-500/50" />
                    <p className="font-medium">Olá! 👋</p>
                    <p className="text-sm mt-1">
                      Sou seu assistente comercial. Como posso te ajudar a vender mais hoje?
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium px-1">Sugestões rápidas:</p>
                    <div className="grid gap-2">
                      {QUICK_PROMPTS.map((item, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className="justify-start h-auto py-2 px-3 text-left text-sm hover:bg-amber-50 hover:border-amber-200"
                          onClick={() => handleQuickPrompt(item.prompt)}
                        >
                          <item.icon className="h-4 w-4 mr-2 text-amber-500 shrink-0" />
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
                        <div className="h-7 w-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-white" />
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
                      <div className="h-7 w-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {error && (
              <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua dúvida..."
                  disabled={isLoading}
                  className="flex-1 h-9 sm:h-10 text-sm"
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-9 w-9 sm:h-10 sm:w-10 shrink-0"
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
};

// Memoized and forwardRef-compatible export to prevent ref warnings
export const CommercialAssistant = memo(forwardRef<HTMLDivElement, Record<string, never>>((_, ref) => {
  return (
    <div ref={ref}>
      <CommercialAssistantComponent />
    </div>
  );
}));

CommercialAssistant.displayName = 'CommercialAssistant';
