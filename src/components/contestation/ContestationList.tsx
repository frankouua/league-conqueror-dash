import { useState, useEffect } from "react";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Contestation {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  admin_response: string | null;
  created_at: string;
  deadline: string;
  responded_at: string | null;
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

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  approved: {
    label: "Aprovada",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  rejected: {
    label: "Rejeitada",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

interface ContestationListProps {
  refresh?: number;
}

const ContestationList = ({ refresh }: ContestationListProps) => {
  const [contestations, setContestations] = useState<Contestation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchContestations = async () => {
      if (!profile?.team_id) return;

      setIsLoading(true);
      const { data, error } = await supabase
        .from("contestations")
        .select("*")
        .eq("team_id", profile.team_id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setContestations(data as Contestation[]);
      }
      setIsLoading(false);
    };

    fetchContestations();
  }, [profile?.team_id, refresh]);

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
          <AlertCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Minhas Contestações</h3>
          <p className="text-muted-foreground text-sm">
            Acompanhe o status das suas contestações
          </p>
        </div>
      </div>

      {contestations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma contestação registrada
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {contestations.map((contestation) => {
            const statusConfig = STATUS_CONFIG[contestation.status];
            const StatusIcon = statusConfig.icon;
            const hoursRemaining = differenceInHours(
              new Date(contestation.deadline),
              new Date()
            );
            const isExpired = hoursRemaining <= 0 && contestation.status === "pending";

            return (
              <div
                key={contestation.id}
                className="p-4 rounded-xl bg-secondary/30 border border-border"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">
                        {contestation.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[contestation.category] || contestation.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(contestation.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Badge className={statusConfig.className}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {contestation.description}
                </p>

                {contestation.status === "pending" && (
                  <div
                    className={`text-xs flex items-center gap-1 ${
                      isExpired ? "text-destructive" : "text-warning"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {isExpired
                      ? "Prazo expirado"
                      : `${hoursRemaining}h restantes para análise`}
                  </div>
                )}

                {contestation.admin_response && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      Resposta da Coordenação:
                    </p>
                    <p className="text-sm text-foreground">{contestation.admin_response}</p>
                    {contestation.responded_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Respondido em:{" "}
                        {format(new Date(contestation.responded_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
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

export default ContestationList;
