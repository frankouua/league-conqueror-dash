import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Award, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Card {
  id: string;
  team_id: string;
  type: "blue" | "white" | "yellow" | "red";
  reason: string;
  points: number;
  date: string;
  created_at: string;
  teams: { name: string } | null;
}

const cardStyles = {
  blue: { label: "Azul", color: "text-info", bgColor: "bg-info/10" },
  white: { label: "Branco", color: "text-foreground", bgColor: "bg-foreground/10" },
  yellow: { label: "Amarelo", color: "text-warning", bgColor: "bg-warning/10" },
  red: { label: "Vermelho", color: "text-destructive", bgColor: "bg-destructive/10" },
};

const CardHistory = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCards = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("*, teams(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Erro ao carregar cartões",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCards(data as Card[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Cartão removido",
        description: "O cartão foi removido com sucesso",
      });

      setCards(cards.filter((c) => c.id !== id));
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-card rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-warning/10">
          <AlertTriangle className="w-6 h-6 text-warning" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Histórico de Cartões</h3>
          <p className="text-muted-foreground text-sm">
            Últimos 50 cartões aplicados
          </p>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhum cartão aplicado ainda
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Equipe</TableHead>
                <TableHead className="text-muted-foreground">Motivo</TableHead>
                <TableHead className="text-muted-foreground">Pontos</TableHead>
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card) => {
                const style = cardStyles[card.type];
                return (
                  <TableRow key={card.id} className="border-border">
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          style.bgColor,
                          style.color
                        )}
                      >
                        {card.points > 0 ? (
                          <Award className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {style.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {card.teams?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {card.reason}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-semibold",
                        card.points > 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {card.points > 0 ? "+" : ""}
                      {card.points}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(card.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">
                              Remover cartão?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Esta ação não pode ser desfeita. Os pontos serão
                              revertidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(card.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deletingId === card.id}
                            >
                              {deletingId === card.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Remover"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CardHistory;
