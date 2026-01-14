import { memo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, Calendar, DollarSign, AlertTriangle, 
  Clock, Star, Flame, Snowflake, ThermometerSun,
  FileText, Percent, CreditCard, Brain, ArrowRight,
  TrendingUp, Tag
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

const formatCurrencyCompact = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
};

const TemperatureIcon = ({ temperature }: { temperature: string }) => {
  switch (temperature) {
    case 'hot':
      return <Flame className="h-3.5 w-3.5 text-red-500" />;
    case 'cold':
      return <Snowflake className="h-3.5 w-3.5 text-blue-400" />;
    default:
      return <ThermometerSun className="h-3.5 w-3.5 text-yellow-500" />;
  }
};

const AIScoreBadge = ({ score, probability }: { score?: number | null; probability?: number | null }) => {
  if (!score && !probability) return null;
  
  const displayScore = score || Math.round((probability || 0) * 100);
  const color = displayScore >= 70 ? 'text-green-600 bg-green-500/10' 
    : displayScore >= 40 ? 'text-yellow-600 bg-yellow-500/10' 
    : 'text-red-600 bg-red-500/10';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold", color)}>
          <Brain className="h-3 w-3" />
          {displayScore}%
        </div>
      </TooltipTrigger>
      <TooltipContent>Probabilidade de conversão (IA)</TooltipContent>
    </Tooltip>
  );
};

const PaymentBadge = ({ method, installments }: { method?: string | null; installments?: number | null }) => {
  if (!method) return null;
  
  const paymentLabels: Record<string, string> = {
    'pix': 'PIX',
    'credit_card': 'Cartão',
    'debit': 'Débito',
    'cash': 'À vista',
    'financing': 'Financ.',
    'installment': 'Parcelado',
  };
  
  const label = paymentLabels[method] || method;
  const installmentText = installments && installments > 1 ? ` ${installments}x` : '';
  
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <CreditCard className="h-3 w-3" />
      <span>{label}{installmentText}</span>
    </div>
  );
};

export const CRMKanbanCard = memo(function CRMKanbanCard({ lead, onClick, isDragging }: CRMKanbanCardProps) {
  const hasOverdueTasks = (lead.checklist_overdue || 0) > 0;
  const completedTasks = lead.checklist_completed || 0;
  const totalTasks = lead.checklist_total || 0;
  const pendingTasks = totalTasks - completedTasks;
  
  // Get procedures
  const mainProcedure = lead.interested_procedures?.[0];
  const additionalProcedures = (lead.interested_procedures?.length || 0) - 1;
  
  // Calculate discount
  const originalValue = (lead as any).original_value;
  const discountPercent = (lead as any).discount_percentage;
  const discountAmount = (lead as any).discount_amount;
  const hasDiscount = discountPercent > 0 || discountAmount > 0;
  
  // Payment info
  const paymentMethod = (lead as any).payment_method;
  const paymentInstallments = (lead as any).payment_installments;
  
  // AI Score
  const aiScore = (lead as any).ai_score;
  const aiProbability = (lead as any).ai_conversion_probability;
  
  // Next action
  const nextAction = (lead as any).next_action;
  const nextActionDate = (lead as any).next_action_date;
  
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
        hasOverdueTasks && "border-l-4 border-l-destructive"
      )}
    >
      {/* Header: Name + Temperature + AI Score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {lead.is_priority && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
          <h4 className="font-medium text-sm truncate">{lead.name}</h4>
        </div>
        <div className="flex items-center gap-1">
          <AIScoreBadge score={aiScore} probability={aiProbability} />
          <TemperatureIcon temperature={lead.temperature || 'warm'} />
        </div>
      </div>

      {/* Procedure + Value Box - HIGHLIGHTED */}
      <div className="mb-2 p-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-md border border-primary/20">
        {/* Procedure */}
        {mainProcedure && (
          <div className="flex items-center gap-1.5 text-xs mb-1.5">
            <FileText className="h-3 w-3 text-primary flex-shrink-0" />
            <span className="truncate font-semibold text-primary">{mainProcedure}</span>
            {additionalProcedures > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                +{additionalProcedures}
              </Badge>
            )}
          </div>
        )}
        
        {/* Value + Discount */}
        {lead.estimated_value && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              <span className="font-bold text-green-600 text-sm">{formatCurrency(lead.estimated_value)}</span>
            </div>
            {hasDiscount && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 text-[10px] font-medium text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded">
                    <Percent className="h-2.5 w-2.5" />
                    {discountPercent > 0 ? `${discountPercent}%` : formatCurrencyCompact(discountAmount)} desc.
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {originalValue && (
                    <span>Valor original: {formatCurrency(originalValue)}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
        
        {/* Payment Method */}
        {paymentMethod && (
          <div className="mt-1.5 pt-1.5 border-t border-primary/10">
            <PaymentBadge method={paymentMethod} installments={paymentInstallments} />
          </div>
        )}
      </div>

      {/* Surgery Date */}
      {lead.surgery_date && (
        <div className="flex items-center gap-1.5 text-xs mb-2 px-2 py-1 bg-primary/10 rounded text-primary font-medium">
          <Calendar className="h-3 w-3" />
          <span>Cirurgia: {format(new Date(lead.surgery_date), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
      )}

      {/* Next Action - HIGHLIGHTED if exists */}
      {nextAction && (
        <div className={cn(
          "flex items-center gap-1.5 text-xs mb-2 px-2 py-1.5 rounded",
          nextActionDate && new Date(nextActionDate) < new Date() 
            ? "bg-destructive/10 text-destructive" 
            : "bg-blue-500/10 text-blue-600"
        )}>
          <ArrowRight className="h-3 w-3 flex-shrink-0" />
          <span className="truncate font-medium">{nextAction}</span>
          {nextActionDate && (
            <span className="text-[10px] opacity-70 ml-auto flex-shrink-0">
              {format(new Date(nextActionDate), "dd/MM HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
      )}

      {/* Checklist Progress - Compact */}
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
            "text-[10px] font-medium flex items-center gap-0.5",
            hasOverdueTasks ? "text-destructive" : "text-muted-foreground"
          )}>
            {hasOverdueTasks && <AlertTriangle className="h-3 w-3" />}
            {pendingTasks > 0 ? `${pendingTasks} pendente${pendingTasks > 1 ? 's' : ''}` : '✓'}
          </span>
        </div>
      )}

      {/* Footer: Last interaction + Quick Contact */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{lastActivity || 'Sem interação'}</span>
        </div>
        {lead.phone && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 hover:text-primary cursor-pointer">
                <Phone className="h-3 w-3" />
                <span>...{lead.phone.slice(-4)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{lead.phone}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Tags (max 2) */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
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
