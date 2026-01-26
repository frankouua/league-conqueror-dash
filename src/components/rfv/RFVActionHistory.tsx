import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Phone, Mail, MessageSquare, Calendar, ClipboardList, Plus, 
  CheckCircle2, XCircle, Clock, User, Search, Loader2, RefreshCw
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RFVActionHistoryProps {
  customerId?: string;
  customerName: string;
  onActionAdded?: () => void;
}

interface ActionHistoryItem {
  id: string;
  customer_id: string | null;
  customer_name: string;
  action_type: string;
  result: string | null;
  notes: string | null;
  scheduled_callback: string | null;
  performed_by: string;
  performed_by_name: string | null;
  created_at: string;
}

const ACTION_TYPES = [
  { value: 'call', label: 'Ligação', icon: Phone, color: 'bg-blue-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, color: 'bg-green-500' },
  { value: 'email', label: 'E-mail', icon: Mail, color: 'bg-purple-500' },
  { value: 'visit', label: 'Visita', icon: User, color: 'bg-orange-500' },
  { value: 'proposal', label: 'Proposta', icon: ClipboardList, color: 'bg-indigo-500' },
  { value: 'other', label: 'Outro', icon: Calendar, color: 'bg-gray-500' },
];

const RESULT_TYPES = [
  { value: 'success', label: 'Sucesso', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'no_answer', label: 'Sem resposta', icon: XCircle, color: 'text-red-500' },
  { value: 'callback', label: 'Retornar depois', icon: Clock, color: 'text-amber-500' },
  { value: 'not_interested', label: 'Sem interesse', icon: XCircle, color: 'text-gray-500' },
  { value: 'scheduled', label: 'Agendado', icon: Calendar, color: 'text-blue-500' },
  { value: 'converted', label: 'Convertido', icon: CheckCircle2, color: 'text-emerald-600' },
];

export const RFVActionHistory = ({ customerId, customerName, onActionAdded }: RFVActionHistoryProps) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFetchingContact, setIsFetchingContact] = useState(false);
  const [fetchedContact, setFetchedContact] = useState<{ phone?: string; email?: string } | null>(null);
  
  // Form state
  const [actionType, setActionType] = useState('');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledCallback, setScheduledCallback] = useState('');

  useEffect(() => {
    if (customerName) {
      loadHistory();
    }
  }, [customerName, customerId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('rfv_action_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      } else {
        query = query.ilike('customer_name', customerName.toLowerCase());
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
    setIsLoading(false);
  };

  const fetchContactFromFeegow = async () => {
    setIsFetchingContact(true);
    try {
      const { data, error } = await supabase.functions.invoke('feegow-patient-search', {
        body: { patientName: customerName },
      });

      if (error) throw error;

      if (data?.success && data?.patients?.length > 0) {
        const patient = data.patients[0];
        setFetchedContact({
          phone: patient.cellphone || patient.phone,
          email: patient.email,
        });
        toast({
          title: "Contato encontrado!",
          description: `Telefone: ${patient.cellphone || patient.phone || 'N/A'} | Email: ${patient.email || 'N/A'}`,
        });
      } else {
        toast({
          title: "Paciente não encontrado",
          description: "Não foi possível encontrar dados de contato no Feegow.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching contact:', error);
      toast({
        title: "Erro ao buscar contato",
        description: "Não foi possível conectar ao Feegow.",
        variant: "destructive",
      });
    }
    setIsFetchingContact(false);
  };

  const handleSubmit = async () => {
    if (!actionType) {
      toast({
        title: "Tipo de ação obrigatório",
        description: "Selecione o tipo de ação realizada.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Usuário não autenticado",
        description: "Faça login para registrar ações.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('rfv_action_history').insert({
        customer_id: customerId || null,
        customer_name: customerName.toLowerCase(),
        action_type: actionType,
        result: result || null,
        notes: notes || null,
        scheduled_callback: scheduledCallback || null,
        performed_by: user.id,
        performed_by_name: profile?.full_name || user.email,
      });

      if (error) throw error;

      toast({
        title: "Ação registrada!",
        description: `${ACTION_TYPES.find(a => a.value === actionType)?.label} registrada com sucesso.`,
      });

      // Reset form
      setActionType('');
      setResult('');
      setNotes('');
      setScheduledCallback('');
      setIsDialogOpen(false);

      // Reload history
      loadHistory();
      onActionAdded?.();
    } catch (error) {
      console.error('Error saving action:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível registrar a ação.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const getActionConfig = (type: string) => ACTION_TYPES.find(a => a.value === type);
  const getResultConfig = (type: string) => RESULT_TYPES.find(r => r.value === type);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Histórico de Ações
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchContactFromFeegow}
              disabled={isFetchingContact}
            >
              {isFetchingContact ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-1 hidden sm:inline">Buscar Contato</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Nova Ação</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Ação - {customerName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {fetchedContact && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium mb-1">Contato encontrado:</p>
                      {fetchedContact.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3 w-3" /> {fetchedContact.phone}
                        </p>
                      )}
                      {fetchedContact.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> {fetchedContact.email}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label>Tipo de Ação *</Label>
                    <Select value={actionType} onValueChange={setActionType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de ação" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map(action => {
                          const Icon = action.icon;
                          return (
                            <SelectItem key={action.value} value={action.value}>
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {action.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Resultado</Label>
                    <Select value={result} onValueChange={setResult}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o resultado" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESULT_TYPES.map(r => {
                          const Icon = r.icon;
                          return (
                            <SelectItem key={r.value} value={r.value}>
                              <span className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${r.color}`} />
                                {r.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {result === 'callback' && (
                    <div>
                      <Label>Data para Retorno</Label>
                      <Input
                        type="datetime-local"
                        value={scheduledCallback}
                        onChange={(e) => setScheduledCallback(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Descreva o que foi conversado, próximos passos, etc..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Registrar Ação
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma ação registrada</p>
            <p className="text-xs">Clique em "Nova Ação" para começar</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {history.map((item) => {
                const actionConfig = getActionConfig(item.action_type);
                const resultConfig = item.result ? getResultConfig(item.result) : null;
                const ActionIcon = actionConfig?.icon || Calendar;
                const ResultIcon = resultConfig?.icon;
                
                return (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${actionConfig?.color || 'bg-gray-500'}`}>
                          <ActionIcon className="h-3 w-3 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{actionConfig?.label || item.action_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {resultConfig && ResultIcon && (
                        <Badge variant="outline" className="text-xs">
                          <ResultIcon className={`h-3 w-3 mr-1 ${resultConfig.color}`} />
                          {resultConfig.label}
                        </Badge>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-2">
                        {item.notes}
                      </p>
                    )}
                    {item.scheduled_callback && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Retornar: {format(new Date(item.scheduled_callback), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Por: {item.performed_by_name || 'Usuário'}
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RFVActionHistory;
