import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, TrendingDown, Target, DollarSign, Users, Calendar, 
  Clock, AlertTriangle, CheckCircle2, Lightbulb, Zap, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Trophy, CalendarDays, Brain,
  ShoppingCart, UserCheck, Percent, Activity, Flame, Star
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CLINIC_GOALS } from "@/constants/clinicGoals";

interface StrategicOverviewProps {
  month: number;
  year: number;
}

export default function StrategicOverview({ month, year }: StrategicOverviewProps) {
  const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd");
  const today = new Date();
  
  // Calculate business days remaining
  const daysInMonth = differenceInDays(endOfMonth(new Date(year, month - 1, 1)), new Date(year, month - 1, 1)) + 1;
  const daysPassed = Math.min(today.getDate(), daysInMonth);
  const daysRemaining = Math.max(0, daysInMonth - daysPassed);
  
  // Count business days remaining
  let businessDaysRemaining = 0;
  for (let d = today.getDate() + 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (!isWeekend(date)) businessDaysRemaining++;
  }

  // Revenue data
  const { data: revenueData } = useQuery({
    queryKey: ["strategic-revenue", startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_records")
        .select("amount, date, patient_name, department")
        .gte("date", startDate)
        .lte("date", endDate);
      return data || [];
    },
  });

  // Executed data
  const { data: executedData } = useQuery({
    queryKey: ["strategic-executed", startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("executed_records")
        .select("amount, date")
        .gte("date", startDate)
        .lte("date", endDate);
      return data || [];
    },
  });

  // Last month revenue for comparison
  const lastMonthStart = format(startOfMonth(subMonths(new Date(year, month - 1, 1), 1)), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(subMonths(new Date(year, month - 1, 1), 1)), "yyyy-MM-dd");
  
  const { data: lastMonthRevenue } = useQuery({
    queryKey: ["strategic-last-month", lastMonthStart, lastMonthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_records")
        .select("amount")
        .gte("date", lastMonthStart)
        .lte("date", lastMonthEnd);
      return data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    },
  });

  // Referral leads
  const { data: referralLeads } = useQuery({
    queryKey: ["strategic-leads", startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_leads")
        .select("status, temperature, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59");
      return data || [];
    },
  });

  // Cancellations
  const { data: cancellations } = useQuery({
    queryKey: ["strategic-cancellations", startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("cancellations")
        .select("status, contract_value")
        .gte("cancellation_request_date", startDate)
        .lte("cancellation_request_date", endDate);
      return data || [];
    },
  });

  // Active campaigns
  const { data: campaigns } = useQuery({
    queryKey: ["strategic-campaigns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("name, start_date, end_date, goal_value, campaign_type")
        .eq("is_active", true)
        .gte("end_date", format(today, "yyyy-MM-dd"));
      return data || [];
    },
  });

  // RFV Segments
  const { data: rfvData } = useQuery({
    queryKey: ["strategic-rfv"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rfv_customers")
        .select("segment, total_value");
      return data || [];
    },
  });

  // Sellers count
  const { data: sellers } = useQuery({
    queryKey: ["strategic-sellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("department", "comercial");
      return data || [];
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalSold = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const totalExecuted = executedData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const salesCount = revenueData?.length || 0;
    const uniquePatients = new Set(revenueData?.map(r => r.patient_name)).size;
    
    const meta1 = CLINIC_GOALS.META_1;
    const meta2 = CLINIC_GOALS.META_2;
    const meta3 = CLINIC_GOALS.META_3;
    
    const meta1Progress = Math.min(100, (totalSold / meta1) * 100);
    const meta2Progress = Math.min(100, (totalSold / meta2) * 100);
    const meta3Progress = Math.min(100, (totalSold / meta3) * 100);
    
    const missingMeta1 = Math.max(0, meta1 - totalSold);
    const missingMeta2 = Math.max(0, meta2 - totalSold);
    const missingMeta3 = Math.max(0, meta3 - totalSold);
    
    const avgTicket = salesCount > 0 ? totalSold / salesCount : 0;
    const dailyAvg = daysPassed > 0 ? totalSold / daysPassed : 0;
    const dailyNeeded = businessDaysRemaining > 0 ? missingMeta1 / businessDaysRemaining : 0;
    
    const projection = dailyAvg * daysInMonth;
    
    // Month over month change
    const momChange = lastMonthRevenue ? ((totalSold - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    
    // Conversion rate from leads
    const totalLeads = referralLeads?.length || 0;
    const convertedLeads = referralLeads?.filter(l => l.status === "ganho" || l.status === "operou").length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    
    // Hot leads
    const hotLeads = referralLeads?.filter(l => l.temperature === "hot").length || 0;
    
    // Cancellation metrics
    const totalCancellations = cancellations?.length || 0;
    const retainedCancellations = cancellations?.filter(c => c.status === "retained").length || 0;
    const cancelledValue = cancellations?.filter(c => c.status === "cancelled_with_fine" || c.status === "cancelled_no_fine")
      .reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;
    
    // RFV metrics
    const rfvSegments = rfvData?.reduce((acc, c) => {
      acc[c.segment] = (acc[c.segment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const atRiskCustomers = (rfvSegments["Em Risco"] || 0) + (rfvSegments["Não Podem Perder"] || 0);
    const champions = rfvSegments["Campeões"] || 0;
    const totalCustomers = rfvData?.length || 0;
    
    return {
      totalSold,
      totalExecuted,
      salesCount,
      uniquePatients,
      meta1,
      meta2,
      meta3,
      meta1Progress,
      meta2Progress,
      meta3Progress,
      missingMeta1,
      missingMeta2,
      missingMeta3,
      avgTicket,
      dailyAvg,
      dailyNeeded,
      projection,
      momChange,
      conversionRate,
      hotLeads,
      totalLeads,
      totalCancellations,
      retainedCancellations,
      cancelledValue,
      atRiskCustomers,
      champions,
      totalCustomers,
      sellersCount: sellers?.length || 0,
      activeCampaigns: campaigns?.length || 0,
    };
  }, [revenueData, executedData, lastMonthRevenue, referralLeads, cancellations, rfvData, sellers, campaigns, daysPassed, daysInMonth, businessDaysRemaining]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
    return `R$ ${value.toFixed(0)}`;
  };

  const getStatusColor = (progress: number) => {
    if (progress >= 100) return "text-emerald-500";
    if (progress >= 80) return "text-amber-500";
    return "text-red-500";
  };

  const getStatusBg = (progress: number) => {
    if (progress >= 100) return "bg-emerald-500/10 border-emerald-500/30";
    if (progress >= 80) return "bg-amber-500/10 border-amber-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  // Strategic insights based on data
  const insights = useMemo(() => {
    const list: { icon: any; text: string; type: "success" | "warning" | "danger" | "info" }[] = [];
    
    if (metrics.meta1Progress >= 100) {
      list.push({ icon: Trophy, text: "Meta 1 batida! Continue para Meta 2.", type: "success" });
    } else if (metrics.dailyNeeded > metrics.dailyAvg * 1.5) {
      list.push({ icon: AlertTriangle, text: `Ritmo atual insuficiente. Precisa +${Math.round(((metrics.dailyNeeded / metrics.dailyAvg) - 1) * 100)}% por dia.`, type: "danger" });
    }
    
    if (metrics.hotLeads > 0) {
      list.push({ icon: Flame, text: `${metrics.hotLeads} leads quentes aguardando ação!`, type: "warning" });
    }
    
    if (metrics.atRiskCustomers > 10) {
      list.push({ icon: Users, text: `${metrics.atRiskCustomers} clientes em risco de perda. Ativar reativação!`, type: "warning" });
    }
    
    if (metrics.activeCampaigns > 0) {
      list.push({ icon: Zap, text: `${metrics.activeCampaigns} campanha(s) ativa(s) no momento.`, type: "info" });
    }
    
    if (metrics.momChange > 10) {
      list.push({ icon: TrendingUp, text: `+${metrics.momChange.toFixed(0)}% vs mês anterior. Excelente!`, type: "success" });
    } else if (metrics.momChange < -10) {
      list.push({ icon: TrendingDown, text: `${metrics.momChange.toFixed(0)}% vs mês anterior. Atenção!`, type: "danger" });
    }
    
    return list;
  }, [metrics]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Visão Geral Estratégica
          </h2>
          <p className="text-muted-foreground text-sm">
            {format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: ptBR })} • {daysRemaining} dias restantes ({businessDaysRemaining} úteis)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={metrics.meta1Progress >= 100 ? "default" : "secondary"} className="gap-1">
            {metrics.meta1Progress >= 100 ? <CheckCircle2 className="h-3 w-3" /> : <Target className="h-3 w-3" />}
            Meta 1: {metrics.meta1Progress.toFixed(0)}%
          </Badge>
          {metrics.meta2Progress >= 100 && (
            <Badge className="gap-1 bg-emerald-500">
              <CheckCircle2 className="h-3 w-3" /> Meta 2 ✓
            </Badge>
          )}
          {metrics.meta3Progress >= 100 && (
            <Badge className="gap-1 bg-gradient-gold-shine text-primary-foreground">
              <Trophy className="h-3 w-3" /> Meta 3 🏆
            </Badge>
          )}
        </div>
      </div>

      {/* Main KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Faturamento */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <Badge variant="outline" className={metrics.momChange >= 0 ? "text-emerald-500" : "text-red-500"}>
                {metrics.momChange >= 0 ? "+" : ""}{metrics.momChange.toFixed(0)}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-gradient-gold">{formatCurrency(metrics.totalSold)}</p>
            <p className="text-xs text-muted-foreground">Vendido no mês</p>
          </CardContent>
        </Card>

        {/* O que falta */}
        <Card className={`border ${getStatusBg(metrics.meta1Progress)}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">Meta 1</span>
            </div>
            <p className={`text-2xl font-bold ${getStatusColor(metrics.meta1Progress)}`}>
              {metrics.meta1Progress >= 100 ? "✓ Batida" : formatCurrency(metrics.missingMeta1)}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.meta1Progress >= 100 ? "Parabéns!" : "Falta para meta"}
            </p>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(metrics.avgTicket)}</p>
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
          </CardContent>
        </Card>

        {/* Necessário/Dia */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <Badge variant="outline">{businessDaysRemaining}d</Badge>
            </div>
            <p className="text-2xl font-bold text-amber-500">{formatCurrency(metrics.dailyNeeded)}</p>
            <p className="text-xs text-muted-foreground">Necessário/dia útil</p>
          </CardContent>
        </Card>

        {/* Conversão */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Percent className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-500">{metrics.conversionRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Conversão Leads</p>
          </CardContent>
        </Card>

        {/* Vendas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-500">{metrics.salesCount}</p>
            <p className="text-xs text-muted-foreground">Vendas no mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Progresso das Metas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Meta 1 - {formatCurrency(metrics.meta1)}</span>
              <span className={getStatusColor(metrics.meta1Progress)}>{metrics.meta1Progress.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.meta1Progress} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Meta 2 - {formatCurrency(metrics.meta2)}</span>
              <span className={getStatusColor(metrics.meta2Progress)}>{metrics.meta2Progress.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.meta2Progress} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Meta 3 - {formatCurrency(metrics.meta3)}</span>
              <span className={getStatusColor(metrics.meta3Progress)}>{metrics.meta3Progress.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.meta3Progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Insights Estratégicos */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Insights Estratégicos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    insight.type === "success" ? "bg-emerald-500/10 text-emerald-600" :
                    insight.type === "warning" ? "bg-amber-500/10 text-amber-600" :
                    insight.type === "danger" ? "bg-red-500/10 text-red-600" :
                    "bg-blue-500/10 text-blue-600"
                  }`}
                >
                  <insight.icon className="h-4 w-4 shrink-0" />
                  <span>{insight.text}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Sem alertas no momento.</p>
            )}
          </CardContent>
        </Card>

        {/* Resumo Operacional */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Resumo Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendedoras:</span>
                <span className="font-semibold">{metrics.sellersCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pacientes únicos:</span>
                <span className="font-semibold">{metrics.uniquePatients}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leads quentes:</span>
                <span className="font-semibold text-amber-500">{metrics.hotLeads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total leads:</span>
                <span className="font-semibold">{metrics.totalLeads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancelamentos:</span>
                <span className="font-semibold text-red-500">{metrics.totalCancellations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retidos:</span>
                <span className="font-semibold text-emerald-500">{metrics.retainedCancellations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clientes em risco:</span>
                <span className="font-semibold text-amber-500">{metrics.atRiskCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clientes campeões:</span>
                <span className="font-semibold text-emerald-500">{metrics.champions}</span>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base total RFV:</span>
              <span className="font-semibold">{metrics.totalCustomers} clientes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projeção e Comparativo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Projeção Mês</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(metrics.projection)}</p>
            <p className="text-xs text-muted-foreground">
              Com base na média diária atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Executado</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(metrics.totalExecuted)}</p>
            <p className="text-xs text-muted-foreground">
              Valor já realizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Campanhas Ativas</span>
            </div>
            <p className="text-2xl font-bold text-primary">{metrics.activeCampaigns}</p>
            <p className="text-xs text-muted-foreground">
              {campaigns?.map(c => c.name).slice(0, 2).join(", ") || "Nenhuma campanha"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Reminders */}
      {(metrics.hotLeads > 0 || metrics.atRiskCustomers > 10) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Ações Prioritárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics.hotLeads > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  📞 {metrics.hotLeads} leads quentes - Ligar hoje!
                </Badge>
              )}
              {metrics.atRiskCustomers > 10 && (
                <Badge variant="outline" className="border-red-500 text-red-600">
                  ⚠️ {metrics.atRiskCustomers} clientes em risco - Ativar reativação
                </Badge>
              )}
              {metrics.dailyNeeded > metrics.dailyAvg && (
                <Badge variant="outline" className="border-blue-500 text-blue-600">
                  📈 Acelerar: {formatCurrency(metrics.dailyNeeded)}/dia necessário
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
