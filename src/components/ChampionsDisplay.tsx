import { Trophy, Crown, Medal, Calendar, Star, Flame, Sparkles, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChampions } from "@/hooks/useChampions";
import { useStreakRecords } from "@/hooks/useStreakRecords";
import { Skeleton } from "@/components/ui/skeleton";
import { playStreakCelebration } from "@/lib/sounds";
import { useEffect, useRef } from "react";
import PrizeHistoryCompact from "./PrizeHistoryCompact";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const ChampionsDisplay = () => {
  const { champions, isLoading } = useChampions();
  const { saveStreakRecord } = useStreakRecords();
  const hasPlayedSound = useRef(false);
  const hasSavedStreak = useRef(false);

  // Play celebration sound and save record when streak is detected
  useEffect(() => {
    if (
      !isLoading &&
      champions.currentStreak &&
      champions.currentStreak.consecutiveWins >= 3
    ) {
      // Play sound once per session
      if (!hasPlayedSound.current) {
        const timer = setTimeout(() => {
          playStreakCelebration();
          hasPlayedSound.current = true;
        }, 500);

        return () => clearTimeout(timer);
      }

      // Save streak record once
      if (!hasSavedStreak.current) {
        const year = new Date().getFullYear();
        saveStreakRecord(
          champions.currentStreak.teamId,
          champions.currentStreak.teamName,
          champions.currentStreak.consecutiveWins,
          champions.currentStreak.months,
          year
        );
        hasSavedStreak.current = true;
      }
    }
  }, [isLoading, champions.currentStreak, saveStreakRecord]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const currentSemester = now.getMonth() < 6 ? 1 : 2;

  return (
    <Card className="bg-gradient-card border-border overflow-hidden relative">
      {/* Winning Streak Special Banner */}
      {champions.currentStreak && champions.currentStreak.consecutiveWins >= 3 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
      )}

      <CardHeader className="pb-4 relative">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="w-6 h-6 text-primary" />
          <span className="text-gradient-gold">Hall da Fama</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 relative">
        {/* Winning Streak Highlight */}
        {champions.currentStreak && champions.currentStreak.consecutiveWins >= 3 && (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-yellow-500/20 to-primary/30 rounded-xl blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-r from-primary/20 via-yellow-500/10 to-primary/20 rounded-xl p-4 border-2 border-primary/50 overflow-hidden">
              {/* Animated sparkles background */}
              <div className="absolute inset-0 overflow-hidden">
                <Sparkles className="absolute top-2 right-4 w-4 h-4 text-primary/40 animate-bounce" style={{ animationDelay: "0s" }} />
                <Sparkles className="absolute top-4 right-12 w-3 h-3 text-yellow-500/40 animate-bounce" style={{ animationDelay: "0.5s" }} />
                <Sparkles className="absolute bottom-3 right-8 w-4 h-4 text-primary/40 animate-bounce" style={{ animationDelay: "1s" }} />
                <Sparkles className="absolute top-3 left-[60%] w-3 h-3 text-yellow-500/40 animate-bounce" style={{ animationDelay: "1.5s" }} />
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-yellow-500 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Flame className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {champions.currentStreak.consecutiveWins}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">
                      🔥 Sequência de Vitórias
                    </span>
                  </div>
                  <p className="text-xl font-black text-foreground mt-1">
                    {champions.currentStreak.teamName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-bold">{champions.currentStreak.consecutiveWins} meses</span> consecutivos na liderança!
                  </p>
                  <div className="flex gap-1 mt-2">
                    {champions.currentStreak.months.map((month) => (
                      <Badge 
                        key={month} 
                        className="bg-primary/20 text-primary border-primary/30 text-xs"
                      >
                        {MONTH_NAMES[month - 1].substring(0, 3)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Leaders Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Month Leader */}
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/10 rounded-xl blur-xl group-hover:bg-primary/20 transition-all duration-300" />
            <div className="relative bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-primary/30 hover:border-primary/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Mês Atual</span>
              </div>
              {champions.currentMonthLeader ? (
                <>
                  <p className="text-lg font-bold text-foreground truncate">
                    {champions.currentMonthLeader.teamName}
                  </p>
                  <Badge variant="outline" className="mt-2 border-primary/50 text-primary">
                    {champions.currentMonthLeader.points.toLocaleString("pt-BR")} pts
                  </Badge>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados</p>
              )}
            </div>
          </div>

          {/* Semester Leader */}
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/15 rounded-xl blur-xl group-hover:bg-primary/25 transition-all duration-300" />
            <div className="relative bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-primary/40 hover:border-primary/60 transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">{currentSemester}º Semestre</span>
              </div>
              {champions.semesterLeader ? (
                <>
                  <p className="text-lg font-bold text-foreground truncate">
                    {champions.semesterLeader.teamName}
                  </p>
                  <Badge variant="outline" className="mt-2 border-primary/50 text-primary">
                    {champions.semesterLeader.points.toLocaleString("pt-BR")} pts
                  </Badge>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados</p>
              )}
            </div>
          </div>

          {/* Year Leader */}
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl group-hover:bg-primary/30 transition-all duration-300" />
            <div className="relative bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-primary/50 hover:border-primary/70 transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-primary fill-primary" />
                <span className="text-sm font-medium text-muted-foreground">Anual {now.getFullYear()}</span>
              </div>
              {champions.yearLeader ? (
                <>
                  <p className="text-lg font-bold text-foreground truncate">
                    {champions.yearLeader.teamName}
                  </p>
                  <Badge variant="outline" className="mt-2 border-primary/50 text-primary">
                    {champions.yearLeader.points.toLocaleString("pt-BR")} pts
                  </Badge>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados</p>
              )}
            </div>
          </div>
        </div>

        {/* Monthly History */}
        {champions.monthlyHistory.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Medal className="w-4 h-4" />
              Histórico de Campeões {now.getFullYear()}
            </h4>
            <div className="flex flex-wrap gap-2">
              {champions.monthlyHistory.map((champ) => (
                <div
                  key={`${champ.year}-${champ.month}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-all duration-300 ${
                    champ.isPartOfStreak
                      ? "bg-gradient-to-r from-primary/20 to-yellow-500/10 border-primary/50 shadow-md shadow-primary/20"
                      : "bg-muted/50 border-border hover:border-primary/30"
                  }`}
                >
                  {champ.isPartOfStreak && (
                    <Flame className="w-4 h-4 text-primary animate-pulse" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      {MONTH_NAMES[champ.month - 1]}
                    </span>
                    <span className={`text-sm font-semibold ${champ.isPartOfStreak ? "text-primary" : "text-foreground"}`}>
                      {champ.teamName}
                    </span>
                  </div>
                  <Badge 
                    variant={champ.isPartOfStreak ? "default" : "secondary"} 
                    className={`text-xs ${champ.isPartOfStreak ? "bg-primary/20 text-primary" : ""}`}
                  >
                    {champ.totalPoints.toLocaleString("pt-BR")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prize History Section */}
        <div className="pt-4 border-t border-border">
          <PrizeHistoryCompact year={now.getFullYear()} />
        </div>
      </CardContent>
    </Card>
  );
};

export default ChampionsDisplay;
