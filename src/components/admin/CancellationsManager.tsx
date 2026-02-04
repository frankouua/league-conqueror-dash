import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  XCircle, 
  Search, 
  Pencil, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  Filter
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type CancellationReason = Database["public"]["Enums"]["cancellation_reason"];
type CancellationStatus = Database["public"]["Enums"]["cancellation_status"];

interface Cancellation {
  id: string;
  patient_name: string;
  procedure_name: string;
  contract_value: number;
  cancellation_request_date: string;
  reason: CancellationReason;
  reason_details: string | null;
  status: CancellationStatus;
  team_id: string;
  user_id: string;
  created_at: string;
  teams?: { name: string } | null;
}

interface Team {
  id: string;
  name: string;
}

const CANCELLATION_REASONS: { value: CancellationReason; label: string }[] = [
  { value: "financial", label: "Financeiro" },
  { value: "health", label: "Saúde" },
  { value: "dissatisfaction", label: "Insatisfação" },
  { value: "changed_mind", label: "Mudou de ideia" },
  { value: "competitor", label: "Concorrência" },
  { value: "scheduling", label: "Agenda" },
  { value: "personal", label: "Pessoal" },
  { value: "other", label: "Outro" },
];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function CancellationsManager() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingCancellation, setEditingCancellation] = useState<Cancellation | null>(null);
  const [deletingCancellation, setDeletingCancellation] = useState<Cancellation | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate date range
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const endDate = format(
    new Date(selectedYear, selectedMonth, 0),
    "yyyy-MM-dd"
  );

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name");
      if (error) throw error;
      return data as Team[];
    },
  });

  // Fetch profiles for user names
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-cancellations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch cancellations
  const { data: cancellations, isLoading } = useQuery({
    queryKey: ["admin-cancellations", selectedMonth, selectedYear, selectedTeam],
    queryFn: async () => {
      let query = supabase
        .from("cancellations")
        .select("*, teams(name)")
        .gte("cancellation_request_date", startDate)
        .lte("cancellation_request_date", endDate)
        .order("cancellation_request_date", { ascending: false });

      if (selectedTeam !== "all") {
        query = query.eq("team_id", selectedTeam);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Cancellation[];
    },
  });

  const getProfileName = (userId: string) => {
    return profiles?.find(p => p.id === userId)?.full_name || "—";
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      patient_name: string;
      procedure_name: string;
      contract_value: number;
      reason: CancellationReason;
      reason_details: string | null;
    }) => {
      const { error } = await supabase
        .from("cancellations")
        .update({
          patient_name: data.patient_name,
          procedure_name: data.procedure_name,
          contract_value: data.contract_value,
          reason: data.reason,
          reason_details: data.reason_details,
        })
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cancellations"] });
      toast({
        title: "Cancelamento atualizado",
        description: "Os dados foram salvos com sucesso.",
      });
      setEditingCancellation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cancellations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cancellations"] });
      toast({
        title: "Cancelamento excluído",
        description: "O registro foi removido com sucesso.",
      });
      setDeletingCancellation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter cancellations by search
  const filteredCancellations = cancellations?.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.patient_name.toLowerCase().includes(query) ||
      c.procedure_name.toLowerCase().includes(query)
    );
  });

  // Calculate totals
  const totalValue = filteredCancellations?.reduce((sum, c) => sum + Number(c.contract_value), 0) || 0;
  const totalCount = filteredCancellations?.length || 0;

  const getReasonLabel = (reason: CancellationReason) => {
    return CANCELLATION_REASONS.find(r => r.value === reason)?.label || reason;
  };

  const handleSaveEdit = () => {
    if (!editingCancellation) return;
    
    updateMutation.mutate({
      id: editingCancellation.id,
      patient_name: editingCancellation.patient_name,
      procedure_name: editingCancellation.procedure_name,
      contract_value: editingCancellation.contract_value,
      reason: editingCancellation.reason,
      reason_details: editingCancellation.reason_details,
    });
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <XCircle className="w-5 h-5" />
          Gerenciar Cancelamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Mês
            </Label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Ano
            </Label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Filter className="w-4 h-4" />
              Equipe
            </Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {teams?.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Search className="w-4 h-4" />
              Buscar
            </Label>
            <Input
              placeholder="Buscar por paciente ou procedimento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-secondary"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Total Cancelado</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Quantidade</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCancellations && filteredCancellations.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCancellations.map(cancellation => (
                  <TableRow key={cancellation.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {format(new Date(cancellation.cancellation_request_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {cancellation.patient_name}
                      </div>
                    </TableCell>
                    <TableCell>{cancellation.procedure_name}</TableCell>
                    <TableCell className="text-destructive font-medium">
                      R$ {Number(cancellation.contract_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getReasonLabel(cancellation.reason)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {(cancellation.teams as any)?.name || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getProfileName(cancellation.user_id)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCancellation(cancellation)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCancellation(cancellation)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum cancelamento encontrado para o período selecionado.</p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingCancellation} onOpenChange={() => setEditingCancellation(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Editar Cancelamento
              </DialogTitle>
            </DialogHeader>
            
            {editingCancellation && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Paciente</Label>
                  <Input
                    value={editingCancellation.patient_name}
                    onChange={(e) => setEditingCancellation({
                      ...editingCancellation,
                      patient_name: e.target.value,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Procedimento</Label>
                  <Input
                    value={editingCancellation.procedure_name}
                    onChange={(e) => setEditingCancellation({
                      ...editingCancellation,
                      procedure_name: e.target.value,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor do Contrato (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingCancellation.contract_value}
                    onChange={(e) => setEditingCancellation({
                      ...editingCancellation,
                      contract_value: parseFloat(e.target.value) || 0,
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Select
                    value={editingCancellation.reason}
                    onValueChange={(v) => setEditingCancellation({
                      ...editingCancellation,
                      reason: v as CancellationReason,
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CANCELLATION_REASONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Detalhes (opcional)</Label>
                  <Textarea
                    value={editingCancellation.reason_details || ""}
                    onChange={(e) => setEditingCancellation({
                      ...editingCancellation,
                      reason_details: e.target.value || null,
                    })}
                    rows={2}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCancellation(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingCancellation} onOpenChange={() => setDeletingCancellation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Confirmar Exclusão
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este cancelamento?
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Paciente:</strong> {deletingCancellation?.patient_name}</p>
                  <p><strong>Procedimento:</strong> {deletingCancellation?.procedure_name}</p>
                  <p><strong>Valor:</strong> R$ {Number(deletingCancellation?.contract_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <p className="mt-3 text-destructive font-medium">
                  Esta ação não pode ser desfeita. O valor será restaurado ao faturamento da equipe.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingCancellation && deleteMutation.mutate(deletingCancellation.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
