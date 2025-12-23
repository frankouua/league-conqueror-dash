import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Target, TrendingUp, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PredefinedGoal, usePredefinedGoals } from "@/hooks/usePredefinedGoals";

const POSITION_LABELS: Record<string, string> = {
  sdr: "SDR",
  comercial_1_captacao: "Social Selling",
  comercial_2_closer: "Closer",
  comercial_3_experiencia: "Customer Success",
  comercial_4_farmer: "Farmer",
  coordenador: "Coordenador",
  gerente: "Gerente",
  assistente: "Assistente",
  outro: "Outro",
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface GoalConfirmationDialogProps {
  goal: PredefinedGoal;
  onClose: () => void;
}

export function GoalConfirmationDialog({ goal, onClose }: GoalConfirmationDialogProps) {
  const [isContesting, setIsContesting] = useState(false);
  const [contestReason, setContestReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirmGoal, contestGoal } = usePredefinedGoals();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const result = await confirmGoal(goal.id);
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Metas confirmadas com sucesso!");
      onClose();
    } else {
      toast.error(result.error || "Erro ao confirmar metas");
    }
  };

  const handleContest = async () => {
    if (!contestReason.trim()) {
      toast.error("Por favor, descreva o motivo da contestação");
      return;
    }

    setIsSubmitting(true);
    const result = await contestGoal(goal.id, contestReason);
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Contestação enviada! O administrador irá analisar.");
      onClose();
    } else {
      toast.error(result.error || "Erro ao enviar contestação");
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Confirme suas Metas
          </DialogTitle>
          <DialogDescription>
            {MONTH_NAMES[goal.month - 1]} de {goal.year} • {POSITION_LABELS[goal.position] || goal.position}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Olá <span className="font-semibold text-foreground">{goal.first_name}</span>! Suas metas para este mês foram definidas. 
            Por favor, confirme se estão corretas ou conteste caso haja algum erro.
          </p>

          {/* Goals Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-600">Meta 1</span>
                </div>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(goal.meta1_goal)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-600">Meta 2</span>
                </div>
                <p className="text-lg font-bold text-amber-700">
                  {formatCurrency(goal.meta2_goal)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600">Meta 3</span>
                </div>
                <p className="text-lg font-bold text-purple-700">
                  {formatCurrency(goal.meta3_goal)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{goal.department}</Badge>
            <Badge variant="secondary">{POSITION_LABELS[goal.position] || goal.position}</Badge>
          </div>

          {/* Contest Form */}
          {isContesting && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Contestar Metas</span>
              </div>
              <Textarea
                placeholder="Descreva o motivo da contestação (ex: meta incorreta, cargo errado, etc.)"
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isContesting ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsContesting(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Contestar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isSubmitting ? "Confirmando..." : "Confirmar Metas"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsContesting(false);
                  setContestReason("");
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Voltar
              </Button>
              <Button
                onClick={handleContest}
                disabled={isSubmitting || !contestReason.trim()}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {isSubmitting ? "Enviando..." : "Enviar Contestação"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
