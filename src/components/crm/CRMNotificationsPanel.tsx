import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Bell, AlertTriangle, CheckCircle2, TrendingUp, Users,
  Clock, Zap, Trophy, Target, ArrowRight, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CRMNotification {
  id: string;
  type: 'lead_stale' | 'lead_won' | 'lead_lost' | 'high_value' | 'goal_progress' | 'new_lead' | 'sla_breach';
  title: string;
  message: string;
  leadId?: string;
  leadName?: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
}

export function CRMNotificationsPanel() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CRMNotification[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  // Fetch initial notifications based on lead data
  const { data: leadData } = useQuery({
    queryKey: ['crm-notifications-data', user?.id],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id);
      
      if (error) throw error;
      return leads || [];
    },
    enabled: !!user,
  });

  // Generate notifications from lead data
  useEffect(() => {
    if (!leadData) return;

    const newNotifications: CRMNotification[] = [];
    const now = new Date();

    leadData.forEach((lead) => {
      // Stale leads
      if (lead.is_stale) {
        newNotifications.push({
          id: `stale-${lead.id}`,
          type: 'lead_stale',
          title: 'Lead parado',
          message: `${lead.name} está sem atividade há muito tempo`,
          leadId: lead.id,
          leadName: lead.name,
          timestamp: new Date(lead.stale_since || lead.updated_at),
          priority: 'high',
          read: false,
        });
      }

      // High value leads without recent activity
      if ((lead.estimated_value || 0) >= 20000 && lead.days_in_stage > 3) {
        newNotifications.push({
          id: `highvalue-${lead.id}`,
          type: 'high_value',
          title: 'Lead de alto valor',
          message: `${lead.name} (R$ ${((lead.estimated_value || 0) / 1000).toFixed(0)}k) precisa de atenção`,
          leadId: lead.id,
          leadName: lead.name,
          timestamp: new Date(lead.updated_at),
          priority: 'high',
          read: false,
        });
      }

      // Recent wins
      if (lead.won_at) {
        const wonDate = new Date(lead.won_at);
        const hoursSinceWon = (now.getTime() - wonDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceWon < 24) {
          newNotifications.push({
            id: `won-${lead.id}`,
            type: 'lead_won',
            title: '🎉 Venda fechada!',
            message: `Parabéns! ${lead.name} foi convertido`,
            leadId: lead.id,
            leadName: lead.name,
            timestamp: wonDate,
            priority: 'low',
            read: false,
          });
        }
      }
    });

    // Sort by timestamp (most recent first)
    newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setNotifications(newNotifications.slice(0, 10));
  }, [leadData]);

  // Real-time subscription for lead changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('crm-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads',
          filter: `assigned_to=eq.${user.id}`,
        },
        (payload) => {
          console.log('CRM notification received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const lead = payload.new as any;
            toast.info(`Novo lead: ${lead.name}`, {
              description: 'Um novo lead foi atribuído a você',
            });
            
            setNotifications(prev => [{
              id: `new-${lead.id}-${Date.now()}`,
              type: 'new_lead',
              title: 'Novo lead atribuído',
              message: `${lead.name} foi atribuído a você`,
              leadId: lead.id,
              leadName: lead.name,
              timestamp: new Date(),
              priority: 'medium',
              read: false,
            }, ...prev.slice(0, 9)]);
          }
          
          if (payload.eventType === 'UPDATE') {
            const lead = payload.new as any;
            const oldLead = payload.old as any;
            
            // Lead was won
            if (!oldLead.won_at && lead.won_at) {
              toast.success(`🎉 Venda fechada: ${lead.name}!`, {
                description: `Valor: R$ ${((lead.contract_value || lead.estimated_value || 0) / 1000).toFixed(1)}k`,
              });
            }
            
            // Lead became stale
            if (!oldLead.is_stale && lead.is_stale) {
              toast.warning(`Lead parado: ${lead.name}`, {
                description: 'Entre em contato para não perder a oportunidade',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: CRMNotification['type']) => {
    switch (type) {
      case 'lead_stale': return AlertTriangle;
      case 'lead_won': return Trophy;
      case 'lead_lost': return X;
      case 'high_value': return TrendingUp;
      case 'goal_progress': return Target;
      case 'new_lead': return Users;
      case 'sla_breach': return Clock;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-500';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30 text-amber-500';
      default: return 'bg-green-500/10 border-green-500/30 text-green-500';
    }
  };

  if (!isOpen) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="fixed bottom-4 right-4 z-50 gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge className="bg-red-500 text-white text-xs px-1.5">
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notificações
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer",
                      notification.read ? "opacity-60" : "",
                      getPriorityColor(notification.priority)
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">
                            {notification.title}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(notification.timestamp, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
