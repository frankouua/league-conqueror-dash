import { Shield, Crown, Users, Smartphone, MessageCircle } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Instance {
  instance_id: string;
  instance_name: string;
  status: string;
  phone_number: string | null;
  role: 'owner' | 'coordinator' | 'member' | 'viewer';
  last_activity?: string | null;
}

interface InstancesListProps {
  instances: Instance[];
  selectedInstanceId: string | null;
  onSelectInstance: (instanceId: string) => void;
  loading?: boolean;
}

const roleConfig = {
  owner: { icon: Crown, label: 'Proprietário', color: 'text-yellow-500' },
  coordinator: { icon: Shield, label: 'Coordenador', color: 'text-blue-500' },
  member: { icon: Users, label: 'Membro', color: 'text-green-500' },
  viewer: { icon: Users, label: 'Visualizador', color: 'text-muted-foreground' },
};

// Mapeamento de nome da instância para informações de exibição
const instanceDisplayConfig: Record<string, { name: string; badge: string; badgeColor: string }> = {
  'INGRED_SOCIAL': { name: 'Ingred', badge: 'Social Selling', badgeColor: 'bg-pink-500 text-white' },
  'KETLEY_SDR': { name: 'Ketley', badge: 'SDR', badgeColor: 'bg-blue-500 text-white' },
  'ANA_PAULA_SDR': { name: 'Ana Paula', badge: 'SDR', badgeColor: 'bg-blue-500 text-white' },
  'VIVI_CS': { name: 'Vivi', badge: 'Customer Success', badgeColor: 'bg-teal-700 text-white' },
  'BIANCA_CLOSER': { name: 'Bianca', badge: 'Closer', badgeColor: 'bg-orange-500 text-white' },
  'KAMYLLE_FARMER': { name: 'Kamylle', badge: 'Farmer', badgeColor: 'bg-purple-500 text-white' },
  'LARISSA_CLOSER': { name: 'Larissa', badge: 'Closer', badgeColor: 'bg-orange-500 text-white' },
  'RODRIGO_SOCIAL': { name: 'Rodrigo', badge: 'Social Selling', badgeColor: 'bg-pink-500 text-white' },
  'PAULA_CS': { name: 'Paula', badge: 'Customer Success', badgeColor: 'bg-teal-700 text-white' },
  'LAYS_CLOSER': { name: 'Lays', badge: 'Farmer', badgeColor: 'bg-purple-500 text-white' },
  'DIEGO_COORDENADOR': { name: 'Diego', badge: 'Coordenador', badgeColor: 'bg-red-500 text-white' },
  'UNIQUE_API_OFICIAL': { name: 'Unique', badge: 'API Oficial', badgeColor: 'bg-green-600 text-white' },
  'UNIQUE_API_NAO_OFICIAL': { name: 'Unique', badge: 'API Não Oficial', badgeColor: 'bg-green-600 text-white' },
};

function getInstanceDisplayInfo(instanceName: string): { name: string; badge: string; badgeColor: string } {
  const config = instanceDisplayConfig[instanceName];
  if (config) return config;
  
  // Fallback: format name and try to extract role from name
  const formatted = instanceName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  
  return {
    name: formatted,
    badge: 'Membro',
    badgeColor: 'bg-muted text-muted-foreground'
  };
}

function formatLastActivity(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

export function InstancesList({
  instances,
  selectedInstanceId,
  onSelectInstance,
  loading = false,
}: InstancesListProps) {
  if (loading) {
    return (
      <div className="w-52 border-r bg-card flex flex-col shrink-0">
        <div className="p-3 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <WhatsAppIcon className="w-3.5 h-3.5 text-green-500" />
            WhatsApp
          </h3>
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="w-52 border-r bg-card flex flex-col shrink-0">
        <div className="p-3 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <WhatsAppIcon className="w-3.5 h-3.5 text-green-500" />
            WhatsApp
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            Nenhuma instância disponível
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-52 border-r bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <WhatsAppIcon className="w-3.5 h-3.5 text-green-500" />
            WhatsApp
          </h3>
          <Badge variant="secondary" className="text-[10px] h-5">
            {instances.length}
          </Badge>
        </div>
      </div>

      {/* Instances List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {instances.map((instance) => {
            const isSelected = selectedInstanceId === instance.instance_id;
            const roleInfo = roleConfig[instance.role];
            const RoleIcon = roleInfo.icon;
            const isConnected = instance.status === 'connected';
            const displayInfo = getInstanceDisplayInfo(instance.instance_name);
            const lastActivity = formatLastActivity(instance.last_activity);

            return (
              <button
                key={instance.instance_id}
                onClick={() => onSelectInstance(instance.instance_id)}
                className={cn(
                  "w-full p-2.5 rounded-lg text-left transition-all duration-200",
                  "hover:bg-muted/80",
                  isSelected && "bg-primary/10 border border-primary/30 shadow-sm"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Instance Icon with Status */}
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      isSelected ? "bg-green-500/20" : "bg-muted"
                    )}>
                      <Smartphone className={cn(
                        "w-4 h-4",
                        isSelected ? "text-green-500" : "text-muted-foreground"
                      )} />
                    </div>
                    {/* Connection Status Indicator */}
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                      isConnected ? "bg-green-500" : "bg-amber-500"
                    )} />
                  </div>

                  {/* Instance Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-foreground" : "text-foreground/80"
                    )}>
                      {displayInfo.name}
                    </p>
                    
                    {/* Function Badge */}
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[9px] h-4 px-1.5 mt-0.5 font-medium",
                        displayInfo.badgeColor
                      )}
                    >
                      {displayInfo.badge}
                    </Badge>
                    
                    {/* Last Activity */}
                    {lastActivity && (
                      <div className="flex items-center gap-1 mt-1">
                        <MessageCircle className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground truncate">
                          {lastActivity}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
