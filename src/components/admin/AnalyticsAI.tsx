import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Send, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  Users, 
  Target,
  Trash2,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "Resumo do mês", prompt: "Faça um resumo executivo do mês atual com principais métricas de vendas", icon: BarChart3 },
  { label: "Top vendedores", prompt: "Quem são os top 5 vendedores do mês atual e quanto cada um vendeu?", icon: Users },
  { label: "De onde vêm os pacientes?", prompt: "Analise a origem dos pacientes. De onde eles vêm? Quais canais trazem mais pacientes e maior faturamento?", icon: TrendingUp },
  { label: "Metas vs Realizado", prompt: "Como estamos em relação às metas do mês? Quem está acima e abaixo?", icon: Target },
  { label: "Quem mais indica?", prompt: "Quem são as pessoas que mais indicam pacientes? Qual o valor gerado por cada indicador?", icon: Users },
  { label: "Procedimentos 2025", prompt: "Liste os procedimentos executados em 2025 por nome, quantidade e valor total", icon: BarChart3 },
  { label: "Top Cidades", prompt: "Quais são as cidades que mais trazem pacientes? Analise geograficamente nossa base", icon: Target },
  { label: "Perfil do paciente", prompt: "Qual o perfil típico do nosso paciente? Idade, profissão, objetivos, motivações", icon: Sparkles },
];

// Enhanced markdown formatter for beautiful AI responses
const formatMarkdown = (text: string): string => {
  let formatted = text;
  
  // Process tables first (more sophisticated handling)
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  formatted = formatted.replace(tableRegex, (match, header, body) => {
    const headerCells = header.split('|').filter((c: string) => c.trim());
    const headerRow = `<tr class="bg-gradient-to-r from-violet-500/20 to-purple-500/20">${headerCells.map((c: string) => `<th class="px-4 py-3 text-left font-bold text-violet-100 border-b border-violet-500/30">${c.trim()}</th>`).join('')}</tr>`;
    
    const bodyRows = body.trim().split('\n').map((row: string, idx: number) => {
      const cells = row.split('|').filter((c: string) => c.trim());
      const bgClass = idx % 2 === 0 ? 'bg-violet-900/10' : 'bg-violet-900/5';
      return `<tr class="${bgClass} hover:bg-violet-500/10 transition-colors">${cells.map((c: string) => `<td class="px-4 py-3 border-b border-violet-500/10">${c.trim()}</td>`).join('')}</tr>`;
    }).join('');
    
    return `<div class="overflow-x-auto my-4 rounded-xl border border-violet-500/20 shadow-lg"><table class="w-full text-sm">${headerRow}${bodyRows}</table></div>`;
  });
  
  // Simple table rows (without separator)
  formatted = formatted.replace(/\|(.+)\|/g, (match) => {
    if (match.includes('---')) return '';
    const cells = match.split('|').filter(c => c.trim());
    return `<tr class="border-b border-violet-500/10">${cells.map(c => `<td class="px-3 py-2">${c.trim()}</td>`).join('')}</tr>`;
  });
  
  // Headers with emojis preserved
  formatted = formatted
    .replace(/^### (.+)$/gm, '<h4 class="text-lg font-bold text-violet-200 mt-6 mb-3 flex items-center gap-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-xl font-bold text-violet-100 mt-6 mb-4 pb-2 border-b border-violet-500/30 flex items-center gap-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-2xl font-bold text-violet-50 mt-6 mb-4">$1</h2>');
  
  // Horizontal rules
  formatted = formatted.replace(/^---$/gm, '<hr class="my-4 border-violet-500/20" />');
  
  // Bold with highlight
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="text-violet-200 font-semibold">$1</strong>');
  
  // Lists with better styling
  formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4 mb-1 flex items-start gap-2"><span class="text-violet-400 mt-1">•</span><span>$1</span></li>');
  formatted = formatted.replace(/^• (.+)$/gm, '<li class="ml-4 mb-1 flex items-start gap-2"><span class="text-violet-400 mt-1">•</span><span>$1</span></li>');
  formatted = formatted.replace(/^\* (.+)$/gm, '<li class="ml-4 mb-1 flex items-start gap-2"><span class="text-violet-400 mt-1">•</span><span>$1</span></li>');
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1 flex items-start gap-2"><span class="text-violet-300 font-bold min-w-[1.5rem]">$1.</span><span>$2</span></li>');
  
  // Wrap consecutive list items in ul
  formatted = formatted.replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ul class="my-3 space-y-1">$1</ul>');
  
  // Line breaks
  formatted = formatted.replace(/\n\n/g, '</p><p class="mb-3">');
  formatted = formatted.replace(/\n/g, '<br/>');
  
  return `<div class="prose prose-invert max-w-none"><p class="mb-3">${formatted}</p></div>`;
};

export function AnalyticsAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: messageText,
            conversationHistory: messages,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar pergunta");
      }

      if (!response.body) {
        throw new Error("Resposta vazia do servidor");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Add empty assistant message to update progressively
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return prev;
              });
            }
          } catch {
            // Incomplete JSON, wait for more data
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Analytics AI error:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pergunta");
      // Remove empty assistant message if error
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    toast.success("Conversa limpa");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Analytics AI</h2>
            <p className="text-sm text-muted-foreground">
              Análise inteligente dos dados da clínica
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearConversation}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Sugestões de perguntas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-auto py-3 px-4 justify-start text-left"
                  onClick={() => sendMessage(prompt.prompt)}
                  disabled={isLoading}
                >
                  <prompt.icon className="w-4 h-4 mr-2 flex-shrink-0 text-primary" />
                  <span className="text-sm">{prompt.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Area */}
      <Card className="flex flex-col h-[600px]">
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Comece uma conversa</p>
                <p className="text-sm">
                  Faça perguntas sobre vendas, metas, performance e mais
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>table]:w-full [&>table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_td]:border [&_td]:border-border [&_td]:p-2 [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-2 [&>h4]:text-sm [&>h4]:font-medium [&>h4]:mt-3 [&>strong]:text-primary">
                          <div 
                            className="whitespace-pre-wrap text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: formatMarkdown(message.content || "...") 
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Faça uma pergunta sobre os dados..."
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isLoading}
                className="h-[44px] w-[44px] flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Baseado nos dados dos últimos 12 meses • Atualizado em tempo real
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats badges */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge variant="outline" className="text-xs">
          <BarChart3 className="w-3 h-3 mr-1" />
          Vendas e Receitas
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Target className="w-3 h-3 mr-1" />
          Metas e Performance
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Users className="w-3 h-3 mr-1" />
          Clientes RFV
        </Badge>
        <Badge variant="outline" className="text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          Procedimentos
        </Badge>
      </div>
    </div>
  );
}
