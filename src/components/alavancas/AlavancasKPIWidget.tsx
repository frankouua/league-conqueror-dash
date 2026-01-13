import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, RefreshCw, UserPlus, Target, ShieldAlert, 
  DollarSign, TrendingUp, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlavancasStats {
  totalClients: number;
  totalRecurrences: number;
  totalReferrals: number;
  totalCancellations: number;
  potentialValue: number;
  unassignedLeads: number;
  criticalRecurrences: number;
}

function AlavancasKPIWidgetComponent() {
  // Fetch aggregated stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['alavancas-kpi-stats'],
    queryFn: async (): Promise<AlavancasStats> => {
      // Parallel queries for performance
      const [
        clientsResult,
        recurrencesResult,
        referralsResult,
        cancellationsResult,
      ] = await Promise.all([
        supabase
          .from('crm_leads')
          .select('id, estimated_value, assigned_to', { count: 'exact', head: false })
          .limit(5000),
        supabase
          .from('crm_leads')
          .select('id, recurrence_days_overdue, estimated_value, assigned_to', { count: 'exact', head: false })
          .eq('is_recurrence_lead', true)
          .limit(5000),
        supabase
          .from('referral_leads')
          .select('id', { count: 'exact' })
          .eq('status', 'nova'),
        supabase
          .from('cancellations')
          .select('id, contract_value', { count: 'exact', head: false })
          .eq('status', 'pending_retention'),
      ]);

      const clients = clientsResult.data || [];
      const recurrences = recurrencesResult.data || [];
      const referrals = referralsResult.data || [];
      const cancellations = cancellationsResult.data || [];

      // Calculate critical recurrences (60+ days overdue)
      const criticalRecurrences = recurrences.filter(
        (r: any) => (r.recurrence_days_overdue || 0) >= 60
      ).length;

      // Calculate potential value from recurrences
      const potentialValue = recurrences.reduce(
        (sum: number, r: any) => sum + (r.estimated_value || 0), 
        0
      );

      // Calculate unassigned leads
      const unassignedLeads = [...clients, ...recurrences].filter(
        (l: any) => !l.assigned_to
      ).length;

      return {
        totalClients: clientsResult.count || clients.length,
        totalRecurrences: recurrencesResult.count || recurrences.length,
        totalReferrals: referralsResult.count || referrals.length,
        totalCancellations: cancellationsResult.count || cancellations.length,
        potentialValue,
        unassignedLeads,
        criticalRecurrences,
      };
    },
    staleTime: 60000, // 1 minute cache
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Clientes',
      value: stats?.totalClients.toLocaleString('pt-BR') || '0',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Recorrências',
      value: stats?.totalRecurrences.toLocaleString('pt-BR') || '0',
      icon: RefreshCw,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      badge: stats?.criticalRecurrences ? { 
        label: `${stats.criticalRecurrences} críticos`, 
        color: 'bg-red-500 text-white' 
      } : undefined,
    },
    {
      label: 'Indicações',
      value: stats?.totalReferrals.toLocaleString('pt-BR') || '0',
      icon: UserPlus,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Cancelamentos',
      value: stats?.totalCancellations.toLocaleString('pt-BR') || '0',
      icon: ShieldAlert,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Valor Potencial',
      value: new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(stats?.potentialValue || 0),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Não Distribuídos',
      value: stats?.unassignedLeads.toLocaleString('pt-BR') || '0',
      icon: Target,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      badge: stats?.unassignedLeads && stats.unassignedLeads > 0 ? {
        label: 'Atribuir',
        color: 'bg-amber-500 text-white',
      } : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 px-6 py-4 bg-gradient-to-r from-card/80 to-card border-b">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className="border-0 shadow-none bg-transparent">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", kpi.bgColor)}>
                  <Icon className={cn("h-4 w-4", kpi.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold">{kpi.value}</p>
                    {kpi.badge && (
                      <Badge className={cn("text-[10px] px-1.5 py-0", kpi.badge.color)}>
                        {kpi.badge.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export const AlavancasKPIWidget = memo(AlavancasKPIWidgetComponent);
