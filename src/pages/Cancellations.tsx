import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingDown,
  Shield,
  Heart,
  RefreshCw,
  Plus,
  History,
  Lightbulb,
  Target,
  Ban,
  Gift,
} from "lucide-react";
import { format, addDays, addYears } from "date-fns";
import { ptBR } from "date-fns/locale";

type CancellationStatus = 
  | "pending_retention"
  | "retention_attempt"
  | "retained"
  | "cancelled_with_fine"
  | "cancelled_no_fine"
  | "credit_used";

type CancellationReason = 
  | "financial"
  | "health"
  | "dissatisfaction"
  | "changed_mind"
  | "competitor"
  | "scheduling"
  | "personal"
  | "other";

interface Cancellation {
  id: string;
  team_id: string;
  user_id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  procedure_name: string;
  contract_value: number;
  fine_percentage: number;
  fine_amount: number;
  refund_amount: number;
  reason: CancellationReason;
  reason_details: string | null;
  status: CancellationStatus;
  retention_attempts: number;
  retention_notes: string | null;
  retained_by: string | null;
  retained_at: string | null;
  apply_fine: boolean;
  refund_deadline: string | null;
  refund_completed: boolean;
  refund_completed_at: string | null;
  credit_valid_until: string | null;
  credit_used_at: string | null;
  credit_used_for: string | null;
  original_sale_date: string | null;
  cancellation_request_date: string;
  contract_signed: boolean;
  contract_url: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<CancellationStatus, { label: string; color: string }> = {
  pending_retention: { label: "Aguardando Retenção", color: "bg-amber-500" },
  retention_attempt: { label: "Em Tentativa", color: "bg-blue-500" },
  retained: { label: "Retido ✓", color: "bg-green-500" },
  cancelled_with_fine: { label: "Cancelado c/ Multa", color: "bg-red-500" },
  cancelled_no_fine: { label: "Cancelado s/ Multa", color: "bg-gray-500" },
  credit_used: { label: "Crédito Utilizado", color: "bg-purple-500" },
};

const REASON_LABELS: Record<CancellationReason, string> = {
  financial: "Financeiro",
  health: "Saúde",
  dissatisfaction: "Insatisfação",
  changed_mind: "Mudou de ideia",
  competitor: "Foi para concorrente",
  scheduling: "Agenda incompatível",
  personal: "Motivos pessoais",
  other: "Outro",
};

const RETENTION_SCRIPTS: Record<CancellationReason, string[]> = {
  financial: [
    "Entendo sua situação. Podemos parcelar de forma diferente?",
    "Temos opções de pagamento flexíveis. Posso ajustar o plano?",
    "O valor investido é importante. Podemos pausar o tratamento temporariamente?",
    "Você já considerou financiamento? Temos parceiros com taxas especiais.",
  ],
  health: [
    "Sua saúde é prioridade. Podemos reagendar quando estiver melhor.",
    "Não se preocupe, seu crédito fica válido por 1 ano.",
    "Desejo melhoras! Quando se recuperar, estaremos aqui.",
  ],
  dissatisfaction: [
    "Lamento ouvir isso. O que podemos fazer para melhorar?",
    "Seu feedback é muito importante. Posso falar com a coordenação?",
    "Gostaria de conversar com nosso gerente sobre suas preocupações?",
    "Podemos oferecer uma compensação pelo transtorno?",
  ],
  changed_mind: [
    "Entendo. O que fez você reconsiderar?",
    "Suas dúvidas são normais. Posso esclarecer algo?",
    "Muitos pacientes tiveram essa mesma sensação e ficaram muito satisfeitos após o procedimento.",
    "Posso mostrar depoimentos de pacientes que tinham dúvidas similares?",
  ],
  competitor: [
    "Posso saber o que a outra clínica ofereceu?",
    "Temos diferenciais únicos como atendimento personalizado e acompanhamento completo.",
    "Nosso pós-operatório inclui benefícios exclusivos.",
    "Podemos igualar ou melhorar a proposta?",
  ],
  scheduling: [
    "Podemos encontrar horários alternativos?",
    "Temos disponibilidade em outros dias da semana.",
    "É possível reagendar para um período mais conveniente.",
  ],
  personal: [
    "Compreendo. Há algo que possamos fazer para ajudar?",
    "Seu procedimento pode aguardar até você se sentir pronta.",
    "O crédito fica disponível por 1 ano se precisar de mais tempo.",
  ],
  other: [
    "Pode me contar mais sobre o motivo?",
    "Gostaria de entender melhor para poder ajudar.",
    "Existe algo que possamos fazer para reverter essa decisão?",
  ],
};

const Cancellations = () => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [selectedCancellation, setSelectedCancellation] = useState<Cancellation | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [retentionNote, setRetentionNote] = useState("");

  const [newForm, setNewForm] = useState({
    patient_name: "",
    patient_phone: "",
    patient_email: "",
    procedure_name: "",
    contract_value: "",
    reason: "" as CancellationReason | "",
    reason_details: "",
    original_sale_date: "",
  });

  // Fetch cancellations
  const { data: cancellations, isLoading } = useQuery({
    queryKey: ["cancellations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cancellations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Cancellation[];
    },
  });

  // Fetch cancellation history
  const { data: history } = useQuery({
    queryKey: ["cancellation-history", selectedCancellation?.id],
    queryFn: async () => {
      if (!selectedCancellation) return [];
      const { data, error } = await supabase
        .from("cancellation_history")
        .select("*")
        .eq("cancellation_id", selectedCancellation.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCancellation,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Create cancellation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.team_id) throw new Error("Usuário não autenticado");
      
      const contractValue = parseFloat(newForm.contract_value.replace(/\./g, "").replace(",", "."));
      const refundDeadline = addDays(new Date(), 30).toISOString().split("T")[0];
      const creditValidUntil = addYears(new Date(), 1).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("cancellations")
        .insert({
          team_id: profile.team_id,
          user_id: user.id,
          patient_name: newForm.patient_name,
          patient_phone: newForm.patient_phone || null,
          patient_email: newForm.patient_email || null,
          procedure_name: newForm.procedure_name,
          contract_value: contractValue,
          reason: newForm.reason as CancellationReason,
          reason_details: newForm.reason_details || null,
          original_sale_date: newForm.original_sale_date || null,
          apply_fine: newForm.reason !== "health",
          refund_deadline: refundDeadline,
          credit_valid_until: creditValidUntil,
        })
        .select()
        .single();

      if (error) throw error;

      // Add history entry
      await supabase.from("cancellation_history").insert({
        cancellation_id: data.id,
        action: "Solicitação de cancelamento registrada",
        new_status: "pending_retention",
        performed_by: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cancellations"] });
      toast({ title: "Solicitação registrada", description: "Inicie o processo de retenção!" });
      setIsNewDialogOpen(false);
      setNewForm({
        patient_name: "",
        patient_phone: "",
        patient_email: "",
        procedure_name: "",
        contract_value: "",
        reason: "",
        reason_details: "",
        original_sale_date: "",
      });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: CancellationStatus; notes?: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const updates: Partial<Cancellation> = { status };

      if (status === "retained") {
        updates.retained_by = user.id;
        updates.retained_at = new Date().toISOString();
      }

      if (status === "cancelled_no_fine") {
        updates.apply_fine = false;
      }

      if (status === "retention_attempt") {
        // Increment retention attempts
        const current = cancellations?.find((c) => c.id === id);
        if (current) {
          updates.retention_attempts = current.retention_attempts + 1;
          if (notes) {
            updates.retention_notes = current.retention_notes 
              ? `${current.retention_notes}\n\n[${format(new Date(), "dd/MM HH:mm")}] ${notes}`
              : `[${format(new Date(), "dd/MM HH:mm")}] ${notes}`;
          }
        }
      }

      const { error } = await supabase
        .from("cancellations")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Add history
      await supabase.from("cancellation_history").insert({
        cancellation_id: id,
        action: notes || `Status alterado para ${STATUS_LABELS[status].label}`,
        old_status: cancellations?.find((c) => c.id === id)?.status,
        new_status: status,
        notes,
        performed_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cancellations"] });
      queryClient.invalidateQueries({ queryKey: ["cancellation-history"] });
      toast({ title: "Status atualizado" });
      setRetentionNote("");
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Mark refund completed
  const markRefundComplete = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("cancellations")
        .update({
          refund_completed: true,
          refund_completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("cancellation_history").insert({
        cancellation_id: id,
        action: "Estorno realizado",
        performed_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cancellations"] });
      toast({ title: "Estorno marcado como realizado" });
    },
  });

  // Use credit
  const useCreditMutation = useMutation({
    mutationFn: async ({ id, procedureName }: { id: string; procedureName: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("cancellations")
        .update({
          status: "credit_used",
          credit_used_at: new Date().toISOString(),
          credit_used_for: procedureName,
        })
        .eq("id", id);

      if (error) throw error;

      await supabase.from("cancellation_history").insert({
        cancellation_id: id,
        action: `Crédito utilizado para: ${procedureName}`,
        old_status: "cancelled_with_fine",
        new_status: "credit_used",
        performed_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cancellations"] });
      toast({ title: "Crédito utilizado! Cliente recuperado!" });
    },
  });

  // Calculate totals
  const stats = cancellations?.reduce(
    (acc, c) => {
      acc.total++;
      if (c.status === "retained") acc.retained++;
      if (c.status === "cancelled_with_fine") {
        acc.cancelledWithFine++;
        acc.totalCancelledValue += Number(c.contract_value);
        acc.totalFineValue += Number(c.fine_amount);
      }
      if (c.status === "cancelled_no_fine") {
        acc.cancelledNoFine++;
        acc.totalCancelledValue += Number(c.contract_value);
      }
      if (c.status === "pending_retention" || c.status === "retention_attempt") {
        acc.pending++;
      }
      if (c.status === "credit_used") acc.creditUsed++;
      return acc;
    },
    { total: 0, retained: 0, cancelledWithFine: 0, cancelledNoFine: 0, pending: 0, creditUsed: 0, totalCancelledValue: 0, totalFineValue: 0 }
  ) || { total: 0, retained: 0, cancelledWithFine: 0, cancelledNoFine: 0, pending: 0, creditUsed: 0, totalCancelledValue: 0, totalFineValue: 0 };

  const retentionRate = stats.total > 0 
    ? Math.round(((stats.retained + stats.creditUsed) / stats.total) * 100) 
    : 0;

  const pendingCancellations = cancellations?.filter(
    (c) => c.status === "pending_retention" || c.status === "retention_attempt"
  ) || [];

  const completedCancellations = cancellations?.filter(
    (c) => c.status !== "pending_retention" && c.status !== "retention_attempt"
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Gestão de Cancelamentos
            </h1>
            <p className="text-muted-foreground">
              Retenção é a meta. Cancelamento é exceção.
            </p>
          </div>
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Registrar Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Nova Solicitação de Cancelamento
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome do Paciente *</Label>
                    <Input
                      value={newForm.patient_name}
                      onChange={(e) => setNewForm({ ...newForm, patient_name: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={newForm.patient_phone}
                      onChange={(e) => setNewForm({ ...newForm, patient_phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newForm.patient_email}
                      onChange={(e) => setNewForm({ ...newForm, patient_email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Procedimento *</Label>
                    <Input
                      value={newForm.procedure_name}
                      onChange={(e) => setNewForm({ ...newForm, procedure_name: e.target.value })}
                      placeholder="Ex: Rinoplastia"
                    />
                  </div>
                  <div>
                    <Label>Valor do Contrato *</Label>
                    <Input
                      value={newForm.contract_value}
                      onChange={(e) => setNewForm({ ...newForm, contract_value: e.target.value })}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div>
                    <Label>Data Original da Venda</Label>
                    <Input
                      type="date"
                      value={newForm.original_sale_date}
                      onChange={(e) => setNewForm({ ...newForm, original_sale_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Motivo *</Label>
                    <Select
                      value={newForm.reason}
                      onValueChange={(v) => setNewForm({ ...newForm, reason: v as CancellationReason })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(REASON_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Detalhes do Motivo</Label>
                    <Textarea
                      value={newForm.reason_details}
                      onChange={(e) => setNewForm({ ...newForm, reason_details: e.target.value })}
                      placeholder="Descreva os detalhes..."
                      rows={2}
                    />
                  </div>
                </div>

                {newForm.reason === "health" && (
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Motivo de saúde: multa NÃO será aplicada
                    </p>
                  </div>
                )}

                {newForm.reason && newForm.reason !== "health" && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Multa de 30% será aplicada. Tente RETER primeiro!
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newForm.patient_name || !newForm.procedure_name || !newForm.contract_value || !newForm.reason}
                >
                  Registrar e Iniciar Retenção
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-green-500">{stats.retained}</p>
              <p className="text-xs text-muted-foreground">Retidos</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-bold text-red-500">{stats.cancelledWithFine + stats.cancelledNoFine}</p>
              <p className="text-xs text-muted-foreground">Cancelados</p>
            </CardContent>
          </Card>
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-4 text-center">
              <Gift className="w-6 h-6 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-purple-500">{stats.creditUsed}</p>
              <p className="text-xs text-muted-foreground">Crédito Usado</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold text-primary">{retentionRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa Retenção</p>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-6 h-6 mx-auto text-red-500 mb-2" />
              <p className="text-lg font-bold text-red-500">{formatCurrency(stats.totalCancelledValue)}</p>
              <p className="text-xs text-muted-foreground">Impacto Meta</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Pendentes ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="completed">Finalizados</TabsTrigger>
            <TabsTrigger value="scripts">
              <Lightbulb className="w-4 h-4" />
              Scripts
            </TabsTrigger>
          </TabsList>

          {/* Pending Cancellations */}
          <TabsContent value="pending" className="space-y-4">
            {pendingCancellations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-semibold">Nenhuma solicitação pendente!</p>
                  <p className="text-muted-foreground">Continue assim! 💪</p>
                </CardContent>
              </Card>
            ) : (
              pendingCancellations.map((cancellation) => (
                <Card key={cancellation.id} className="border-amber-500/30">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4" />
                          <span className="font-semibold">{cancellation.patient_name}</span>
                          <Badge className={STATUS_LABELS[cancellation.status].color}>
                            {STATUS_LABELS[cancellation.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {cancellation.procedure_name} • {formatCurrency(Number(cancellation.contract_value))}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Ban className="w-3 h-3" />
                            {REASON_LABELS[cancellation.reason]}
                          </span>
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            {cancellation.retention_attempts} tentativas
                          </span>
                          {cancellation.patient_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {cancellation.patient_phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCancellation(cancellation);
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          <History className="w-4 h-4 mr-1" />
                          Detalhes
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-green-500 hover:bg-green-600">
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Retido!
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>🎉 Paciente Retido!</AlertDialogTitle>
                              <AlertDialogDescription>
                                Parabéns! O paciente desistiu do cancelamento?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => updateStatusMutation.mutate({ id: cancellation.id, status: "retained" })}
                              >
                                Confirmar Retenção
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
                              <AlertDialogDescription>
                                {cancellation.apply_fine ? (
                                  <>
                                    Multa de 30%: <strong>{formatCurrency(Number(cancellation.fine_amount))}</strong>
                                    <br />
                                    Estorno: <strong>{formatCurrency(Number(cancellation.refund_amount))}</strong> em até 30 dias
                                    <br />
                                    <span className="text-amber-500">O crédito fica válido por 1 ano.</span>
                                  </>
                                ) : (
                                  <>
                                    Cancelamento <strong>sem multa</strong> (motivo: saúde)
                                    <br />
                                    Estorno integral: <strong>{formatCurrency(Number(cancellation.contract_value))}</strong>
                                  </>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: cancellation.id,
                                    status: cancellation.apply_fine ? "cancelled_with_fine" : "cancelled_no_fine",
                                  })
                                }
                              >
                                Confirmar Cancelamento
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Retention Scripts */}
                    <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <p className="text-sm font-semibold text-blue-500 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Scripts de Retenção ({REASON_LABELS[cancellation.reason]}):
                      </p>
                      <ul className="space-y-1">
                        {RETENTION_SCRIPTS[cancellation.reason]?.map((script, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {script}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Quick Retention Note */}
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Registrar tentativa de retenção..."
                        value={retentionNote}
                        onChange={(e) => setRetentionNote(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (retentionNote.trim()) {
                            updateStatusMutation.mutate({
                              id: cancellation.id,
                              status: "retention_attempt",
                              notes: retentionNote,
                            });
                          }
                        }}
                        disabled={!retentionNote.trim()}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Registrar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Completed Cancellations */}
          <TabsContent value="completed" className="space-y-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {completedCancellations.map((cancellation) => (
                  <Card key={cancellation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{cancellation.patient_name}</span>
                            <Badge className={STATUS_LABELS[cancellation.status].color}>
                              {STATUS_LABELS[cancellation.status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {cancellation.procedure_name} • {formatCurrency(Number(cancellation.contract_value))}
                          </p>
                          {cancellation.status === "cancelled_with_fine" && (
                            <p className="text-xs text-amber-500 mt-1">
                              Multa: {formatCurrency(Number(cancellation.fine_amount))} • Crédito válido até{" "}
                              {cancellation.credit_valid_until
                                ? format(new Date(cancellation.credit_valid_until), "dd/MM/yyyy")
                                : "-"}
                            </p>
                          )}
                          {cancellation.status === "credit_used" && (
                            <p className="text-xs text-purple-500 mt-1">
                              Crédito usado para: {cancellation.credit_used_for}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {cancellation.status === "cancelled_with_fine" && !cancellation.refund_completed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markRefundComplete.mutate(cancellation.id)}
                            >
                              Marcar Estorno
                            </Button>
                          )}
                          {cancellation.status === "cancelled_with_fine" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="bg-purple-500 hover:bg-purple-600">
                                  <Gift className="w-4 h-4 mr-1" />
                                  Usar Crédito
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Usar Crédito do Paciente</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O paciente quer usar os {formatCurrency(Number(cancellation.fine_amount))} como entrada para novo procedimento?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4">
                                  <Label>Novo Procedimento</Label>
                                  <Input
                                    id="credit-procedure"
                                    placeholder="Ex: Rinoplastia"
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      const input = document.getElementById("credit-procedure") as HTMLInputElement;
                                      if (input?.value) {
                                        useCreditMutation.mutate({ id: cancellation.id, procedureName: input.value });
                                      }
                                    }}
                                  >
                                    Confirmar Uso do Crédito
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Retention Scripts */}
          <TabsContent value="scripts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Scripts de Retenção por Motivo
                </CardTitle>
                <CardDescription>
                  Use estes argumentos para tentar reverter o cancelamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(RETENTION_SCRIPTS).map(([reason, scripts]) => (
                  <div key={reason} className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      {reason === "health" && <Heart className="w-4 h-4 text-red-500" />}
                      {reason === "financial" && <DollarSign className="w-4 h-4 text-green-500" />}
                      {reason === "competitor" && <Target className="w-4 h-4 text-amber-500" />}
                      {REASON_LABELS[reason as CancellationReason]}
                    </h3>
                    <ul className="space-y-2">
                      {scripts.map((script, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {script}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-primary">💡 Dicas Gerais de Retenção</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Escute primeiro:</strong> Deixe o paciente falar e entenda o real motivo</li>
                      <li>• <strong>Empatia:</strong> Demonstre que entende a situação</li>
                      <li>• <strong>Ofereça alternativas:</strong> Parcelamento, reagendamento, troca de procedimento</li>
                      <li>• <strong>Valorize o investimento:</strong> Lembre dos benefícios e resultados esperados</li>
                      <li>• <strong>Urgência suave:</strong> Explique que a multa é política da empresa</li>
                      <li>• <strong>Resgate futuro:</strong> Se cancelar, reforce que o crédito fica válido por 1 ano</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-red-500/30 bg-red-500/5">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 text-red-500">⚠️ Política de Cancelamento</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Multa padrão:</strong> 30% do valor do contrato</li>
                      <li>• <strong>Estorno:</strong> 70% em até 30 dias úteis</li>
                      <li>• <strong>Exceção:</strong> Motivos de saúde NÃO pagam multa</li>
                      <li>• <strong>Crédito:</strong> Os 30% ficam como crédito por 1 ano</li>
                      <li>• <strong>Resgate:</strong> Se voltar em 1 ano, 30% vira entrada</li>
                      <li>• <strong>Contrato:</strong> Sempre com assinatura de contrato!</li>
                    </ul>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes do Cancelamento</DialogTitle>
            </DialogHeader>
            {selectedCancellation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Paciente</p>
                    <p className="font-semibold">{selectedCancellation.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Procedimento</p>
                    <p className="font-semibold">{selectedCancellation.procedure_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-semibold">{formatCurrency(Number(selectedCancellation.contract_value))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Motivo</p>
                    <p className="font-semibold">{REASON_LABELS[selectedCancellation.reason]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Multa (30%)</p>
                    <p className="font-semibold text-amber-500">{formatCurrency(Number(selectedCancellation.fine_amount))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estorno (70%)</p>
                    <p className="font-semibold text-green-500">{formatCurrency(Number(selectedCancellation.refund_amount))}</p>
                  </div>
                </div>

                {selectedCancellation.retention_notes && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Notas de Retenção</p>
                    <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                      {selectedCancellation.retention_notes}
                    </div>
                  </div>
                )}

                {history && history.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Histórico</p>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {history.map((h: { id: string; action: string; created_at: string }) => (
                          <div key={h.id} className="text-xs p-2 bg-muted/50 rounded">
                            <p>{h.action}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Cancellations;
