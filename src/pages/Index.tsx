import { useState } from "react";
import { Loader2, PartyPopper, Clock, Calendar, Trophy, Users, Building2, TrendingUp, Target, LayoutDashboard, User } from "lucide-react";
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
import SalesForecastPanel from "@/components/SalesForecastPanel";
import MonthComparisonPanel from "@/components/MonthComparisonPanel";
import TeamMembersOverview from "@/components/TeamMembersOverview";
import ProceduresGoalTracker from "@/components/ProceduresGoalTracker";
import { useTeamScores } from "@/hooks/useTeamScores";
import { usePredefinedGoals } from "@/hooks/usePredefinedGoals";
import { useAuth } from "@/contexts/AuthContext";
import MyGoalsDashboard from "@/components/MyGoalsDashboard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import copaLogo from "@/assets/logo-copa-unique-league.png";
import uniqueLogo from "@/assets/logo-unique-cpa.png";

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

      <main className="container mx-auto px-4 py-4">
        {/* Compact Hero Section - Optimized for TV */}
        <div className="text-center mb-4 animate-slide-up">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-3">
            <img 
              src={copaLogo} 
              alt="Copa Unique League 2026" 
              className="h-16 md:h-20 trophy-glow"
            />
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-black text-gradient-gold">
                Dashboard Central
              </h1>
              <p className="text-primary font-semibold text-sm">
                Copa Unique League 2026
              </p>
            </div>
          </div>
          
          {/* Compact Controls Row */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Period Selector - More compact */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[100px] h-7 bg-transparent border-0 text-sm px-1">
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
                <SelectTrigger className="w-[70px] h-7 bg-transparent border-0 text-sm px-1">
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

            {/* Live Indicator */}
            {isCurrentPeriod && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-emerald-500">Ao Vivo</span>
              </div>
            )}
            
            {!isCurrentPeriod && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-500">
                  {MONTHS[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
            )}
            
            {lastUpdated && isCurrentPeriod && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {format(lastUpdated, "HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}

            {/* Admin Celebration Button */}
            {role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerCelebration("goal")}
                className="h-7 gap-1.5 px-3 text-xs border-primary/30 text-primary hover:bg-primary/10"
              >
                <PartyPopper className="w-3.5 h-3.5" />
                Celebrar
              </Button>
            )}
          </div>

          {/* Goals Achievement Banner - Shows when metas are reached */}
          {totalClinicRevenue > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {totalClinicRevenue >= CLINIC_GOALS.META_1 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-500">META 1 ✓</span>
                </div>
              )}
              {totalClinicRevenue >= CLINIC_GOALS.META_2 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 animate-pulse">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-500">META 2 ✓</span>
                </div>
              )}
              {totalClinicRevenue >= CLINIC_GOALS.META_3 && (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-gold-shine border-2 border-primary shadow-gold animate-bounce">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                  <span className="text-sm font-black text-primary-foreground">META 3 🏆 CAMPEÕES!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:max-w-4xl md:mx-auto md:grid-cols-6 gap-1 bg-muted/50 p-1 rounded-xl">
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
              <TabsTrigger 
                value="minhas-metas" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <User className="w-4 h-4" />
                Minhas Metas
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

          {/* MINHAS METAS TAB - Individual Performance */}
          <TabsContent value="minhas-metas" className="animate-fade-in">
            <MyGoalsDashboard />
          </TabsContent>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-hidden">
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

            {/* Team Members Overview - NEW */}
            <TeamMembersOverview month={selectedMonth} year={selectedYear} />

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
            {/* NEW: Procedures Goal Tracker - Clear view of what's missing */}
            <ProceduresGoalTracker month={selectedMonth} year={selectedYear} />
            
            <ExecutiveKPIs month={selectedMonth} year={selectedYear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SmartDailyGoals month={selectedMonth} year={selectedYear} />
              <SalesForecastPanel month={selectedMonth} year={selectedYear} />
            </div>
            
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
            
            {/* Month Comparison */}
            <MonthComparisonPanel 
              currentMonth={selectedMonth} 
              currentYear={selectedYear} 
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
        <footer className="mt-16 pb-8">
          <div className="flex flex-col items-center gap-4">
            <img 
              src={uniqueLogo} 
              alt="Unique Cirurgia Plástica Avançada" 
              className="h-12 md:h-16 w-auto object-contain"
            />
            <p className="text-primary font-medium">
              Copa Unique League 2026
            </p>
            <p className="text-muted-foreground text-sm text-center">
              A Disputa pela Excelência CPI • © {new Date().getFullYear()} Unique Cirurgia Plástica Avançada
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
