import { Trophy, Crown, Medal, Calendar, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChampions } from "@/hooks/useChampions";
import { Skeleton } from "@/components/ui/skeleton";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const ChampionsDisplay = () => {
  const { champions, isLoading } = useChampions();

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
    <Card className="bg-gradient-card border-border overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="w-6 h-6 text-primary" />
          <span className="text-gradient-gold">Hall da Fama</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
                  className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      {MONTH_NAMES[champ.month - 1]}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {champ.teamName}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {champ.totalPoints.toLocaleString("pt-BR")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChampionsDisplay;
