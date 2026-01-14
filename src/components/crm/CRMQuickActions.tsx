import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Calendar, 
  Star,
  StarOff,
  Trash2,
  Copy,
  ExternalLink,
  UserPlus,
  ArrowRightLeft,
  Flag,
  Trophy,
  ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CRMLead } from '@/hooks/useCRM';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CRMQuickActionsProps {
  lead: CRMLead;
  onTogglePriority: () => void;
  onDelete: () => void;
  onTransfer: () => void;
  onMarkWon?: () => void;
  onMarkLost?: () => void;
  vertical?: boolean;
}

export function CRMQuickActions({ 
  lead, 
  onTogglePriority, 
  onDelete, 
  onTransfer,
  onMarkWon,
  onMarkLost,
  vertical = false 
}: CRMQuickActionsProps) {
  const { toast } = useToast();

  const handleCall = () => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_self');
    }
  };

  const handleWhatsApp = () => {
    const number = lead.whatsapp || lead.phone;
    if (number) {
      const cleanNumber = number.replace(/\D/g, '');
      const fullNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
      window.open(`https://wa.me/${fullNumber}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (lead.email) {
      window.open(`mailto:${lead.email}`, '_self');
    }
  };

  const handleCopyInfo = () => {
    const info = [
      `Nome: ${lead.name}`,
      lead.phone && `Telefone: ${lead.phone}`,
      lead.email && `E-mail: ${lead.email}`,
      lead.whatsapp && `WhatsApp: ${lead.whatsapp}`,
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(info);
    toast({ title: 'Informações copiadas!' });
  };

  const actions = [
    {
      icon: Phone,
      label: 'Ligar',
      onClick: handleCall,
      disabled: !lead.phone,
      color: 'text-blue-500 hover:bg-blue-500/10',
    },
    {
      icon: MessageSquare,
      label: 'WhatsApp',
      onClick: handleWhatsApp,
      disabled: !lead.whatsapp && !lead.phone,
      color: 'text-green-500 hover:bg-green-500/10',
    },
    {
      icon: Mail,
      label: 'E-mail',
      onClick: handleEmail,
      disabled: !lead.email,
      color: 'text-orange-500 hover:bg-orange-500/10',
    },
  ];

  // Check if lead is already won or lost
  const isFinalized = lead.won_at || lead.lost_at;

  return (
    <div className={cn(
      "flex gap-1",
      vertical ? "flex-col" : "flex-row"
    )}>
      {/* Primary Actions */}
      {actions.map((action) => (
        <Tooltip key={action.label}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                action.color,
                action.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <action.icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={vertical ? "right" : "bottom"}>
            {action.label}
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Won/Lost Quick Buttons - Only show if not finalized */}
      {!isFinalized && onMarkWon && onMarkLost && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:bg-green-500/10"
                onClick={onMarkWon}
              >
                <Trophy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={vertical ? "right" : "bottom"}>
              Marcar como Ganho
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={onMarkLost}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={vertical ? "right" : "bottom"}>
              Marcar como Perdido
            </TooltipContent>
          </Tooltip>
        </>
      )}

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <span className="text-lg">⋯</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onTogglePriority}>
            {lead.is_priority ? (
              <>
                <StarOff className="h-4 w-4 mr-2" />
                Remover Prioridade
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                Marcar como Prioritário
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyInfo}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar Informações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onTransfer}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transferir Lead
          </DropdownMenuItem>
          
          {!isFinalized && (
            <>
              <DropdownMenuSeparator />
              {onMarkWon && (
                <DropdownMenuItem 
                  onClick={onMarkWon}
                  className="text-green-600 focus:text-green-600"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Marcar como Ganho
                </DropdownMenuItem>
              )}
              {onMarkLost && (
                <DropdownMenuItem 
                  onClick={onMarkLost}
                  className="text-destructive focus:text-destructive"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Marcar como Perdido
                </DropdownMenuItem>
              )}
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
