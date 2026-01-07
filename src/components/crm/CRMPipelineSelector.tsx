import { useMemo } from 'react';
import { Users, Target, Zap, LayoutGrid, Briefcase, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Pipeline {
  id: string;
  name: string;
  pipeline_type: string;
  description?: string | null;
  color?: string | null;
}

interface CRMPipelineSelectorProps {
  pipelines: Pipeline[];
  selectedPipeline: string;
  onSelect: (pipelineId: string) => void;
  leadCounts?: Record<string, number>;
  valueCounts?: Record<string, number>;
}

const pipelineConfig: Record<string, { icon: typeof Users; gradient: string; description: string }> = {
  sdr: {
    icon: Users,
    gradient: 'from-blue-500 to-cyan-500',
    description: 'Prospecção e Qualificação',
  },
  closer: {
    icon: Target,
    gradient: 'from-green-500 to-emerald-500',
    description: 'Vendas e Fechamento',
  },
  cs: {
    icon: Zap,
    gradient: 'from-purple-500 to-pink-500',
    description: 'Pós-Venda e Experiência',
  },
  farmer: {
    icon: LayoutGrid,
    gradient: 'from-orange-500 to-amber-500',
    description: 'Fidelização e Recorrência',
  },
  influencer: {
    icon: Star,
    gradient: 'from-rose-500 to-red-500',
    description: 'UniInfluencers',
  },
};

export function CRMPipelineSelector({
  pipelines,
  selectedPipeline,
  onSelect,
  leadCounts = {},
  valueCounts = {},
}: CRMPipelineSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {pipelines.map((pipeline) => {
        const config = pipelineConfig[pipeline.pipeline_type] || {
          icon: Briefcase,
          gradient: 'from-gray-500 to-slate-500',
          description: pipeline.description || '',
        };
        const Icon = config.icon;
        const isSelected = selectedPipeline === pipeline.id;
        const count = leadCounts[pipeline.id] || 0;
        const value = valueCounts[pipeline.id] || 0;

        return (
          <Tooltip key={pipeline.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelect(pipeline.id)}
                className={cn(
                  "relative flex flex-col items-center min-w-[100px] p-3 rounded-xl transition-all duration-200",
                  "border-2 hover:scale-105",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-transparent bg-muted/50 hover:bg-muted hover:border-border"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                    "bg-gradient-to-br",
                    config.gradient,
                    !isSelected && "opacity-60"
                  )}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                
                <span className={cn(
                  "text-xs font-medium text-center",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}>
                  {pipeline.name}
                </span>
                
                {count > 0 && (
                  <Badge
                    variant={isSelected ? "default" : "secondary"}
                    className="mt-1 text-[10px] px-1.5 py-0"
                  >
                    {count} leads
                  </Badge>
                )}
                
                {value > 0 && (
                  <span className={cn(
                    "text-[10px] mt-0.5",
                    isSelected ? "text-green-600" : "text-muted-foreground"
                  )}>
                    R$ {(value / 1000).toFixed(0)}k
                  </span>
                )}

                {isSelected && (
                  <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">{pipeline.name}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
