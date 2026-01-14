import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Zap,
  Calendar,
  Activity,
  Bot
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AutomationSchedule {
  id: string;
  automation_name: string;
  function_name: string;
  cron_expression: string;
  description: string | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AutomationLog {
  id: string;
  automation_type: string;
  status: string;
  results: Record<string, unknown> | null;
  errors: string[] | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function AutomationsMonitor() {
  const queryClient = useQueryClient();
  const [runningFunction, setRunningFunction] = useState<string | null>(null);

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['automation-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_schedules')
        .select('*')
        .order('automation_name');
      if (error) throw error;
      return data as AutomationSchedule[];
    }
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['automation-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AutomationLog[];
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('automation_schedules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-schedules'] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    }
  });

  const runAutomation = async (functionName: string) => {
    setRunningFunction(functionName);
    try {
      const { data, error } = await supabase.functions.invoke(functionName);
      if (error) throw error;
      
      toast.success(`${functionName} executado com sucesso!`, {
        description: data?.message || "Automação concluída"
      });
      
      queryClient.invalidateQueries({ queryKey: ['automation-logs'] });
      queryClient.invalidateQueries({ queryKey: ['automation-schedules'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao executar ${functionName}`, {
        description: errorMessage
      });
    } finally {
      setRunningFunction(null);
    }
  };

  const runMasterAutomation = async () => {
    setRunningFunction('crm-master-automation');
    try {
      const { data, error } = await supabase.functions.invoke('crm-master-automation');
      if (error) throw error;
      
      toast.success("Orquestrador executado!", {
        description: `${data?.successful || 0}/${data?.total_automations || 0} automações com sucesso`
      });
      
      queryClient.invalidateQueries({ queryKey: ['automation-logs'] });
      queryClient.invalidateQueries({ queryKey: ['automation-schedules'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error("Erro ao executar orquestrador", { description: errorMessage });
    } finally {
      setRunningFunction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Sucesso</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" /> Parcial</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const activeCount = schedules?.filter(s => s.is_active).length || 0;
  const totalCount = schedules?.length || 0;
  const recentSuccessCount = logs?.filter(l => l.status === 'success').length || 0;
  const recentErrorCount = logs?.filter(l => l.status === 'error').length || 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Automações Ativas</p>
                <p className="text-2xl font-bold">{activeCount}/{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sucessos (24h)</p>
                <p className="text-2xl font-bold text-green-600">{recentSuccessCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Erros (24h)</p>
                <p className="text-2xl font-bold text-red-600">{recentErrorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={runMasterAutomation}
              disabled={runningFunction !== null}
              className="w-full"
            >
              {runningFunction === 'crm-master-automation' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Executar Todas
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="h-4 w-4" />
            Agendamentos
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Automações Agendadas</CardTitle>
              <CardDescription>
                Gerencie e execute automações do CRM
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Automação</TableHead>
                      <TableHead>Cron</TableHead>
                      <TableHead>Última Execução</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules?.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{schedule.automation_name}</p>
                            <p className="text-xs text-muted-foreground">{schedule.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {schedule.cron_expression}
                          </code>
                        </TableCell>
                        <TableCell>
                          {schedule.last_run_at ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(schedule.last_run_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Nunca</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={schedule.is_active}
                              onCheckedChange={(checked) => 
                                toggleMutation.mutate({ id: schedule.id, isActive: checked })
                              }
                            />
                            {schedule.is_active ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                Inativo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runAutomation(schedule.function_name)}
                            disabled={runningFunction !== null}
                          >
                            {runningFunction === schedule.function_name ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Execuções</CardTitle>
              <CardDescription>
                Últimas 50 execuções de automações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Automação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs?.map((log) => {
                        const duration = log.started_at && log.completed_at
                          ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                          : null;

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">
                              {log.automation_type}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(log.status)}
                            </TableCell>
                            <TableCell>
                              {log.created_at ? format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR }) : '-'}
                            </TableCell>
                            <TableCell>
                              {duration !== null ? `${duration}s` : '-'}
                            </TableCell>
                            <TableCell>
                              {log.errors && log.errors.length > 0 ? (
                                <span className="text-xs text-red-500">
                                  {log.errors.length} erro(s)
                                </span>
                              ) : (
                                <span className="text-xs text-green-500">OK</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
