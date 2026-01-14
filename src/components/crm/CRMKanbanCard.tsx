import { memo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, Calendar, DollarSign, AlertTriangle, 
  Clock, Star, Flame, Snowflake, ThermometerSun,
  FileText, Percent, CreditCard, Brain, ArrowRight,
  History, TrendingUp, Zap
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

export const CRMKanbanCard = memo(function CRMKanbanCard({ lead, onClick, isDragging }: CRMKanbanCardProps) {
  const hasOverdueTasks = (lead.checklist_overdue || 0) > 0;
  const completedTasks = lead.checklist_completed || 0;
  const totalTasks = lead.checklist_total || 0;
  const pendingTasks = totalTasks - completedTasks;
  
  // Current opportunity - NEW negotiation
  const mainProcedure = lead.interested_procedures?.[0];
  const additionalProcedures = (lead.interested_procedures?.length || 0) - 1;
  const currentValue = lead.estimated_value || 0;
  
  // Discount info - now properly typed from CRMLead interface
  const discountPercent = lead.discount_percentage || 0;
  const discountAmount = lead.discount_amount || 0;
  const hasDiscount = discountPercent > 0 || discountAmount > 0;
  
  // Payment info - now properly typed from CRMLead interface
  const paymentMethod = lead.payment_method;
  const paymentInstallments = lead.payment_installments;
  
  // AI Score - now properly typed from CRMLead interface
  const aiScore = lead.ai_score;
  const aiProbability = lead.ai_conversion_probability;
  
  // Lead Score (MQL) - from marketing forms
  const leadScore = lead.lead_score || 0;
  const isHighPriorityLead = leadScore >= 70;
  
  // Next action - now properly typed from CRMLead interface
  const nextAction = lead.next_action;
  const nextActionDate = lead.next_action_date;
  
  // Historical data (past purchases) - MINIMIZED
  const historicalTotal = (lead as any).historical_total_value || 0;
  const historicalProcedures = (lead as any).historical_procedures_count || 0;
  
  // Last activity
  const lastActivity = lead.last_activity_at 
    ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true, locale: ptBR })
    : null;

  const paymentLabels: Record<string, string> = {
    'pix': 'PIX',
    'credit_card': 'Cartão',
    'debit': 'Débito',
    'cash': 'À vista',
    'financing': 'Financ.',
    'installment': 'Parcelado',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isDragging && "shadow-lg rotate-2 opacity-90",
        lead.is_priority && "border-l-4 border-l-yellow-500",
        hasOverdueTasks && "border-l-4 border-l-destructive",
        isHighPriorityLead && "ring-2 ring-purple-500/50"
      )}
    >
      {/* Lead Score MQL Badge - HIGH PRIORITY */}
      {leadScore > 0 && (
        <div className={cn(
          "flex items-center justify-between mb-2 px-2 py-1.5 rounded-md",
          isHighPriorityLead 
            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" 
            : "bg-muted/50"
        )}>
          <div className="flex items-center gap-1.5">
            <Zap className={cn("h-3.5 w-3.5", isHighPriorityLead ? "text-yellow-300 fill-yellow-300" : "text-muted-foreground")} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wide", !isHighPriorityLead && "text-muted-foreground")}>
              Lead Score
            </span>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black",
            isHighPriorityLead 
              ? "bg-white/20 text-white" 
              : leadScore >= 50 
                ? "bg-yellow-500/20 text-yellow-600"
                : "bg-muted text-muted-foreground"
          )}>
            {leadScore}
            {isHighPriorityLead && <span className="text-[9px] font-medium ml-0.5">MQL</span>}
          </div>
        </div>
      )}

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

      {/* ===== CURRENT OPPORTUNITY - HIGHLIGHTED ===== */}
      {(currentValue > 0 || mainProcedure) ? (
        <div className="mb-2 p-2.5 bg-gradient-to-r from-green-500/15 via-green-500/10 to-emerald-500/5 rounded-lg border-2 border-green-500/30">
          {/* Label + MAIN VALUE - ALWAYS VISIBLE */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Oportunidade Atual</span>
            </div>
            {/* VALUE ALWAYS PROMINENT */}
            <div className="flex items-center gap-1 bg-green-600 px-2 py-0.5 rounded-md">
              <DollarSign className="h-3.5 w-3.5 text-white" />
              <span className="font-black text-white text-sm">{formatCurrency(currentValue)}</span>
            </div>
          </div>
          
          {/* Procedure */}
          {mainProcedure && (
            <div className="flex items-center gap-1.5 text-xs mb-1.5">
              <FileText className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="truncate font-bold text-foreground">{mainProcedure}</span>
              {additionalProcedures > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-600">
                  +{additionalProcedures}
                </Badge>
              )}
            </div>
          )}
          
          {/* Warning if value but no procedures */}
          {currentValue > 0 && !mainProcedure && (
            <div className="flex items-center gap-1 text-[10px] text-yellow-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Valor manual</span>
            </div>
          )}
          
          {/* Discount Badge */}
          {hasDiscount && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-600 bg-orange-500/20 px-2 py-0.5 rounded-full mt-1">
                  <Percent className="h-3 w-3" />
                  Desconto: {discountPercent > 0 ? `${discountPercent}%` : formatCurrencyCompact(discountAmount)}
                </div>
              </TooltipTrigger>
              <TooltipContent>Desconto aplicado</TooltipContent>
            </Tooltip>
          )}
          
          {/* Payment Method */}
          {paymentMethod && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-green-500/20 text-[11px] text-muted-foreground">
              <CreditCard className="h-3 w-3" />
              <span>{paymentLabels[paymentMethod] || paymentMethod}</span>
              {paymentInstallments && paymentInstallments > 1 && (
                <span className="font-medium">{paymentInstallments}x</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-2 p-2 bg-muted/30 rounded-lg border border-dashed text-center">
          <span className="text-[10px] text-muted-foreground">Sem oportunidade</span>
        </div>
      )}

      {/* Surgery Date */}
      {lead.surgery_date && (
        <div className="flex items-center gap-1.5 text-xs mb-2 px-2 py-1.5 bg-primary/10 rounded-md text-primary font-semibold">
          <Calendar className="h-3.5 w-3.5" />
          <span>Cirurgia: {format(new Date(lead.surgery_date), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
      )}

      {/* Next Action */}
      {nextAction && (
        <div className={cn(
          "flex items-center gap-1.5 text-xs mb-2 px-2 py-1.5 rounded-md",
          nextActionDate && new Date(nextActionDate) < new Date() 
            ? "bg-destructive/10 text-destructive border border-destructive/30" 
            : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
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

      {/* ===== HISTORICAL DATA - MINIMIZED ===== */}
      {(historicalTotal > 0 || historicalProcedures > 0) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mb-2 px-1.5 py-1 bg-muted/30 rounded">
              <History className="h-3 w-3" />
              <span>Histórico: {historicalProcedures} proc. • {formatCurrencyCompact(historicalTotal)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Compras anteriores do cliente</p>
            <p className="text-xs text-muted-foreground">{historicalProcedures} procedimentos realizados</p>
            <p className="text-xs font-medium">Total: {formatCurrency(historicalTotal)}</p>
          </TooltipContent>
        </Tooltip>
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
            {pendingTasks > 0 ? `${pendingTasks} pend.` : '✓'}
          </span>
        </div>
      )}

      {/* Footer: Last interaction + Quick Contact */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
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
    </div>
  );
});
