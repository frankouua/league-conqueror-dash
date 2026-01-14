import { useState, lazy, Suspense, memo, useMemo, useCallback } from "react";
import { Loader2, PartyPopper, Clock, Calendar, Trophy, Users, Building2, TrendingUp, Target, User, History, Brain, ChevronDown, Award, Sparkles } from "lucide-react";
import { CLINIC_GOALS } from "@/constants/clinicGoals";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Header from "@/components/Header";
import { useTeamScores } from "@/hooks/useTeamScores";
import { useTeamProgressData } from "@/hooks/useTeamProgressData";
import { usePredefinedGoals } from "@/hooks/usePredefinedGoals";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import copaLogo from "@/assets/logo-copa-unique-league.png";
import uniqueLogo from "@/assets/logo-unique-cpa.png";

// Lazy load heavy components for faster initial render
const TeamRankingCard = lazy(() => import("@/components/TeamRankingCard"));
const TeamQualityComparisonCard = lazy(() => import("@/components/TeamQualityComparisonCard"));
const DepartmentGoalsCard = lazy(() => import("@/components/DepartmentGoalsCard"));
const RecentAchievements = lazy(() => import("@/components/RecentAchievements"));
const TimeCounters = lazy(() => import("@/components/TimeCounters"));
const EvolutionChart = lazy(() => import("@/components/EvolutionChart"));
const ChampionsDisplay = lazy(() => import("@/components/ChampionsDisplay"));
const StreakRecordsDisplay = lazy(() => import("@/components/StreakRecordsDisplay"));
const TeamBadgesDisplay = lazy(() => import("@/components/TeamBadgesDisplay"));
const TeamPrizesDisplay = lazy(() => import("@/components/TeamPrizesDisplay"));
const QuickInsightsPanel = lazy(() => import("@/components/QuickInsightsPanel"));
const GoalAchievementSummary = lazy(() => import("@/components/GoalAchievementSummary"));
const SoldVsExecutedPanel = lazy(() => import("@/components/SoldVsExecutedPanel").then(m => ({ default: m.SoldVsExecutedPanel })));
const GoalConfirmationDialog = lazy(() => import("@/components/GoalConfirmationDialog").then(m => ({ default: m.GoalConfirmationDialog })));
const GoalTrackingDashboard = lazy(() => import("@/components/GoalTrackingDashboard"));
const SellerDashboard = lazy(() => import("@/components/SellerDashboard"));
const DashboardFilters = lazy(() => import("@/components/DashboardFilters").then(m => ({ default: m.DashboardFilters })));
const ExecutiveKPIs = lazy(() => import("@/components/ExecutiveKPIs"));
const DailyGoalsPanel = lazy(() => import("@/components/DailyGoalsPanel"));
const LeadResponseMetrics = lazy(() => import("@/components/LeadResponseMetrics"));
const AchievementsBadgesDisplay = lazy(() => import("@/components/AchievementsBadgesDisplay"));
const DepartmentGoalCards = lazy(() => import("@/components/DepartmentGoalCards").then(m => ({ default: m.DepartmentGoalCards })));
const TeamMembersOverview = lazy(() => import("@/components/TeamMembersOverview"));
const ProceduresGoalTracker = lazy(() => import("@/components/ProceduresGoalTracker"));
const HistoricalComparison = lazy(() => import("@/components/HistoricalComparison"));
const TeamProgressTable = lazy(() => import("@/components/TeamProgressTable"));
const TeamQuantityTable = lazy(() => import("@/components/TeamQuantityTable"));
const MyGoalsDashboard = lazy(() => import("@/components/MyGoalsDashboard"));
const StrategicOverview = lazy(() => import("@/components/StrategicOverview"));
const OnlineUsersWidget = lazy(() => import("@/components/OnlineUsersWidget"));
const MonthlyTeamRankingChart = lazy(() => import("@/components/MonthlyTeamRankingChart").then(m => ({ default: m.MonthlyTeamRankingChart })));
const ConsolidatedTrendsPanel = lazy(() => import("@/components/ConsolidatedTrendsPanel"));
const MultiPeriodGoalTracker = lazy(() => import("@/components/MultiPeriodGoalTracker").then(m => ({ default: m.MultiPeriodGoalTracker })));
const MyPeriodGoalTracker = lazy(() => import("@/components/MyPeriodGoalTracker").then(m => ({ default: m.MyPeriodGoalTracker })));


// Mini loading component for lazy loaded content
const MiniLoader = memo(() => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
  </div>
));

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const Index = () => {
  const now = useMemo(() => new Date(), []);
  
  // Memoized date calculations
  const { endOfMonth, endOfSemester, endOfYear, daysRemainingMonth, daysRemainingSemester, daysRemainingYear } = useMemo(() => {
    const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const eos = now.getMonth() < 6 
      ? new Date(now.getFullYear(), 5, 30) 
      : new Date(now.getFullYear(), 11, 31);
    const eoy = new Date(now.getFullYear(), 11, 31);
    return {
      endOfMonth: eom,
      endOfSemester: eos,
      endOfYear: eoy,
      daysRemainingMonth: Math.ceil((eom.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      daysRemainingSemester: Math.ceil((eos.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      daysRemainingYear: Math.ceil((eoy.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }, [now]);

  const { role, profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => now.getFullYear());
  const [activeTab, setActiveTab] = useState("times");
  const [filterSeller, setFilterSeller] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [auxInfoOpen, setAuxInfoOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  
  const isCurrentPeriod = useMemo(() => 
    selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear(), 
    [selectedMonth, selectedYear, now]
  );

  const { teams, achievements, chartData, totalClinicRevenue, isLoading, lastUpdated, triggerCelebration } = useTeamScores(
    profile?.team_id,
    selectedMonth,
    selectedYear
  );
  const { teamsProgress, teamsQuantity } = useTeamProgressData(selectedMonth, selectedYear);
  const { pendingGoal } = usePredefinedGoals();

  // Memoized calculations
  const currentDay = useMemo(() => 
    isCurrentPeriod ? now.getDate() : new Date(selectedYear, selectedMonth, 0).getDate(),
    [isCurrentPeriod, now, selectedYear, selectedMonth]
  );
  const totalDaysInMonth = useMemo(() => 
    new Date(selectedYear, selectedMonth, 0).getDate(),
    [selectedYear, selectedMonth]
  );

  // Memoized team data
  const { team1, team2, pointsDifference } = useMemo(() => {
    const t1 = teams[0];
    const t2 = teams[1];
    return {
      team1: t1,
      team2: t2,
      pointsDifference: t1 && t2 ? Math.abs(t1.totalPoints - t2.totalPoints) : 0,
    };
  }, [teams]);

  // Memoized callbacks for filters
  const handleMonthChange = useCallback((v: string) => setSelectedMonth(Number(v)), []);
  const handleYearChange = useCallback((v: string) => setSelectedYear(Number(v)), []);
  const handleTabChange = useCallback((v: string) => setActiveTab(v), []);
  const handleCelebrate = useCallback(() => triggerCelebration("goal"), [triggerCelebration]);

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
        <Suspense fallback={null}>
          <GoalConfirmationDialog 
            goal={pendingGoal} 
            onClose={() => window.location.reload()} 
          />
        </Suspense>
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

            {/* Last Updated Indicator */}
            {lastUpdated && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Atualizado {format(lastUpdated, "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
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
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:max-w-6xl md:mx-auto md:grid-cols-8 gap-1 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="times" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Trophy className="w-4 h-4" />
                Times
              </TabsTrigger>
              <TabsTrigger 
                value="visao-geral" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Brain className="w-4 h-4" />
                Visão Geral
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
                Vendedores
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
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <User className="w-4 h-4" />
                Minhas Metas
              </TabsTrigger>
              <TabsTrigger 
                value="historico" 
                className="whitespace-nowrap text-sm px-3 py-2 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
          </TabsList>
          
          {/* Filters - shown for relevant tabs */}
          {(activeTab === "vendido-executado" || activeTab === "vendedoras" || activeTab === "departamentos" || activeTab === "o-que-falta") && (
            <Suspense fallback={<MiniLoader />}>
              <DashboardFilters
                selectedSeller={filterSeller}
                selectedDepartment={filterDepartment}
                onSellerFilterChange={setFilterSeller}
                onDepartmentFilterChange={setFilterDepartment}
              />
            </Suspense>
          )}
          </div>

          {/* VISÃO GERAL TAB - Strategic Executive Summary */}
          <TabsContent value="visao-geral" className="animate-fade-in">
            <Suspense fallback={<MiniLoader />}>
              <StrategicOverview month={selectedMonth} year={selectedYear} />
            </Suspense>
          </TabsContent>

          {/* MINHAS METAS TAB - Individual Performance */}
          <TabsContent value="minhas-metas" className="space-y-6 animate-fade-in">
            {/* Personal Period Goal Tracker - Only user's individual goals */}
            <Suspense fallback={<MiniLoader />}>
              <MyPeriodGoalTracker />
            </Suspense>
            
            <Suspense fallback={<MiniLoader />}>
              <MyGoalsDashboard />
            </Suspense>
          </TabsContent>

          {/* TIMES TAB - Team Rankings & General Stats - OPTIMIZED */}
          <TabsContent value="times" className="space-y-6 animate-fade-in">
            {/* Executive KPIs - Main Numbers */}
            <Suspense fallback={<MiniLoader />}>
              <ExecutiveKPIs month={selectedMonth} year={selectedYear} />
            </Suspense>

            {/* Multi-Period Goal Tracker - Daily/Weekly/Biweekly/Monthly Goals */}
            <Suspense fallback={<MiniLoader />}>
              <MultiPeriodGoalTracker />
            </Suspense>

            {/* Team Badges Display */}
            <div className="animate-scale-in">
              <Suspense fallback={<MiniLoader />}>
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
              </Suspense>
            </div>

            {/* Team Rankings */}
            {teams.length >= 2 ? (
              <Suspense fallback={<MiniLoader />}>
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
              </Suspense>
            ) : (
              <div className="text-center py-12 bg-gradient-card rounded-2xl border border-border">
                <p className="text-muted-foreground">
                  Nenhuma equipe cadastrada ainda.
                </p>
              </div>
            )}


            {/* Team Progress Table - Meta vs Vendido vs Esperado (R$) */}
            {teamsProgress.length > 0 && (
              <Suspense fallback={<MiniLoader />}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Progresso por Categoria (R$)
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Dia {currentDay} de {totalDaysInMonth}
                    </span>
                  </div>
                  <TeamProgressTable
                    teamsData={teamsProgress}
                    currentDay={currentDay}
                    totalDaysInMonth={totalDaysInMonth}
                  />
                </div>
              </Suspense>
            )}

            {/* Team Quantity Table - Meta vs Vendido vs Esperado (Qtd) */}
            {teamsQuantity.length > 0 && (
              <Suspense fallback={<MiniLoader />}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-secondary-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Progresso por Categoria (Quantidade)
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Procedimentos vendidos
                    </span>
                  </div>
                  <TeamQuantityTable
                    teamsData={teamsQuantity}
                    currentDay={currentDay}
                    totalDaysInMonth={totalDaysInMonth}
                  />
                </div>
              </Suspense>
            )}

            {/* Team Members Overview */}
            <Suspense fallback={<MiniLoader />}>
              <TeamMembersOverview month={selectedMonth} year={selectedYear} />
            </Suspense>

            {/* Quick Insights */}
            <Suspense fallback={<MiniLoader />}>
              <QuickInsightsPanel month={selectedMonth} year={selectedYear} />
            </Suspense>

            {/* Auxiliary Information - Collapsible */}
            <Collapsible open={auxInfoOpen} onOpenChange={setAuxInfoOpen}>
              <Card className="bg-muted/30 border-border">
                <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Contadores e Usuários Online</span>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                      {daysRemainingMonth}d restantes
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${auxInfoOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 space-y-4">
                  <Suspense fallback={<MiniLoader />}>
                    <OnlineUsersWidget />
                    <TimeCounters
                      daysRemainingMonth={daysRemainingMonth}
                      daysRemainingSemester={daysRemainingSemester > 0 ? daysRemainingSemester : 0}
                      daysRemainingYear={daysRemainingYear}
                    />
                  </Suspense>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Achievements, Champions & Prizes - Collapsible Section */}
            <Collapsible open={achievementsOpen} onOpenChange={setAchievementsOpen}>
              <Card className="bg-gradient-to-br from-primary/5 to-amber-500/5 border-primary/20">
                <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
                  <div className="flex items-center gap-2 text-foreground">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Conquistas, Campeões e Prêmios</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Histórico
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${achievementsOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 space-y-6">
                  {/* Champions & Streak Records */}
                  <Suspense fallback={<MiniLoader />}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ChampionsDisplay />
                      <StreakRecordsDisplay />
                    </div>
                  </Suspense>

                  {/* Team Prizes */}
                  <Suspense fallback={<MiniLoader />}>
                    <TeamPrizesDisplay />
                  </Suspense>

                  {/* Achievements & Badges System */}
                  <Suspense fallback={<MiniLoader />}>
                    <AchievementsBadgesDisplay showAll month={selectedMonth} year={selectedYear} />
                  </Suspense>

                  {/* Recent Achievements */}
                  {achievements.length > 0 && (
                    <Suspense fallback={<MiniLoader />}>
                      <RecentAchievements achievements={achievements} />
                    </Suspense>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Team Quality Comparison - Indicadores de Qualidade (Compacto) */}
            <Suspense fallback={<MiniLoader />}>
              <TeamQualityComparisonCard />
            </Suspense>
          </TabsContent>

          {/* O QUE FALTA TAB - Department Goal Cards with Pace Analysis */}
          <TabsContent value="o-que-falta" className="space-y-6 animate-fade-in">
            <Suspense fallback={<MiniLoader />}>
              <DepartmentGoalCards 
                month={selectedMonth} 
                year={selectedYear} 
                filterDepartment={filterDepartment}
              />
            </Suspense>
            
            <Suspense fallback={<MiniLoader />}>
              <GoalTrackingDashboard month={selectedMonth} year={selectedYear} />
            </Suspense>
          </TabsContent>

          {/* VENDIDO VS EXECUTADO TAB - OPTIMIZED: Consolidated Trends Panel */}
          <TabsContent value="vendido-executado" className="space-y-6 animate-fade-in">
            <Suspense fallback={<MiniLoader />}>
              <SoldVsExecutedPanel 
                month={selectedMonth} 
                year={selectedYear} 
                filterSeller={filterSeller}
                filterDepartment={filterDepartment}
              />
            </Suspense>
            
            {/* Consolidated Trends Panel - Replaces MonthComparisonPanel + HistoricalTrendsPanel */}
            <Suspense fallback={<MiniLoader />}>
              <ConsolidatedTrendsPanel 
                currentMonth={selectedMonth} 
                currentYear={selectedYear} 
              />
            </Suspense>
            
            <Suspense fallback={<MiniLoader />}>
              <GoalAchievementSummary month={selectedMonth} year={selectedYear} />
            </Suspense>
          </TabsContent>

          {/* POR VENDEDORA TAB */}
          <TabsContent value="vendedoras" className="space-y-8 animate-fade-in">
            <Suspense fallback={<MiniLoader />}>
              <SellerDashboard 
                month={selectedMonth} 
                year={selectedYear} 
                filterSeller={filterSeller}
                filterDepartment={filterDepartment}
              />
            </Suspense>
          </TabsContent>

          {/* POR DEPARTAMENTO TAB */}
          <TabsContent value="departamentos" className="space-y-8 animate-fade-in">
            <Suspense fallback={<MiniLoader />}>
              <DepartmentGoalsCard 
                month={selectedMonth} 
                year={selectedYear} 
                filterDepartment={filterDepartment}
              />
            </Suspense>
          </TabsContent>

          {/* HISTÓRICO TAB - ENRICHED with MonthlyTeamRankingChart and EvolutionChart */}
          <TabsContent value="historico" className="space-y-6 animate-fade-in">
            {/* Monthly Team Ranking Chart - Moved from Times */}
            <Suspense fallback={<MiniLoader />}>
              <MonthlyTeamRankingChart />
            </Suspense>

            {/* Evolution Chart - Moved from Times */}
            <Suspense fallback={<MiniLoader />}>
              <EvolutionChart
                data={chartData}
                team1Name={team1?.name || "Lioness Team"}
                team2Name={team2?.name || "Tróia Team"}
              />
            </Suspense>

            {/* Historical Comparison - Full component */}
            <Suspense fallback={<MiniLoader />}>
              <HistoricalComparison />
            </Suspense>
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
