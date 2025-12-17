import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Zap, Target, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpecialEvent {
  id: string;
  team_id: string;
  category: string;
  event_type: string;
  points: number;
  multiplier: number;
  description: string | null;
  date: string;
  created_at: string;
  teams?: { name: string };
}

const EVENT_LABELS: Record<string, string> = {
  chuva_fechamentos: "Chuva de Fechamentos",
  liga_lealdade: "Liga da Lealdade",
  dia_virada: "Dia da Virada",
  missao_bruna: "Missão Bruna",
  var: "VAR",
};

const SpecialEventsHistory = () => {
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEvents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("special_events")
      .select("*, teams(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setEvents(data as SpecialEvent[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("special_events").delete().eq("id", id);
      if (error) throw error;

      setEvents(events.filter((e) => e.id !== id));
      toast({
        title: "Evento removido",
        description: "O evento foi removido com sucesso",
      });
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
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Histórico de Eventos</h3>
          <p className="text-muted-foreground text-sm">
            Boosters e Turning Points aplicados
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum evento especial aplicado ainda
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    event.category === "booster"
                      ? "bg-yellow-500/10"
                      : "bg-blue-500/10"
                  }`}
                >
                  {event.category === "booster" ? (
                    <Zap className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Target className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {EVENT_LABELS[event.event_type] || event.event_type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {event.teams?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{format(new Date(event.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    {event.points !== 0 && (
                      <span className={event.points > 0 ? "text-green-500" : "text-red-500"}>
                        {event.points > 0 ? "+" : ""}{event.points} pts
                      </span>
                    )}
                    {event.multiplier !== 1 && (
                      <span className="text-primary">
                        x{event.multiplier}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(event.id)}
                disabled={deletingId === event.id}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {deletingId === event.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpecialEventsHistory;
