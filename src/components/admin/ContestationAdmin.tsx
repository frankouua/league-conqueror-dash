import { useState, useEffect } from "react";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Contestation {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  admin_response: string | null;
  created_at: string;
  deadline: string;
  team_id: string;
  user_id: string;
  teams?: { name: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  revenue: "Faturamento",
  nps: "NPS",
  testimonial: "Depoimento",
  referral: "Indicação",
  card: "Cartão",
  special_event: "Evento Especial",
  other: "Outro",
};

const ContestationAdmin = () => {
  const [contestations, setContestations] = useState<Contestation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchContestations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("contestations")
      .select("*, teams(name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setContestations(data as Contestation[]);
    }
    setIsLoading(false);
  };

  const createNotification = async (
    contestation: Contestation,
    status: "approved" | "rejected"
  ) => {
    const statusText = status === "approved" ? "aprovada" : "rejeitada";
    
    await supabase.from("notifications").insert({
      user_id: contestation.user_id,
      team_id: contestation.team_id,
      type: "contestation_response",
      title: `Contestação ${statusText}`,
      message: `Sua contestação "${contestation.title}" foi ${statusText}. Confira a resposta do coordenador.`,
    });
  };

  useEffect(() => {
    fetchContestations();
  }, []);

  const handleRespond = async (id: string, status: "approved" | "rejected") => {
    if (!user || !response.trim()) {
      toast({
        title: "Erro",
        description: "Informe uma resposta",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(id);

    try {
      const contestation = contestations.find((c) => c.id === id);
      if (!contestation) throw new Error("Contestação não encontrada");

      const { error } = await supabase
        .from("contestations")
        .update({
          status,
          admin_response: response.trim(),
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Create notification for the user
      await createNotification(contestation, status);

      toast({
        title: status === "approved" ? "Contestação Aprovada" : "Contestação Rejeitada",
        description: "A resposta foi enviada à equipe",
      });

      setRespondingId(null);
      setResponse("");
      fetchContestations();
    } catch (error: any) {
      toast({
        title: "Erro ao responder",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
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

  const pendingCount = contestations.filter((c) => c.status === "pending").length;

  return (
    <div className="bg-gradient-card rounded-2xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-warning/10">
          <AlertCircle className="w-6 h-6 text-warning" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground">Contestações</h3>
          <p className="text-muted-foreground text-sm">
            Gerencie as contestações das equipes
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-warning text-warning-foreground">
            {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {contestations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma contestação registrada
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {contestations.map((contestation) => {
            const hoursRemaining = differenceInHours(
              new Date(contestation.deadline),
              new Date()
            );
            const isExpired = hoursRemaining <= 0;
            const isResponding = respondingId === contestation.id;

            return (
              <div
                key={contestation.id}
                className={`p-4 rounded-xl border ${
                  contestation.status === "pending"
                    ? "bg-warning/5 border-warning/30"
                    : "bg-secondary/30 border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {contestation.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[contestation.category] || contestation.category}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {contestation.teams?.name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(contestation.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Badge
                    className={
                      contestation.status === "pending"
                        ? "bg-warning/10 text-warning"
                        : contestation.status === "approved"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }
                  >
                    {contestation.status === "pending" ? (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        Pendente
                      </>
                    ) : contestation.status === "approved" ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprovada
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejeitada
                      </>
                    )}
                  </Badge>
                </div>

                <p className="text-sm text-foreground mb-3 bg-muted/30 p-3 rounded-lg">
                  {contestation.description}
                </p>

                {contestation.status === "pending" && (
                  <>
                    <div
                      className={`text-xs flex items-center gap-1 mb-3 ${
                        isExpired ? "text-destructive" : "text-warning"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {isExpired
                        ? "Prazo de resposta expirado"
                        : `${hoursRemaining}h para responder`}
                    </div>

                    {isResponding ? (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Digite sua resposta..."
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          className="bg-secondary border-border text-foreground resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRespond(contestation.id, "approved")}
                            disabled={processingId === contestation.id}
                            className="bg-success text-success-foreground hover:bg-success/90"
                          >
                            {processingId === contestation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Aprovar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRespond(contestation.id, "rejected")}
                            disabled={processingId === contestation.id}
                          >
                            {processingId === contestation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Rejeitar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRespondingId(null);
                              setResponse("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRespondingId(contestation.id)}
                        className="border-warning text-warning hover:bg-warning/10"
                      >
                        Responder
                      </Button>
                    )}
                  </>
                )}

                {contestation.admin_response && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Resposta:</p>
                    <p className="text-sm text-foreground">{contestation.admin_response}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContestationAdmin;
