import { useMemo } from 'react';
import { 
  AlertTriangle, Clock, Calendar, Phone, MessageSquare,
  FileCheck, Bell, ChevronRight, User, Stethoscope,
  TrendingDown, UserX, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CRMLead } from '@/hooks/useCRM';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'surgery' | 'stale' | 'checklist' | 'followup' | 'unassigned';
  title: string;
  description: string;
  leadId: string;
  leadName: string;
  icon: any;
  action?: string;
  actionLabel?: string;
  createdAt: Date;
}

interface CRMSmartAlertsProps {
  onLeadClick?: (leadId: string) => void;
}

export function CRMSmartAlerts({ onLeadClick }: CRMSmartAlertsProps) {
  // Fetch all leads for alert generation
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['crm-leads-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .is('lost_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as CRMLead[];
    },
  });

  // Generate alerts based on lead data
  const alerts: Alert[] = useMemo(() => {
    const generatedAlerts: Alert[] = [];
    const now = new Date();

    leads.forEach(lead => {
      // 1. Surgery alerts
      if (lead.surgery_date) {
        const surgeryDate = new Date(lead.surgery_date);
        const daysUntil = differenceInDays(surgeryDate, now);

        if (daysUntil === 0) {
          generatedAlerts.push({
            id: `surgery-today-${lead.id}`,
            type: 'critical',
            category: 'surgery',
            title: '🚨 Cirurgia HOJE!',
            description: `${lead.name} tem cirurgia agendada para hoje`,
            leadId: lead.id,
            leadName: lead.name,
            icon: Stethoscope,
            actionLabel: 'Ver detalhes',
            createdAt: now,
          });
        } else if (daysUntil === 1) {
          generatedAlerts.push({
            id: `surgery-tomorrow-${lead.id}`,
            type: 'critical',
            category: 'surgery',
            title: '⚠️ Cirurgia AMANHÃ',
            description: `${lead.name} - verificar confirmação e orientações`,
            leadId: lead.id,
            leadName: lead.name,
            icon: Calendar,
            actionLabel: 'Enviar lembrete',
            createdAt: now,
          });
        } else if (daysUntil > 0 && daysUntil <= 3) {
          generatedAlerts.push({
            id: `surgery-soon-${lead.id}`,
            type: 'warning',
            category: 'surgery',
            title: `Cirurgia em ${daysUntil} dias`,
            description: `${lead.name} - verificar checklist pré-operatório`,
            leadId: lead.id,
            leadName: lead.name,
            icon: Calendar,
            actionLabel: 'Ver checklist',
            createdAt: now,
          });
        }

        // Surgery without completed pre-op checklist
        if (daysUntil > 0 && daysUntil <= 7 && !lead.pre_surgery_checklist_completed) {
          generatedAlerts.push({
            id: `preop-incomplete-${lead.id}`,
            type: 'warning',
            category: 'checklist',
            title: 'Checklist pré-op incompleto',
            description: `${lead.name} - cirurgia em ${daysUntil} dias sem checklist`,
            leadId: lead.id,
            leadName: lead.name,
            icon: FileCheck,
            actionLabel: 'Completar checklist',
            createdAt: now,
          });
        }
      }

      // 2. Stale lead alerts (no activity for 3+ days)
      if (lead.is_stale || (lead.last_activity_at && differenceInDays(now, new Date(lead.last_activity_at)) >= 3)) {
        const daysSinceActivity = lead.last_activity_at 
          ? differenceInDays(now, new Date(lead.last_activity_at))
          : differenceInDays(now, new Date(lead.created_at));

        if (daysSinceActivity >= 7) {
          generatedAlerts.push({
            id: `stale-critical-${lead.id}`,
            type: 'critical',
            category: 'stale',
            title: 'Lead esfriando! 🥶',
            description: `${lead.name} sem contato há ${daysSinceActivity} dias`,
            leadId: lead.id,
            leadName: lead.name,
            icon: TrendingDown,
            actionLabel: 'Fazer contato',
            createdAt: now,
          });
        } else if (daysSinceActivity >= 3) {
          generatedAlerts.push({
            id: `stale-warning-${lead.id}`,
            type: 'warning',
            category: 'stale',
            title: 'Lead parado',
            description: `${lead.name} sem atividade há ${daysSinceActivity} dias`,
            leadId: lead.id,
            leadName: lead.name,
            icon: Clock,
            actionLabel: 'Fazer follow-up',
            createdAt: now,
          });
        }
      }

      // 3. Unassigned leads (priority leads without assigned user)
      if (!lead.assigned_to && (lead.is_priority || (lead.estimated_value && lead.estimated_value >= 10000))) {
        generatedAlerts.push({
          id: `unassigned-${lead.id}`,
          type: 'warning',
          category: 'unassigned',
          title: 'Lead sem responsável',
          description: `${lead.name} (R$ ${(lead.estimated_value || 0).toLocaleString()}) não atribuído`,
          leadId: lead.id,
          leadName: lead.name,
          icon: UserX,
          actionLabel: 'Atribuir',
          createdAt: now,
        });
      }

      // 4. New lead without first contact (more than 5 minutes)
      const minutesSinceCreation = differenceInHours(now, new Date(lead.created_at)) * 60;
      if (!lead.first_contact_at && minutesSinceCreation > 5 && minutesSinceCreation < 60) {
        generatedAlerts.push({
          id: `new-no-contact-${lead.id}`,
          type: 'critical',
          category: 'followup',
          title: 'Novo lead sem contato!',
          description: `${lead.name} aguardando primeiro contato`,
          leadId: lead.id,
          leadName: lead.name,
          icon: Phone,
          actionLabel: 'Ligar agora',
          createdAt: now,
        });
      }
    });

    // Sort by priority: critical first, then warning, then info
    return generatedAlerts.sort((a, b) => {
      const priority = { critical: 0, warning: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    });
  }, [leads]);

  // Group alerts by category
  const alertsByCategory = useMemo(() => {
    const grouped: Record<string, Alert[]> = {};
    alerts.forEach(alert => {
      if (!grouped[alert.category]) {
        grouped[alert.category] = [];
      }
      grouped[alert.category].push(alert);
    });
    return grouped;
  }, [alerts]);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      surgery: '🏥 Cirurgias',
      stale: '⏰ Leads Parados',
      checklist: '📋 Checklists',
      followup: '📞 Follow-ups',
      unassigned: '👤 Sem Responsável',
    };
    return labels[category] || category;
  };

  const getAlertStyle = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-red-500 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/10';
      default:
        return 'border-blue-500 bg-blue-500/10';
    }
  };

  const getIconColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={cn(criticalCount > 0 && "border-red-500 bg-red-500/10")}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={cn("w-6 h-6 mx-auto mb-2", criticalCount > 0 ? "text-red-500" : "text-muted-foreground")} />
            <p className={cn("text-3xl font-bold", criticalCount > 0 && "text-red-500")}>{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Críticos</p>
          </CardContent>
        </Card>

        <Card className={cn(warningCount > 0 && "border-yellow-500 bg-yellow-500/10")}>
          <CardContent className="p-4 text-center">
            <Bell className={cn("w-6 h-6 mx-auto mb-2", warningCount > 0 ? "text-yellow-500" : "text-muted-foreground")} />
            <p className={cn("text-3xl font-bold", warningCount > 0 && "text-yellow-500")}>{warningCount}</p>
            <p className="text-xs text-muted-foreground">Atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold text-green-500">{leads.length - criticalCount - warningCount}</p>
            <p className="text-xs text-muted-foreground">Em dia</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Central de Alertas
          </CardTitle>
          <CardDescription>
            {alerts.length} alerta(s) que precisam de atenção
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">Tudo em dia! 🎉</p>
              <p className="text-sm">Nenhum alerta pendente no momento</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {Object.entries(alertsByCategory).map(([category, categoryAlerts]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      {getCategoryLabel(category)}
                      <Badge variant="secondary" className="ml-2">
                        {categoryAlerts.length}
                      </Badge>
                    </h3>
                    
                    <div className="space-y-2">
                      {categoryAlerts.map(alert => {
                        const Icon = alert.icon;
                        
                        return (
                          <Card
                            key={alert.id}
                            className={cn(
                              "cursor-pointer hover:shadow-md transition-all",
                              getAlertStyle(alert.type)
                            )}
                            onClick={() => onLeadClick?.(alert.leadId)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg bg-background", getIconColor(alert.type))}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm">{alert.title}</h4>
                                  <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                                </div>

                                {alert.actionLabel && (
                                  <Button size="sm" variant="outline" className="shrink-0">
                                    {alert.actionLabel}
                                  </Button>
                                )}
                                
                                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
