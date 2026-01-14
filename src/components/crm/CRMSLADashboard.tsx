import { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, Settings, RefreshCw, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCRMSLA } from '@/hooks/useCRMSLA';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CRMSLADashboard() {
  const { slaConfigs, leadsWithSLABreach, checkSLAAlerts, updateSLAConfig } = useCRMSLA();
  const [selectedConfig, setSelectedConfig] = useState<any>(null);

  const breaches = leadsWithSLABreach.data || [];
  const configs = slaConfigs.data || [];

  // Group breaches by severity
  const criticalBreaches = breaches.filter(b => b.hoursOverdue > 24);
  const warningBreaches = breaches.filter(b => b.hoursOverdue <= 24 && b.hoursOverdue > 0);

  const handleCheckAlerts = async () => {
    try {
      await checkSLAAlerts.mutateAsync();
      toast.success('Verificação de SLA concluída');
    } catch (error) {
      toast.error('Erro ao verificar SLAs');
    }
  };

  const handleUpdateConfig = async (values: { max_hours: number; warning_hours: number }) => {
    if (!selectedConfig) return;
    
    try {
      await updateSLAConfig.mutateAsync({
        id: selectedConfig.id,
        ...values,
      });
      toast.success('Configuração atualizada');
      setSelectedConfig(null);
    } catch (error) {
      toast.error('Erro ao atualizar configuração');
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d ${Math.round(hours % 24)}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={cn(
          "border-l-4",
          criticalBreaches.length > 0 ? "border-l-red-500" : "border-l-green-500"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-red-500">{criticalBreaches.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Alerta</p>
                <p className="text-2xl font-bold text-yellow-500">{warningBreaches.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dentro do SLA</p>
                <p className="text-2xl font-bold text-green-500">
                  {Math.max(0, 100 - breaches.length)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Regras Ativas</p>
                <p className="text-2xl font-bold">{configs.length}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckAlerts}
                disabled={checkSLAAlerts.isPending}
              >
                <RefreshCw className={cn("h-4 w-4", checkSLAAlerts.isPending && "animate-spin")} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Breaches Table */}
      {breaches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Leads Fora do SLA ({breaches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tempo Excedido</TableHead>
                  <TableHead>Severidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breaches.slice(0, 10).map((breach) => (
                  <TableRow key={breach.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{breach.name}</p>
                        <p className="text-xs text-muted-foreground">{breach.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{breach.stage?.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {breach.assigned_to ? 'Atribuído' : 'Não atribuído'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-medium",
                        breach.hoursOverdue > 24 ? "text-red-500" : "text-yellow-500"
                      )}>
                        +{formatDuration(breach.hoursOverdue)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {breach.hoursOverdue > 24 ? (
                        <Badge variant="destructive">Crítico</Badge>
                      ) : (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          Alerta
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* SLA Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Configurações de SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge>{config.stage?.name || 'Etapa'}</Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedConfig(config)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar SLA - {config.stage?.name}</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          handleUpdateConfig({
                            max_hours: Number(formData.get('max_hours')),
                            warning_hours: Number(formData.get('warning_hours')),
                          });
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="max_hours">Tempo Máximo (horas)</Label>
                          <Input
                            id="max_hours"
                            name="max_hours"
                            type="number"
                            defaultValue={config.max_hours}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="warning_hours">Alerta em (horas)</Label>
                          <Input
                            id="warning_hours"
                            name="warning_hours"
                            type="number"
                            defaultValue={config.warning_hours}
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          Salvar
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tempo máximo</span>
                    <span className="font-medium">{formatDuration(config.max_hours)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alerta em</span>
                    <span className="font-medium">{formatDuration(config.warning_hours || 0)}</span>
                  </div>
                  <Progress
                    value={(config.warning_hours / config.max_hours) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
