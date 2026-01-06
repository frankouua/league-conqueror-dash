import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Sparkles, Target, TrendingUp, Lightbulb, MessageSquare, Zap, Award, Clock, ArrowLeft, Brain, Heart, Shield, Phone, FileText, BookOpen, Plus, History, MoreVertical, Pencil, X, Check, Star, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommercialAssistant } from '@/hooks/useCommercialAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const QUICK_PROMPTS = [
  { icon: Target, label: 'Quebrar objeção "Vou pensar"', prompt: 'O lead disse que vai pensar. Como quebro essa objeção de forma eficaz?', color: 'text-red-500' },
  { icon: TrendingUp, label: 'Estratégia para bater meta', prompt: 'Preciso de uma estratégia urgente para bater minha meta esse mês. Analise meu contexto e sugira ações práticas.', color: 'text-green-500' },
  { icon: Lightbulb, label: 'Script de follow-up', prompt: 'Me dê um script de follow-up criativo para um lead que não responde há 3 dias.', color: 'text-yellow-500' },
  { icon: Sparkles, label: 'Motivação e energia', prompt: 'Estou desmotivado hoje. Me ajuda a recuperar a energia para vender e bater minha meta?', color: 'text-purple-500' },
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
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    clearMessages, 
    sellerContext,
    conversations,
    currentConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation,
    updateConversationTitle,
    toggleFavorite,
    favoriteMessages,
  } = useCommercialAssistant();
  const { profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch leads for script generation
  const { data: leads } = useQuery({
    queryKey: ['referral-leads-for-script', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];
      const { data, error } = await supabase
        .from('referral_leads')
        .select('*')
        .eq('team_id', profile.team_id)
        .in('status', ['nova', 'em_contato', 'agendou', 'consultou'])
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.team_id,
  });

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

  const handleEditTitle = (conversationId: string, currentTitle: string) => {
    setEditingTitle(conversationId);
    setNewTitle(currentTitle);
  };

  const handleSaveTitle = async (conversationId: string) => {
    if (newTitle.trim()) {
      await updateConversationTitle(conversationId, newTitle.trim());
    }
    setEditingTitle(null);
    setNewTitle('');
  };

  const handleGenerateScriptForLead = (leadId: string) => {
    const lead = leads?.find(l => l.id === leadId);
    if (!lead) return;
    
    const statusLabels: Record<string, string> = {
      nova: 'nova (primeiro contato)',
      em_contato: 'em contato',
      agendou: 'agendou consulta',
      consultou: 'já consultou',
    };
    
    const temperatureLabels: Record<string, string> = {
      hot: 'quente (alta urgência)',
      warm: 'morno (interesse moderado)',
      cold: 'frio (baixo interesse)',
    };
    
    const prompt = `Gere um script de abordagem personalizado para este lead:

**Nome do Lead:** ${lead.referred_name}
**Indicado por:** ${lead.referrer_name}
**Status atual:** ${statusLabels[lead.status] || lead.status}
**Temperatura:** ${lead.temperature ? temperatureLabels[lead.temperature] : 'não classificado'}
${lead.notes ? `**Notas:** ${lead.notes}` : ''}
${lead.consultation_date ? `**Data da consulta:** ${lead.consultation_date}` : ''}

Por favor, crie um script de WhatsApp ou ligação adequado para este perfil, considerando o estágio atual no funil e a temperatura do lead.`;
    
    sendMessage(prompt);
    setScriptDialogOpen(false);
    setSelectedLeadId(null);
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Conversation History Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-220px)]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {showFavorites ? (
                      <>
                        <Star className="h-5 w-5 text-yellow-500" />
                        Favoritos
                      </>
                    ) : (
                      <>
                        <History className="h-5 w-5 text-amber-500" />
                        Conversas
                      </>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant={showFavorites ? "default" : "ghost"}
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setShowFavorites(!showFavorites)}
                      title={showFavorites ? "Ver conversas" : "Ver favoritos"}
                    >
                      <Star className={cn("h-4 w-4", showFavorites && "text-yellow-400")} />
                    </Button>
                    {!showFavorites && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={startNewConversation}
                        title="Nova conversa"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="px-4 pb-4 space-y-2">
                    {showFavorites ? (
                      favoriteMessages?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhum favorito ainda
                        </p>
                      ) : (
                        favoriteMessages?.map((msg) => (
                          <div
                            key={msg.id}
                            className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                            onClick={() => {
                              if (msg.conversation_id) {
                                loadConversation(msg.conversation_id);
                                setShowFavorites(false);
                              }
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <Star className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm line-clamp-3">{msg.content}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(msg.created_at), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      conversations?.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Nenhuma conversa ainda
                        </p>
                      ) : (
                        conversations?.map((conv) => (
                        <div
                          key={conv.id}
                          className={cn(
                            "group relative p-3 rounded-lg cursor-pointer transition-colors",
                            currentConversationId === conv.id
                              ? "bg-amber-500/10 border border-amber-500/30"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => loadConversation(conv.id)}
                        >
                          {editingTitle === conv.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="h-7 text-sm"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveTitle(conv.id);
                                  if (e.key === 'Escape') setEditingTitle(null);
                                }}
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveTitle(conv.id);
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTitle(null);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium truncate pr-8">{conv.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(conv.updated_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </p>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTitle(conv.id, conv.title);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Renomear
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta ação não pode ser desfeita. A conversa será permanentemente excluída.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          onClick={() => deleteConversation(conv.id)}
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                        ))
                      )
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-220px)] flex flex-col">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bot className="h-6 w-6" />
                    <div>
                      <CardTitle className="text-lg">
                        {currentConversationId 
                          ? conversations?.find(c => c.id === currentConversationId)?.title || 'Chat'
                          : 'Nova Conversa'}
                      </CardTitle>
                      <CardDescription className="text-white/80">
                        Pergunte sobre estratégias, scripts e objeções
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={startNewConversation}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova
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
                        {QUICK_PROMPTS.map((item, i) => (
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
                          key={msg.id || i}
                          className={cn(
                            "flex gap-3 group",
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {msg.role === 'assistant' && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                              <Bot className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div className="relative max-w-[80%]">
                            <div
                              className={cn(
                                "rounded-lg px-4 py-3",
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                            </div>
                            {msg.id && msg.role === 'assistant' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "absolute -right-10 top-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                                  msg.is_favorite && "opacity-100"
                                )}
                                onClick={() => toggleFavorite(msg.id!, msg.is_favorite || false)}
                                title={msg.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                              >
                                <Star className={cn(
                                  "h-4 w-4",
                                  msg.is_favorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                                )} />
                              </Button>
                            )}
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
                      placeholder="Digite sua pergunta... (Enter para enviar)"
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

          {/* Right Sidebar */}
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
                    <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", getProgressColor())} style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                    </div>
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
                {/* Script Generator for Leads */}
                <Dialog open={scriptDialogOpen} onOpenChange={setScriptDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full mb-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Gerar Script para Lead
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Gerar Script Personalizado</DialogTitle>
                      <DialogDescription>
                        Selecione um lead para gerar um script de abordagem personalizado baseado no perfil.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Select value={selectedLeadId || ''} onValueChange={setSelectedLeadId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um lead" />
                        </SelectTrigger>
                        <SelectContent>
                          {leads?.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              <div className="flex items-center gap-2">
                                <span>{lead.referred_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {lead.status}
                                </Badge>
                                {lead.temperature && (
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      "text-xs",
                                      lead.temperature === 'hot' && "bg-red-500/20 text-red-600",
                                      lead.temperature === 'warm' && "bg-yellow-500/20 text-yellow-600",
                                      lead.temperature === 'cold' && "bg-blue-500/20 text-blue-600"
                                    )}
                                  >
                                    {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '🟡' : '🔵'}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {leads?.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Nenhum lead ativo encontrado.
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setScriptDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        disabled={!selectedLeadId}
                        onClick={() => selectedLeadId && handleGenerateScriptForLead(selectedLeadId)}
                      >
                        Gerar Script
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

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
                <Link to="/referral-leads">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <MessageSquare className="h-4 w-4" />
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
