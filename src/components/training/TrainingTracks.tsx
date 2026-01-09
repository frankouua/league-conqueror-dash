import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Target, BookOpen, HelpCircle, MessageSquare, 
  Lock, CheckCircle2, Zap, Trophy, ArrowRight, Play
} from "lucide-react";
import { useTrainingAcademy, TrainingTrack, TrackStep } from "@/hooks/useTrainingAcademy";
import TrainingMaterialViewer from "./TrainingMaterialViewer";

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

const TrainingTracks = () => {
  const { 
    tracks, 
    trackProgress, 
    isMaterialCompleted, 
    isQuizPassed, 
    simulationAttempts,
    quizzes,
    simulations,
    isLoading 
  } = useTrainingAcademy();
  const [selectedTrack, setSelectedTrack] = useState<TrainingTrack | null>(null);
  const [viewingMaterialId, setViewingMaterialId] = useState<string | null>(null);
  const [viewingQuizId, setViewingQuizId] = useState<string | null>(null);
  const [viewingSimulationId, setViewingSimulationId] = useState<string | null>(null);

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
                        setViewingQuizId(step.reference_id);
                      } else if (step.type === 'simulation') {
                        setViewingSimulationId(step.reference_id);
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
    </div>
  );
};

export default TrainingTracks;
