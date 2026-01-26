import { Shield, Crown, Users, Smartphone } from 'lucide-react';
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

interface Instance {
  instance_id: string;
  instance_name: string;
  status: string;
  phone_number: string | null;
  role: 'owner' | 'coordinator' | 'member' | 'viewer';
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

function formatInstanceName(name: string): string {
  // Convert SNAKE_CASE to more readable format
  return name
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
                      {formatInstanceName(instance.instance_name)}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <RoleIcon className={cn("w-3 h-3", roleInfo.color)} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-popover border-border">
                          <p className="text-xs">{roleInfo.label}</p>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {instance.phone_number || 'Sem número'}
                      </span>
                    </div>
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
