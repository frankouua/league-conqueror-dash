import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Award, Users, Zap, AlertCircle, FileEdit, Target, Trophy, Megaphone, FileSpreadsheet, Calendar, Brain, Database, Lock } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CardForm from "@/components/admin/CardForm";
import CardHistory from "@/components/admin/CardHistory";
import UserManagement from "@/components/admin/UserManagement";
import SpecialEventsForm from "@/components/admin/SpecialEventsForm";
import SpecialEventsHistory from "@/components/admin/SpecialEventsHistory";
import ContestationAdmin from "@/components/admin/ContestationAdmin";
import RecordsEditor from "@/components/admin/RecordsEditor";
import GoalNotifications from "@/components/admin/GoalNotifications";
import PrizeForm from "@/components/admin/PrizeForm";
import AnnouncementsManager from "@/components/admin/AnnouncementsManager";
import CampaignsManager from "@/components/admin/CampaignsManager";
import SalesSpreadsheetUpload from "@/components/admin/SalesSpreadsheetUpload";
import ComprehensiveDataImport from "@/components/admin/ComprehensiveDataImport";
import { AnalyticsAI } from "@/components/admin/AnalyticsAI";
import PeriodLockManager from "@/components/admin/PeriodLockManager";

const Admin = () => {
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate("/auth");
      } else if (role !== "admin") {
        navigate("/");
      }
    }
  }, [user, role, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Área do Coordenador</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gradient-gold mb-2">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Gerencie cartões, usuários e acompanhe a competição
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cards" className="max-w-6xl mx-auto">
          <div className="w-full overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 mb-6">
            <TabsList className="flex flex-wrap justify-center gap-2 h-auto bg-secondary/30 p-3 rounded-2xl min-w-max">
              <TabsTrigger
                value="cards"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <Award className="w-4 h-4" />
                <span className="text-xs font-medium">Cartões</span>
              </TabsTrigger>
              <TabsTrigger
                value="announcements"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <Megaphone className="w-4 h-4" />
                <span className="text-xs font-medium">Avisos</span>
              </TabsTrigger>
              <TabsTrigger
                value="campaigns"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger
                value="prizes"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-medium">Prêmios</span>
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">Eventos</span>
              </TabsTrigger>
              <TabsTrigger
                value="records"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <FileEdit className="w-4 h-4" />
                <span className="text-xs font-medium">Registros</span>
              </TabsTrigger>
              <TabsTrigger
                value="sales-upload"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-xs font-medium">Vendas</span>
              </TabsTrigger>
              <TabsTrigger
                value="goals"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">Metas</span>
              </TabsTrigger>
              <TabsTrigger
                value="contestations"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Contestações</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium">Histórico</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap"
              >
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Usuários</span>
              </TabsTrigger>
              <TabsTrigger
                value="data-import"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg whitespace-nowrap"
              >
                <Database className="w-4 h-4" />
                <span className="text-xs font-medium">Dados</span>
              </TabsTrigger>
              <TabsTrigger
                value="analytics-ai"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg whitespace-nowrap"
              >
                <Brain className="w-4 h-4" />
                <span className="text-xs font-medium">AI Analytics</span>
              </TabsTrigger>
              <TabsTrigger
                value="period-locks"
                className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-lg whitespace-nowrap"
              >
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">Travamento</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cards" className="animate-scale-in">
            <CardForm />
          </TabsContent>

          <TabsContent value="announcements" className="animate-scale-in">
            <AnnouncementsManager />
          </TabsContent>

          <TabsContent value="campaigns" className="animate-scale-in">
            <CampaignsManager />
          </TabsContent>

          <TabsContent value="prizes" className="animate-scale-in">
            <PrizeForm />
          </TabsContent>

          <TabsContent value="events" className="animate-scale-in">
            <div className="grid gap-6 lg:grid-cols-2">
              <SpecialEventsForm />
              <SpecialEventsHistory />
            </div>
          </TabsContent>

          <TabsContent value="records" className="animate-scale-in">
            <RecordsEditor />
          </TabsContent>

          <TabsContent value="sales-upload" className="animate-scale-in">
            <SalesSpreadsheetUpload />
          </TabsContent>

          <TabsContent value="goals" className="animate-scale-in">
            <GoalNotifications />
          </TabsContent>

          <TabsContent value="contestations" className="animate-scale-in">
            <ContestationAdmin />
          </TabsContent>

          <TabsContent value="history" className="animate-scale-in">
            <CardHistory />
          </TabsContent>

          <TabsContent value="users" className="animate-scale-in">
            <UserManagement />
          </TabsContent>

          <TabsContent value="data-import" className="animate-scale-in">
            <ComprehensiveDataImport />
          </TabsContent>

          <TabsContent value="analytics-ai" className="animate-scale-in">
            <AnalyticsAI />
          </TabsContent>

          <TabsContent value="period-locks" className="animate-scale-in">
            <PeriodLockManager />
          </TabsContent>
        </Tabs>

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

export default Admin;
