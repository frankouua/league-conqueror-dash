import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { calculatePaceMetrics, formatPaceDiff } from "@/lib/paceAnalysis";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaceBadgeProps {
  monthlyGoal: number;
  currentValue: number;
  currentDay: number;
  totalDaysInMonth: number;
  showDifference?: boolean;
  showExpected?: boolean;
  compact?: boolean;
  className?: string;
}

export function PaceBadge({
  monthlyGoal,
  currentValue,
  currentDay,
  totalDaysInMonth,
  showDifference = false,
  showExpected = false,
  compact = false,
  className,
}: PaceBadgeProps) {
  if (monthlyGoal <= 0) return null;

  const metrics = calculatePaceMetrics(
    monthlyGoal,
    currentValue,
    currentDay,
    totalDaysInMonth
  );

  const Icon = metrics.isAbove ? ArrowUpRight : ArrowDownRight;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatCompact = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "gap-1 font-medium",
              metrics.bgColor,
              metrics.textColor,
              metrics.borderColor,
              "border",
              className
            )}
          >
            <Icon className={cn("h-3 w-3", compact && "h-2.5 w-2.5")} />
            {compact ? (
              metrics.formattedDiff
            ) : (
              <>
                {metrics.formattedDiff}
                {showDifference && metrics.difference !== 0 && (
                  <span className="text-xs opacity-75">
                    ({metrics.isAbove ? "+" : ""}{formatCompact(metrics.difference)})
                  </span>
                )}
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">Análise de Ritmo - Dia {currentDay}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Esperado hoje:</span>
              <span className="font-medium text-right">{formatCurrency(metrics.expected)}</span>
              <span className="text-muted-foreground">Realizado:</span>
              <span className="font-medium text-right">{formatCurrency(currentValue)}</span>
              <span className="text-muted-foreground">Diferença:</span>
              <span className={cn("font-medium text-right", metrics.textColor)}>
                {metrics.isAbove ? "+" : ""}{formatCurrency(metrics.difference)}
              </span>
              <span className="text-muted-foreground">Status:</span>
              <span className={cn("font-medium text-right", metrics.textColor)}>
                {metrics.label}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PaceIndicatorProps {
  monthlyGoal: number;
  currentValue: number;
  currentDay: number;
  totalDaysInMonth: number;
  label?: string;
  showExpected?: boolean;
}

export function PaceIndicator({
  monthlyGoal,
  currentValue,
  currentDay,
  totalDaysInMonth,
  label = "Ritmo",
  showExpected = true,
}: PaceIndicatorProps) {
  if (monthlyGoal <= 0) return null;

  const metrics = calculatePaceMetrics(
    monthlyGoal,
    currentValue,
    currentDay,
    totalDaysInMonth
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className={cn("p-2 rounded-lg border", metrics.bgColor, metrics.borderColor)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-bold", metrics.textColor)}>
          {metrics.label} {metrics.formattedDiff}
        </span>
      </div>
      {showExpected && (
        <p className="text-xs text-muted-foreground mt-1">
          Esperado: {formatCurrency(metrics.expected)} | Atual: {formatCurrency(currentValue)}
        </p>
      )}
    </div>
  );
}
