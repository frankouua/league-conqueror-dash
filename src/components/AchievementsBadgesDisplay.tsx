import { useState, useEffect } from "react";
import { 
  Trophy, Star, Flame, Target, Zap, Award, Crown, 
  TrendingUp, Users, Medal, Sparkles, Gift
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAchievements, ACHIEVEMENT_DEFINITIONS, AchievementType, UserAchievement } from "@/hooks/useAchievements";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AchievementsBadgesDisplayProps {
  userId?: string;
  month?: number;
  year?: number;
  showAll?: boolean;
}

const CATEGORY_INFO = {
  sales: { label: "Vendas", icon: TrendingUp, color: "text-success" },
  referrals: { label: "Indicações", icon: Users, color: "text-info" },
  streaks: { label: "Sequências", icon: Flame, color: "text-orange-500" },
  quality: { label: "Qualidade", icon: Star, color: "text-primary" },
  goals: { label: "Metas", icon: Target, color: "text-purple-500" },
  leads: { label: "Leads", icon: Zap, color: "text-yellow-500" },
  special: { label: "Especiais", icon: Crown, color: "text-gradient-gold" }
};

const AchievementsBadgesDisplay = ({ 
  userId, 
  month, 
  year, 
  showAll = false 
}: AchievementsBadgesDisplayProps) => {
  const { achievements, stats, isLoading } = useAchievements(userId, month, year);
  const [allAchievements, setAllAchievements] = useState<UserAchievement[]>([]);
  const [topUsers, setTopUsers] = useState<{userId: string; points: number; name: string}[]>([]);

  // Fetch all achievements for overview
  useEffect(() => {
    const fetchAllAchievements = async () => {
      if (!showAll) return;

      const { data } = await supabase
        .from("user_achievements")
        .select("*")
        .order("unlocked_at", { ascending: false })
        .limit(20);

      if (data) setAllAchievements(data as UserAchievement[]);
    };

    const fetchTopUsers = async () => {
      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select("user_id, points_value");

      if (!achievementsData) return;

      // Aggregate points by user
      const userPoints: Record<string, number> = {};
      for (const a of achievementsData) {
        userPoints[a.user_id] = (userPoints[a.user_id] || 0) + (a.points_value || 0);
      }

      const userIds = Object.keys(userPoints);
      
      // Fetch user names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      for (const p of (profiles || [])) {
        nameMap[p.user_id] = p.full_name;
      }

      const sorted = Object.entries(userPoints)
        .map(([id, points]) => ({
          userId: id,
          points,
          name: nameMap[id] || "Usuário"
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

      setTopUsers(sorted);
    };

    fetchAllAchievements();
    fetchTopUsers();
  }, [showAll]);

  const unlockedTypes = new Set(achievements.map(a => a.achievement_type));
  const totalPossible = Object.keys(ACHIEVEMENT_DEFINITIONS).length;
  const progressPercentage = (achievements.length / totalPossible) * 100;

  const getCategoryAchievements = (category: string) => {
    return Object.entries(ACHIEVEMENT_DEFINITIONS)
      .filter(([, def]) => def.category === category)
      .map(([type, def]) => ({
        type: type as AchievementType,
        ...def,
        unlocked: unlockedTypes.has(type)
      }));
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border animate-pulse">
        <CardContent className="p-6">
          <div className="h-40 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Conquistas & Badges</CardTitle>
              <p className="text-sm text-muted-foreground">
                {stats.totalAchievements} de {totalPossible} desbloqueadas
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gradient-gold">{stats.totalPoints}</p>
            <p className="text-xs text-muted-foreground">pontos</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="recent" className="text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 mr-1" />
              Recentes
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              <Medal className="w-4 h-4 mr-1" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs sm:text-sm">
              <Trophy className="w-4 h-4 mr-1" />
              Ranking
            </TabsTrigger>
          </TabsList>

          {/* Recent Achievements */}
          <TabsContent value="recent" className="space-y-3">
            {stats.recentAchievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma conquista ainda</p>
                <p className="text-sm">Continue vendendo para desbloquear!</p>
              </div>
            ) : (
              stats.recentAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors animate-slide-up"
                >
                  <div className="text-3xl">{achievement.icon || "🏆"}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{achievement.achievement_name}</p>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(achievement.unlocked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    +{achievement.points_value}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>

          {/* All Achievements by Category */}
          <TabsContent value="all" className="space-y-4">
            {Object.entries(CATEGORY_INFO).map(([category, info]) => {
              const categoryAchievements = getCategoryAchievements(category);
              const unlockedCount = categoryAchievements.filter(a => a.unlocked).length;
              const Icon = info.icon;

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${info.color}`} />
                    <span className="font-medium text-sm">{info.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({unlockedCount}/{categoryAchievements.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {categoryAchievements.map((achievement) => (
                      <div
                        key={achievement.type}
                        className={`relative group flex flex-col items-center justify-center p-3 rounded-xl transition-all cursor-pointer ${
                          achievement.unlocked 
                            ? "bg-primary/20 border border-primary/30" 
                            : "bg-muted/30 border border-border opacity-50 grayscale"
                        }`}
                        title={`${achievement.name}: ${achievement.description}`}
                      >
                        <span className="text-2xl mb-1">{achievement.icon}</span>
                        {achievement.unlocked && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-success">
                            ✓
                          </Badge>
                        )}
                        
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 w-48 pointer-events-none">
                          <p className="font-semibold text-sm">{achievement.name}</p>
                          <p className="text-xs text-muted-foreground">{achievement.description}</p>
                          <p className="text-xs text-primary mt-1">+{achievement.points} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* Ranking */}
          <TabsContent value="ranking" className="space-y-3">
            {topUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Ranking em construção</p>
              </div>
            ) : (
              topUsers.map((user, index) => (
                <div
                  key={user.userId}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                    index === 0 
                      ? "bg-gradient-to-r from-primary/20 to-transparent border border-primary/30" 
                      : "bg-secondary/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? "bg-primary text-primary-foreground" :
                    index === 1 ? "bg-muted-foreground/30 text-foreground" :
                    index === 2 ? "bg-orange-500/30 text-orange-500" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${index === 0 ? "text-gradient-gold" : ""}`}>
                      {user.points} pts
                    </p>
                  </div>
                  {index === 0 && <Crown className="w-5 h-5 text-primary" />}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AchievementsBadgesDisplay;
