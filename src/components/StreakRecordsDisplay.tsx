import { Trophy, Flame, Medal, Crown, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStreakRecords } from "@/hooks/useStreakRecords";
import { Skeleton } from "@/components/ui/skeleton";

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const getRankIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <Award className="w-4 h-4 text-muted-foreground" />;
  }
};

const getRankBgColor = (position: number) => {
  switch (position) {
    case 1:
      return "bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 border-yellow-500/50";
    case 2:
      return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/50";
    case 3:
      return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/50";
    default:
      return "bg-muted/30 border-border";
  }
};

const StreakRecordsDisplay = () => {
  const { records, allTimeRecord, isLoading } = useStreakRecords();

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            Recordes de Sequências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum recorde de sequência registrado ainda.
            <br />
            <span className="text-xs">Sequências de 3+ vitórias serão registradas automaticamente.</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-primary" />
          <span>Recordes de Sequências</span>
          <Badge variant="outline" className="ml-auto text-xs border-primary/50 text-primary">
            All-Time
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* All-time record highlight */}
        {allTimeRecord && (
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-primary/10 to-yellow-500/20 rounded-xl blur-lg" />
            <div className="relative bg-gradient-to-r from-yellow-500/10 via-primary/5 to-yellow-500/10 rounded-xl p-4 border-2 border-yellow-500/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-yellow-500 uppercase tracking-wider">
                      🏆 Recorde Absoluto
                    </span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {allTimeRecord.teamName}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-bold text-primary">{allTimeRecord.consecutiveWins} meses</span>
                    <span>•</span>
                    <span>
                      {MONTH_NAMES[allTimeRecord.startMonth - 1]} - {MONTH_NAMES[allTimeRecord.endMonth - 1]} {allTimeRecord.year}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Records list */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Top 10 Sequências
          </h4>
          {records.map((record, index) => (
            <div
              key={record.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-all duration-200 hover:scale-[1.01] ${getRankBgColor(index + 1)}`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50">
                {getRankIcon(index + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate text-sm">
                  {record.teamName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {MONTH_NAMES[record.startMonth - 1]} - {MONTH_NAMES[record.endMonth - 1]} {record.year}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-primary" />
                <span className="font-bold text-primary">{record.consecutiveWins}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakRecordsDisplay;
