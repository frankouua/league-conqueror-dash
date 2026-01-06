import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Unlock, Calendar, Shield, AlertTriangle, Check, Loader2, History, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PeriodLock {
  id: string;
  month: number;
  year: number;
  record_type: string;
  locked: boolean;
  locked_at: string;
  locked_by: string;
  unlock_reason: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  notes: string | null;
}

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export default function PeriodLockManager() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isLocking, setIsLocking] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [selectedLock, setSelectedLock] = useState<PeriodLock | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  
  // New lock form
  const [newMonth, setNewMonth] = useState<number>(new Date().getMonth());
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [newRecordType, setNewRecordType] = useState<string>("all");
  const [newNotes, setNewNotes] = useState("");

  const { data: locks, isLoading } = useQuery({
    queryKey: ["period-locks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("period_locks")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      
      if (error) throw error;
      return data as PeriodLock[];
    },
  });

  const handleLockPeriod = async () => {
    if (!user) return;
    
    setIsLocking(true);
    try {
      const { error } = await supabase.from("period_locks").insert({
        month: newMonth,
        year: newYear,
        record_type: newRecordType,
        locked: true,
        locked_by: user.id,
        notes: newNotes || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Período já existe",
            description: "Este período já foi travado anteriormente. Você pode destravá-lo se precisar.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "🔒 Período Travado!",
          description: `${MONTHS.find(m => m.value === newMonth)?.label} ${newYear} foi travado com sucesso.`,
        });
        queryClient.invalidateQueries({ queryKey: ["period-locks"] });
        setShowLockDialog(false);
        setNewNotes("");
      }
    } catch (error) {
      console.error("Error locking period:", error);
      toast({
        title: "Erro ao travar período",
        description: "Não foi possível travar o período.",
        variant: "destructive",
      });
    }
    setIsLocking(false);
  };

  const handleUnlockPeriod = async () => {
    if (!user || !selectedLock) return;
    
    setIsLocking(true);
    try {
      const { error } = await supabase
        .from("period_locks")
        .update({
          locked: false,
          unlocked_at: new Date().toISOString(),
          unlocked_by: user.id,
          unlock_reason: unlockReason,
        })
        .eq("id", selectedLock.id);

      if (error) throw error;

      toast({
        title: "🔓 Período Destravado!",
        description: `${MONTHS.find(m => m.value === selectedLock.month)?.label} ${selectedLock.year} foi destravado.`,
      });
      queryClient.invalidateQueries({ queryKey: ["period-locks"] });
      setShowUnlockDialog(false);
      setUnlockReason("");
      setSelectedLock(null);
    } catch (error) {
      console.error("Error unlocking period:", error);
      toast({
        title: "Erro ao destravar período",
        description: "Não foi possível destravar o período.",
        variant: "destructive",
      });
    }
    setIsLocking(false);
  };

  const handleRelockPeriod = async (lock: PeriodLock) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("period_locks")
        .update({
          locked: true,
          locked_at: new Date().toISOString(),
          locked_by: user.id,
          unlocked_at: null,
          unlocked_by: null,
          unlock_reason: null,
        })
        .eq("id", lock.id);

      if (error) throw error;

      toast({
        title: "🔒 Período Re-travado!",
        description: `${MONTHS.find(m => m.value === lock.month)?.label} ${lock.year} foi travado novamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ["period-locks"] });
    } catch (error) {
      console.error("Error relocking period:", error);
      toast({
        title: "Erro",
        description: "Não foi possível re-travar o período.",
        variant: "destructive",
      });
    }
  };

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case "vendas": return "Vendas";
      case "executado": return "Executado";
      case "all": return "Todos";
      default: return type;
    }
  };

  // Get previous month as suggestion
  const prevMonth = new Date().getMonth(); // 0-indexed, so current month - 1
  const prevYear = prevMonth === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear();
  const suggestedMonth = prevMonth === 0 ? 12 : prevMonth;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Travamento de Períodos
        </CardTitle>
        <CardDescription>
          Trave períodos para proteger dados históricos de alterações acidentais durante importações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Lock Suggestion */}
        {!locks?.some(l => l.month === suggestedMonth && l.year === prevYear && l.locked) && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600">Sugestão: Travar {MONTHS.find(m => m.value === suggestedMonth)?.label} {prevYear}</p>
                <p className="text-sm text-muted-foreground">O mês anterior ainda não está protegido</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setNewMonth(suggestedMonth);
                setNewYear(prevYear);
                setNewRecordType("all");
                setShowLockDialog(true);
              }}
              size="sm"
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              Travar Agora
            </Button>
          </div>
        )}

        {/* Lock Dialog */}
        <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Travar Novo Período
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Travar Período
              </DialogTitle>
              <DialogDescription>
                Períodos travados não serão sobrescritos durante importações de planilhas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mês</Label>
                  <Select value={String(newMonth)} onValueChange={(v) => setNewMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano</Label>
                  <Select value={String(newYear)} onValueChange={(v) => setNewYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Tipo de Registro</Label>
                <Select value={newRecordType} onValueChange={setNewRecordType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos (Vendas + Executado)</SelectItem>
                    <SelectItem value="vendas">Apenas Vendas</SelectItem>
                    <SelectItem value="executado">Apenas Executado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Fechamento mensal conferido em 05/02"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLockDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleLockPeriod} disabled={isLocking} className="gap-2">
                {isLocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Travar Período
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unlock Dialog */}
        <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <Unlock className="h-5 w-5" />
                Destravar Período
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja destravar este período? Os dados poderão ser sobrescritos em importações.
              </DialogDescription>
            </DialogHeader>
            {selectedLock && (
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">
                    {MONTHS.find(m => m.value === selectedLock.month)?.label} {selectedLock.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tipo: {getRecordTypeLabel(selectedLock.record_type)}
                  </p>
                </div>
                <div>
                  <Label>Motivo do destravamento *</Label>
                  <Textarea
                    value={unlockReason}
                    onChange={(e) => setUnlockReason(e.target.value)}
                    placeholder="Ex: Correção de valores após auditoria"
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleUnlockPeriod} 
                disabled={isLocking || !unlockReason.trim()} 
                variant="destructive"
                className="gap-2"
              >
                {isLocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                Destravar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Locks Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : locks && locks.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Travado em</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locks.map((lock) => (
                  <TableRow key={lock.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {MONTHS.find(m => m.value === lock.month)?.label} {lock.year}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getRecordTypeLabel(lock.record_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lock.locked ? (
                        <Badge className="gap-1 bg-emerald-500">
                          <Lock className="h-3 w-3" />
                          Travado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30">
                          <Unlock className="h-3 w-3" />
                          Destravado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lock.locked_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {lock.notes || (lock.unlock_reason && `Destravado: ${lock.unlock_reason}`) || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {lock.locked ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLock(lock);
                            setShowUnlockDialog(true);
                          }}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRelockPeriod(lock)}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum período travado ainda.</p>
            <p className="text-sm">Trave os meses anteriores para proteger os dados históricos.</p>
          </div>
        )}

        {/* Info */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
          <p className="font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Como funciona:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Períodos <strong>travados</strong> são protegidos durante importações de planilhas</li>
            <li>Se a planilha contiver dados de um período travado, esses registros serão <strong>ignorados</strong></li>
            <li>Você pode destravar temporariamente para fazer correções retroativas</li>
            <li>Recomendamos travar o mês anterior assim que conferir os dados finais</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}