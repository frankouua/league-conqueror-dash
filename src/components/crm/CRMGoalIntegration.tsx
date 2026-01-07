import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Target, TrendingUp, Trophy, ArrowRight, CheckCircle2,
  Clock, DollarSign, Users, Award, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function CRMGoalIntegration() {
  const { user, profile } = useAuth();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Fetch individual goals
  const { data: individualGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['crm-individual-goals', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch CRM performance data
  const { data: crmPerformance, isLoading: perfLoading } = useQuery({
    queryKey: ['crm-performance', user?.id, currentMonth, currentYear],
    queryFn: async () => {
      // Get won leads this month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

      const { data: wonLeads, error: wonError } = await supabase
        .from('crm_leads')
        .select('*, contract_value, estimated_value')
        .eq('assigned_to', user?.id)
        .not('won_at', 'is', null)
        .gte('won_at', startOfMonth)
        .lte('won_at', endOfMonth);
      
      if (wonError) throw wonError;

      // Get all my leads
      const { data: allLeads, error: allError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', user?.id);
      
      if (allError) throw allError;

      // Calculate metrics
      const totalRevenue = wonLeads?.reduce((acc, l) => acc + (l.contract_value || l.estimated_value || 0), 0) || 0;
      const dealsWon = wonLeads?.length || 0;
      const activeLeads = allLeads?.filter(l => !l.won_at && !l.lost_at).length || 0;
      const avgTicket = dealsWon > 0 ? totalRevenue / dealsWon : 0;

      return {
        totalRevenue,
        dealsWon,
        activeLeads,
        avgTicket,
        wonLeads: wonLeads || [],
      };
    },
    enabled: !!user,
  });

  const isLoading = goalsLoading || perfLoading;

  // Calculate goal progress
  const getGoalProgress = (current: number, goal: number) => {
    if (!goal) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const revenueGoal = individualGoals?.revenue_goal || 0;
  const revenueProgress = getGoalProgress(crmPerformance?.totalRevenue || 0, revenueGoal);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Goal Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-amber-500/10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Metas do CRM
              </CardTitle>
              <CardDescription>
                {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
              </CardDescription>
            </div>
            {revenueProgress >= 100 && (
              <Badge className="bg-green-500 gap-1">
                <Trophy className="w-3 h-3" />
                Meta Batida!
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Goal */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Meta de Receita</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {revenueProgress.toFixed(0)}%
                </span>
              </div>
              <Progress value={revenueProgress} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="font-bold text-lg">
                  R$ {((crmPerformance?.totalRevenue || 0) / 1000).toFixed(1)}k
                </span>
                <span className="text-muted-foreground">
                  de R$ {(revenueGoal / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Faltam R$ {(Math.max(0, revenueGoal - (crmPerformance?.totalRevenue || 0)) / 1000).toFixed(1)}k para bater a meta
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {crmPerformance?.dealsWon || 0}
                </div>
                <div className="text-xs text-muted-foreground">Vendas Fechadas</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {crmPerformance?.activeLeads || 0}
                </div>
                <div className="text-xs text-muted-foreground">Leads Ativos</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-500">
                  R$ {((crmPerformance?.avgTicket || 0) / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-muted-foreground">Ticket Médio</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {Math.ceil((revenueGoal - (crmPerformance?.totalRevenue || 0)) / (crmPerformance?.avgTicket || 1))}
                </div>
                <div className="text-xs text-muted-foreground">Vendas p/ Meta</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Wins */}
      {(crmPerformance?.wonLeads?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Vendas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {crmPerformance?.wonLeads.slice(0, 5).map((lead: any) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {lead.won_at && format(new Date(lead.won_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-green-500/50 text-green-500">
                    R$ {((lead.contract_value || lead.estimated_value || 0) / 1000).toFixed(1)}k
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Projeção do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Days remaining */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <div className="font-bold">
                {new Date(currentYear, currentMonth, 0).getDate() - new Date().getDate()}
              </div>
              <div className="text-xs text-muted-foreground">Dias Restantes</div>
            </div>
            
            {/* Daily goal */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Target className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <div className="font-bold">
                R$ {((Math.max(0, revenueGoal - (crmPerformance?.totalRevenue || 0)) / Math.max(1, new Date(currentYear, currentMonth, 0).getDate() - new Date().getDate())) / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-muted-foreground">Meta/Dia</div>
            </div>
            
            {/* Leads needed */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <div className="font-bold">
                {Math.ceil((revenueGoal - (crmPerformance?.totalRevenue || 0)) / (crmPerformance?.avgTicket || 10000))}
              </div>
              <div className="text-xs text-muted-foreground">Leads p/ Fechar</div>
            </div>
            
            {/* Status */}
            <div className={cn(
              "text-center p-3 rounded-lg",
              revenueProgress >= 100 
                ? "bg-green-500/10" 
                : revenueProgress >= 70 
                  ? "bg-amber-500/10" 
                  : "bg-red-500/10"
            )}>
              <Award className={cn(
                "w-5 h-5 mx-auto mb-1",
                revenueProgress >= 100 
                  ? "text-green-500" 
                  : revenueProgress >= 70 
                    ? "text-amber-500" 
                    : "text-red-500"
              )} />
              <div className="font-bold">
                {revenueProgress >= 100 ? 'Batida!' : revenueProgress >= 70 ? 'No Ritmo' : 'Acelerar'}
              </div>
              <div className="text-xs text-muted-foreground">Status</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
