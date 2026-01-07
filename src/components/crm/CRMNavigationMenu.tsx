import { useState } from 'react';
import { 
  LayoutGrid, 
  PieChart, 
  BarChart3, 
  Users,
  MessageSquare,
  Phone,
  Clock,
  Heart,
  Target,
  Zap,
  Trophy,
  Settings,
  ChevronDown,
  Bot,
  Smartphone,
  Mail,
  Calendar,
  FileText,
  Brain,
  Filter,
  UserCheck,
  Gamepad2,
  Link2,
  TrendingUp,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type CRMViewMode = 
  | 'overview' | 'kanban' | 'metrics' | 'rfv' | 'campaigns' | 'protocols' 
  | 'automations' | 'leaderboard' | 'whatsapp' | 'routine' | 'chat' 
  | 'contacts' | 'postsale' | 'connections' | 'marketing' | 'calendar' | 'proposals'
  | 'predictive' | 'funnel' | 'team-performance' | 'gamification' | 'integrations';

interface CRMNavigationMenuProps {
  viewMode: CRMViewMode;
  onViewChange: (view: CRMViewMode) => void;
  staleCount?: number;
  aiCount?: number;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: any;
  items: {
    value: CRMViewMode;
    label: string;
    icon: any;
    color?: string;
    badge?: string | number;
  }[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'principal',
    label: 'Principal',
    icon: LayoutGrid,
    items: [
      { value: 'overview', label: 'Visão Geral', icon: PieChart },
      { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
      { value: 'postsale', label: 'Pós-Venda', icon: Heart, color: 'text-pink-500' },
    ]
  },
  {
    id: 'comunicacao',
    label: 'Comunicação',
    icon: MessageSquare,
    items: [
      { value: 'whatsapp', label: 'WhatsApp IA', icon: Bot, color: 'text-green-500' },
      { value: 'contacts', label: 'Contatos', icon: Phone },
      { value: 'chat', label: 'Chat Equipe', icon: MessageSquare },
      { value: 'connections', label: 'Conexões', icon: Smartphone, color: 'text-green-600' },
    ]
  },
  {
    id: 'operacional',
    label: 'Operacional',
    icon: Clock,
    items: [
      { value: 'routine', label: 'Rotina do Dia', icon: Clock },
      { value: 'calendar', label: 'Agenda', icon: Calendar, color: 'text-blue-500' },
      { value: 'proposals', label: 'Propostas', icon: FileText, color: 'text-indigo-500' },
    ]
  },
  {
    id: 'analytics',
    label: 'Análises & IA',
    icon: Brain,
    items: [
      { value: 'metrics', label: 'Métricas', icon: BarChart3 },
      { value: 'funnel', label: 'Funil', icon: Filter, color: 'text-pink-500' },
      { value: 'predictive', label: 'IA Preditiva', icon: Brain, color: 'text-violet-500' },
      { value: 'rfv', label: 'RFV', icon: Target },
    ]
  },
  {
    id: 'equipe',
    label: 'Equipe & Metas',
    icon: Users,
    items: [
      { value: 'team-performance', label: 'Performance', icon: UserCheck, color: 'text-amber-500' },
      { value: 'leaderboard', label: 'Ranking', icon: Trophy },
      { value: 'gamification', label: 'Copa League', icon: Gamepad2, color: 'text-yellow-500' },
    ]
  },
  {
    id: 'automacao',
    label: 'Automação',
    icon: Zap,
    items: [
      { value: 'automations', label: 'Automações', icon: Zap },
      { value: 'marketing', label: 'Marketing', icon: Mail, color: 'text-purple-500' },
      { value: 'campaigns', label: 'Campanhas', icon: TrendingUp },
      { value: 'protocols', label: 'Protocolos', icon: Package },
    ]
  },
  {
    id: 'config',
    label: 'Configurações',
    icon: Settings,
    items: [
      { value: 'integrations', label: 'Integrações', icon: Link2 },
    ]
  }
];

// Get label for current view
const getViewLabel = (viewMode: CRMViewMode): string => {
  for (const group of MENU_GROUPS) {
    const item = group.items.find(i => i.value === viewMode);
    if (item) return item.label;
  }
  return 'Selecionar';
};

// Get icon for current view
const getViewIcon = (viewMode: CRMViewMode): any => {
  for (const group of MENU_GROUPS) {
    const item = group.items.find(i => i.value === viewMode);
    if (item) return item.icon;
  }
  return LayoutGrid;
};

export function CRMNavigationMenu({ viewMode, onViewChange, staleCount, aiCount }: CRMNavigationMenuProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Quick access buttons (most used)
  const quickAccessItems: CRMViewMode[] = ['kanban', 'postsale', 'whatsapp', 'routine'];

  const CurrentIcon = getViewIcon(viewMode);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick Access Buttons */}
      <div className="flex items-center gap-1">
        {quickAccessItems.map(item => {
          const menuItem = MENU_GROUPS.flatMap(g => g.items).find(i => i.value === item);
          if (!menuItem) return null;
          
          const Icon = menuItem.icon;
          const isActive = viewMode === item;
          
          return (
            <Button
              key={item}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "gap-1.5",
                isActive && "bg-primary text-primary-foreground",
                menuItem.color && !isActive && menuItem.color
              )}
              onClick={() => onViewChange(item)}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{menuItem.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border mx-1" />

      {/* Dropdown Menus */}
      <div className="flex items-center gap-1 flex-wrap">
        {MENU_GROUPS.filter(g => g.id !== 'principal').map(group => {
          const GroupIcon = group.icon;
          const hasActiveItem = group.items.some(i => i.value === viewMode);
          const activeItem = group.items.find(i => i.value === viewMode);
          
          return (
            <DropdownMenu 
              key={group.id}
              open={openDropdown === group.id}
              onOpenChange={(open) => setOpenDropdown(open ? group.id : null)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant={hasActiveItem ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    "gap-1",
                    hasActiveItem && "bg-secondary"
                  )}
                >
                  <GroupIcon className="w-4 h-4" />
                  <span className="hidden md:inline">
                    {hasActiveItem && activeItem ? activeItem.label : group.label}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                  <GroupIcon className="w-3 h-3" />
                  {group.label}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = viewMode === item.value;
                  
                  return (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={() => {
                        onViewChange(item.value);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "gap-2 cursor-pointer",
                        isActive && "bg-primary/10"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", item.color)} />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs h-5">
                          {item.badge}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>

      {/* Stats Badges */}
      {staleCount !== undefined && staleCount > 0 && (
        <Badge variant="destructive" className="gap-1">
          <Clock className="w-3 h-3" />
          {staleCount} parados
        </Badge>
      )}
    </div>
  );
}
