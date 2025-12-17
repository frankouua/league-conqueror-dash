import { Loader2, PartyPopper } from "lucide-react";
import Header from "@/components/Header";
import TeamRankingCard from "@/components/TeamRankingCard";
import ClinicGoalsCard from "@/components/ClinicGoalsCard";
import RecentAchievements from "@/components/RecentAchievements";
import TimeCounters from "@/components/TimeCounters";
import EvolutionChart from "@/components/EvolutionChart";
import ChampionsDisplay from "@/components/ChampionsDisplay";
import StreakRecordsDisplay from "@/components/StreakRecordsDisplay";
import TeamComparisonCard from "@/components/TeamComparisonCard";
import { useTeamScores } from "@/hooks/useTeamScores";
import { Button } from "@/components/ui/button";
import copaLogo from "@/assets/copa-unique-logo.png";

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

const Index = () => {
  const { teams, achievements, chartData, totalClinicRevenue, isLoading, triggerCelebration } = useTeamScores();

  // Get top 2 teams
  const team1 = teams[0];
  const team2 = teams[1];

  const pointsDifference = team1 && team2 ? Math.abs(team1.totalPoints - team2.totalPoints) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-slide-up">
          <img 
            src={copaLogo} 
            alt="Copa Unique League 2026" 
            className="h-32 md:h-40 mx-auto mb-6 trophy-glow"
          />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gradient-gold mb-2">
            Ranking Ao Vivo
          </h1>
          <p className="text-primary font-semibold text-lg mb-2">
            A Disputa pela Excelência CPI
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Acompanhe a competição em tempo real. Cada atendimento importa. Cada sonho realizado vale ouro.
          </p>
          
          {/* Celebration Test Button */}
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerCelebration("goal")}
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              <PartyPopper className="w-4 h-4" />
              Testar Celebração
            </Button>
          </div>
        </div>

        {/* Time Counters */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <TimeCounters
            daysRemainingMonth={daysRemainingMonth}
            daysRemainingSemester={daysRemainingSemester > 0 ? daysRemainingSemester : 0}
            daysRemainingYear={daysRemainingYear}
          />
        </div>

        {/* Team Rankings */}
        {teams.length >= 2 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="animate-scale-in" style={{ animationDelay: "200ms" }}>
              <TeamRankingCard
                position={1}
                teamName={team1.name}
                totalPoints={team1.totalPoints}
                revenuePoints={team1.revenuePoints}
                qualityPoints={team1.qualityPoints}
                modifierPoints={team1.modifierPoints}
                pointsDifference={pointsDifference}
                isLeading={true}
              />
            </div>
            <div className="animate-scale-in" style={{ animationDelay: "300ms" }}>
              <TeamRankingCard
                position={2}
                teamName={team2.name}
                totalPoints={team2.totalPoints}
                revenuePoints={team2.revenuePoints}
                qualityPoints={team2.qualityPoints}
                modifierPoints={team2.modifierPoints}
                pointsDifference={-pointsDifference}
                isLeading={false}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 mb-8 bg-gradient-card rounded-2xl border border-border">
            <p className="text-muted-foreground">
              Nenhuma equipe cadastrada ainda. Entre em contato com o administrador.
            </p>
          </div>
        )}

        {/* Team Comparison */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: "350ms" }}>
          <TeamComparisonCard />
        </div>

        {/* Champions & Streak Records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="animate-slide-up" style={{ animationDelay: "400ms" }}>
            <ChampionsDisplay />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "450ms" }}>
            <StreakRecordsDisplay />
          </div>
        </div>

        {/* Clinic Goals & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="animate-slide-up" style={{ animationDelay: "500ms" }}>
            <ClinicGoalsCard
              currentRevenue={totalClinicRevenue}
              goal1={2500000}
              goal2={2700000}
              goal3={3000000}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "550ms" }}>
            <EvolutionChart
              data={chartData}
              team1Name={team1?.name || "Equipe 1"}
              team2Name={team2?.name || "Equipe 2"}
            />
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="animate-slide-up" style={{ animationDelay: "600ms" }}>
          {achievements.length > 0 ? (
            <RecentAchievements achievements={achievements} />
          ) : (
            <div className="bg-gradient-card rounded-2xl p-6 border border-border text-center">
              <p className="text-muted-foreground">
                Nenhuma conquista registrada ainda. Comece registrando indicadores!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-primary font-medium mb-1">
            Copa Unique League 2026
          </p>
          <p className="text-muted-foreground text-sm">
            A Disputa pela Excelência CPI • © Unique
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
