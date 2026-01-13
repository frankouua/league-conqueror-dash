import { memo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Phone, 
  MessageSquare, 
  Calendar,
  AlertTriangle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RecurrenceLead {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  last_procedure_date: string | null;
  last_procedure_name: string | null;
  recurrence_due_date: string | null;
  recurrence_days_overdue: number;
  recurrence_group: string | null;
}

interface RecurrenceLeadRowProps {
  lead: RecurrenceLead;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
}

const getUrgencyBadge = (daysOverdue: number) => {
  if (daysOverdue > 60) {
    return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Crítico</Badge>;
  }
  if (daysOverdue > 0) {
    return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 gap-1"><AlertTriangle className="w-3 h-3" />Vencido</Badge>;
  }
  return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600"><Clock className="w-3 h-3" />Por Vencer</Badge>;
};

export const RecurrenceLeadRow = memo(function RecurrenceLeadRow({
  lead,
  isSelected,
  onToggleSelection
}: RecurrenceLeadRowProps) {
  
  const handleCall = useCallback(() => {
    window.open(`tel:${lead.phone}`, '_blank');
  }, [lead.phone]);

  const handleWhatsApp = useCallback(() => {
    const phone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}`, '_blank');
  }, [lead.whatsapp, lead.phone]);

  const handleToggle = useCallback(() => {
    onToggleSelection(lead.id);
  }, [lead.id, onToggleSelection]);

  return (
    <div
      className={cn(
        "p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors",
        isSelected && "bg-primary/5"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={handleToggle}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{lead.name}</span>
          {getUrgencyBadge(lead.recurrence_days_overdue || 0)}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="truncate">{lead.last_procedure_name}</span>
          {lead.recurrence_due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(lead.recurrence_due_date), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          )}
          {lead.recurrence_days_overdue > 0 && (
            <span className="text-red-500 font-medium">
              +{lead.recurrence_days_overdue} dias
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {lead.phone && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleCall}
          >
            <Phone className="w-4 h-4" />
          </Button>
        )}
        {(lead.whatsapp || lead.phone) && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleWhatsApp}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
