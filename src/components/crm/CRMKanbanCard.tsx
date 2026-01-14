import { memo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, Calendar, DollarSign, AlertTriangle, 
  CheckCircle2, Clock, Star, Flame, Snowflake, ThermometerSun,
  FileText, User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';

interface CRMKanbanCardProps {
  lead: CRMLead;
  onClick: () => void;
  isDragging?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
};

const TemperatureIcon = ({ temperature }: { temperature: string }) => {
  switch (temperature) {
    case 'hot':
      return <Flame className="h-3 w-3 text-red-500" />;
    case 'cold':
      return <Snowflake className="h-3 w-3 text-blue-400" />;
    default:
      return <ThermometerSun className="h-3 w-3 text-yellow-500" />;
  }
};

export const CRMKanbanCard = memo(function CRMKanbanCard({ lead, onClick, isDragging }: CRMKanbanCardProps) {
  const hasOverdueTasks = (lead.checklist_overdue || 0) > 0;
  const hasPendingTasks = (lead.checklist_total || 0) > (lead.checklist_completed || 0);
  const completedTasks = lead.checklist_completed || 0;
  const totalTasks = lead.checklist_total || 0;
  
  // Get first procedure
  const mainProcedure = lead.interested_procedures?.[0];
  const additionalProcedures = (lead.interested_procedures?.length || 0) - 1;
  
  // Last activity
  const lastActivity = lead.last_activity_at 
    ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isDragging && "shadow-lg rotate-2 opacity-90",
        lead.is_priority && "border-l-4 border-l-yellow-500",
        hasOverdueTasks && "border-l-4 border-l-red-500"
      )}
    >
      {/* Header: Name + Temperature */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {lead.is_priority && <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />}
          <h4 className="font-medium text-sm truncate">{lead.name}</h4>
        </div>
        <TemperatureIcon temperature={lead.temperature || 'warm'} />
      </div>

      {/* Procedure + Value - MOST IMPORTANT */}
      {(mainProcedure || lead.estimated_value) && (
        <div className="mb-2 p-2 bg-muted/50 rounded-md">
          {mainProcedure && (
            <div className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3 w-3 text-primary flex-shrink-0" />
              <span className="truncate font-medium">{mainProcedure}</span>
              {additionalProcedures > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  +{additionalProcedures}
                </Badge>
              )}
            </div>
          )}
          {lead.estimated_value && (
            <div className="flex items-center gap-1.5 text-xs mt-1">
              <DollarSign className="h-3 w-3 text-green-500 flex-shrink-0" />
              <span className="font-semibold text-green-600">{formatCurrency(lead.estimated_value)}</span>
            </div>
          )}
        </div>
      )}

      {/* Surgery Date - if exists */}
      {lead.surgery_date && (
        <div className="flex items-center gap-1.5 text-xs mb-2 text-primary">
          <Calendar className="h-3 w-3" />
          <span className="font-medium">
            Cirurgia: {format(new Date(lead.surgery_date), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
      )}

      {/* Checklist Progress */}
      {totalTasks > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all",
                hasOverdueTasks ? "bg-destructive" : "bg-green-500"
              )}
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
          <span className={cn(
            "text-[10px] font-medium",
            hasOverdueTasks ? "text-destructive" : "text-muted-foreground"
          )}>
            {hasOverdueTasks && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
            {completedTasks}/{totalTasks}
          </span>
        </div>
      )}

      {/* Footer: Last interaction + Phone */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{lastActivity || 'Sem interação'}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span className="truncate max-w-[80px]">
              {lead.phone.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {/* Tags (max 2) */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 2 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              +{lead.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
});
