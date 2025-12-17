import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileEdit, Loader2, DollarSign, ThumbsUp, Star, Users, Search } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  name: string;
}

interface RevenueRecord {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  team_id: string;
  teams?: { name: string };
}

interface NPSRecord {
  id: string;
  score: number;
  cited_member: boolean;
  member_name: string | null;
  date: string;
  team_id: string;
  teams?: { name: string };
}

const RecordsEditor = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [recordType, setRecordType] = useState<string>("revenue");
  const [isLoading, setIsLoading] = useState(false);
  
  const [revenueRecords, setRevenueRecords] = useState<RevenueRecord[]>([]);
  const [npsRecords, setNpsRecords] = useState<NPSRecord[]>([]);
  
  const [editingRevenue, setEditingRevenue] = useState<RevenueRecord | null>(null);
  const [editingNps, setEditingNps] = useState<NPSRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  const fetchTeams = async () => {
    const { data } = await supabase.from("teams").select("id, name");
    if (data) setTeams(data);
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    
    if (recordType === "revenue") {
      let query = supabase
        .from("revenue_records")
        .select("*, teams(name)")
        .order("date", { ascending: false })
        .limit(50);
      
      if (selectedTeam !== "all") {
        query = query.eq("team_id", selectedTeam);
      }
      
      const { data, error } = await query;
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        setRevenueRecords(data as RevenueRecord[]);
      }
    } else if (recordType === "nps") {
      let query = supabase
        .from("nps_records")
        .select("*, teams(name)")
        .order("date", { ascending: false })
        .limit(50);
      
      if (selectedTeam !== "all") {
        query = query.eq("team_id", selectedTeam);
      }
      
      const { data, error } = await query;
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        setNpsRecords(data as NPSRecord[]);
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [selectedTeam, recordType]);

  const handleSaveRevenue = async () => {
    if (!editingRevenue) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("revenue_records")
        .update({
          amount: editingRevenue.amount,
          notes: editingRevenue.notes,
        })
        .eq("id", editingRevenue.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Registro atualizado" });
      setEditingRevenue(null);
      fetchRecords();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNps = async () => {
    if (!editingNps) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("nps_records")
        .update({
          score: editingNps.score,
          cited_member: editingNps.cited_member,
          member_name: editingNps.member_name,
        })
        .eq("id", editingNps.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Registro atualizado" });
      setEditingNps(null);
      fetchRecords();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <FileEdit className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Editar Registros</h3>
          <p className="text-muted-foreground text-sm">
            Visualize e edite registros de qualquer time
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={recordType} onValueChange={setRecordType}>
          <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Tipo de registro" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="revenue" className="text-foreground">
              <span className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Faturamento
              </span>
            </SelectItem>
            <SelectItem value="nps" className="text-foreground">
              <span className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4" /> NPS
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border">
            <SelectValue placeholder="Filtrar por time" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-foreground">
              Todos os times
            </SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id} className="text-foreground">
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Records Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : recordType === "revenue" ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground">Valor</TableHead>
                <TableHead className="text-muted-foreground">Notas</TableHead>
                <TableHead className="text-muted-foreground text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueRecords.map((record) => (
                <TableRow key={record.id} className="border-border">
                  <TableCell className="text-foreground">
                    {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      {record.teams?.name || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground font-medium">
                    R$ {record.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {record.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRevenue(record)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <FileEdit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {revenueRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground">Nota</TableHead>
                <TableHead className="text-muted-foreground">Citação</TableHead>
                <TableHead className="text-muted-foreground text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {npsRecords.map((record) => (
                <TableRow key={record.id} className="border-border">
                  <TableCell className="text-foreground">
                    {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      {record.teams?.name || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={record.score === 10 ? "bg-success" : "bg-info"}>
                      NPS {record.score}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {record.cited_member ? record.member_name || "Sim" : "Não"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNps(record)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <FileEdit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {npsRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Revenue Dialog */}
      <Dialog open={!!editingRevenue} onOpenChange={(open) => !open && setEditingRevenue(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Faturamento</DialogTitle>
          </DialogHeader>
          {editingRevenue && (
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Valor (R$)</Label>
                <Input
                  type="number"
                  value={editingRevenue.amount}
                  onChange={(e) =>
                    setEditingRevenue({ ...editingRevenue, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div>
                <Label className="text-foreground">Observações</Label>
                <Input
                  value={editingRevenue.notes || ""}
                  onChange={(e) =>
                    setEditingRevenue({ ...editingRevenue, notes: e.target.value })
                  }
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingRevenue(null)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRevenue}
              disabled={isSaving}
              className="bg-gradient-gold-shine text-primary-foreground"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit NPS Dialog */}
      <Dialog open={!!editingNps} onOpenChange={(open) => !open && setEditingNps(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar NPS</DialogTitle>
          </DialogHeader>
          {editingNps && (
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Nota NPS</Label>
                <Select
                  value={String(editingNps.score)}
                  onValueChange={(value) =>
                    setEditingNps({ ...editingNps, score: parseInt(value) })
                  }
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="9">NPS 9</SelectItem>
                    <SelectItem value="10">NPS 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">Membro Citado</Label>
                <Input
                  value={editingNps.member_name || ""}
                  onChange={(e) =>
                    setEditingNps({
                      ...editingNps,
                      member_name: e.target.value,
                      cited_member: !!e.target.value,
                    })
                  }
                  placeholder="Nome do membro (deixe vazio se não citou)"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingNps(null)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNps}
              disabled={isSaving}
              className="bg-gradient-gold-shine text-primary-foreground"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecordsEditor;
