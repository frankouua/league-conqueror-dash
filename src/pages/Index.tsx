import Header from "@/components/Header";
import TeamRankingCard from "@/components/TeamRankingCard";
import ClinicGoalsCard from "@/components/ClinicGoalsCard";
import RecentAchievements from "@/components/RecentAchievements";
import TimeCounters from "@/components/TimeCounters";
import EvolutionChart from "@/components/EvolutionChart";

// Mock data for demonstration
const mockTeam1 = {
  name: "Equipe Ouro",
  totalPoints: 1850,
  revenuePoints: 1450,
  qualityPoints: 350,
  modifierPoints: 50,
};

const mockTeam2 = {
  name: "Equipe Diamante",
  totalPoints: 1720,
  revenuePoints: 1380,
  qualityPoints: 380,
  modifierPoints: -40,
};

const mockAchievements = [
  {
    id: "1",
    type: "goal" as const,
    teamName: "Clínica Unique",
    description: "Meta 2 atingida! +50 pontos para todas as equipes 🎉",
    timestamp: "Há 2 horas",
    points: 50,
  },
  {
    id: "2",
    type: "card_blue" as const,
    teamName: "Equipe Ouro",
    description: "Recebeu Cartão Azul por inovação no atendimento",
    timestamp: "Há 5 horas",
    points: 20,
  },
  {
    id: "3",
    type: "referral" as const,
    teamName: "Equipe Diamante",
    description: "Registrou 8 novas indicações coletadas",
    timestamp: "Há 1 dia",
    points: 40,
  },
  {
    id: "4",
    type: "testimonial" as const,
    teamName: "Equipe Ouro",
    description: "Conseguiu 3 depoimentos Google 5★",
    timestamp: "Há 1 dia",
    points: 30,
  },
  {
    id: "5",
    type: "ambassador" as const,
    teamName: "Equipe Diamante",
    description: "Nova paciente embaixadora reconhecida",
    timestamp: "Há 2 dias",
    points: 50,
  },
  {
    id: "6",
    type: "card_yellow" as const,
    teamName: "Equipe Diamante",
    description: "Recebeu Cartão Amarelo - Atenção ao prazo",
    timestamp: "Há 3 dias",
    points: -15,
  },
];

const mockChartData = [
  { month: "Jan", team1: 280, team2: 250 },
  { month: "Fev", team1: 580, team2: 520 },
  { month: "Mar", team1: 920, team2: 880 },
  { month: "Abr", team1: 1280, team2: 1150 },
  { month: "Mai", team1: 1580, team2: 1480 },
  { month: "Jun", team1: 1850, team2: 1720 },
];

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
  const isTeam1Leading = mockTeam1.totalPoints > mockTeam2.totalPoints;
  const pointsDifference = Math.abs(mockTeam1.totalPoints - mockTeam2.totalPoints);

  // Combined revenue for clinic goals
  const team1Revenue = mockTeam1.revenuePoints * 10000;
  const team2Revenue = mockTeam2.revenuePoints * 10000;
  const totalClinicRevenue = team1Revenue + team2Revenue;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gradient-gold mb-4">
            Ranking Ao Vivo
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Acompanhe a competição em tempo real e veja qual equipe está dominando a Copa Unique League 2026
          </p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="animate-scale-in" style={{ animationDelay: "200ms" }}>
            <TeamRankingCard
              position={isTeam1Leading ? 1 : 2}
              teamName={mockTeam1.name}
              totalPoints={mockTeam1.totalPoints}
              revenuePoints={mockTeam1.revenuePoints}
              qualityPoints={mockTeam1.qualityPoints}
              modifierPoints={mockTeam1.modifierPoints}
              pointsDifference={isTeam1Leading ? pointsDifference : -pointsDifference}
              isLeading={isTeam1Leading}
            />
          </div>
          <div className="animate-scale-in" style={{ animationDelay: "300ms" }}>
            <TeamRankingCard
              position={isTeam1Leading ? 2 : 1}
              teamName={mockTeam2.name}
              totalPoints={mockTeam2.totalPoints}
              revenuePoints={mockTeam2.revenuePoints}
              qualityPoints={mockTeam2.qualityPoints}
              modifierPoints={mockTeam2.modifierPoints}
              pointsDifference={isTeam1Leading ? -pointsDifference : pointsDifference}
              isLeading={!isTeam1Leading}
            />
          </div>
        </div>

        {/* Clinic Goals & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="animate-slide-up" style={{ animationDelay: "400ms" }}>
            <ClinicGoalsCard
              currentRevenue={totalClinicRevenue}
              goal1={2500000}
              goal2={2700000}
              goal3={3000000}
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "500ms" }}>
            <EvolutionChart
              data={mockChartData}
              team1Name={mockTeam1.name}
              team2Name={mockTeam2.name}
            />
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="animate-slide-up" style={{ animationDelay: "600ms" }}>
          <RecentAchievements achievements={mockAchievements} />
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026 Unique CPI • Copa Unique League
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
