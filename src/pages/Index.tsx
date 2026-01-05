import { useState } from "react";
import { Loader2, PartyPopper, Clock, Calendar, Trophy, Users, Building2, TrendingUp, Target, LayoutDashboard } from "lucide-react";
import { MonthlyTeamRankingChart } from "@/components/MonthlyTeamRankingChart";
import { CLINIC_GOALS } from "@/constants/clinicGoals";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Header from "@/components/Header";
import TeamRankingCard from "@/components/TeamRankingCard";
import ClinicGoalsCard from "@/components/ClinicGoalsCard";
import DepartmentGoalsCard from "@/components/DepartmentGoalsCard";
import RecentAchievements from "@/components/RecentAchievements";
import TimeCounters from "@/components/TimeCounters";
import EvolutionChart from "@/components/EvolutionChart";
import ChampionsDisplay from "@/components/ChampionsDisplay";
import StreakRecordsDisplay from "@/components/StreakRecordsDisplay";
import TeamComparisonCard from "@/components/TeamComparisonCard";
import TeamBadgesDisplay from "@/components/TeamBadgesDisplay";
import TeamPrizesDisplay from "@/components/TeamPrizesDisplay";
import QuickInsightsPanel from "@/components/QuickInsightsPanel";
import GoalAchievementSummary from "@/components/GoalAchievementSummary";
import { SoldVsExecutedPanel } from "@/components/SoldVsExecutedPanel";
import { GoalConfirmationDialog } from "@/components/GoalConfirmationDialog";
import GoalTrackingDashboard from "@/components/GoalTrackingDashboard";
import SellerDashboard from "@/components/SellerDashboard";
import { DashboardFilters } from "@/components/DashboardFilters";
import { HistoricalTrendsPanel } from "@/components/HistoricalTrendsPanel";
import GoalGapAnalysis from "@/components/GoalGapAnalysis";
import ExecutiveKPIs from "@/components/ExecutiveKPIs";
import DailyGoalsPanel from "@/components/DailyGoalsPanel";
import LeadResponseMetrics from "@/components/LeadResponseMetrics";
import AchievementsBadgesDisplay from "@/components/AchievementsBadgesDisplay";
import SmartDailyGoals from "@/components/SmartDailyGoals";
import { useTeamScores } from "@/hooks/useTeamScores";
import { usePredefinedGoals } from "@/hooks/usePredefinedGoals";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import copaLogo from "@/assets/logo-copa-unique-league.png";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
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
  const { role, profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState("times");
  const [filterSeller, setFilterSeller] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  
  const isCurrentPeriod = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();
  
  const { teams, achievements, chartData, totalClinicRevenue, isLoading, lastUpdated, triggerCelebration } = useTeamScores(
    profile?.team_id,
    selectedMonth,
    selectedYear
  );
  const { pendingGoal } = usePredefinedGoals();

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

      {/* Goal Confirmation Dialog */}
      {pendingGoal && (
        <GoalConfirmationDialog 
          goal={pendingGoal} 
          onClose={() => window.location.reload()} 
        />
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-slide-up">
          <img 
            src={copaLogo} 
            alt="Copa Unique League 2026" 
            className="h-24 md:h-32 mx-auto mb-4 trophy-glow"
          />
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gradient-gold mb-2">
            Dashboard Central
          </h1>
          <p className="text-primary font-semibold text-lg mb-2">
            Copa Unique League 2026
          </p>
          
          {/* Period Selector */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Período:</span>
            </div>
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[140px] bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {MONTHS.map((month, index) => (
                  <SelectItem key={index + 1} value={String(index + 1)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px] bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {[2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Live Indicator & Last Updated */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isCurrentPeriod && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-emerald-500">
                  Ao Vivo
                </span>
              </div>
            )}
            
            {!isCurrentPeriod && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">
                  {MONTHS[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
            )}
            
            {lastUpdated && isCurrentPeriod && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Atualizado:{" "}
                  <span className="text-foreground font-medium">
                    {format(lastUpdated, "HH:mm", { locale: ptBR })}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Celebration Test Button - Admin Only */}
          {role === "admin" && (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerCelebration("goal")}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                <PartyPopper className="w-4 h-4" />
                Celebrar!
              </Button>
            </div>
          )}
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:max-w-3xl md:mx-auto md:grid-cols-5 gap-1 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="times" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Trophy className="w-4 h-4" />
                Times
              </TabsTrigger>
              <TabsTrigger 
                value="o-que-falta" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Target className="w-4 h-4" />
                O Que Falta
              </TabsTrigger>
              <TabsTrigger 
                value="vendido-executado" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <TrendingUp className="w-4 h-4" />
                Vendido vs Executado
              </TabsTrigger>
              <TabsTrigger 
                value="vendedoras" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Users className="w-4 h-4" />
                Vendedoras
              </TabsTrigger>
              <TabsTrigger 
                value="departamentos" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Building2 className="w-4 h-4" />
                Departamentos
              </TabsTrigger>
          </TabsList>
          
          {/* Filters - shown for relevant tabs */}
          {(activeTab === "vendido-executado" || activeTab === "vendedoras" || activeTab === "departamentos" || activeTab === "o-que-falta") && (
            <DashboardFilters
              selectedSeller={filterSeller}
              selectedDepartment={filterDepartment}
              onSellerFilterChange={setFilterSeller}
              onDepartmentFilterChange={setFilterDepartment}
            />
          )}
          </div>

          {/* TIMES TAB - Team Rankings & General Stats */}
          <TabsContent value="times" className="space-y-8 animate-fade-in">
            {/* Executive KPIs - Main Numbers */}
            <ExecutiveKPIs month={selectedMonth} year={selectedYear} />

            {/* Team Badges Display */}
            <div className="animate-scale-in">
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
            </div>

            <TimeCounters
              daysRemainingMonth={daysRemainingMonth}
              daysRemainingSemester={daysRemainingSemester > 0 ? daysRemainingSemester : 0}
              daysRemainingYear={daysRemainingYear}
            />

            {/* Team Rankings */}
            {teams.length >= 2 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TeamRankingCard
                  position={1}
                  teamName={team1.name}
                  totalPoints={team1.totalPoints}
                  revenuePoints={team1.revenuePoints}
                  qualityPoints={team1.qualityPoints}
                  modifierPoints={team1.modifierPoints}
                  totalRevenue={team1.totalRevenue}
                  pointsDifference={pointsDifference}
                  isLeading={true}
                />
                <TeamRankingCard
                  position={2}
                  teamName={team2.name}
                  totalPoints={team2.totalPoints}
                  revenuePoints={team2.revenuePoints}
                  qualityPoints={team2.qualityPoints}
                  modifierPoints={team2.modifierPoints}
                  totalRevenue={team2.totalRevenue}
                  pointsDifference={-pointsDifference}
                  isLeading={false}
                />
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-card rounded-2xl border border-border">
                <p className="text-muted-foreground">
                  Nenhuma equipe cadastrada ainda.
                </p>
              </div>
            )}

            {/* Daily Goals & Lead Response Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyGoalsPanel month={selectedMonth} year={selectedYear} />
              <LeadResponseMetrics month={selectedMonth} year={selectedYear} />
            </div>

            {/* Quick Insights & Team Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickInsightsPanel month={selectedMonth} year={selectedYear} />
              <TeamComparisonCard />
            </div>

            {/* Monthly Team Ranking Chart */}
            <MonthlyTeamRankingChart />

            {/* Champions & Streak Records */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChampionsDisplay />
              <StreakRecordsDisplay />
            </div>

            {/* Team Prizes */}
            <TeamPrizesDisplay />

            {/* Clinic Goals & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClinicGoalsCard
                currentRevenue={totalClinicRevenue}
                goal1={CLINIC_GOALS.META_1}
                goal2={CLINIC_GOALS.META_2}
                goal3={CLINIC_GOALS.META_3}
              />
              <EvolutionChart
                data={chartData}
                team1Name={team1?.name || "Lioness Team"}
                team2Name={team2?.name || "Tróia Team"}
              />
            </div>

            {/* Achievements & Badges System */}
            <AchievementsBadgesDisplay showAll month={selectedMonth} year={selectedYear} />

            {/* Recent Achievements */}
            {achievements.length > 0 && (
              <RecentAchievements achievements={achievements} />
            )}
          </TabsContent>

          {/* O QUE FALTA TAB */}
          <TabsContent value="o-que-falta" className="space-y-8 animate-fade-in">
            <ExecutiveKPIs month={selectedMonth} year={selectedYear} />
            <SmartDailyGoals month={selectedMonth} year={selectedYear} />
            <GoalGapAnalysis month={selectedMonth} year={selectedYear} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyGoalsPanel month={selectedMonth} year={selectedYear} />
              <LeadResponseMetrics month={selectedMonth} year={selectedYear} />
            </div>
            <GoalTrackingDashboard month={selectedMonth} year={selectedYear} />
          </TabsContent>

          {/* VENDIDO VS EXECUTADO TAB */}
          <TabsContent value="vendido-executado" className="space-y-8 animate-fade-in">
            <SoldVsExecutedPanel 
              month={selectedMonth} 
              year={selectedYear} 
              filterSeller={filterSeller}
              filterDepartment={filterDepartment}
            />
            
            {/* Historical Trends */}
            <HistoricalTrendsPanel 
              currentMonth={selectedMonth} 
              currentYear={selectedYear} 
            />
            
            <GoalAchievementSummary month={selectedMonth} year={selectedYear} />
          </TabsContent>

          {/* POR VENDEDORA TAB */}
          <TabsContent value="vendedoras" className="space-y-8 animate-fade-in">
            <SellerDashboard 
              month={selectedMonth} 
              year={selectedYear} 
              filterSeller={filterSeller}
              filterDepartment={filterDepartment}
            />
          </TabsContent>

          {/* POR DEPARTAMENTO TAB */}
          <TabsContent value="departamentos" className="space-y-8 animate-fade-in">
            <DepartmentGoalsCard 
              month={selectedMonth} 
              year={selectedYear} 
              filterDepartment={filterDepartment}
            />
          </TabsContent>
        </Tabs>

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
