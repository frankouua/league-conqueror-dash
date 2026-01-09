import { useMemo } from 'react';
import { 
  Users, Target, Zap, LayoutGrid, Star, Share2, Grid3X3, 
  ArrowRight, TrendingUp, ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Pipeline {
  id: string;
  name: string;
  pipeline_type: string;
  description?: string | null;
  color?: string | null;
}

interface CRMPipelineJourneyProps {
  pipelines: Pipeline[];
  selectedPipeline: string;
  onSelect: (pipelineId: string) => void;
  leadCounts?: Record<string, number>;
  valueCounts?: Record<string, number>;
}

const pipelineConfig: Record<string, { 
  icon: typeof Users; 
  gradient: string; 
  bgGradient: string;
  borderColor: string;
  iconBg: string;
  description: string;
  shortName: string;
  step: number;
}> = {
  social_selling: {
    icon: Share2,
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-500/10 to-rose-500/10',
    borderColor: 'border-pink-500/30 hover:border-pink-500/60',
    iconBg: 'bg-pink-500/20',
    description: 'Captação via Redes',
    shortName: 'Social',
    step: 1,
  },
  sdr: {
    icon: Users,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    iconBg: 'bg-blue-500/20',
    description: 'Prospecção & Qualificação',
    shortName: 'SDR',
    step: 2,
  },
  closer: {
    icon: Target,
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    borderColor: 'border-green-500/30 hover:border-green-500/60',
    iconBg: 'bg-green-500/20',
    description: 'Vendas & Fechamento',
    shortName: 'Closer',
    step: 3,
  },
  cs: {
    icon: Zap,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-500/10 to-pink-500/10',
    borderColor: 'border-purple-500/30 hover:border-purple-500/60',
    iconBg: 'bg-purple-500/20',
    description: 'Pós-Venda & Experiência',
    shortName: 'CS',
    step: 4,
  },
  farmer: {
    icon: LayoutGrid,
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-500/10 to-amber-500/10',
    borderColor: 'border-orange-500/30 hover:border-orange-500/60',
    iconBg: 'bg-orange-500/20',
    description: 'Fidelização & Recorrência',
    shortName: 'Farmer',
    step: 5,
  },
  influencer: {
    icon: Star,
    gradient: 'from-rose-500 to-red-500',
    bgGradient: 'from-rose-500/10 to-red-500/10',
    borderColor: 'border-rose-500/30 hover:border-rose-500/60',
    iconBg: 'bg-rose-500/20',
    description: 'UniInfluencers',
    shortName: 'Influencer',
    step: 6,
  },
  rfv_matrix: {
    icon: Grid3X3,
    gradient: 'from-cyan-500 to-teal-500',
    bgGradient: 'from-cyan-500/10 to-teal-500/10',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
    iconBg: 'bg-cyan-500/20',
    description: 'Matriz RFV',
    shortName: 'RFV',
    step: 7,
  },
};

// Order pipelines by customer journey
const journeyOrder = ['social_selling', 'sdr', 'closer', 'cs', 'farmer', 'influencer', 'rfv_matrix'];

export function CRMPipelineJourney({
  pipelines,
  selectedPipeline,
  onSelect,
  leadCounts = {},
  valueCounts = {},
}: CRMPipelineJourneyProps) {
  // Sort pipelines by journey order
  const sortedPipelines = useMemo(() => {
    return [...pipelines].sort((a, b) => {
      const orderA = journeyOrder.indexOf(a.pipeline_type);
      const orderB = journeyOrder.indexOf(b.pipeline_type);
      if (orderA === -1 && orderB === -1) return 0;
      if (orderA === -1) return 1;
      if (orderB === -1) return -1;
      return orderA - orderB;
    });
  }, [pipelines]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);
    const totalValue = Object.values(valueCounts).reduce((a, b) => a + b, 0);
    return { totalLeads, totalValue };
  }, [leadCounts, valueCounts]);

  return (
    <Card className="p-4 bg-gradient-to-r from-card via-card to-muted/20 border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Jornada do Cliente</h3>
            <p className="text-xs text-muted-foreground">Selecione uma pipeline para gerenciar</p>
          </div>
        </div>
        
        {/* Totals */}
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <div className="text-center">
            <p className="text-muted-foreground">Total Leads</p>
            <p className="font-bold text-foreground">{totals.totalLeads.toLocaleString('pt-BR')}</p>
          </div>
          {totals.totalValue > 0 && (
            <div className="text-center">
              <p className="text-muted-foreground">Valor Pipeline</p>
              <p className="font-bold text-green-600">R$ {(totals.totalValue / 1000).toFixed(0)}k</p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Journey Cards */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {sortedPipelines.map((pipeline, index) => {
          const config = pipelineConfig[pipeline.pipeline_type] || {
            icon: LayoutGrid,
            gradient: 'from-gray-500 to-slate-500',
            bgGradient: 'from-gray-500/10 to-slate-500/10',
            borderColor: 'border-gray-500/30 hover:border-gray-500/60',
            iconBg: 'bg-gray-500/20',
            description: pipeline.description || '',
            shortName: pipeline.name,
            step: index + 1,
          };
          const Icon = config.icon;
          const isSelected = selectedPipeline === pipeline.id;
          const count = leadCounts[pipeline.id] || 0;
          const value = valueCounts[pipeline.id] || 0;
          const showArrow = index < sortedPipelines.length - 1;

          return (
            <div key={pipeline.id} className="flex items-center gap-1 shrink-0">
              {/* Pipeline Card */}
              <button
                onClick={() => onSelect(pipeline.id)}
                className={cn(
                  "relative flex flex-col min-w-[130px] p-3 rounded-xl transition-all duration-300 group",
                  "border-2 hover:scale-[1.02] hover:shadow-lg",
                  isSelected
                    ? cn("border-primary shadow-lg bg-gradient-to-br", config.bgGradient)
                    : cn("bg-card/80 hover:bg-gradient-to-br", config.borderColor, "hover:" + config.bgGradient)
                )}
              >
                {/* Step Number */}
                <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className={cn(
                    "text-[10px] font-bold",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {config.step}
                  </span>
                </div>

                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-2 mx-auto transition-transform group-hover:scale-110",
                  "bg-gradient-to-br shadow-sm",
                  config.gradient
                )}>
                  <Icon className="w-6 h-6 text-white drop-shadow" />
                </div>
                
                {/* Name */}
                <span className={cn(
                  "text-xs font-semibold text-center mb-1 transition-colors",
                  isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {pipeline.name}
                </span>

                {/* Description */}
                <span className="text-[10px] text-muted-foreground text-center line-clamp-1 mb-2">
                  {config.description}
                </span>
                
                {/* Stats Row */}
                <div className="flex items-center justify-center gap-2">
                  {count > 0 && (
                    <Badge
                      variant={isSelected ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0 h-5"
                    >
                      {count} leads
                    </Badge>
                  )}
                </div>
                
                {value > 0 && (
                  <span className={cn(
                    "text-[10px] text-center mt-1",
                    isSelected ? "text-green-600 font-medium" : "text-muted-foreground"
                  )}>
                    R$ {(value / 1000).toFixed(0)}k
                  </span>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-primary rounded-full" />
                )}
              </button>

              {/* Arrow between cards */}
              {showArrow && (
                <div className="flex items-center px-1 text-muted-foreground/30">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
