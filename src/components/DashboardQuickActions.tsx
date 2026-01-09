import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Target, 
  TrendingUp, 
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  Trophy,
  Zap,
  UserCheck,
  Megaphone,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  route: string;
  color: string;
  bgColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'crm',
    label: 'CRM',
    description: 'Gerenciar leads e pipeline',
    icon: Users,
    route: '/crm',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20'
  },
  {
    id: 'metas',
    label: 'Minhas Metas',
    description: 'Ver progresso individual',
    icon: Target,
    route: '/?tab=minhas-metas',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20'
  },
  {
    id: 'vendas',
    label: 'Dashboard Vendas',
    description: 'Análise de vendas',
    icon: TrendingUp,
    route: '/vendas',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20'
  },
  {
    id: 'calendario',
    label: 'Calendário',
    description: 'Agenda unificada',
    icon: Calendar,
    route: '/calendario',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20'
  },
  {
    id: 'campanhas',
    label: 'Campanhas',
    description: 'Campanhas ativas',
    icon: Megaphone,
    route: '/campanhas',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10 hover:bg-pink-500/20'
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    description: 'Análises detalhadas',
    icon: BarChart3,
    route: '/relatorios',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20'
  },
  {
    id: 'guias',
    label: 'Guias',
    description: 'Scripts e materiais',
    icon: FileText,
    route: '/guias-comercial',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20'
  },
  {
    id: 'ranking',
    label: 'Ranking',
    description: 'Posição na liga',
    icon: Trophy,
    route: '/?tab=times',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20'
  }
];

interface DashboardQuickActionsProps {
  className?: string;
}

const DashboardQuickActions = memo(function DashboardQuickActions({ className }: DashboardQuickActionsProps) {
  const navigate = useNavigate();

  const handleActionClick = (action: QuickAction) => {
    if (action.route.startsWith('/?tab=')) {
      const tab = action.route.replace('/?tab=', '');
      // Se já está na página index, apenas muda a tab
      window.location.href = `/${action.route}`;
    } else {
      navigate(action.route);
    }
  };

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Acesso Rápido</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200",
                  "border border-transparent hover:border-border/50",
                  "group cursor-pointer",
                  action.bgColor
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  "bg-background/80 shadow-sm",
                  "group-hover:scale-110 transition-transform duration-200"
                )}>
                  <Icon className={cn("w-5 h-5", action.color)} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground leading-tight">
                    {action.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

export default DashboardQuickActions;
