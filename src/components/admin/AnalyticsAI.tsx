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
  { label: "Ticket médio", prompt: "Qual o ticket médio por tipo de procedimento nos últimos 3 meses?", icon: TrendingUp },
  { label: "Metas vs Realizado", prompt: "Como estamos em relação às metas do mês? Quem está acima e abaixo?", icon: Target },
  { label: "Oportunidades", prompt: "Identifique 3 oportunidades de melhoria baseadas nos dados atuais", icon: Sparkles },
  { label: "Comparativo anual", prompt: "Compare o desempenho do mês atual com o mesmo mês do ano passado", icon: BarChart3 },
];

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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <div className="whitespace-pre-wrap">{message.content || "..."}</div>
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
