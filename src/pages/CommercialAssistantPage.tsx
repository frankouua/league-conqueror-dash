import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Sparkles, Target, TrendingUp, Lightbulb, MessageSquare, Zap, Award, Users, Clock, ArrowLeft, Brain, Flame, Heart, Shield, Phone, MessageCircle, FileText, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCommercialAssistant } from '@/hooks/useCommercialAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';

const QUICK_PROMPTS = [
  { 
    icon: Target, 
    label: 'Quebrar objeção "Vou pensar"', 
    prompt: 'O lead disse que vai pensar. Como quebro essa objeção de forma eficaz?',
    color: 'text-red-500'
  },
  { 
    icon: TrendingUp, 
    label: 'Estratégia para bater meta', 
    prompt: 'Preciso de uma estratégia urgente para bater minha meta esse mês. Analise meu contexto e sugira ações práticas.',
    color: 'text-green-500'
  },
  { 
    icon: Lightbulb, 
    label: 'Script de follow-up', 
    prompt: 'Me dê um script de follow-up criativo para um lead que não responde há 3 dias.',
    color: 'text-yellow-500'
  },
  { 
    icon: Sparkles, 
    label: 'Motivação e energia', 
    prompt: 'Estou desmotivado hoje. Me ajuda a recuperar a energia para vender e bater minha meta?',
    color: 'text-purple-500'
  },
  { 
    icon: MessageSquare, 
    label: 'Apresentar Unique Day', 
    prompt: 'Como apresento o Unique Day de forma irresistível para um lead qualificado?',
    color: 'text-blue-500'
  },
  { 
    icon: Zap, 
    label: 'Qualificação BANT', 
    prompt: 'Me explique como usar o método BANT para qualificar leads de forma rápida e eficiente.',
    color: 'text-orange-500'
  },
  { 
    icon: Phone, 
    label: 'Script primeira ligação', 
    prompt: 'Me dê um script completo para a primeira ligação com um lead novo.',
    color: 'text-cyan-500'
  },
  { 
    icon: Shield, 
    label: 'Objeção "está caro"', 
    prompt: 'O lead disse que está caro. Como mostro o valor e justifico o investimento?',
    color: 'text-pink-500'
  },
];

const CATEGORY_PROMPTS = {
  objections: [
    { label: '"Vou pensar"', prompt: 'Como quebrar a objeção "vou pensar" de forma elegante?' },
    { label: '"Está caro"', prompt: 'O lead disse que está caro. Como contornar?' },
    { label: '"Não tenho tempo"', prompt: 'O lead disse que não tem tempo. Como responder?' },
    { label: '"Preciso pesquisar mais"', prompt: 'O lead quer pesquisar mais. Como responder?' },
    { label: '"Meu marido não quer"', prompt: 'A paciente disse que o marido não quer. Como ajudá-la?' },
    { label: '"Tenho medo de cirurgia"', prompt: 'A paciente tem medo de cirurgia. Como tranquilizá-la?' },
  ],
  scripts: [
    { label: 'Primeira ligação', prompt: 'Me dê um script completo para a primeira ligação com um lead.' },
    { label: 'WhatsApp inicial', prompt: 'Script de WhatsApp para lead que não atendeu a ligação.' },
    { label: 'Apresentar valores', prompt: 'Como apresentar os valores do Unique Day de forma persuasiva?' },
    { label: 'Follow-up D+1', prompt: 'Script de follow-up para o dia seguinte ao primeiro contato.' },
    { label: 'Última tentativa', prompt: 'Script de última tentativa para lead que não responde há 7 dias.' },
    { label: 'Reativação', prompt: 'Script para reativar lead inativo há mais de 30 dias.' },
  ],
  strategy: [
    { label: 'Planejamento semanal', prompt: 'Me ajude a criar um planejamento semanal para maximizar vendas.' },
    { label: 'Priorizar leads', prompt: 'Como priorizar meus leads da carteira hoje?' },
    { label: 'Aumentar conversão', prompt: 'Estratégias para aumentar minha taxa de conversão.' },
    { label: 'Gestão de tempo', prompt: 'Como organizar meu dia para ser mais produtiva?' },
    { label: 'Recuperar mês fraco', prompt: 'Estou abaixo da meta. O que fazer para recuperar?' },
    { label: 'Manter consistência', prompt: 'Como manter a consistência nas vendas ao longo do mês?' },
  ],
};

export default function CommercialAssistantPage() {
  const [input, setInput] = useState('');
  const { messages, isLoading, error, sendMessage, clearMessages, sellerContext } = useCommercialAssistant();
  const { profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const progressPercent = sellerContext?.progress || 0;
  const getProgressColor = () => {
    if (progressPercent >= 100) return 'bg-green-500';
    if (progressPercent >= 80) return 'bg-emerald-500';
    if (progressPercent >= 60) return 'bg-yellow-500';
    if (progressPercent >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Assistente Comercial IA</h1>
              <p className="text-muted-foreground text-sm">Seu coach de vendas personalizado</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-220px)] flex flex-col">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="h-6 w-6" />
                    <div>
                      <CardTitle className="text-lg">Chat com Assistente</CardTitle>
                      <CardDescription className="text-white/80">
                        Pergunte sobre estratégias, scripts e objeções
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={clearMessages}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                        <Bot className="h-10 w-10 text-amber-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Olá, {profile?.full_name?.split(' ')[0]}! 👋</h3>
                      <p className="text-muted-foreground max-w-md mb-6">
                        Sou seu assistente comercial. Posso te ajudar com estratégias de venda, 
                        quebrar objeções, criar scripts e muito mais.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                        {QUICK_PROMPTS.slice(0, 4).map((item, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleQuickPrompt(item.prompt)}
                          >
                            <item.icon className={cn("h-4 w-4", item.color)} />
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-3",
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {msg.role === 'assistant' && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                              <Bot className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg px-4 py-3",
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                          </div>
                          {msg.role === 'user' && (
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex gap-3 justify-start">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <div className="bg-muted rounded-lg px-4 py-3">
                            <div className="flex gap-1.5">
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

                <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
                  <div className="flex gap-3">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua pergunta... (Enter para enviar, Shift+Enter para nova linha)"
                      disabled={isLoading}
                      className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                      rows={2}
                    />
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={isLoading || !input.trim()}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-auto"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Context Card */}
            {sellerContext && sellerContext.monthlyGoal && sellerContext.monthlyGoal > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Seu Contexto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progresso da Meta</span>
                      <span className="font-bold">{progressPercent.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(progressPercent, 100)} className="h-3" />
                    <div className={cn("h-3 rounded-full -mt-3", getProgressColor())} style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs">Meta</p>
                      <p className="font-bold text-primary">
                        R$ {sellerContext.monthlyGoal.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs">Realizado</p>
                      <p className="font-bold">
                        R$ {(sellerContext.currentRevenue || 0).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Dias restantes:</span>
                    <Badge variant="secondary" className="font-bold">
                      {sellerContext.daysRemaining}
                    </Badge>
                  </div>

                  {sellerContext.daysRemaining && sellerContext.monthlyGoal && sellerContext.currentRevenue !== undefined && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Precisa por dia:</p>
                      <p className="font-bold text-amber-600">
                        R$ {Math.max(0, Math.ceil((sellerContext.monthlyGoal - sellerContext.currentRevenue) / sellerContext.daysRemaining)).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="objections" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-3">
                    <TabsTrigger value="objections" className="text-xs">Objeções</TabsTrigger>
                    <TabsTrigger value="scripts" className="text-xs">Scripts</TabsTrigger>
                    <TabsTrigger value="strategy" className="text-xs">Estratégia</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="objections" className="space-y-2 mt-0">
                    {CATEGORY_PROMPTS.objections.map((item, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm h-auto py-2"
                        onClick={() => handleQuickPrompt(item.prompt)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="scripts" className="space-y-2 mt-0">
                    {CATEGORY_PROMPTS.scripts.map((item, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm h-auto py-2"
                        onClick={() => handleQuickPrompt(item.prompt)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="strategy" className="space-y-2 mt-0">
                    {CATEGORY_PROMPTS.strategy.map((item, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm h-auto py-2"
                        onClick={() => handleQuickPrompt(item.prompt)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-amber-500" />
                  Recursos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/guias-comerciais">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FileText className="h-4 w-4" />
                    Scripts Comerciais
                  </Button>
                </Link>
                <Link to="/patient-kanban">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Users className="h-4 w-4" />
                    Kanban de Leads
                  </Button>
                </Link>
                <Link to="/referral-leads">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Heart className="h-4 w-4" />
                    Indicações
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
