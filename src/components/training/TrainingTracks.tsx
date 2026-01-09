import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Target, BookOpen, HelpCircle, MessageSquare, 
  Lock, CheckCircle2, Zap, Trophy, ArrowRight, Play,
  User, Bot, Send, Loader2, XCircle, RotateCcw, Star
} from "lucide-react";
import { useTrainingAcademy, TrainingTrack, TrackStep, TrainingQuiz, TrainingSimulation } from "@/hooks/useTrainingAcademy";
import TrainingMaterialViewer from "./TrainingMaterialViewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STEP_ICONS: Record<string, typeof BookOpen> = {
  material: BookOpen,
  quiz: HelpCircle,
  simulation: MessageSquare,
};

const STEP_COLORS: Record<string, string> = {
  material: "bg-emerald-500/10 text-emerald-500",
  quiz: "bg-blue-500/10 text-blue-500",
  simulation: "bg-purple-500/10 text-purple-500",
};

interface TrainingTracksProps {
  targetRole: string;
}

const TrainingTracks = ({ targetRole }: TrainingTracksProps) => {
  const { user } = useAuth();
  const { 
    tracks, 
    trackProgress, 
    isMaterialCompleted, 
    isQuizPassed, 
    simulationAttempts,
    quizzes,
    simulations,
    submitQuiz,
    addXp,
    isLoading 
  } = useTrainingAcademy(targetRole);
  const [selectedTrack, setSelectedTrack] = useState<TrainingTrack | null>(null);
  const [viewingMaterialId, setViewingMaterialId] = useState<string | null>(null);
  
  // Quiz state
  const [activeQuiz, setActiveQuiz] = useState<TrainingQuiz | null>(null);
  const [quizStep, setQuizStep] = useState<'info' | 'playing' | 'results'>('info');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizStartTime, setQuizStartTime] = useState(0);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; xpEarned: number; correctAnswers: number; total: number } | null>(null);
  
  // Simulation state
  const [activeSimulation, setActiveSimulation] = useState<TrainingSimulation | null>(null);
  const [simStep, setSimStep] = useState<'info' | 'playing' | 'results'>('info');
  const [simMessages, setSimMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [simInput, setSimInput] = useState('');
  const [simSending, setSimSending] = useState(false);
  const [simEvaluating, setSimEvaluating] = useState(false);
  const [simFeedback, setSimFeedback] = useState<{ score: number; strengths: string[]; improvements: string[]; detailed_analysis: string } | null>(null);
  const [simMsgCount, setSimMsgCount] = useState(0);

  // Get track progress
  const getTrackProgress = (track: TrainingTrack) => {
    const progress = trackProgress.find(p => p.track_id === track.id);
    if (!progress) return { completed: 0, total: track.steps.length, percent: 0 };
    
    const completedSteps = (progress.completed_steps as number[])?.length || 0;
    return {
      completed: completedSteps,
      total: track.steps.length,
      percent: Math.round((completedSteps / track.steps.length) * 100),
    };
  };

  // Check if step is completed
  const isStepCompleted = (step: TrackStep) => {
    switch (step.type) {
      case 'material':
        return isMaterialCompleted(step.reference_id);
      case 'quiz':
        return isQuizPassed(step.reference_id);
      case 'simulation':
        return simulationAttempts.some(
          a => a.simulation_id === step.reference_id && a.score && a.score >= 70
        );
      default:
        return false;
    }
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
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Trilhas de Aprendizado</h3>
              <p className="text-sm text-muted-foreground">
                Complete trilhas inteiras para desbloquear certificados e badges especiais. 
                Cada trilha é uma jornada completa de aprendizado para sua função.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracks List */}
      {tracks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhuma trilha disponível ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Em breve teremos trilhas de aprendizado estruturadas!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map((track) => {
            const progress = getTrackProgress(track);
            const isCompleted = progress.percent === 100;

            return (
              <Card 
                key={track.id}
                className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
                  isCompleted ? 'border-green-500/30 bg-green-500/5' : ''
                }`}
                onClick={() => setSelectedTrack(track)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl ${
                      isCompleted ? 'bg-green-500/20' : 'bg-primary/10'
                    }`}>
                      {track.badge_icon || (isCompleted ? <Trophy className="w-7 h-7 text-green-500" /> : <Target className="w-7 h-7 text-primary" />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{track.title}</h3>
                      {track.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {track.description}
                        </p>
                      )}
                      
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {progress.completed} de {progress.total} etapas
                          </span>
                          <span className="font-medium">{progress.percent}%</span>
                        </div>
                        <Progress value={progress.percent} className="h-2" />
                      </div>

                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>{track.total_xp} XP total</span>
                        </div>
                        {track.target_role && (
                          <Badge variant="outline" className="text-xs">
                            {track.target_role === 'all' ? 'Todos' : track.target_role.toUpperCase()}
                          </Badge>
                        )}
                        {isCompleted && track.badge_name && (
                          <Badge className="bg-green-500 text-xs">
                            <Trophy className="w-3 h-3 mr-1" />
                            {track.badge_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Track Detail Dialog */}
      <Dialog open={!!selectedTrack} onOpenChange={() => setSelectedTrack(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedTrack && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                    {selectedTrack.badge_icon || <Target className="w-6 h-6 text-primary" />}
                  </div>
                  <div>
                    <DialogTitle>{selectedTrack.title}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-muted-foreground">
                        {selectedTrack.total_xp} XP total
                      </span>
                    </div>
                  </div>
                </div>
                <DialogDescription>
                  {selectedTrack.description}
                </DialogDescription>
              </DialogHeader>

                <div className="py-4">
                <h4 className="font-medium mb-3">Etapas da Trilha</h4>
                <div className="space-y-2">
                  {selectedTrack.steps.map((step, idx) => {
                    const Icon = STEP_ICONS[step.type] || BookOpen;
                    const completed = isStepCompleted(step);
                    const isLocked = idx > 0 && !isStepCompleted(selectedTrack.steps[idx - 1]);

                    const handleStepClick = () => {
                      if (isLocked) return;
                      if (step.type === 'material') {
                        setViewingMaterialId(step.reference_id);
                      } else if (step.type === 'quiz') {
                        const quiz = quizzes.find(q => q.id === step.reference_id);
                        if (quiz) {
                          setActiveQuiz(quiz);
                          setQuizStep('info');
                        }
                      } else if (step.type === 'simulation') {
                        const sim = simulations.find(s => s.id === step.reference_id);
                        if (sim) {
                          setActiveSimulation(sim);
                          setSimStep('info');
                        }
                      }
                    };

                    return (
                      <button 
                        key={idx}
                        onClick={handleStepClick}
                        disabled={isLocked}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          completed 
                            ? 'bg-green-500/5 border-green-500/30 hover:bg-green-500/10' 
                            : isLocked
                              ? 'bg-muted/30 border-border opacity-50 cursor-not-allowed'
                              : 'border-border hover:border-primary/30 hover:bg-primary/5 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            completed 
                              ? 'bg-green-500/20' 
                              : isLocked 
                                ? 'bg-muted' 
                                : STEP_COLORS[step.type]
                          }`}>
                            {completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : isLocked ? (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{step.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {step.type === 'material' ? '📚 Material' :
                               step.type === 'quiz' ? '📝 Quiz' : '🎮 Simulação'}
                              {!isLocked && !completed && ' - Clique para abrir'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span>{step.xp} XP</span>
                            </div>
                            {!isLocked && !completed && (
                              <ArrowRight className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedTrack.badge_name && (
                  <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="font-medium">Recompensa</p>
                    <p className="text-sm text-muted-foreground">
                      Badge: <span className="font-medium text-amber-600">{selectedTrack.badge_name}</span>
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTrack(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Material Viewer */}
      <TrainingMaterialViewer
        materialId={viewingMaterialId}
        onClose={() => setViewingMaterialId(null)}
      />

      {/* Quiz Dialog */}
      <Dialog open={!!activeQuiz} onOpenChange={() => { setActiveQuiz(null); setQuizStep('info'); setQuizResult(null); }}>
        <DialogContent className="max-w-2xl">
          {activeQuiz && quizStep === 'info' && (
            <>
              <DialogHeader>
                <DialogTitle>{activeQuiz.title}</DialogTitle>
                <DialogDescription>{activeQuiz.description}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <HelpCircle className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="font-medium">{activeQuiz.questions.length}</p>
                  <p className="text-xs text-muted-foreground">Questões</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="font-medium">{activeQuiz.passing_score}%</p>
                  <p className="text-xs text-muted-foreground">Para aprovação</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveQuiz(null)}>Cancelar</Button>
                <Button onClick={() => {
                  setQuizStep('playing');
                  setCurrentQuestion(0);
                  setQuizAnswers(new Array(activeQuiz.questions.length).fill(-1));
                  setQuizStartTime(Date.now());
                }}>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Quiz
                </Button>
              </DialogFooter>
            </>
          )}
          
          {activeQuiz && quizStep === 'playing' && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg">{activeQuiz.title}</DialogTitle>
                  <Badge variant="outline">{currentQuestion + 1} / {activeQuiz.questions.length}</Badge>
                </div>
                <Progress value={((currentQuestion + 1) / activeQuiz.questions.length) * 100} className="h-2 mt-2" />
              </DialogHeader>
              <div className="py-6">
                <h3 className="text-lg font-medium mb-4">{activeQuiz.questions[currentQuestion]?.question}</h3>
                <RadioGroup
                  value={quizAnswers[currentQuestion]?.toString()}
                  onValueChange={(v) => {
                    const newAnswers = [...quizAnswers];
                    newAnswers[currentQuestion] = parseInt(v);
                    setQuizAnswers(newAnswers);
                  }}
                  className="space-y-3"
                >
                  {activeQuiz.questions[currentQuestion]?.options.map((opt, idx) => (
                    <div key={idx} className={`flex items-center space-x-3 p-3 rounded-lg border ${quizAnswers[currentQuestion] === idx ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <RadioGroupItem value={idx.toString()} id={`q-opt-${idx}`} />
                      <Label htmlFor={`q-opt-${idx}`} className="flex-1 cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => currentQuestion > 0 && setCurrentQuestion(currentQuestion - 1)} disabled={currentQuestion === 0}>Anterior</Button>
                {currentQuestion < activeQuiz.questions.length - 1 ? (
                  <Button onClick={() => setCurrentQuestion(currentQuestion + 1)} disabled={quizAnswers[currentQuestion] === -1}>Próxima</Button>
                ) : (
                  <Button className="bg-green-600 hover:bg-green-700" onClick={async () => {
                    const timeTaken = Math.round((Date.now() - quizStartTime) / 1000);
                    const result = await submitQuiz({ quizId: activeQuiz.id, answers: quizAnswers, timeTaken });
                    setQuizResult(result);
                    setQuizStep('results');
                  }} disabled={quizAnswers.some(a => a === -1)}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />Finalizar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
          
          {activeQuiz && quizStep === 'results' && quizResult && (
            <div className="py-6 text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${quizResult.passed ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                {quizResult.passed ? <Trophy className="w-10 h-10 text-green-500" /> : <XCircle className="w-10 h-10 text-orange-500" />}
              </div>
              <h2 className="text-2xl font-bold mb-2">{quizResult.passed ? "Parabéns! 🎉" : "Quase lá!"}</h2>
              <p className="text-muted-foreground">{quizResult.passed ? "Você passou no quiz!" : `Você precisa de ${activeQuiz.passing_score}% para passar.`}</p>
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <div className="text-4xl font-bold mb-2">{quizResult.score}%</div>
                <div className="text-sm text-muted-foreground">{quizResult.correctAnswers} de {quizResult.total} corretas</div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="font-medium">+{quizResult.xpEarned} XP</span>
              </div>
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="outline" onClick={() => { setActiveQuiz(null); setQuizStep('info'); setQuizResult(null); }}>Fechar</Button>
                {!quizResult.passed && (
                  <Button onClick={() => {
                    setQuizStep('playing');
                    setCurrentQuestion(0);
                    setQuizAnswers(new Array(activeQuiz.questions.length).fill(-1));
                    setQuizStartTime(Date.now());
                    setQuizResult(null);
                  }}>
                    <RotateCcw className="w-4 h-4 mr-2" />Tentar Novamente
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Simulation Dialog */}
      <Dialog open={!!activeSimulation} onOpenChange={() => { setActiveSimulation(null); setSimStep('info'); setSimFeedback(null); setSimMessages([]); }}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          {activeSimulation && simStep === 'info' && (
            <>
              <DialogHeader>
                <DialogTitle>{activeSimulation.title}</DialogTitle>
                <DialogDescription>{activeSimulation.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Cenário:</h4>
                  <p className="text-sm text-muted-foreground">{activeSimulation.context.situation}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Seu objetivo:</h4>
                  <p className="text-sm text-muted-foreground">{activeSimulation.context.goal}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveSimulation(null)}>Cancelar</Button>
                <Button onClick={async () => {
                  setSimStep('playing');
                  setSimMessages([]);
                  setSimMsgCount(0);
                  setSimSending(true);
                  try {
                    const response = await supabase.functions.invoke("training-simulation", {
                      body: { action: "start", simulation: { scenario_type: activeSimulation.scenario_type, context: activeSimulation.context } }
                    });
                    if (response.error) throw response.error;
                    setSimMessages([{ role: "assistant", content: response.data.message }]);
                  } catch (e) {
                    console.error(e);
                    toast.error("Erro ao iniciar simulação");
                    setSimStep('info');
                  } finally {
                    setSimSending(false);
                  }
                }}>
                  <Play className="w-4 h-4 mr-2" />Iniciar Simulação
                </Button>
              </DialogFooter>
            </>
          )}
          
          {activeSimulation && simStep === 'playing' && !simFeedback && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <DialogTitle>{activeSimulation.title}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <Progress value={(simMsgCount / 10) * 100} className="w-24 h-2" />
                    <span className="text-xs text-muted-foreground">{simMsgCount}/10</span>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 py-4">
                  {simMessages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-muted"}`}>
                        {msg.role === "user" ? <User className="w-4 h-4 text-primary-foreground" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {simSending && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><Bot className="w-4 h-4 text-muted-foreground" /></div>
                      <div className="p-3 rounded-lg bg-muted"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex-shrink-0 pt-4 border-t space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    placeholder="Digite sua resposta..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && !e.shiftKey && simInput.trim() && !simSending) {
                        e.preventDefault();
                        const userMsg = simInput.trim();
                        setSimInput('');
                        setSimMsgCount(prev => prev + 1);
                        const newMsgs = [...simMessages, { role: 'user' as const, content: userMsg }];
                        setSimMessages(newMsgs);
                        setSimSending(true);
                        try {
                          const response = await supabase.functions.invoke("training-simulation", {
                            body: { action: "continue", simulation: { scenario_type: activeSimulation.scenario_type, context: activeSimulation.context }, messages: newMsgs }
                          });
                          if (response.error) throw response.error;
                          const updatedMsgs = [...newMsgs, { role: 'assistant' as const, content: response.data.message }];
                          setSimMessages(updatedMsgs);
                          if (simMsgCount + 1 >= 10 || response.data.shouldEnd) {
                            // Auto-evaluate
                            setSimEvaluating(true);
                            const evalRes = await supabase.functions.invoke("training-simulation", {
                              body: { action: "evaluate", simulation: { scenario_type: activeSimulation.scenario_type, context: activeSimulation.context }, messages: updatedMsgs }
                            });
                            setSimFeedback(evalRes.data.feedback);
                            // Save attempt
                            if (user) {
                              await supabase.from("training_simulation_attempts").insert([{
                                user_id: user.id,
                                simulation_id: activeSimulation.id,
                                conversation: JSON.parse(JSON.stringify(updatedMsgs)),
                                ai_feedback: JSON.parse(JSON.stringify(evalRes.data.feedback)),
                                score: evalRes.data.feedback.score,
                                xp_earned: Math.round(activeSimulation.xp_reward * (evalRes.data.feedback.score / 100)),
                                completed_at: new Date().toISOString()
                              }]);
                              addXp({ xpAmount: Math.round(activeSimulation.xp_reward * (evalRes.data.feedback.score / 100)), sourceType: "simulation", sourceId: activeSimulation.id, description: `Simulação: ${activeSimulation.title}` });
                            }
                            setSimEvaluating(false);
                          }
                        } catch (err) {
                          console.error(err);
                          toast.error("Erro ao enviar mensagem");
                        } finally {
                          setSimSending(false);
                        }
                      }
                    }}
                    disabled={simSending || simEvaluating}
                  />
                  <Button
                    size="icon"
                    className="h-auto"
                    disabled={!simInput.trim() || simSending || simEvaluating}
                    onClick={async () => {
                      if (!simInput.trim() || simSending) return;
                      const userMsg = simInput.trim();
                      setSimInput('');
                      setSimMsgCount(prev => prev + 1);
                      const newMsgs = [...simMessages, { role: 'user' as const, content: userMsg }];
                      setSimMessages(newMsgs);
                      setSimSending(true);
                      try {
                        const response = await supabase.functions.invoke("training-simulation", {
                          body: { action: "continue", simulation: { scenario_type: activeSimulation.scenario_type, context: activeSimulation.context }, messages: newMsgs }
                        });
                        if (response.error) throw response.error;
                        setSimMessages([...newMsgs, { role: 'assistant' as const, content: response.data.message }]);
                      } catch (err) {
                        console.error(err);
                        toast.error("Erro ao enviar mensagem");
                      } finally {
                        setSimSending(false);
                      }
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">Pressione Enter para enviar</p>
                  <Button variant="outline" size="sm" disabled={simMessages.length < 2 || simEvaluating} onClick={async () => {
                    setSimEvaluating(true);
                    try {
                      const evalRes = await supabase.functions.invoke("training-simulation", {
                        body: { action: "evaluate", simulation: { scenario_type: activeSimulation.scenario_type, context: activeSimulation.context }, messages: simMessages }
                      });
                      setSimFeedback(evalRes.data.feedback);
                      if (user) {
                        await supabase.from("training_simulation_attempts").insert([{
                          user_id: user.id,
                          simulation_id: activeSimulation.id,
                          conversation: JSON.parse(JSON.stringify(simMessages)),
                          ai_feedback: JSON.parse(JSON.stringify(evalRes.data.feedback)),
                          score: evalRes.data.feedback.score,
                          xp_earned: Math.round(activeSimulation.xp_reward * (evalRes.data.feedback.score / 100)),
                          completed_at: new Date().toISOString()
                        }]);
                        addXp({ xpAmount: Math.round(activeSimulation.xp_reward * (evalRes.data.feedback.score / 100)), sourceType: "simulation", sourceId: activeSimulation.id, description: `Simulação: ${activeSimulation.title}` });
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("Erro ao avaliar simulação");
                    } finally {
                      setSimEvaluating(false);
                    }
                  }}>
                    {simEvaluating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Avaliando...</> : "Finalizar e Avaliar"}
                  </Button>
                </div>
              </div>
            </>
          )}
          
          {activeSimulation && simFeedback && (
            <div className="py-4 space-y-4 overflow-y-auto">
              <div className="text-center">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${simFeedback.score >= 70 ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                  {simFeedback.score >= 70 ? <Trophy className="w-10 h-10 text-green-500" /> : <Star className="w-10 h-10 text-orange-500" />}
                </div>
                <h2 className="text-2xl font-bold mb-2">{simFeedback.score >= 70 ? "Excelente! 🎉" : "Continue Praticando!"}</h2>
                <div className="text-4xl font-bold">{simFeedback.score}%</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">+{Math.round(activeSimulation.xp_reward * (simFeedback.score / 100))} XP</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-medium text-green-700 mb-2">✅ Pontos Fortes</h4>
                  <ul className="space-y-1 text-sm">
                    {simFeedback.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <h4 className="font-medium text-orange-700 mb-2">📈 Melhorias</h4>
                  <ul className="space-y-1 text-sm">
                    {simFeedback.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Análise Detalhada</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{simFeedback.detailed_analysis}</p>
              </div>
              
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => { setActiveSimulation(null); setSimStep('info'); setSimFeedback(null); setSimMessages([]); }}>Fechar</Button>
                <Button onClick={() => { setSimFeedback(null); setSimMessages([]); setSimMsgCount(0); setSimStep('info'); }}>
                  <RotateCcw className="w-4 h-4 mr-2" />Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingTracks;
