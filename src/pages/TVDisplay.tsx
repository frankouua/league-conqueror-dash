import { Loader2, Clock, Wifi, Monitor } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTeamScores } from "@/hooks/useTeamScores";
import TeamBadgesDisplay from "@/components/TeamBadgesDisplay";
import TimeCounters from "@/components/TimeCounters";
import copaLogo from "@/assets/logo-copa-unique-league.png";

// Calculate days remaining
const now = new Date();
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
const endOfSemester = now.getMonth() < 6 
  ? new Date(now.getFullYear(), 5, 30) 
  : new Date(now.getFullYear(), 11, 31);
const endOfYear = new Date(now.getFullYear(), 11, 31);

const daysRemainingMonth = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
const daysRemainingSemester = Math.ceil((endOfSemester.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
const daysRemainingYear = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

const TVDisplay = () => {
  const { teams, isLoading, lastUpdated } = useTeamScores();

  const team1 = teams[0];
  const team2 = teams[1];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
          <p className="text-muted-foreground text-xl">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar - Logo, Title, and Status */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <img 
            src={copaLogo} 
            alt="Copa Unique League 2026" 
            className="h-16 md:h-20 lg:h-24 trophy-glow"
          />
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gradient-gold">
              Ranking Ao Vivo
            </h1>
            <p className="text-primary font-semibold text-lg md:text-xl">
              Copa Unique League 2026
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* TV Mode Indicator */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Modo TV</span>
          </div>
          
          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-500">
              Ao Vivo
            </span>
          </div>
          
          {/* Last Updated */}
          {lastUpdated && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                Atualizado:{" "}
                <span className="text-foreground font-medium">
                  {format(lastUpdated, "HH:mm:ss", { locale: ptBR })}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Team Comparison */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
        {teams.length >= 2 ? (
          <TeamBadgesDisplay 
            layout="tv" 
            size="xl" 
            winningTeam={
              team1 && team2 
                ? team1.totalPoints > team2.totalPoints 
                  ? team1.name.toLowerCase().includes("lioness") ? "lioness" : "troia"
                  : team2.totalPoints > team1.totalPoints
                  ? team2.name.toLowerCase().includes("lioness") ? "lioness" : "troia"
                  : "tie"
                : null
            }
            team1={team1 ? {
              name: team1.name,
              totalPoints: team1.totalPoints,
              totalRevenue: team1.totalRevenue
            } : null}
            team2={team2 ? {
              name: team2.name,
              totalPoints: team2.totalPoints,
              totalRevenue: team2.totalRevenue
            } : null}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-xl">
              Nenhuma equipe cadastrada ainda.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Bar - Time Counters */}
      <div className="px-8 py-6 border-t border-border/50 bg-secondary/20">
        <TimeCounters
          daysRemainingMonth={daysRemainingMonth}
          daysRemainingSemester={daysRemainingSemester > 0 ? daysRemainingSemester : 0}
          daysRemainingYear={daysRemainingYear}
        />
      </div>
    </div>
  );
};

export default TVDisplay;
