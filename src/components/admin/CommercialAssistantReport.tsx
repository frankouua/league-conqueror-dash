import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Brain, MessageSquare, User, Search, Filter, TrendingUp, 
  BarChart3, Clock, Star, AlertCircle, Lightbulb, Target,
  ChevronDown, ChevronRight, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationWithUser {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  message_count: number;
}

interface MessageWithContext {
  id: string;
  role: string;
  content: string;
  created_at: string;
  is_favorite: boolean;
  conversation_id: string;
  conversation_title: string;
  user_name: string;
}

// Common patterns to detect in messages
const PATTERN_KEYWORDS = {
  objections: ['objeção', 'vou pensar', 'está caro', 'caro demais', 'não tenho tempo', 'marido', 'medo', 'depois'],
  scripts: ['script', 'abordagem', 'whatsapp', 'mensagem', 'ligação', 'follow-up', 'followup'],
  strategy: ['estratégia', 'meta', 'bater meta', 'planejamento', 'priorizar', 'organizar'],
  motivation: ['motivação', 'desmotivado', 'energia', 'cansado', 'difícil', 'frustrado'],
  leads: ['lead', 'cliente', 'paciente', 'prospect', 'indicação'],
};

export function CommercialAssistantReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('30');
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [selectedConversationForView, setSelectedConversationForView] = useState<string | null>(null);

  // Fetch all users who have conversations
  const { data: usersWithConversations } = useQuery({
    queryKey: ['admin-commercial-assistant-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('user_id')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get unique user IDs
      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      
      if (userIds.length === 0) return [];
      
      // Fetch user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      if (profileError) throw profileError;
      
      return profiles || [];
    },
  });

  // Fetch conversations with user info
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['admin-commercial-conversations', selectedUser, dateFilter],
    queryFn: async () => {
      const daysAgo = parseInt(dateFilter);
      const startDate = subDays(new Date(), daysAgo).toISOString();

      let query = supabase
        .from('ai_conversations')
        .select('*')
        .gte('created_at', startDate)
        .order('updated_at', { ascending: false });

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data: convData, error } = await query;
      if (error) throw error;

      // Get message counts for each conversation
      const conversationsWithDetails: ConversationWithUser[] = [];
      
      for (const conv of convData || []) {
        const { count } = await supabase
          .from('ai_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        const user = usersWithConversations?.find(u => u.user_id === conv.user_id);
        
        conversationsWithDetails.push({
          ...conv,
          user_name: user?.full_name || 'Usuário',
          user_email: user?.email || '',
          message_count: count || 0,
        });
      }

      return conversationsWithDetails;
    },
    enabled: !!usersWithConversations,
  });

  // Fetch all messages for analysis
  const { data: allMessages } = useQuery({
    queryKey: ['admin-commercial-messages-analysis', selectedUser, dateFilter],
    queryFn: async () => {
      const daysAgo = parseInt(dateFilter);
      const startDate = subDays(new Date(), daysAgo).toISOString();

      // First get conversation IDs in the date range
      let convQuery = supabase
        .from('ai_conversations')
        .select('id, title, user_id')
        .gte('created_at', startDate);

      if (selectedUser !== 'all') {
        convQuery = convQuery.eq('user_id', selectedUser);
      }

      const { data: convs, error: convError } = await convQuery;
      if (convError) throw convError;

      if (!convs || convs.length === 0) return [];

      const convIds = convs.map(c => c.id);

      // Fetch messages from these conversations
      const { data: messages, error } = await supabase
        .from('ai_messages')
        .select('*')
        .in('conversation_id', convIds)
        .eq('role', 'user')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with conversation and user info
      const enrichedMessages: MessageWithContext[] = (messages || []).map(msg => {
        const conv = convs.find(c => c.id === msg.conversation_id);
        const user = usersWithConversations?.find(u => u.user_id === conv?.user_id);
        return {
          ...msg,
          conversation_title: conv?.title || 'Conversa',
          user_name: user?.full_name || 'Usuário',
        };
      });

      return enrichedMessages;
    },
    enabled: !!usersWithConversations,
  });

  // Fetch messages for a specific conversation
  const { data: conversationMessages, isLoading: loadingMessages } = useQuery({
    queryKey: ['admin-conversation-messages', selectedConversationForView],
    queryFn: async () => {
      if (!selectedConversationForView) return [];
      
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', selectedConversationForView)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedConversationForView,
  });

  // Analyze patterns in messages
  const patternAnalysis = (() => {
    if (!allMessages) return null;

    const analysis: Record<string, { count: number; examples: string[] }> = {
      objections: { count: 0, examples: [] },
      scripts: { count: 0, examples: [] },
      strategy: { count: 0, examples: [] },
      motivation: { count: 0, examples: [] },
      leads: { count: 0, examples: [] },
    };

    allMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      Object.entries(PATTERN_KEYWORDS).forEach(([category, keywords]) => {
        if (keywords.some(kw => content.includes(kw))) {
          analysis[category].count++;
          if (analysis[category].examples.length < 5) {
            analysis[category].examples.push(msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : ''));
          }
        }
      });
    });

    return analysis;
  })();

  // Filter conversations by search
  const filteredConversations = conversations?.filter(conv => 
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalConversations = conversations?.length || 0;
  const totalMessages = allMessages?.length || 0;
  const uniqueUsers = new Set(conversations?.map(c => c.user_id)).size;
  const avgMessagesPerConversation = totalConversations > 0 
    ? Math.round(totalMessages / totalConversations * 10) / 10 
    : 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'objections': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'scripts': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'strategy': return <Target className="h-4 w-4 text-green-500" />;
      case 'motivation': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'leads': return <User className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'objections': return 'Objeções';
      case 'scripts': return 'Scripts';
      case 'strategy': return 'Estratégia';
      case 'motivation': return 'Motivação';
      case 'leads': return 'Leads';
      default: return category;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
            <MessageSquare className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Relatório de Conversas IA</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe o que os colaboradores estão perguntando ao Assistente Comercial
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <MessageSquare className="h-3 w-3 mr-1" />
            Assistente Comercial
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[200px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {usersWithConversations?.map(user => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Conversas</p>
                <p className="text-2xl font-bold">{totalConversations}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensagens</p>
                <p className="text-2xl font-bold">{totalMessages}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                <p className="text-2xl font-bold">{uniqueUsers}</p>
              </div>
              <User className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média Msg/Conversa</p>
                <p className="text-2xl font-bold">{avgMessagesPerConversation}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analysis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análise de Padrões
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversas
          </TabsTrigger>
        </TabsList>

        {/* Pattern Analysis Tab */}
        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {patternAnalysis && Object.entries(patternAnalysis).map(([category, data]) => (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                    <Badge variant="secondary" className="ml-auto">
                      {data.count} menções
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.examples.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-2">
                        Exemplos de perguntas:
                      </p>
                      {data.examples.map((example, idx) => (
                        <div 
                          key={idx} 
                          className="text-sm p-2 rounded-lg bg-muted/50 border border-border"
                        >
                          "{example}"
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma menção encontrada no período
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Key Insights */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Insights Principais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {patternAnalysis && (
                  <>
                    {patternAnalysis.objections.count > patternAnalysis.strategy.count * 2 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                        <p className="text-sm">
                          <strong>Alta demanda por quebra de objeções.</strong> Considere criar um treinamento focado ou material de apoio específico.
                        </p>
                      </div>
                    )}
                    
                    {patternAnalysis.motivation.count > 5 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0" />
                        <p className="text-sm">
                          <strong>Vendedores buscando motivação.</strong> Pode indicar necessidade de maior suporte ou reconhecimento da equipe.
                        </p>
                      </div>
                    )}
                    
                    {patternAnalysis.scripts.count > 10 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <MessageSquare className="h-5 w-5 text-blue-500 shrink-0" />
                        <p className="text-sm">
                          <strong>Alta busca por scripts.</strong> A equipe pode se beneficiar de uma biblioteca de scripts prontos.
                        </p>
                      </div>
                    )}
                    
                    {totalMessages === 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted border">
                        <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          Nenhuma conversa encontrada no período selecionado.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Conversas</CardTitle>
              <CardDescription>
                Todas as conversas do assistente comercial
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredConversations?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma conversa encontrada
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredConversations?.map(conv => (
                      <div 
                        key={conv.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedConversation(
                            expandedConversation === conv.id ? null : conv.id
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {expandedConversation === conv.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{conv.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{conv.user_name}</span>
                                <span>•</span>
                                <span>{format(new Date(conv.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {conv.message_count} msgs
                            </Badge>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedConversationForView(conv.id);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    {conv.title}
                                  </DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="h-[60vh] pr-4">
                                  {loadingMessages ? (
                                    <div className="flex items-center justify-center py-8">
                                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {conversationMessages?.map(msg => (
                                        <div
                                          key={msg.id}
                                          className={cn(
                                            "flex gap-3",
                                            msg.role === 'user' ? "justify-end" : "justify-start"
                                          )}
                                        >
                                          <div className={cn(
                                            "max-w-[85%] rounded-lg p-3",
                                            msg.role === 'user' 
                                              ? "bg-primary text-primary-foreground"
                                              : "bg-muted"
                                          )}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            <p className={cn(
                                              "text-xs mt-1",
                                              msg.role === 'user' 
                                                ? "text-primary-foreground/70"
                                                : "text-muted-foreground"
                                            )}>
                                              {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        
                        {expandedConversation === conv.id && (
                          <div className="px-4 pb-3 pt-0 bg-muted/30 border-t">
                            <p className="text-sm text-muted-foreground py-2">
                              <strong>Usuário:</strong> {conv.user_name} ({conv.user_email})
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Criado:</strong> {format(new Date(conv.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
