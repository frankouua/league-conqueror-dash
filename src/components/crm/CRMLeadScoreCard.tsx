import { useMemo } from 'react';
import { 
  Target, TrendingUp, Flame, Snowflake, 
  ThermometerSun, Zap, Crown, AlertTriangle 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CRMLeadScoreCardProps {
  leadScore: number;
  bantScores?: {
    budget: number;
    authority: number;
    need: number;
    timing: number;
  };
  sentiment?: string;
  intent?: string;
  estimatedValue?: number;
  daysInStage?: number;
  isStale?: boolean;
  compact?: boolean;
}

export function CRMLeadScoreCard({
  leadScore,
  bantScores,
  sentiment,
  intent,
  estimatedValue,
  daysInStage,
  isStale,
  compact = false,
}: CRMLeadScoreCardProps) {
  const scoreCategory = useMemo(() => {
    if (leadScore >= 80) return { label: 'Quente', icon: Flame, color: 'text-red-500', bg: 'bg-red-500' };
    if (leadScore >= 60) return { label: 'Morno', icon: ThermometerSun, color: 'text-orange-500', bg: 'bg-orange-500' };
    if (leadScore >= 40) return { label: 'Frio', icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-500' };
    return { label: 'Gelado', icon: Snowflake, color: 'text-cyan-500', bg: 'bg-cyan-500' };
  }, [leadScore]);

  const totalBant = bantScores 
    ? bantScores.budget + bantScores.authority + bantScores.need + bantScores.timing 
    : 0;
  
  const bantLevel = useMemo(() => {
    if (totalBant >= 32) return { label: 'A+', color: 'text-emerald-500' };
    if (totalBant >= 24) return { label: 'A', color: 'text-green-500' };
    if (totalBant >= 16) return { label: 'B', color: 'text-yellow-500' };
    if (totalBant >= 8) return { label: 'C', color: 'text-orange-500' };
    return { label: 'D', color: 'text-red-500' };
  }, [totalBant]);

  const sentimentEmoji = {
    positive: '😊',
    neutral: '😐',
    negative: '😟',
    unknown: '❓',
  }[sentiment || 'unknown'] || '❓';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", 
          `${scoreCategory.bg}/20 ${scoreCategory.color}`
        )}>
          <scoreCategory.icon className="h-3 w-3" />
          {leadScore}
        </div>
        {bantScores && (
          <Badge variant="outline" className={cn("text-xs", bantLevel.color)}>
            BANT: {bantLevel.label}
          </Badge>
        )}
        {isStale && (
          <Badge variant="outline" className="text-orange-500 border-orange-500/50 text-xs">
            ⏰ {daysInStage}d
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border bg-gradient-to-br from-card to-muted/30 space-y-4">
      {/* Main Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            `${scoreCategory.bg}/20`
          )}>
            <scoreCategory.icon className={cn("h-7 w-7", scoreCategory.color)} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{leadScore}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <p className={cn("text-sm font-medium", scoreCategory.color)}>
              Lead {scoreCategory.label}
            </p>
          </div>
        </div>
        
        {estimatedValue && (
          <div className="text-right">
            <p className="text-xl font-bold text-green-600">
              R$ {(estimatedValue / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground">Valor Potencial</p>
          </div>
        )}
      </div>

      {/* Score Bar */}
      <div className="space-y-1">
        <div className="relative">
          <Progress value={leadScore} className="h-2" />
          <div className="absolute top-3 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* BANT Breakdown */}
      {bantScores && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Qualificação BANT</span>
            <Badge variant="outline" className={cn("font-bold", bantLevel.color)}>
              {bantLevel.label}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'budget', label: 'Budget', value: bantScores.budget, emoji: '💰' },
              { key: 'authority', label: 'Authority', value: bantScores.authority, emoji: '👔' },
              { key: 'need', label: 'Need', value: bantScores.need, emoji: '🎯' },
              { key: 'timing', label: 'Timing', value: bantScores.timing, emoji: '⏰' },
            ].map(item => (
              <div key={item.key} className="text-center p-2 rounded-lg bg-muted/50">
                <span className="text-lg">{item.emoji}</span>
                <p className="text-lg font-bold mt-1">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {(sentiment || intent) && (
        <div className="pt-3 border-t flex items-center justify-between text-sm">
          {sentiment && (
            <div className="flex items-center gap-2">
              <span className="text-lg">{sentimentEmoji}</span>
              <span className="text-muted-foreground">Sentimento: </span>
              <span className="font-medium capitalize">{sentiment}</span>
            </div>
          )}
          {intent && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="text-muted-foreground">Intenção: </span>
              <span className="font-medium capitalize">{intent}</span>
            </div>
          )}
        </div>
      )}

      {/* Stale Warning */}
      {isStale && (
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-orange-600 font-medium">
              Lead parado há {daysInStage} dias - Requer ação!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
