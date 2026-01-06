import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { 
  AlertTriangle, Bell, TrendingDown, Clock, XCircle, 
  Play, RefreshCw, CheckCircle2, Users, Calendar,
  Zap, Settings
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AlertResult {
  type: string;
  count: number;
  details: string[];
}

interface AlertSummary {
  success: boolean;
  timestamp: string;
  month: string;
  daysRemaining: number;
  alerts: AlertResult[];
  notificationsCreated: number;
}

export default function AlertsManager() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<AlertSummary | null>(null);

  // Fetch recent notifications
  const { data: recentNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["admin-alert-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .in("type", [
          "seller_below_pace",
          "seller_no_daily_sale", 
          "seller_critical",
          "seller_warning",
          "lead_stale_48h",
          "cancellation_retention",
          "daily_goal_missed"
        ])
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Group notifications by type
  const groupedNotifications = recentNotifications?.reduce((acc, notif) => {
    if (!acc[notif.type]) acc[notif.type] = [];
    acc[notif.type].push(notif);
    return acc;
  }, {} as Record<string, typeof recentNotifications>);

  const runAlertCheck = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-seller-alerts");
      
      if (error) throw error;
      
      setLastResult(data as AlertSummary);
      refetchNotifications();
      
      toast({
        title: "✅ Verificação concluída",
        description: `${data.notificationsCreated} alertas enviados`,
      });
    } catch (error) {
      console.error("Error running alert check:", error);
      toast({
        title: "Erro",
        description: "Falha ao executar verificação de alertas",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getAlertTypeInfo = (type: string) => {
    switch (type) {
      case "below_pace":
        return { label: "Abaixo do Ritmo", icon: TrendingDown, color: "text-orange-500", bg: "bg-orange-500/10" };
      case "no_daily_sale":
        return { label: "Sem Venda Hoje", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" };
      case "stale_leads_48h":
        return { label: "Indicações Paradas 48h+", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" };
      case "pending_retentions":
        return { label: "Cancelamentos Pendentes", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" };
      case "missed_daily_goal":
        return { label: "Meta Diária Não Batida", icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" };
      default:
        return { label: type, icon: Bell, color: "text-muted-foreground", bg: "bg-muted" };
    }
  };

  const getNotifTypeInfo = (type: string) => {
    switch (type) {
      case "seller_below_pace":
        return { label: "Abaixo do Ritmo", color: "bg-orange-500" };
      case "seller_no_daily_sale":
        return { label: "Sem Venda Hoje", color: "bg-amber-500" };
      case "seller_critical":
        return { label: "Crítico", color: "bg-red-500" };
      case "seller_warning":
        return { label: "Atenção", color: "bg-yellow-500" };
      case "lead_stale_48h":
        return { label: "Lead Parado", color: "bg-red-500" };
      case "cancellation_retention":
        return { label: "Cancelamento", color: "bg-destructive" };
      case "daily_goal_missed":
        return { label: "Meta Diária", color: "bg-orange-500" };
      default:
        return { label: type, color: "bg-muted" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Sistema de Alertas Automáticos</CardTitle>
                <CardDescription>
                  Notificações automáticas para vendedoras sobre metas, indicações e cancelamentos
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={runAlertCheck} 
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Executar Agora
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Alert Types Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tipos de Alertas Monitorados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-orange-500/5 border-orange-500/20">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-sm">Vendedora 20% abaixo do ritmo</p>
                  <p className="text-xs text-muted-foreground">Compara vendas vs ritmo esperado</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600">Ativo</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-red-500/5 border-red-500/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-sm">Indicação parada há 48h+</p>
                  <p className="text-xs text-muted-foreground">Leads sem contato recente</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600">Ativo</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">Meta diária não batida</p>
                  <p className="text-xs text-muted-foreground">Verifica vendas do dia anterior</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600">Ativo</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-destructive/5 border-destructive/20">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-sm">Cancelamento pendente</p>
                  <p className="text-xs text-muted-foreground">Retenção não concluída</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-600">Ativo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Última Verificação
            </CardTitle>
            <CardDescription>
              {format(new Date(lastResult.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {lastResult.alerts.map((alert) => {
                const info = getAlertTypeInfo(alert.type);
                const Icon = info.icon;
                return (
                  <div key={alert.type} className={`p-3 rounded-lg ${info.bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${info.color}`} />
                      <span className="text-xs font-medium">{info.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${info.color}`}>{alert.count}</p>
                    {alert.details.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {alert.details.slice(0, 3).join(", ")}
                        {alert.details.length > 3 && ` +${alert.details.length - 3}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{lastResult.notificationsCreated} notificações enviadas</span>
              <span className="mx-2">•</span>
              <span>{lastResult.daysRemaining} dias restantes no mês</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Alertas Recentes Enviados
          </CardTitle>
          <CardDescription>
            Últimas 50 notificações de alerta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {recentNotifications?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum alerta recente
                </p>
              )}
              {recentNotifications?.map((notif) => {
                const info = getNotifTypeInfo(notif.type);
                return (
                  <div 
                    key={notif.id} 
                    className={`p-3 rounded-lg border ${notif.read ? "bg-background" : "bg-primary/5"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${info.color} text-white text-[10px]`}>
                            {info.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notif.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notif.message.replace(/\[.*?\]/g, "").trim()}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
