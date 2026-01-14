import { Trophy, Star, TrendingUp, Award, Flame, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCRMGamification } from '@/hooks/useCRMGamification';
import { cn } from '@/lib/utils';

export function CRMGamificationWidget() {
  const { userPoints, userAchievements, allAchievements, leaderboard } = useCRMGamification();

  const totalPoints = userPoints.data?.totalPoints || 0;
  const monthlyPoints = userPoints.data?.thisMonth || 0;
  const achievements = userAchievements.data || [];
  const allBadges = allAchievements.data || [];
  const ranking = leaderboard.data || [];

  // Calculate level based on total points
  const level = Math.floor(totalPoints / 500) + 1;
  const pointsToNextLevel = (level * 500) - totalPoints;
  const levelProgress = ((totalPoints % 500) / 500) * 100;

  // Find next achievement
  const unlockedIds = new Set(achievements.map(a => a.achievement_id));
  const nextAchievement = allBadges.find(a => !unlockedIds.has(a.id));

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Gamificação CRM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level & Points */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{level}</span>
              </div>
              <Badge className="absolute -bottom-1 -right-1 bg-primary text-xs">
                Nível
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">pontos totais</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-primary">+{monthlyPoints}</p>
            <p className="text-xs text-muted-foreground">este mês</p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Progresso para Nível {level + 1}</span>
            <span>{pointsToNextLevel} pts restantes</span>
          </div>
          <Progress value={levelProgress} className="h-2" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Star className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{achievements.length}</p>
            <p className="text-xs text-muted-foreground">Conquistas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Flame className="h-4 w-4 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">7</p>
            <p className="text-xs text-muted-foreground">Dias Streak</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Target className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">85%</p>
            <p className="text-xs text-muted-foreground">Meta Mensal</p>
          </div>
        </div>

        {/* Next Achievement */}
        {nextAchievement && (
          <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
                {nextAchievement.icon || '🏆'}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{nextAchievement.name}</p>
                <p className="text-xs text-muted-foreground">{nextAchievement.description}</p>
              </div>
              <Badge variant="outline">{nextAchievement.requirement_value} pts</Badge>
            </div>
          </div>
        )}

        {/* Leaderboard Preview */}
        {ranking.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top 3 do Mês
            </h4>
            <div className="space-y-2">
              {ranking.slice(0, 3).map((user, index) => (
                <div
                  key={user.userId}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg",
                    index === 0 && "bg-yellow-500/10",
                    index === 1 && "bg-gray-400/10",
                    index === 2 && "bg-orange-600/10"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    index === 0 && "bg-yellow-500 text-white",
                    index === 1 && "bg-gray-400 text-white",
                    index === 2 && "bg-orange-600 text-white"
                  )}>
                    {index + 1}
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">
                    {user.profile?.full_name || 'Usuário'}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {user.points.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {achievements.slice(0, 5).map((ua) => (
              <div
                key={ua.id}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xl"
                title={ua.achievement?.name}
              >
                {ua.achievement?.icon || '🏆'}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
