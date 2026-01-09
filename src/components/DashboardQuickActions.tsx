import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Target, 
  TrendingUp, 
  Calendar,
  FileText,
  BarChart3,
  Trophy,
  Zap,
  Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'crm', label: 'CRM', icon: Users, route: '/crm', color: 'text-blue-500' },
  { id: 'metas', label: 'Metas', icon: Target, route: '/', color: 'text-emerald-500' },
  { id: 'vendas', label: 'Vendas', icon: TrendingUp, route: '/sales-dashboard', color: 'text-amber-500' },
  { id: 'calendario', label: 'Agenda', icon: Calendar, route: '/calendario', color: 'text-purple-500' },
  { id: 'campanhas', label: 'Campanhas', icon: Megaphone, route: '/campanhas', color: 'text-pink-500' },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3, route: '/data-reports', color: 'text-cyan-500' },
  { id: 'guias', label: 'Guias', icon: FileText, route: '/guias-comerciais', color: 'text-orange-500' },
  { id: 'ranking', label: 'Ranking', icon: Trophy, route: '/', color: 'text-yellow-500' }
];

interface DashboardQuickActionsProps {
  className?: string;
  onTabChange?: (tab: string) => void;
}

const DashboardQuickActions = memo(function DashboardQuickActions({ className, onTabChange }: DashboardQuickActionsProps) {
  const navigate = useNavigate();

  const handleActionClick = (action: QuickAction) => {
    // Handle internal tab navigation
    if (action.id === 'metas' && onTabChange) {
      onTabChange('minhas-metas');
      return;
    }
    if (action.id === 'ranking' && onTabChange) {
      onTabChange('times');
      return;
    }
    // Navigate to external routes
    navigate(action.route);
  };

  return (
    <div className={cn("flex items-center justify-center gap-1 flex-wrap", className)}>
      <Zap className="w-3 h-3 text-primary mr-1" />
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-200",
              "hover:bg-muted/80 text-muted-foreground hover:text-foreground",
              "text-[10px] font-medium"
            )}
          >
            <Icon className={cn("w-3 h-3", action.color)} />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
});

export default DashboardQuickActions;
