import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, FileText, Video, HelpCircle, MessageSquare, 
  Trophy, Star, TrendingUp, Zap, Target, GraduationCap,
  CheckCircle2, Lock, Play, Award
} from "lucide-react";
import { useTrainingAcademy, getLevelName, getXpProgress } from "@/hooks/useTrainingAcademy";
import { useAuth } from "@/contexts/AuthContext";
import TrainingLibrary from "./TrainingLibrary";
import TrainingQuizzes from "./TrainingQuizzes";
import TrainingSimulations from "./TrainingSimulations";
import TrainingTracks from "./TrainingTracks";
import TrainingLeaderboard from "./TrainingLeaderboard";

const TrainingAcademy = () => {
  const { profile } = useAuth();
  const { userStats, isLoading } = useTrainingAcademy();
  const [activeTab, setActiveTab] = useState("overview");

  const xpProgress = userStats ? getXpProgress(userStats.total_xp, userStats.current_level) : 0;
  const levelName = userStats ? getLevelName(userStats.current_level) : "Iniciante 🌱";

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Level & XP Card */}
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {userStats?.current_level || 1}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Zap className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Seu Nível</p>
                <p className="text-lg font-bold">{levelName}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{userStats?.total_xp || 0} XP</span>
                    <span>{(userStats?.current_level || 1) * 500} XP</span>
                  </div>
                  <Progress value={xpProgress} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userStats?.materials_completed || 0}</p>
                <p className="text-xs text-muted-foreground">Materiais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userStats?.quizzes_passed || 0}</p>
                <p className="text-xs text-muted-foreground">Quizzes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2 whitespace-nowrap">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2 whitespace-nowrap">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Biblioteca</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-2 whitespace-nowrap">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Quizzes</span>
            </TabsTrigger>
            <TabsTrigger value="simulations" className="gap-2 whitespace-nowrap">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Simulações</span>
            </TabsTrigger>
            <TabsTrigger value="tracks" className="gap-2 whitespace-nowrap">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Trilhas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Progress */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Seu Progresso
                  </CardTitle>
                  <CardDescription>
                    Continue treinando para subir de nível e ganhar mais XP
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <p className="text-2xl font-bold">{userStats?.materials_completed || 0}</p>
                      <p className="text-xs text-muted-foreground">Materiais Lidos</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <HelpCircle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{userStats?.quizzes_passed || 0}</p>
                      <p className="text-xs text-muted-foreground">Quizzes Aprovados</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <p className="text-2xl font-bold">{userStats?.simulations_completed || 0}</p>
                      <p className="text-xs text-muted-foreground">Simulações</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                      <p className="text-2xl font-bold">{userStats?.tracks_completed || 0}</p>
                      <p className="text-xs text-muted-foreground">Trilhas Completas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Continue Aprendendo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button 
                      onClick={() => setActiveTab("library")}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    >
                      <BookOpen className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="font-medium">Biblioteca</p>
                      <p className="text-xs text-muted-foreground">PDFs, ebooks e mais</p>
                    </button>
                    <button 
                      onClick={() => setActiveTab("quizzes")}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    >
                      <HelpCircle className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="font-medium">Testar Conhecimento</p>
                      <p className="text-xs text-muted-foreground">Quizzes interativos</p>
                    </button>
                    <button 
                      onClick={() => setActiveTab("simulations")}
                      className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    >
                      <MessageSquare className="w-6 h-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="font-medium">Simulação</p>
                      <p className="text-xs text-muted-foreground">Pratique com IA</p>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Leaderboard */}
            <div>
              <TrainingLeaderboard compact />
            </div>
          </div>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library">
          <TrainingLibrary />
        </TabsContent>

        {/* Quizzes Tab */}
        <TabsContent value="quizzes">
          <TrainingQuizzes />
        </TabsContent>

        {/* Simulations Tab */}
        <TabsContent value="simulations">
          <TrainingSimulations />
        </TabsContent>

        {/* Tracks Tab */}
        <TabsContent value="tracks">
          <TrainingTracks />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingAcademy;
