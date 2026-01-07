import { Flame, Thermometer, Snowflake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type LeadTemperature = 'hot' | 'warm' | 'cold';

interface CRMTemperatureBadgeProps {
  temperature: LeadTemperature;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

const TEMPERATURE_CONFIG: Record<LeadTemperature, {
  icon: typeof Flame;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  hot: {
    icon: Flame,
    label: 'Quente',
    description: 'Lead muito engajado, pronto para fechar',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/50',
  },
  warm: {
    icon: Thermometer,
    label: 'Morno',
    description: 'Lead interessado, precisa de nutrição',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/50',
  },
  cold: {
    icon: Snowflake,
    label: 'Frio',
    description: 'Lead pouco engajado ou sem interação recente',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/50',
  },
};

export function CRMTemperatureBadge({ 
  temperature, 
  size = 'md', 
  showLabel = false,
  onClick 
}: CRMTemperatureBadgeProps) {
  const config = TEMPERATURE_CONFIG[temperature];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              config.borderColor,
              config.bgColor,
              'gap-1 cursor-default',
              onClick && 'cursor-pointer hover:opacity-80'
            )}
            onClick={onClick}
          >
            <Icon className={cn(sizeClasses[size], config.color)} />
            {showLabel && <span className={config.color}>{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CRMTemperatureSelectorProps {
  value: LeadTemperature;
  onChange: (temperature: LeadTemperature) => void;
  disabled?: boolean;
}

export function CRMTemperatureSelector({ value, onChange, disabled }: CRMTemperatureSelectorProps) {
  const temperatures: LeadTemperature[] = ['hot', 'warm', 'cold'];

  return (
    <div className="flex gap-2">
      {temperatures.map((temp) => {
        const config = TEMPERATURE_CONFIG[temp];
        const Icon = config.icon;
        const isSelected = value === temp;

        return (
          <button
            key={temp}
            type="button"
            disabled={disabled}
            onClick={() => onChange(temp)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              isSelected 
                ? `${config.borderColor} ${config.bgColor} border-2` 
                : 'border-border hover:border-muted-foreground/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn('h-5 w-5', isSelected ? config.color : 'text-muted-foreground')} />
            <span className={cn('text-sm font-medium', isSelected ? config.color : 'text-muted-foreground')}>
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
