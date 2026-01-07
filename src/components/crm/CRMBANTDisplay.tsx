import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BANTScore {
  budget: number;
  authority: number;
  need: number;
  timing: number;
}

interface CRMBANTDisplayProps {
  scores: BANTScore;
  compact?: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 8) return 'bg-green-500';
  if (score >= 5) return 'bg-yellow-500';
  if (score >= 3) return 'bg-orange-500';
  return 'bg-red-500';
};

const getScoreLabel = (score: number) => {
  if (score >= 8) return 'Excelente';
  if (score >= 5) return 'Bom';
  if (score >= 3) return 'Regular';
  return 'Baixo';
};

const bantLabels = {
  budget: { label: 'Budget', description: 'Orçamento disponível', icon: '💰' },
  authority: { label: 'Authority', description: 'Poder de decisão', icon: '👔' },
  need: { label: 'Need', description: 'Necessidade do serviço', icon: '🎯' },
  timing: { label: 'Timing', description: 'Urgência/prazo', icon: '⏰' },
};

export function CRMBANTDisplay({ scores, compact = false }: CRMBANTDisplayProps) {
  const totalScore = scores.budget + scores.authority + scores.need + scores.timing;
  const maxScore = 40;
  const percentage = (totalScore / maxScore) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {Object.entries(scores).map(([key, value]) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white",
                  getScoreColor(value)
                )}
              >
                {value}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{bantLabels[key as keyof typeof bantLabels].label}: {value}/10</p>
            </TooltipContent>
          </Tooltip>
        ))}
        <div className="ml-2 text-xs font-medium">
          {totalScore}/{maxScore}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overall Score */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Score BANT</span>
            <span className={cn(
              "text-sm font-bold",
              percentage >= 70 ? "text-green-600" :
              percentage >= 50 ? "text-yellow-600" :
              percentage >= 30 ? "text-orange-600" :
              "text-red-600"
            )}>
              {totalScore}/{maxScore}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                percentage >= 70 ? "bg-green-500" :
                percentage >= 50 ? "bg-yellow-500" :
                percentage >= 30 ? "bg-orange-500" :
                "bg-red-500"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Individual Scores */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(scores).map(([key, value]) => {
          const config = bantLabels[key as keyof typeof bantLabels];
          return (
            <div
              key={key}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
            >
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{config.label}</span>
                  <span className="text-xs font-bold">{value}/10</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className={cn("h-full rounded-full", getScoreColor(value))}
                    style={{ width: `${value * 10}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Qualificação */}
      <div className={cn(
        "text-center py-2 px-3 rounded-lg text-sm font-medium",
        percentage >= 70 ? "bg-green-500/10 text-green-700" :
        percentage >= 50 ? "bg-yellow-500/10 text-yellow-700" :
        percentage >= 30 ? "bg-orange-500/10 text-orange-700" :
        "bg-red-500/10 text-red-700"
      )}>
        {percentage >= 70 ? "✅ Lead Altamente Qualificado" :
         percentage >= 50 ? "⚡ Lead Qualificado" :
         percentage >= 30 ? "⚠️ Lead em Qualificação" :
         "❌ Lead Não Qualificado"}
      </div>
    </div>
  );
}
