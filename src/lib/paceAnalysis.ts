/**
 * Funções utilitárias para análise de ritmo (pace)
 * Compara o progresso atual com o esperado baseado no dia do mês
 */

/**
 * Calcula o valor esperado para o dia atual do mês
 * @param monthlyGoal Meta do mês inteiro
 * @param currentDay Dia atual
 * @param totalDaysInMonth Total de dias no mês
 * @param useBusinessDays Se true, usa dias úteis (70% dos dias)
 */
export function getExpectedValueForDay(
  monthlyGoal: number,
  currentDay: number,
  totalDaysInMonth: number,
  useBusinessDays = false
): number {
  if (monthlyGoal <= 0 || currentDay <= 0) return 0;
  
  const effectiveDays = useBusinessDays ? Math.round(totalDaysInMonth * 0.7) : totalDaysInMonth;
  const effectiveCurrentDay = useBusinessDays ? Math.round(currentDay * 0.7) : currentDay;
  const dailyTarget = monthlyGoal / effectiveDays;
  
  return dailyTarget * effectiveCurrentDay;
}

/**
 * Calcula a diferença entre valor atual e esperado
 */
export function getPaceDifference(
  actual: number,
  expected: number
): { difference: number; percentDiff: number; isAbove: boolean; isOnTrack: boolean } {
  const difference = actual - expected;
  const percentDiff = expected > 0 ? ((actual - expected) / expected) * 100 : 0;
  
  return {
    difference,
    percentDiff,
    isAbove: difference >= 0,
    isOnTrack: percentDiff >= -10, // Considera "no ritmo" se estiver até 10% abaixo
  };
}

/**
 * Retorna a cor do badge baseado no ritmo
 */
export function getPaceColor(percentDiff: number): {
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  if (percentDiff >= 10) {
    return {
      bgColor: "bg-emerald-500/20",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-500/50",
    };
  } else if (percentDiff >= 0) {
    return {
      bgColor: "bg-success/20",
      textColor: "text-success",
      borderColor: "border-success/50",
    };
  } else if (percentDiff >= -10) {
    return {
      bgColor: "bg-amber-500/20",
      textColor: "text-amber-600",
      borderColor: "border-amber-500/50",
    };
  } else if (percentDiff >= -25) {
    return {
      bgColor: "bg-orange-500/20",
      textColor: "text-orange-600",
      borderColor: "border-orange-500/50",
    };
  } else {
    return {
      bgColor: "bg-destructive/20",
      textColor: "text-destructive",
      borderColor: "border-destructive/50",
    };
  }
}

/**
 * Retorna o label de status do ritmo
 */
export function getPaceLabel(percentDiff: number): string {
  if (percentDiff >= 20) return "Excelente";
  if (percentDiff >= 10) return "Acima";
  if (percentDiff >= 0) return "No Ritmo";
  if (percentDiff >= -10) return "Atenção";
  if (percentDiff >= -25) return "Abaixo";
  return "Crítico";
}

/**
 * Formata a diferença de percentual
 */
export function formatPaceDiff(percentDiff: number): string {
  const sign = percentDiff >= 0 ? "+" : "";
  return `${sign}${percentDiff.toFixed(0)}%`;
}

/**
 * Calcula métricas completas de pace
 */
export function calculatePaceMetrics(
  monthlyGoal: number,
  currentValue: number,
  currentDay: number,
  totalDaysInMonth: number
) {
  const expected = getExpectedValueForDay(monthlyGoal, currentDay, totalDaysInMonth);
  const pace = getPaceDifference(currentValue, expected);
  const colors = getPaceColor(pace.percentDiff);
  const label = getPaceLabel(pace.percentDiff);
  
  return {
    expected,
    ...pace,
    ...colors,
    label,
    formattedDiff: formatPaceDiff(pace.percentDiff),
    dailyTarget: totalDaysInMonth > 0 ? monthlyGoal / totalDaysInMonth : 0,
    currentDailyAverage: currentDay > 0 ? currentValue / currentDay : 0,
  };
}
