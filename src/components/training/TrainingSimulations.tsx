import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, Play, Send, User, Bot, Zap, 
  Target, Clock, CheckCircle2, XCircle, Loader2,
  Trophy, Star
} from "lucide-react";
import { useTrainingAcademy, TrainingSimulation } from "@/hooks/useTrainingAcademy";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SCENARIO_LABELS: Record<string, string> = {
  lead_qualification: "Qualificação de Lead",
  objection_handling: "Quebra de Objeções",
  closing: "Fechamento",
  follow_up: "Follow-up",
  consultoria: "Consultoria",
  partnership: "Parceria",
  referral: "Indicação",
  reactivation: "Reativação",
  upsell: "Upsell",
  crisis: "Gestão de Crise",
  retention: "Retenção",
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: "Iniciante", color: "bg-green-500/10 text-green-600" },
  easy: { label: "Fácil", color: "bg-green-500/10 text-green-600" },
  intermediate: { label: "Intermediário", color: "bg-yellow-500/10 text-yellow-600" },
  medium: { label: "Médio", color: "bg-yellow-500/10 text-yellow-600" },
  advanced: { label: "Avançado", color: "bg-red-500/10 text-red-600" },
  hard: { label: "Difícil", color: "bg-red-500/10 text-red-600" },
  expert: { label: "Expert", color: "bg-purple-500/10 text-purple-600" },
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface SimulationFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  detailed_analysis: string;
}

interface TrainingSimulationsProps {
  targetRole: string;
}

const TrainingSimulations = ({ targetRole }: TrainingSimulationsProps) => {
  const { user } = useAuth();
  const { simulations, simulationAttempts, addXp, isLoading } = useTrainingAcademy(targetRole);
  const [selectedSimulation, setSelectedSimulation] = useState<TrainingSimulation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<SimulationFeedback | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const MAX_MESSAGES = 10; // Max exchanges before evaluation

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartSimulation = async (simulation: TrainingSimulation) => {
    setSelectedSimulation(simulation);
    setIsPlaying(true);
    setMessages([]);
    setFeedback(null);
    setMessageCount(0);

    // Get initial message from AI
    setIsSending(true);
    try {
      const response = await supabase.functions.invoke("training-simulation", {
        body: {
          action: "start",
          simulation: {
            scenario_type: simulation.scenario_type,
            context: simulation.context,
          },
        },
      });

      if (response.error) throw response.error;
      
      setMessages([{
        role: "assistant",
        content: response.data.message,
      }]);
    } catch (error) {
      console.error("Error starting simulation:", error);
      toast.error("Erro ao iniciar simulação");
      setIsPlaying(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending || !selectedSimulation) return;

    const userMessage = input.trim();
    setInput("");
    setMessageCount(prev => prev + 1);

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsSending(true);

    try {
      const response = await supabase.functions.invoke("training-simulation", {
        body: {
          action: "continue",
          simulation: {
            scenario_type: selectedSimulation.scenario_type,
            context: selectedSimulation.context,
          },
          messages: newMessages,
        },
      });

      if (response.error) throw response.error;

      setMessages([
        ...newMessages,
        { role: "assistant", content: response.data.message },
      ]);

      // Check if we should end the simulation
      if (messageCount + 1 >= MAX_MESSAGES || response.data.shouldEnd) {
        handleEndSimulation([
          ...newMessages,
          { role: "assistant", content: response.data.message },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const handleEndSimulation = async (finalMessages?: ChatMessage[]) => {
    if (!selectedSimulation || !user) return;

    setIsEvaluating(true);
    const messagesToEvaluate = finalMessages || messages;

    try {
      const response = await supabase.functions.invoke("training-simulation", {
        body: {
          action: "evaluate",
          simulation: {
            scenario_type: selectedSimulation.scenario_type,
            context: selectedSimulation.context,
          },
          messages: messagesToEvaluate,
        },
      });

      if (response.error) throw response.error;

      const evaluationFeedback: SimulationFeedback = response.data.feedback;
      setFeedback(evaluationFeedback);

      // Save attempt
      await supabase.from("training_simulation_attempts").insert([{
        user_id: user.id,
        simulation_id: selectedSimulation.id,
        conversation: JSON.parse(JSON.stringify(messagesToEvaluate)),
        ai_feedback: JSON.parse(JSON.stringify(evaluationFeedback)),
        score: evaluationFeedback.score,
        xp_earned: Math.round(selectedSimulation.xp_reward * (evaluationFeedback.score / 100)),
        completed_at: new Date().toISOString(),
      }]);

      // Add XP
      const xpEarned = Math.round(selectedSimulation.xp_reward * (evaluationFeedback.score / 100));
      addXp({
        xpAmount: xpEarned,
        sourceType: "simulation",
        sourceId: selectedSimulation.id,
        description: `Simulação: ${selectedSimulation.title}`,
      });

    } catch (error) {
      console.error("Error evaluating simulation:", error);
      toast.error("Erro ao avaliar simulação");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCloseSimulation = () => {
    setSelectedSimulation(null);
    setIsPlaying(false);
    setMessages([]);
    setFeedback(null);
    setInput("");
    setMessageCount(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/5 border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium">Simulações de Atendimento</h3>
              <p className="text-sm text-muted-foreground">
                Pratique suas habilidades de vendas com uma IA que simula diferentes tipos de clientes. 
                Ao final, você receberá uma avaliação detalhada do seu desempenho.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulations List */}
      {simulations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhuma simulação disponível ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Em breve teremos cenários para você praticar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {simulations.map((simulation) => {
            const bestAttempt = simulationAttempts
              .filter(a => a.simulation_id === simulation.id)
              .sort((a, b) => (b.score || 0) - (a.score || 0))[0];
            const difficulty = DIFFICULTY_LABELS[simulation.difficulty_level] || DIFFICULTY_LABELS.beginner;

            return (
              <Card 
                key={simulation.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                onClick={() => setSelectedSimulation(simulation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{simulation.title}</h3>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {SCENARIO_LABELS[simulation.scenario_type] || simulation.scenario_type}
                      </Badge>
                      {simulation.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                          {simulation.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className={difficulty.color}>
                          {difficulty.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>até {simulation.xp_reward} XP</span>
                        </div>
                      </div>
                      {bestAttempt && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Melhor:</span>
                          <Badge variant={bestAttempt.score && bestAttempt.score >= 70 ? "default" : "secondary"}>
                            {bestAttempt.score}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Simulation Start Dialog */}
      <Dialog open={!!selectedSimulation && !isPlaying} onOpenChange={() => setSelectedSimulation(null)}>
        <DialogContent className="max-w-lg">
          {selectedSimulation && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSimulation.title}</DialogTitle>
                <DialogDescription>
                  {selectedSimulation.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Cenário:</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSimulation.context?.situation || selectedSimulation.description || "Cenário não informado."}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Seu objetivo:</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedSimulation.context?.goal || "Conduzir o atendimento com empatia e avançar para o próximo passo."}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Até {selectedSimulation.xp_reward} XP</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    <span>~{MAX_MESSAGES} mensagens</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedSimulation(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleStartSimulation(selectedSimulation)} className="gap-2">
                  <Play className="w-4 h-4" />
                  Iniciar Simulação
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Simulation Chat Dialog */}
      <Dialog open={isPlaying && !feedback} onOpenChange={handleCloseSimulation}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          {selectedSimulation && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedSimulation.title}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(messageCount / MAX_MESSAGES) * 100} 
                      className="w-24 h-2"
                    />
                    <span className="text-xs text-muted-foreground">
                      {messageCount}/{MAX_MESSAGES}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4 py-4">
                  {messages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === "user" ? "bg-primary" : "bg-muted"
                      }`}>
                        {msg.role === "user" ? (
                          <User className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="flex-shrink-0 pt-4 border-t space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite sua resposta..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isSending || isEvaluating}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isSending || isEvaluating}
                    size="icon"
                    className="h-auto"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Pressione Enter para enviar
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEndSimulation()}
                    disabled={messages.length < 2 || isEvaluating}
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Avaliando...
                      </>
                    ) : (
                      "Finalizar e Avaliar"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={!!feedback} onOpenChange={handleCloseSimulation}>
        <DialogContent className="max-w-lg">
          {feedback && selectedSimulation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trophy className={`w-5 h-5 ${feedback.score >= 70 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  Resultado da Simulação
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Score */}
                <div className="text-center p-6 rounded-lg bg-muted/50">
                  <div className={`text-5xl font-bold mb-2 ${
                    feedback.score >= 80 ? 'text-green-500' :
                    feedback.score >= 60 ? 'text-amber-500' :
                    'text-red-500'
                  }`}>
                    {feedback.score}%
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(feedback.score / 20) 
                            ? 'text-amber-500 fill-amber-500' 
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">
                      +{Math.round(selectedSimulation.xp_reward * (feedback.score / 100))} XP
                    </span>
                  </div>
                </div>

                {/* Strengths */}
                {feedback.strengths.length > 0 && (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Pontos Fortes
                    </h4>
                    <ul className="space-y-1">
                      {feedback.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {feedback.improvements.length > 0 && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <h4 className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4" />
                      Oportunidades de Melhoria
                    </h4>
                    <ul className="space-y-1">
                      {feedback.improvements.map((improvement, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Analysis */}
                {feedback.detailed_analysis && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Análise Detalhada</h4>
                    <p className="text-sm text-muted-foreground">
                      {feedback.detailed_analysis}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={handleCloseSimulation}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingSimulations;
