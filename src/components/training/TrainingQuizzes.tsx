import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  HelpCircle, Clock, Zap, CheckCircle2, XCircle, 
  Trophy, ArrowRight, RotateCcw, Play
} from "lucide-react";
import { useTrainingAcademy, TrainingQuiz, QuizQuestion } from "@/hooks/useTrainingAcademy";

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: "Iniciante", color: "bg-green-500/10 text-green-600" },
  easy: { label: "Fácil", color: "bg-green-500/10 text-green-600" },
  intermediate: { label: "Intermediário", color: "bg-yellow-500/10 text-yellow-600" },
  medium: { label: "Médio", color: "bg-yellow-500/10 text-yellow-600" },
  advanced: { label: "Avançado", color: "bg-red-500/10 text-red-600" },
  hard: { label: "Difícil", color: "bg-red-500/10 text-red-600" },
  expert: { label: "Expert", color: "bg-purple-500/10 text-purple-600" },
};

interface TrainingQuizzesProps {
  targetRole: string;
}

const TrainingQuizzes = ({ targetRole }: TrainingQuizzesProps) => {
  const { quizzes, submitQuiz, getBestQuizScore, isQuizPassed, isLoading } = useTrainingAcademy(targetRole);
  const [selectedQuiz, setSelectedQuiz] = useState<TrainingQuiz | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    xpEarned: number;
    correctAnswers: number;
    total: number;
  } | null>(null);

  const handleStartQuiz = (quiz: TrainingQuiz) => {
    setSelectedQuiz(quiz);
    setIsPlaying(true);
    setCurrentQuestion(0);
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setStartTime(Date.now());
    setShowResults(false);
    setQuizResult(null);
  };

  const handleSelectAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (selectedQuiz && currentQuestion < selectedQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;

    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    
    try {
      const result = await submitQuiz({
        quizId: selectedQuiz.id,
        answers,
        timeTaken,
      });
      setQuizResult(result);
      setShowResults(true);
    } catch (error) {
      console.error("Error submitting quiz:", error);
    }
  };

  const handleCloseQuiz = () => {
    setSelectedQuiz(null);
    setIsPlaying(false);
    setShowResults(false);
    setQuizResult(null);
    setAnswers([]);
    setCurrentQuestion(0);
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
      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum quiz disponível ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Em breve teremos quizzes para você testar seu conhecimento!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => {
            const bestScore = getBestQuizScore(quiz.id);
            const passed = isQuizPassed(quiz.id);
            const difficulty = DIFFICULTY_LABELS[quiz.difficulty_level] || DIFFICULTY_LABELS.beginner;

            return (
              <Card 
                key={quiz.id}
                className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
                  passed ? 'border-green-500/30 bg-green-500/5' : ''
                }`}
                onClick={() => setSelectedQuiz(quiz)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      passed ? 'bg-green-500/20' : 'bg-blue-500/10'
                    }`}>
                      {passed ? (
                        <Trophy className="w-5 h-5 text-green-500" />
                      ) : (
                        <HelpCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{quiz.title}</h3>
                      {quiz.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {quiz.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className={difficulty.color}>
                          {difficulty.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <HelpCircle className="w-3 h-3" />
                          <span>{quiz.questions.length} questões</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>{quiz.xp_reward} XP</span>
                        </div>
                      </div>
                      {bestScore !== null && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Melhor:</span>
                          <Badge variant={passed ? "default" : "secondary"} className={passed ? "bg-green-500" : ""}>
                            {bestScore}%
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

      {/* Quiz Detail / Start Dialog */}
      <Dialog open={!!selectedQuiz && !isPlaying} onOpenChange={() => setSelectedQuiz(null)}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {selectedQuiz && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedQuiz.title}</DialogTitle>
                <DialogDescription>
                  {selectedQuiz.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <HelpCircle className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="font-medium">{selectedQuiz.questions.length}</p>
                    <p className="text-xs text-muted-foreground">Questões</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <p className="font-medium">{selectedQuiz.passing_score}%</p>
                    <p className="text-xs text-muted-foreground">Para aprovação</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Zap className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="font-medium">{selectedQuiz.xp_reward} XP</p>
                    <p className="text-xs text-muted-foreground">Recompensa</p>
                  </div>
                  {selectedQuiz.time_limit_minutes && (
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                      <p className="font-medium">{selectedQuiz.time_limit_minutes}min</p>
                      <p className="text-xs text-muted-foreground">Limite</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedQuiz(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleStartQuiz(selectedQuiz)} className="gap-2">
                  <Play className="w-4 h-4" />
                  Iniciar Quiz
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Playing Dialog */}
      <Dialog open={isPlaying && !showResults} onOpenChange={handleCloseQuiz}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {selectedQuiz && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg">{selectedQuiz.title}</DialogTitle>
                  <Badge variant="outline">
                    {currentQuestion + 1} / {selectedQuiz.questions.length}
                  </Badge>
                </div>
                <Progress 
                  value={((currentQuestion + 1) / selectedQuiz.questions.length) * 100} 
                  className="h-2 mt-2"
                />
              </DialogHeader>

              <div className="py-6">
                <h3 className="text-lg font-medium mb-4">
                  {selectedQuiz.questions[currentQuestion]?.question}
                </h3>

                <RadioGroup
                  value={answers[currentQuestion]?.toString()}
                  onValueChange={(value) => handleSelectAnswer(parseInt(value))}
                  className="space-y-3"
                >
                  {selectedQuiz.questions[currentQuestion]?.options.map((option, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        answers[currentQuestion] === idx 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                      <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={handlePrevQuestion}
                  disabled={currentQuestion === 0}
                >
                  Anterior
                </Button>
                {currentQuestion < selectedQuiz.questions.length - 1 ? (
                  <Button 
                    onClick={handleNextQuestion}
                    disabled={answers[currentQuestion] === -1}
                    className="gap-2"
                  >
                    Próxima
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmitQuiz}
                    disabled={answers.some(a => a === -1)}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={handleCloseQuiz}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto text-center p-4 sm:p-6">
          {quizResult && selectedQuiz && (
            <>
              <div className="py-6">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  quizResult.passed ? 'bg-green-500/20' : 'bg-orange-500/20'
                }`}>
                  {quizResult.passed ? (
                    <Trophy className="w-10 h-10 text-green-500" />
                  ) : (
                    <XCircle className="w-10 h-10 text-orange-500" />
                  )}
                </div>

                <h2 className="text-2xl font-bold mb-2">
                  {quizResult.passed ? "Parabéns! 🎉" : "Quase lá!"}
                </h2>
                <p className="text-muted-foreground">
                  {quizResult.passed 
                    ? "Você passou no quiz!"
                    : `Você precisa de ${selectedQuiz.passing_score}% para passar.`
                  }
                </p>

                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <div className="text-4xl font-bold mb-2">
                    {quizResult.score}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quizResult.correctAnswers} de {quizResult.total} corretas
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">+{quizResult.xpEarned} XP</span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-center">
                <Button variant="outline" onClick={handleCloseQuiz}>
                  Fechar
                </Button>
                {!quizResult.passed && (
                  <Button onClick={() => handleStartQuiz(selectedQuiz)} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Tentar Novamente
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingQuizzes;
