import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Award, Users, Zap, AlertCircle, FileEdit, Target, Trophy, Megaphone, FileSpreadsheet, Calendar, Brain } from "lucide-react";
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
import { AnalyticsAI } from "@/components/admin/AnalyticsAI";

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
        <Tabs defaultValue="cards" className="max-w-5xl mx-auto">
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-8">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-12 h-auto bg-secondary/50 p-1 rounded-xl gap-1">
              <TabsTrigger
                value="cards"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Award className="w-4 h-4" />
                <span className="text-[10px]">Cartões</span>
              </TabsTrigger>
              <TabsTrigger
                value="announcements"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Megaphone className="w-4 h-4" />
                <span className="text-[10px]">Avisos</span>
              </TabsTrigger>
              <TabsTrigger
                value="campaigns"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Calendar className="w-4 h-4" />
                <span className="text-[10px]">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger
                value="prizes"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Trophy className="w-4 h-4" />
                <span className="text-[10px]">Prêmios</span>
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Zap className="w-4 h-4" />
                <span className="text-[10px]">Eventos</span>
              </TabsTrigger>
              <TabsTrigger
                value="records"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <FileEdit className="w-4 h-4" />
                <span className="text-[10px]">Registros</span>
              </TabsTrigger>
              <TabsTrigger
                value="sales-upload"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-[10px]">Vendas</span>
              </TabsTrigger>
              <TabsTrigger
                value="goals"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Target className="w-4 h-4" />
                <span className="text-[10px]">Metas</span>
              </TabsTrigger>
              <TabsTrigger
                value="contestations"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px]">Contest.</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Shield className="w-4 h-4" />
                <span className="text-[10px]">Histórico</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Users className="w-4 h-4" />
                <span className="text-[10px]">Usuários</span>
              </TabsTrigger>
              <TabsTrigger
                value="analytics-ai"
                className="flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg"
              >
                <Brain className="w-4 h-4" />
                <span className="text-[10px]">AI</span>
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

          <TabsContent value="analytics-ai" className="animate-scale-in">
            <AnalyticsAI />
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
