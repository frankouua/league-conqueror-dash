import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Repeat, Clock, AlertTriangle, CheckCircle2, Calendar,
  Search, Phone, MessageSquare, Send, Loader2, TrendingUp,
  Users, DollarSign, Timer, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecurrenceTracking {
  id: string;
  lead_id: string;
  protocol_id: string;
  last_procedure_date: string;
  next_due_date: string;
  days_overdue: number;
  reminder_sent_at: string | null;
  status: string;
  lead?: {
    id: string;
    name: string;
    phone: string;
    whatsapp: string;
    email: string;
    team_id: string;
  };
  protocol?: {
    id: string;
    name: string;
    price: number;
    recurrence_days: number;
    recurrence_script: string;
  };
}

// Default recurrence scripts by procedure type
const DEFAULT_SCRIPTS: Record<string, string> = {
  implante: `Olá {nome}! 💫

Seu implante hormonal está no período ideal para renovação!

Manter os níveis hormonais equilibrados é fundamental para:
✨ Disposição e energia
✨ Qualidade do sono
✨ Bem-estar geral

Vamos agendar sua consulta? Tenho um horário especial reservado para você! 📅`,

  botox: `Oi {nome}! ✨

Passando para lembrar que já está chegando o momento da sua manutenção de Botox!

Para manter aquele resultado lindo e natural, o ideal é renovar agora.

Que tal agendarmos? Tenho condições especiais esperando você! 💕`,

  morpheus: `Olá {nome}! 🌟

Seu tratamento com Morpheus está no momento perfeito para a próxima sessão!

Lembre-se: a consistência é a chave para resultados incríveis.

Posso agendar sua próxima sessão? ✨`,

  default: `Oi {nome}! 💫

Tudo bem? Passando para lembrar que está na hora de renovar seu tratamento!

Manter a regularidade é essencial para resultados duradouros.

Quando podemos te receber novamente? Tenho horários especiais para você! 🌸`,
};

export function ProtocolRecurrenceManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overdue');
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceTracking | null>(null);
  const [customScript, setCustomScript] = useState('');

  // Fetch recurrence tracking data
  const { data: recurrences = [], isLoading } = useQuery({
    queryKey: ['protocol-recurrence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocol_recurrence_tracking')
        .select(`
          *,
          lead:crm_leads(id, name, phone, whatsapp, email, team_id),
          protocol:protocols(id, name, price, recurrence_days, recurrence_script)
        `)
        .order('days_overdue', { ascending: false })
        .limit(500);
      
      if (error) throw error;

      // Calculate current days overdue
      const now = new Date();
      return (data || []).map(r => ({
        ...r,
        days_overdue: Math.max(0, differenceInDays(now, new Date(r.next_due_date))),
      }));
    },
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async ({ recurrenceId, script }: { recurrenceId: string; script: string }) => {
      // Update reminder sent
      await supabase
        .from('protocol_recurrence_tracking')
        .update({ 
          reminder_sent_at: new Date().toISOString(),
          status: 'reminded',
        })
        .eq('id', recurrenceId);

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Lembrete registrado!');
      queryClient.invalidateQueries({ queryKey: ['protocol-recurrence'] });
    },
  });

  // Mark as completed mutation
  const markCompletedMutation = useMutation({
    mutationFn: async (recurrenceId: string) => {
      const { error } = await supabase
        .from('protocol_recurrence_tracking')
        .update({ 
          status: 'completed',
          reactivated_at: new Date().toISOString(),
        })
        .eq('id', recurrenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Marcado como concluído!');
      queryClient.invalidateQueries({ queryKey: ['protocol-recurrence'] });
    },
  });

  const openScriptDialog = (recurrence: RecurrenceTracking) => {
    setSelectedRecurrence(recurrence);
    
    // Generate personalized script
    const firstName = recurrence.lead?.name?.split(' ')[0] || 'Cliente';
    const protocolName = recurrence.protocol?.name?.toLowerCase() || '';
    
    let scriptTemplate = recurrence.protocol?.recurrence_script || DEFAULT_SCRIPTS.default;
    
    // Find best matching template
    for (const [key, template] of Object.entries(DEFAULT_SCRIPTS)) {
      if (protocolName.includes(key)) {
        scriptTemplate = template;
        break;
      }
    }
    
    const script = scriptTemplate.replace(/{nome}/g, firstName);
    setCustomScript(script);
    setShowScriptDialog(true);
  };

  const handleSendWhatsApp = (recurrence: RecurrenceTracking, script: string) => {
    const phone = recurrence.lead?.whatsapp || recurrence.lead?.phone;
    if (!phone) {
      toast.error('Lead sem telefone cadastrado');
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(script)}`, '_blank');
    
    sendReminderMutation.mutate({ recurrenceId: recurrence.id, script });
    setShowScriptDialog(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Filter and categorize recurrences
  const overdueRecurrences = recurrences.filter(r => r.days_overdue > 0 && r.status !== 'completed');
  const dueSoonRecurrences = recurrences.filter(r => r.days_overdue <= 0 && r.days_overdue >= -30 && r.status !== 'completed');
  const remindedRecurrences = recurrences.filter(r => r.status === 'reminded');
  const completedRecurrences = recurrences.filter(r => r.status === 'completed');

  const filteredRecurrences = (activeTab === 'overdue' ? overdueRecurrences :
    activeTab === 'due_soon' ? dueSoonRecurrences :
    activeTab === 'reminded' ? remindedRecurrences :
    completedRecurrences
  ).filter(r =>
    !searchQuery ||
    r.lead?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.protocol?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate potential revenue
  const potentialRevenue = overdueRecurrences.reduce((sum, r) => sum + (r.protocol?.price || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="h-6 w-6 text-primary" />
            Gestão de Recorrência
          </h2>
          <p className="text-muted-foreground">
            Acompanhe clientes que precisam renovar procedimentos
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{overdueRecurrences.length}</div>
                <div className="text-sm text-muted-foreground">Vencidos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{dueSoonRecurrences.length}</div>
                <div className="text-sm text-muted-foreground">Vence em breve</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{remindedRecurrences.length}</div>
                <div className="text-sm text-muted-foreground">Contatados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(potentialRevenue)}</div>
                <div className="text-sm text-muted-foreground">Receita Potencial</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou procedimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Vencidos ({overdueRecurrences.length})
          </TabsTrigger>
          <TabsTrigger value="due_soon" className="gap-2">
            <Clock className="h-4 w-4" />
            Vence em breve ({dueSoonRecurrences.length})
          </TabsTrigger>
          <TabsTrigger value="reminded" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Contatados ({remindedRecurrences.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Concluídos ({completedRecurrences.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRecurrences.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'overdue' ? 'Nenhum procedimento vencido' : 
                   activeTab === 'due_soon' ? 'Nenhum procedimento vencendo em breve' :
                   activeTab === 'reminded' ? 'Nenhum cliente contatado ainda' :
                   'Nenhum procedimento concluído'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Procedimento</TableHead>
                    <TableHead>Último</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecurrences.map((recurrence) => (
                    <TableRow key={recurrence.id}>
                      <TableCell className="font-medium">
                        {recurrence.lead?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{recurrence.protocol?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {format(new Date(recurrence.last_procedure_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {format(new Date(recurrence.next_due_date), 'dd/MM/yyyy', { locale: ptBR })}
                          {recurrence.days_overdue > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              +{recurrence.days_overdue}d
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          recurrence.status === 'completed' ? 'default' :
                          recurrence.status === 'reminded' ? 'secondary' :
                          recurrence.days_overdue > 30 ? 'destructive' :
                          recurrence.days_overdue > 0 ? 'outline' : 'secondary'
                        }>
                          {recurrence.status === 'completed' ? 'Concluído' :
                           recurrence.status === 'reminded' ? 'Contatado' :
                           recurrence.days_overdue > 0 ? 'Vencido' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        {formatCurrency(recurrence.protocol?.price || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {recurrence.status !== 'completed' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openScriptDialog(recurrence)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markCompletedMutation.mutate(recurrence.id)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Script Dialog */}
      <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Lembrete de Recorrência
            </DialogTitle>
            <DialogDescription>
              Envie um lembrete para {selectedRecurrence?.lead?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Lead Info */}
            {selectedRecurrence?.lead && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="flex-1">
                  <p className="font-medium">{selectedRecurrence.lead.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecurrence.lead.whatsapp || selectedRecurrence.lead.phone || 'Sem telefone'}
                  </p>
                </div>
                {selectedRecurrence.days_overdue > 0 && (
                  <Badge variant="destructive">
                    +{selectedRecurrence.days_overdue} dias
                  </Badge>
                )}
              </div>
            )}

            {/* Protocol Info */}
            {selectedRecurrence?.protocol && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedRecurrence.protocol.name}</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(selectedRecurrence.protocol.price)}
                  </span>
                </div>
              </div>
            )}

            {/* Script Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScriptDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => selectedRecurrence && handleSendWhatsApp(selectedRecurrence, customScript)}
              className="gap-2"
              disabled={!selectedRecurrence?.lead?.phone && !selectedRecurrence?.lead?.whatsapp}
            >
              <ExternalLink className="h-4 w-4" />
              Enviar WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProtocolRecurrenceManager;
