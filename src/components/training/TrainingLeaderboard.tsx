import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Crown, Zap } from "lucide-react";
import { useTrainingAcademy, getLevelName } from "@/hooks/useTrainingAcademy";
import { useAuth } from "@/contexts/AuthContext";

interface TrainingLeaderboardProps {
  compact?: boolean;
}

const TrainingLeaderboard = ({ compact = false }: TrainingLeaderboardProps) => {
  const { user } = useAuth();
  const { leaderboard, isLoading } = useTrainingAcademy();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/30";
      case 1:
        return "bg-gradient-to-r from-gray-400/20 to-gray-400/5 border-gray-400/30";
      case 2:
        return "bg-gradient-to-r from-amber-700/20 to-amber-700/5 border-amber-700/30";
      default:
        return "border-border";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const displayList = compact ? leaderboard.slice(0, 5) : leaderboard;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-amber-500" />
          Ranking de Treinamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayList.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum ranking ainda</p>
            <p className="text-xs">Complete treinamentos para aparecer aqui!</p>
          </div>
        ) : (
          displayList.map((entry, index) => {
            const isCurrentUser = entry.user_id === user?.id;
            const initials = entry.full_name
              .split(" ")
              .map(n => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                  isCurrentUser ? 'bg-primary/10 border-primary/30' : getRankBg(index)
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {getRankIcon(index)}
                </div>
                
                <Avatar className="w-8 h-8">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                    {entry.full_name}
                    {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(você)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getLevelName(entry.current_level)}
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span className="text-sm font-bold">{entry.total_xp.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Nv. {entry.current_level}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingLeaderboard;
