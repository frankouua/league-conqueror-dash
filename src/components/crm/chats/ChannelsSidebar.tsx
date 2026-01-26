import { Instagram, Facebook } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Channel = 'whatsapp' | 'instagram' | 'facebook';

interface ChannelsSidebarProps {
  activeChannel: Channel;
  onSelectChannel: (channel: Channel) => void;
}

const channels = [
  {
    id: 'whatsapp' as Channel,
    name: 'WhatsApp',
    icon: WhatsAppIcon,
    enabled: true,
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-500/20',
    activeColor: 'bg-green-500/20 text-green-500',
  },
  {
    id: 'instagram' as Channel,
    name: 'Instagram',
    icon: Instagram,
    enabled: false,
    color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600',
    hoverColor: 'hover:bg-pink-500/20',
    activeColor: 'bg-pink-500/20 text-pink-500',
  },
  {
    id: 'facebook' as Channel,
    name: 'Facebook',
    icon: Facebook,
    enabled: false,
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-500/20',
    activeColor: 'bg-blue-500/20 text-blue-500',
  },
];

export function ChannelsSidebar({ activeChannel, onSelectChannel }: ChannelsSidebarProps) {
  return (
    <div className="w-16 border-r bg-muted/30 flex flex-col items-center py-4 gap-2 shrink-0">
      <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Canais
      </h3>
      
      {channels.map((channel) => {
        const Icon = channel.icon;
        const isActive = activeChannel === channel.id;
        const isDisabled = !channel.enabled;

        return (
          <Tooltip key={channel.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => channel.enabled && onSelectChannel(channel.id)}
                disabled={isDisabled}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                  "border border-transparent",
                  isActive && channel.enabled && [
                    channel.activeColor,
                    "border-current",
                    "shadow-sm"
                  ],
                  !isActive && channel.enabled && [
                    "text-muted-foreground",
                    channel.hoverColor,
                    "hover:text-foreground"
                  ],
                  isDisabled && [
                    "opacity-40",
                    "cursor-not-allowed",
                    "text-muted-foreground"
                  ]
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border-border">
              <p className="text-sm">
                {channel.name}
                {isDisabled && <span className="text-muted-foreground ml-1">(Em breve)</span>}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
      
      {/* Visual indicator for active channel */}
      <div className="mt-auto px-2">
        <div className="w-8 h-0.5 bg-primary/30 rounded-full" />
      </div>
    </div>
  );
}
