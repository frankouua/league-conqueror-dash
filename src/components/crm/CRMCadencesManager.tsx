import { useState } from 'react';
import { Play, Clock, Mail, MessageSquare, Phone, CheckCircle, XCircle, Plus, Settings } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCRMCadences } from '@/hooks/useCRMCadences';
import { useCRM } from '@/hooks/useCRM';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_ICONS: Record<string, typeof Phone> = {
  whatsapp: WhatsAppIcon,
  email: Mail,
  call: Phone,
  sms: MessageSquare,
  task: CheckCircle,
};

const ACTION_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  call: 'Ligação',
  sms: 'SMS',
  task: 'Tarefa',
};

export function CRMCadencesManager() {
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);

  const { cadences, pendingExecutions, executeCadences, markExecutionComplete, createCadence } = useCRMCadences(
    selectedPipeline !== 'all' ? selectedPipeline : undefined
  );
  const { pipelines, stages } = useCRM();

  const handleExecuteCadences = async () => {
    try {
      const result = await executeCadences.mutateAsync();
      toast.success(`${result.executed || 0} cadências executadas`);
    } catch (error) {
      toast.error('Erro ao executar cadências');
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await markExecutionComplete.mutateAsync({ id });
      toast.success('Execução marcada como concluída');
    } catch (error) {
      toast.error('Erro ao marcar execução');
    }
  };

  const handleCreateCadence = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createCadence.mutateAsync({
        name: formData.get('name') as string,
        pipeline_id: formData.get('pipeline_id') as string,
        stage_id: formData.get('stage_id') as string || undefined,
        action_type: formData.get('action_type') as string,
        delay_hours: Number(formData.get('delay_hours')),
        message_template: formData.get('message_template') as string || undefined,
      });
      toast.success('Cadência criada com sucesso');
      setIsCreating(false);
    } catch (error) {
      toast.error('Erro ao criar cadência');
    }
  };

  const cadenceList = cadences.data || [];
  const pending = pendingExecutions.data || [];
  const pipelineList = pipelines || [];
  const stageList = stages || [];

  // Group cadences by pipeline
  const groupedCadences = cadenceList.reduce((acc, cadence) => {
    const pipelineName = cadence.pipeline?.name || 'Sem Pipeline';
    if (!acc[pipelineName]) acc[pipelineName] = [];
    acc[pipelineName].push(cadence);
    return acc;
  }, {} as Record<string, typeof cadenceList>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cadências de Vendas</h2>
          <p className="text-muted-foreground">Gerencie suas sequências automatizadas de follow-up</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExecuteCadences}
            disabled={executeCadences.isPending}
          >
            <Play className={cn("h-4 w-4 mr-2", executeCadences.isPending && "animate-pulse")} />
            Executar Pendentes ({pending.length})
          </Button>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Cadência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Nova Cadência</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCadence} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" placeholder="Ex: Follow-up D+1" required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pipeline_id">Pipeline</Label>
                    <Select name="pipeline_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelineList.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stage_id">Etapa (opcional)</Label>
                    <Select name="stage_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        {stageList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="action_type">Tipo de Ação</Label>
                    <Select name="action_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="call">Ligação</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="task">Tarefa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="delay_hours">Delay (horas)</Label>
                    <Input id="delay_hours" name="delay_hours" type="number" min="0" defaultValue="24" required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message_template">Template de Mensagem</Label>
                  <Textarea
                    id="message_template"
                    name="message_template"
                    placeholder="Use {nome} para o nome do lead..."
                    rows={4}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createCadence.isPending}>
                    Criar Cadência
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter by Pipeline */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedPipeline === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedPipeline('all')}
        >
          Todos
        </Button>
        {pipelineList.map(p => (
          <Button
            key={p.id}
            variant={selectedPipeline === p.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPipeline(p.id)}
          >
            {p.name}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="cadences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cadences">Cadências</TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="cadences" className="space-y-4">
          {Object.entries(groupedCadences).map(([pipelineName, cadenceItems]) => (
            <Card key={pipelineName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{pipelineName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cadenceItems.map((cadence, index) => {
                    const Icon = ACTION_ICONS[cadence.action_type] || Clock;
                    return (
                      <div
                        key={cadence.id}
                        className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="h-4 w-4" />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <p className="font-medium">{cadence.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {ACTION_LABELS[cadence.action_type] || cadence.action_type}
                            </Badge>
                            {cadence.stage && (
                              <span>Etapa: {cadence.stage.name}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            <span>D+{cadence.day_offset}</span>
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {Object.keys(groupedCadences).length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma cadência configurada. Clique em "Nova Cadência" para começar.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Cadência</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Agendado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((exec) => {
                    const Icon = ACTION_ICONS[exec.cadence?.action_type || ''] || Clock;
                    return (
                      <TableRow key={exec.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{exec.lead?.name}</p>
                            <p className="text-xs text-muted-foreground">{exec.lead?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{exec.cadence?.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{ACTION_LABELS[exec.cadence?.action_type || '']}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(exec.scheduled_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkComplete(exec.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pending.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma execução pendente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Histórico de execuções em breve...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
