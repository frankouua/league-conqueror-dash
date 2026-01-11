import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  TrendingUp,
  Star,
  Gift,
  Trophy,
  RefreshCcw,
  Zap,
  FileText,
} from "lucide-react";

interface ActionBatch {
  id: string;
  name: string;
  action_type: string;
  channel: string;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  response_count: number;
  total_points_generated: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface ActionDispatch {
  id: string;
  lead_id: string;
  action_type: string;
  channel: string;
  message_content: string;
  status: string;
  points_earned: number;
  bonus_earned: number;
  sent_at: string;
  response_at: string | null;
  crm_leads: {
    name: string;
  };
}

const ACTION_ICONS: Record<string, any> = {
  nps: Star,
  campaign: Zap,
  referral: Users,
  ambassador: Trophy,
  protocol: FileText,
  rfv_reactivation: RefreshCcw,
  rfv_bonus: Gift,
  rfv_upgrade: TrendingUp,
  rfv_crosssell: TrendingUp,
  rfv_upsell: TrendingUp,
};

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-yellow-500", icon: Clock, label: "Pendente" },
  sent: { color: "bg-blue-500", icon: Send, label: "Enviado" },
  delivered: { color: "bg-blue-600", icon: CheckCircle2, label: "Entregue" },
  read: { color: "bg-purple-500", icon: CheckCircle2, label: "Lido" },
  responded: { color: "bg-green-500", icon: CheckCircle2, label: "Respondido" },
  failed: { color: "bg-red-500", icon: XCircle, label: "Falhou" },
  completed: { color: "bg-green-500", icon: CheckCircle2, label: "Concluído" },
  processing: { color: "bg-blue-500", icon: RefreshCcw, label: "Processando" },
};

export default function CRMActionHistory() {
  // Buscar batches recentes
  const { data: batches = [] } = useQuery({
    queryKey: ["action-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as ActionBatch[];
    },
  });

  // Buscar dispatches recentes
  const { data: dispatches = [] } = useQuery({
    queryKey: ["action-dispatches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_dispatches")
        .select(`
          *,
          crm_leads (name)
        `)
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActionDispatch[];
    },
  });

  // Estatísticas
  const { data: stats } = useQuery({
    queryKey: ["action-stats"],
    queryFn: async () => {
      const { data: dispatchStats, error: dispatchError } = await supabase
        .from("action_dispatches")
        .select("status, points_earned, bonus_earned");

      if (dispatchError) throw dispatchError;

      const total = dispatchStats?.length || 0;
      const sent = dispatchStats?.filter(d => d.status !== 'pending' && d.status !== 'failed').length || 0;
      const responded = dispatchStats?.filter(d => d.status === 'responded').length || 0;
      const totalPoints = dispatchStats?.reduce((sum, d) => sum + (d.points_earned || 0) + (d.bonus_earned || 0), 0) || 0;

      return {
        total,
        sent,
        responded,
        responseRate: total > 0 ? ((responded / total) * 100).toFixed(1) : 0,
        totalPoints,
      };
    },
  });

  const getIcon = (type: string) => {
    const Icon = ACTION_ICONS[type] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className="gap-1">
        <span className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Enviados</p>
                <p className="text-2xl font-bold">{stats?.sent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Respondidos</p>
                <p className="text-2xl font-bold">{stats?.responded || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Resposta</p>
                <p className="text-2xl font-bold">{stats?.responseRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontos Gerados</p>
                <p className="text-2xl font-bold">{stats?.totalPoints || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">
            <Users className="h-4 w-4 mr-2" />
            Lotes em Massa
          </TabsTrigger>
          <TabsTrigger value="individual">
            <MessageSquare className="h-4 w-4 mr-2" />
            Disparos Individuais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Lotes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <Card key={batch.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background">
                              {getIcon(batch.action_type)}
                            </div>
                            <div>
                              <p className="font-medium">{batch.name || "Lote sem nome"}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(batch.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm">
                                <span className="text-green-600 font-medium">{batch.sent_count}</span>
                                {" / "}
                                <span className="text-muted-foreground">{batch.total_leads}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {batch.response_count} respostas
                              </p>
                            </div>
                            {getStatusBadge(batch.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {batches.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum lote disparado ainda</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Últimos Disparos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {dispatches.map((dispatch) => (
                    <div
                      key={dispatch.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-background">
                          {getIcon(dispatch.action_type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {dispatch.crm_leads?.name || "Lead"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(dispatch.sent_at), "dd/MM HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {(dispatch.points_earned > 0 || dispatch.bonus_earned > 0) && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3" />
                            +{dispatch.points_earned + dispatch.bonus_earned}
                          </Badge>
                        )}
                        {getStatusBadge(dispatch.status)}
                      </div>
                    </div>
                  ))}

                  {dispatches.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum disparo realizado ainda</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
