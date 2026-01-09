import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, Clock, Calendar, Phone, Bell, 
  ChevronRight, CheckCircle2, RefreshCw, Flame,
  DollarSign, TrendingDown, Stethoscope, UserPlus,
  Eye, X, Filter, PlayCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CRMNotification {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  team_id: string | null;
  notification_type: string;
  title: string;
  message: string;
  metadata: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  crm_leads?: {
    id: string;
    name: string;
    phone: string | null;
    estimated_value: number | null;
  };
}

interface CRMAlertsDashboardProps {
  onLeadClick?: (leadId: string) => void;
  compact?: boolean;
}

export function CRMAlertsDashboard({ onLeadClick, compact = false }: CRMAlertsDashboardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-alerts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_notifications')
        .select(`
          *,
          crm_leads (id, name, phone, estimated_value)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CRMNotification[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('crm_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-alerts'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('crm_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-alerts'] });
      toast({ title: 'Todas as notificações marcadas como lidas' });
    },
  });

  // Run alert check manually
  const runAlertCheck = async () => {
    setIsRunningCheck(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-crm-alerts');
      if (error) throw error;
      
      toast({
        title: '✅ Verificação concluída',
        description: `${data.totalNotifications} novos alertas criados`,
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro na verificação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunningCheck(false);
    }
  };

  // Get icon and color for notification type
  const getAlertStyle = (type: string) => {
    const styles: Record<string, { icon: any; color: string; bgColor: string; priority: string }> = {
      stale_lead_5d: { 
        icon: Clock, 
        color: 'text-yellow-500', 
        bgColor: 'bg-yellow-500/10 border-yellow-500/50',
        priority: 'warning' 
      },
      stale_lead_7d: { 
        icon: TrendingDown, 
        color: 'text-red-500', 
        bgColor: 'bg-red-500/10 border-red-500/50',
        priority: 'critical' 
      },
      negative_sentiment: { 
        icon: AlertTriangle, 
        color: 'text-red-500', 
        bgColor: 'bg-red-500/10 border-red-500/50',
        priority: 'critical' 
      },
      ready_conversion: { 
        icon: CheckCircle2, 
        color: 'text-green-500', 
        bgColor: 'bg-green-500/10 border-green-500/50',
        priority: 'opportunity' 
      },
      high_value_pending: { 
        icon: DollarSign, 
        color: 'text-amber-500', 
        bgColor: 'bg-amber-500/10 border-amber-500/50',
        priority: 'high' 
      },
      surgery_reminder: { 
        icon: Stethoscope, 
        color: 'text-purple-500', 
        bgColor: 'bg-purple-500/10 border-purple-500/50',
        priority: 'critical' 
      },
      new_lead_no_contact: { 
        icon: UserPlus, 
        color: 'text-blue-500', 
        bgColor: 'bg-blue-500/10 border-blue-500/50',
        priority: 'urgent' 
      },
      hot_lead_stale: { 
        icon: Flame, 
        color: 'text-orange-500', 
        bgColor: 'bg-orange-500/10 border-orange-500/50',
        priority: 'critical' 
      },
    };
    return styles[type] || { 
      icon: Bell, 
      color: 'text-muted-foreground', 
      bgColor: 'bg-muted',
      priority: 'info' 
    };
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return !n.is_read;
    if (selectedFilter === 'critical') {
      const style = getAlertStyle(n.notification_type);
      return style.priority === 'critical' || style.priority === 'urgent';
    }
    return n.notification_type === selectedFilter;
  });

  // Count by type
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => {
    const style = getAlertStyle(n.notification_type);
    return !n.is_read && (style.priority === 'critical' || style.priority === 'urgent');
  }).length;
  const opportunityCount = notifications.filter(n => {
    const style = getAlertStyle(n.notification_type);
    return !n.is_read && style.priority === 'opportunity';
  }).length;

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alertas
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={runAlertCheck}
              disabled={isRunningCheck}
            >
              <RefreshCw className={cn("w-3 h-3", isRunningCheck && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-48">
            {filteredNotifications.slice(0, 5).map(notification => {
              const style = getAlertStyle(notification.notification_type);
              const Icon = style.icon;
              
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-2 rounded-lg mb-2 cursor-pointer transition-all hover:shadow-md border",
                    notification.is_read ? "opacity-60" : "",
                    style.bgColor
                  )}
                  onClick={() => {
                    if (notification.lead_id) {
                      onLeadClick?.(notification.lead_id);
                    }
                    markAsReadMutation.mutate(notification.id);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4 shrink-0", style.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDistanceToNow(new Date(notification.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={cn(criticalCount > 0 && "border-red-500 bg-red-500/10")}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={cn("w-6 h-6 mx-auto mb-2", criticalCount > 0 ? "text-red-500" : "text-muted-foreground")} />
            <p className={cn("text-3xl font-bold", criticalCount > 0 && "text-red-500")}>{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Críticos</p>
          </CardContent>
        </Card>

        <Card className={cn(opportunityCount > 0 && "border-green-500 bg-green-500/10")}>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className={cn("w-6 h-6 mx-auto mb-2", opportunityCount > 0 ? "text-green-500" : "text-muted-foreground")} />
            <p className={cn("text-3xl font-bold", opportunityCount > 0 && "text-green-500")}>{opportunityCount}</p>
            <p className="text-xs text-muted-foreground">Oportunidades</p>
          </CardContent>
        </Card>

        <Card className={cn(unreadCount > 0 && "border-blue-500 bg-blue-500/10")}>
          <CardContent className="p-4 text-center">
            <Bell className={cn("w-6 h-6 mx-auto mb-2", unreadCount > 0 ? "text-blue-500" : "text-muted-foreground")} />
            <p className={cn("text-3xl font-bold", unreadCount > 0 && "text-blue-500")}>{unreadCount}</p>
            <p className="text-xs text-muted-foreground">Não lidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <Button
              variant="outline"
              size="sm"
              onClick={runAlertCheck}
              disabled={isRunningCheck}
              className="mt-1"
            >
              {isRunningCheck ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <PlayCircle className="w-3 h-3 mr-1" />
                  Verificar Agora
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Central de Alertas Inteligentes
              </CardTitle>
              <CardDescription>
                Monitoramento automático de situações críticas
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={selectedFilter} onValueChange={setSelectedFilter} className="mb-4">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="all">
                Todos
                <Badge variant="secondary" className="ml-1">{notifications.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="unread">
                Não lidos
                {unreadCount > 0 && <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="critical">
                Críticos
                {criticalCount > 0 && <Badge variant="destructive" className="ml-1">{criticalCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="ready_conversion">
                Oportunidades
              </TabsTrigger>
              <TabsTrigger value="high_value_pending">
                Alto Valor
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">Tudo em dia! 🎉</p>
              <p className="text-sm">Nenhum alerta pendente nesta categoria</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredNotifications.map(notification => {
                  const style = getAlertStyle(notification.notification_type);
                  const Icon = style.icon;
                  
                  return (
                    <Card
                      key={notification.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md transition-all border-l-4",
                        notification.is_read ? "opacity-60" : "",
                        style.bgColor
                      )}
                      onClick={() => {
                        if (notification.lead_id) {
                          onLeadClick?.(notification.lead_id);
                        }
                        if (!notification.is_read) {
                          markAsReadMutation.mutate(notification.id);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={cn("p-2 rounded-lg bg-background shrink-0", style.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {!notification.is_read && (
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>
                                {formatDistanceToNow(new Date(notification.created_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                              
                              {notification.crm_leads && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {notification.crm_leads.name}
                                </span>
                              )}
                              
                              {notification.metadata?.estimated_value && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {new Intl.NumberFormat('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL',
                                    notation: 'compact'
                                  }).format(notification.metadata.estimated_value)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {notification.lead_id && (
                              <Button size="sm" variant="outline">
                                Ver Lead
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Alert Types Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tipos de Alertas Monitorados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { type: 'stale_lead_5d', label: 'Sem resposta 5+ dias' },
              { type: 'stale_lead_7d', label: 'Sem resposta 7+ dias' },
              { type: 'negative_sentiment', label: 'Sentimento negativo' },
              { type: 'ready_conversion', label: 'Pronto para conversão' },
              { type: 'high_value_pending', label: 'Alto valor pendente' },
              { type: 'surgery_reminder', label: 'Cirurgia próxima' },
              { type: 'new_lead_no_contact', label: 'Novo sem contato' },
              { type: 'hot_lead_stale', label: 'Lead quente esfriando' },
            ].map(item => {
              const style = getAlertStyle(item.type);
              const Icon = style.icon;
              
              return (
                <div 
                  key={item.type} 
                  className={cn("flex items-center gap-2 p-2 rounded-lg", style.bgColor)}
                >
                  <Icon className={cn("w-4 h-4", style.color)} />
                  <span className="text-xs">{item.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
