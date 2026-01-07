import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowRight, MessageSquare, Phone, Mail, Sparkles, 
  User, Edit, Calendar, CheckCircle2, XCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  action_type: string;
  title: string | null;
  description: string | null;
  created_at: string;
  from_stage?: { name: string; color: string } | null;
  to_stage?: { name: string; color: string } | null;
  ai_analysis?: any;
}

interface CRMLeadTimelineProps {
  events: TimelineEvent[];
}

const ACTION_ICONS: Record<string, any> = {
  created: User,
  stage_change: ArrowRight,
  note: MessageSquare,
  call: Phone,
  email: Mail,
  ai_analysis: Sparkles,
  edit: Edit,
  task_created: Calendar,
  task_completed: CheckCircle2,
  won: CheckCircle2,
  lost: XCircle,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-blue-500',
  stage_change: 'bg-primary',
  note: 'bg-gray-500',
  call: 'bg-green-500',
  email: 'bg-purple-500',
  ai_analysis: 'bg-gradient-to-r from-primary to-purple-500',
  edit: 'bg-muted-foreground',
  task_created: 'bg-yellow-500',
  task_completed: 'bg-emerald-500',
  won: 'bg-emerald-500',
  lost: 'bg-red-500',
};

const ACTION_LABELS: Record<string, string> = {
  created: 'Lead criado',
  stage_change: 'Movido de estágio',
  note: 'Nota adicionada',
  call: 'Ligação',
  email: 'Email enviado',
  ai_analysis: 'Análise IA',
  edit: 'Editado',
  task_created: 'Tarefa criada',
  task_completed: 'Tarefa concluída',
  won: 'Lead ganho',
  lost: 'Lead perdido',
};

export function CRMLeadTimeline({ events }: CRMLeadTimelineProps) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma atividade registrada ainda</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="relative pl-6 space-y-4">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

        {sortedEvents.map((event, index) => {
          const Icon = ACTION_ICONS[event.action_type] || MessageSquare;
          const bgColor = ACTION_COLORS[event.action_type] || 'bg-muted-foreground';
          const label = ACTION_LABELS[event.action_type] || event.action_type;

          return (
            <div key={event.id} className="relative flex gap-3">
              {/* Icon dot */}
              <div className={cn(
                "absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center",
                bgColor
              )}>
                <Icon className="h-3 w-3 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium">{event.title || label}</span>
                    {event.action_type === 'stage_change' && event.from_stage && event.to_stage && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: event.from_stage.color, color: event.from_stage.color }}
                        >
                          {event.from_stage.name}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: event.to_stage.color, color: event.to_stage.color }}
                        >
                          {event.to_stage.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {event.ai_analysis && (
                  <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20 text-xs">
                    <span className="font-medium text-primary">💡 IA:</span>{' '}
                    {event.ai_analysis.summary || 'Análise realizada'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
