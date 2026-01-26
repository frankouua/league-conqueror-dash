import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Activity, Phone, Mail, MessageSquare, Calendar, 
  User, CheckCircle2, XCircle, ArrowRight, Sparkles,
  Edit, Star, AlertTriangle, Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface CRMActivityFeedProps {
  pipelineId?: string;
  limit?: number;
  showHeader?: boolean;
}

interface ActivityItem {
  id: string;
  action_type: string;
  title: string | null;
  description: string | null;
  created_at: string;
  lead_name?: string;
  lead_id?: string;
  performed_by_name?: string;
  from_stage_name?: string;
  from_stage_color?: string;
  to_stage_name?: string;
  to_stage_color?: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  created: { icon: User, color: 'bg-blue-500', label: 'Lead criado' },
  stage_change: { icon: ArrowRight, color: 'bg-primary', label: 'Movido' },
  pipeline_change: { icon: ArrowRight, color: 'bg-purple-500', label: 'Transferido' },
  note: { icon: MessageSquare, color: 'bg-gray-500', label: 'Nota' },
  call: { icon: Phone, color: 'bg-green-500', label: 'Ligação' },
  email: { icon: Mail, color: 'bg-indigo-500', label: 'Email' },
  meeting: { icon: Calendar, color: 'bg-amber-500', label: 'Reunião' },
  whatsapp: { icon: WhatsAppIcon, color: 'bg-emerald-500', label: 'WhatsApp' },
  ai_analysis: { icon: Sparkles, color: 'bg-violet-500', label: 'Análise IA' },
  edit: { icon: Edit, color: 'bg-muted-foreground', label: 'Editado' },
  priority_change: { icon: Star, color: 'bg-yellow-500', label: 'Prioridade' },
  won: { icon: Trophy, color: 'bg-emerald-500', label: 'Ganho!' },
  lost: { icon: XCircle, color: 'bg-red-500', label: 'Perdido' },
  task_completed: { icon: CheckCircle2, color: 'bg-green-500', label: 'Tarefa' },
};

export function CRMActivityFeed({ 
  pipelineId, 
  limit = 20,
  showHeader = true 
}: CRMActivityFeedProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['crm-activity-feed', pipelineId, limit],
    queryFn: async () => {
      let query = supabase
        .from('crm_lead_history')
        .select(`
          id,
          action_type,
          title,
          description,
          created_at,
          lead_id,
          crm_leads!inner(name, pipeline_id),
          from_stage:crm_stages!crm_lead_history_from_stage_id_fkey(name, color),
          to_stage:crm_stages!crm_lead_history_to_stage_id_fkey(name, color)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (pipelineId) {
        query = query.eq('crm_leads.pipeline_id', pipelineId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        action_type: item.action_type,
        title: item.title,
        description: item.description,
        created_at: item.created_at,
        lead_name: item.crm_leads?.name,
        lead_id: item.lead_id,
        from_stage_name: item.from_stage?.name,
        from_stage_color: item.from_stage?.color,
        to_stage_name: item.to_stage?.name,
        to_stage_color: item.to_stage?.color,
      })) as ActivityItem[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atividade Recente
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {activities?.length || 0} atividades
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative space-y-1">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-border" />

            {activities?.map((activity, index) => {
              const config = ACTION_CONFIG[activity.action_type] || {
                icon: Activity,
                color: 'bg-muted-foreground',
                label: activity.action_type,
              };
              const Icon = config.icon;
              const isRecent = new Date(activity.created_at) > new Date(Date.now() - 3600000); // 1 hour

              return (
                <div 
                  key={activity.id} 
                  className={cn(
                    "relative flex gap-3 py-3 px-2 rounded-lg transition-colors hover:bg-muted/50",
                    isRecent && "bg-primary/5"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    config.color
                  )}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {/* Lead Name */}
                        <span className="font-medium text-sm truncate block">
                          {activity.lead_name || 'Lead'}
                        </span>
                        
                        {/* Action Description */}
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {config.label}
                          </Badge>
                          
                          {/* Stage Change Visual */}
                          {activity.action_type === 'stage_change' && (
                            <>
                              {activity.from_stage_name && (
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px] px-1.5 py-0"
                                  style={{ 
                                    borderColor: activity.from_stage_color,
                                    color: activity.from_stage_color 
                                  }}
                                >
                                  {activity.from_stage_name}
                                </Badge>
                              )}
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              {activity.to_stage_name && (
                                <Badge 
                                  className="text-[10px] px-1.5 py-0 text-white"
                                  style={{ backgroundColor: activity.to_stage_color }}
                                >
                                  {activity.to_stage_name}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>

                        {/* Description */}
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {activity.description}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDistanceToNow(new Date(activity.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {(!activities || activities.length === 0) && (
              <div className="py-8 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
