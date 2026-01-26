import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Smartphone, ChevronDown, Shield, User, Crown } from 'lucide-react';
import { MyWhatsAppInstance, InstanceRole } from '@/hooks/useMyWhatsAppInstances';
import { cn } from '@/lib/utils';

interface InstanceSelectorProps {
  instances: MyWhatsAppInstance[];
  selectedInstanceId: string | null;
  onSelectInstance: (instanceId: string) => void;
  loading?: boolean;
}

const roleConfig: Record<InstanceRole, { label: string; icon: React.ElementType; color: string }> = {
  owner: { label: 'Proprietário', icon: Crown, color: 'text-amber-500' },
  coordinator: { label: 'Coordenador', icon: Shield, color: 'text-blue-500' },
  member: { label: 'Membro', icon: User, color: 'text-green-500' },
  viewer: { label: 'Visualizador', icon: User, color: 'text-muted-foreground' },
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  connected: { label: 'Conectado', variant: 'default' },
  disconnected: { label: 'Desconectado', variant: 'destructive' },
  pending: { label: 'Pendente', variant: 'secondary' },
};

export function InstanceSelector({
  instances,
  selectedInstanceId,
  onSelectInstance,
  loading,
}: InstanceSelectorProps) {
  const selectedInstance = instances.find(i => i.instance_id === selectedInstanceId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md animate-pulse">
        <Smartphone className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando instâncias...</span>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
        <Smartphone className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Nenhuma instância disponível</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span className="truncate max-w-[150px]">
              {selectedInstance?.instance_name || 'Selecionar instância'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel>Suas Instâncias WhatsApp</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {instances.map((instance) => {
          const role = roleConfig[instance.role];
          const status = statusConfig[instance.status] || statusConfig.pending;
          const RoleIcon = role.icon;

          return (
            <DropdownMenuItem
              key={instance.instance_id}
              onClick={() => onSelectInstance(instance.instance_id)}
              className={cn(
                "flex flex-col items-start gap-1 py-2 cursor-pointer",
                selectedInstanceId === instance.instance_id && "bg-accent"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{instance.instance_name}</span>
                <Badge variant={status.variant} className="text-xs">
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RoleIcon className={cn("w-3 h-3", role.color)} />
                <span>{role.label}</span>
                {instance.phone_number && (
                  <>
                    <span>•</span>
                    <span>{instance.phone_number}</span>
                  </>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
