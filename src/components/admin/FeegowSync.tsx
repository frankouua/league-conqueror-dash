import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Link2, BarChart3, Key } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import FeegowUserMapping from "./FeegowUserMapping";

interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  date_start: string | null;
  date_end: string | null;
  total_accounts: number | null;
  paid_accounts: number | null;
  inserted: number | null;
  skipped: number | null;
  errors: number | null;
  sellers_not_found: string[] | null;
  error_message: string | null;
  triggered_by: string | null;
}

const FeegowSync = () => {
  const queryClient = useQueryClient();
  const [dateStart, setDateStart] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [dateEnd, setDateEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showTokenUpdate, setShowTokenUpdate] = useState(false);
  const [newToken, setNewToken] = useState("");

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["feegow-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feegow_sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SyncLog[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async ({ dateStart, dateEnd }: { dateStart: string; dateEnd: string }) => {
      // Convert dates to DD-MM-YYYY format for FEEGOW API
      const startParts = dateStart.split("-");
      const endParts = dateEnd.split("-");
      const formattedStart = `${startParts[2]}-${startParts[1]}-${startParts[0]}`;
      const formattedEnd = `${endParts[2]}-${endParts[1]}-${endParts[0]}`;

      const { data, error } = await supabase.functions.invoke("feegow-sync", {
        body: {
          date_start: formattedStart,
          date_end: formattedEnd,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["feegow-sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-records"] });
      
      if (data.success) {
        toast.success(
          `Sincronização concluída: ${data.stats?.inserted || 0} registros inseridos`
        );
      } else {
        toast.error(data.error || "Erro na sincronização");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSync = () => {
    if (!dateStart || !dateEnd) {
      toast.error("Selecione as datas de início e fim");
      return;
    }
    syncMutation.mutate({ dateStart, dateEnd });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sucesso
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      case "running":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            Executando
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Tabs defaultValue="sync" className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sincronização
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Mapeamentos
          </TabsTrigger>
        </TabsList>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowTokenUpdate(!showTokenUpdate)}
          >
            <Key className="w-4 h-4 mr-2" />
            Atualizar Token
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/sales-dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard de Vendas
            </Link>
          </Button>
        </div>
      </div>

      {showTokenUpdate && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              Atualizar Token FEEGOW
            </CardTitle>
            <CardDescription>
              Cole o novo token da API FEEGOW para atualizar a integração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="Cole o novo token aqui..."
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Para atualizar o token, vá em <strong>Configurações → Segredos</strong> no painel do Lovable 
              ou solicite ao administrador para atualizar o secret <code>FEEGOW_API_TOKEN</code>.
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => {
                setShowTokenUpdate(false);
                setNewToken("");
                toast.info("Para atualizar o token, peça ao Lovable: 'atualizar o token FEEGOW'");
              }}
            >
              Entendi
            </Button>
          </CardContent>
        </Card>
      )}

      <TabsContent value="sync" className="space-y-6 mt-0">
        {/* Sync Control Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
            Sincronização FEEGOW
          </CardTitle>
          <CardDescription>
            Sincronize pagamentos recebidos do FEEGOW para o sistema de faturamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStart" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Inicial
              </Label>
              <Input
                id="dateStart"
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEnd" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Final
              </Label>
              <Input
                id="dateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>
          
          <Button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className="w-full"
          >
            {syncMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Agora
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Sincronizações</CardTitle>
          <CardDescription>
            Últimas 20 sincronizações realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(log.status)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {log.triggered_by && (
                          <span className="text-xs text-muted-foreground">
                            por {log.triggered_by}
                          </span>
                        )}
                      </div>
                      
                      {log.date_start && log.date_end && (
                        <p className="text-sm text-muted-foreground">
                          Período: {log.date_start} até {log.date_end}
                        </p>
                      )}
                      
                      {log.status === "success" && (
                        <div className="flex gap-4 text-sm mt-2">
                          <span className="text-green-500">
                            ✓ {log.inserted} inseridos
                          </span>
                          <span className="text-muted-foreground">
                            ⏭ {log.skipped} pulados
                          </span>
                          {log.errors && log.errors > 0 && (
                            <span className="text-destructive">
                              ✕ {log.errors} erros
                            </span>
                          )}
                        </div>
                      )}
                      
                      {log.error_message && (
                        <p className="text-sm text-destructive mt-2">
                          {log.error_message}
                        </p>
                      )}
                      
                      {log.sellers_not_found && log.sellers_not_found.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                          <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            Vendedores não encontrados:
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.sellers_not_found.join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma sincronização realizada ainda
            </p>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="mapping" className="mt-0">
        <FeegowUserMapping />
      </TabsContent>
    </Tabs>
  );
};

export default FeegowSync;
