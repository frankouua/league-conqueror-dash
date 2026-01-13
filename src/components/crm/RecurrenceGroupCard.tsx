import { useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Phone, 
  MessageSquare, 
  AlertCircle,
  AlertTriangle,
  Clock,
  Send,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecurrenceLead {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf?: string | null;
  last_procedure_date: string | null;
  last_procedure_name: string | null;
  recurrence_due_date: string | null;
  recurrence_days_overdue: number;
  recurrence_group: string | null;
  temperature?: string | null;
  assigned_to?: string | null;
  stage?: {
    name: string;
    color: string;
  } | null;
}

interface RecurrenceGroupCardProps {
  groupName: string;
  leads: RecurrenceLead[];
  selectedLeads: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onOpenScript: (lead: RecurrenceLead) => void;
}

const getUrgencyInfo = (daysOverdue: number) => {
  if (daysOverdue > 60) {
    return { 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-100 dark:bg-red-900/30', 
      label: 'Crítico' 
    };
  }
  if (daysOverdue > 0) {
    return { 
      icon: AlertTriangle, 
      color: 'text-orange-600', 
      bg: 'bg-orange-100 dark:bg-orange-900/30', 
      label: 'Vencido' 
    };
  }
  return { 
    icon: Clock, 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
    label: 'Por Vencer' 
  };
};

const getGroupIcon = (groupName: string) => {
  if (groupName?.includes('HARMONIZAÇÃO')) return '💎';
  if (groupName?.includes('SOROTERAPIA') || groupName?.includes('NUTRICIONAL')) return '💉';
  if (groupName?.includes('SPA')) return '🌿';
  if (groupName?.includes('PÓS')) return '🏥';
  return '📋';
};

function RecurrenceGroupCardComponent({
  groupName,
  leads,
  selectedLeads,
  onToggleSelection,
  onSelectAll,
  onOpenScript
}: RecurrenceGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const criticalCount = leads.filter(l => (l.recurrence_days_overdue || 0) > 60).length;
  const overdueCount = leads.filter(l => (l.recurrence_days_overdue || 0) > 0 && (l.recurrence_days_overdue || 0) <= 60).length;
  const upcomingCount = leads.filter(l => (l.recurrence_days_overdue || 0) <= 0).length;

  const selectedInGroup = leads.filter(l => selectedLeads.includes(l.id)).length;
  const allSelected = selectedInGroup === leads.length && leads.length > 0;

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleSelectAllInGroup = useCallback(() => {
    if (allSelected) {
      // Deselect all in group
      leads.forEach(l => {
        if (selectedLeads.includes(l.id)) {
          onToggleSelection(l.id);
        }
      });
    } else {
      // Select all in group
      onSelectAll(leads.map(l => l.id));
    }
  }, [allSelected, leads, selectedLeads, onToggleSelection, onSelectAll]);

  const handleCall = useCallback((phone: string) => {
    window.open(`tel:${phone}`, '_blank');
  }, []);

  const handleWhatsApp = useCallback((lead: RecurrenceLead) => {
    const phone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${lead.name}! 💛 Tudo bem? Aqui é da Unique! Seu procedimento de ${lead.last_procedure_name || 'tratamento'} está próximo do vencimento. Que tal agendarmos sua renovação?`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  }, []);

  const estimatedValue = leads.reduce((sum, lead) => {
    const baseValue = lead.recurrence_group?.includes('HARMONIZAÇÃO') ? 3500 :
                     lead.recurrence_group?.includes('SOROTERAPIA') ? 1200 :
                     lead.recurrence_group?.includes('SPA') ? 800 : 1500;
    return sum + baseValue;
  }, 0);

  return (
    <Card className={cn(
      "transition-all duration-200",
      isExpanded && "ring-2 ring-primary/30"
    )}>
      <CardHeader 
        className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getGroupIcon(groupName)}</span>
            <div>
              <CardTitle className="text-sm font-medium">{groupName || 'Outros'}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {leads.length} pacientes
                </Badge>
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalCount} críticos
                  </Badge>
                )}
                {overdueCount > 0 && (
                  <Badge className="text-xs bg-orange-500">
                    {overdueCount} vencidos
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  ≈ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(estimatedValue)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedInGroup > 0 && (
              <Badge variant="outline" className="text-primary">
                {selectedInGroup} selecionados
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-3">
          {/* Action bar */}
          <div className="flex items-center justify-between mb-3 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAllInGroup}
              />
              <span className="text-xs text-muted-foreground">
                {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </span>
            </div>
            {selectedInGroup > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Send className="w-3 h-3" />
                  CRM
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700">
                  <MessageSquare className="w-3 h-3" />
                  WhatsApp
                </Button>
              </div>
            )}
          </div>

          {/* Leads list */}
          <ScrollArea className={cn(
            "rounded-lg border",
            leads.length > 5 ? "h-[300px]" : ""
          )}>
            <div className="divide-y">
              {leads.map(lead => {
                const urgency = getUrgencyInfo(lead.recurrence_days_overdue || 0);
                const UrgencyIcon = urgency.icon;
                
                return (
                  <div
                    key={lead.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 transition-colors",
                      selectedLeads.includes(lead.id) && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => onToggleSelection(lead.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{lead.name}</span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs gap-1", urgency.color, urgency.bg)}
                          >
                            <UrgencyIcon className="w-3 h-3" />
                            {urgency.label}
                          </Badge>
                        </div>
                        
                        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                          <p className="truncate">{lead.last_procedure_name}</p>
                          <div className="flex items-center gap-3">
                            {lead.recurrence_due_date && (
                              <span>
                                Venc: {format(new Date(lead.recurrence_due_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                            {(lead.recurrence_days_overdue || 0) > 0 && (
                              <span className="text-red-500 font-medium">
                                +{lead.recurrence_days_overdue} dias
                              </span>
                            )}
                            {(lead.recurrence_days_overdue || 0) < 0 && (
                              <span className="text-yellow-600 font-medium">
                                Faltam {Math.abs(lead.recurrence_days_overdue)} dias
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenScript(lead);
                          }}
                          title="Ver scripts de reativação"
                        >
                          <FileText className="w-4 h-4 text-primary" />
                        </Button>
                        {lead.phone && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCall(lead.phone!);
                            }}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}
                        {(lead.whatsapp || lead.phone) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsApp(lead);
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}

export const RecurrenceGroupCard = memo(RecurrenceGroupCardComponent);
