import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Award, Users, Zap, AlertCircle, FileEdit, Target, RefreshCw, Trophy } from "lucide-react";
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
import FeegowSync from "@/components/admin/FeegowSync";
import PrizeForm from "@/components/admin/PrizeForm";

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
        <Tabs defaultValue="cards" className="max-w-4xl mx-auto">
          <TabsList className="grid grid-cols-9 h-auto bg-secondary/50 p-1 rounded-xl mb-8">
            <TabsTrigger
              value="cards"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Award className="w-5 h-5" />
              <span className="hidden sm:block">Cartões</span>
            </TabsTrigger>
            <TabsTrigger
              value="prizes"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Trophy className="w-5 h-5" />
              <span className="hidden sm:block">Prêmios</span>
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Zap className="w-5 h-5" />
              <span className="hidden sm:block">Eventos</span>
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <FileEdit className="w-5 h-5" />
              <span className="hidden sm:block">Registros</span>
            </TabsTrigger>
            <TabsTrigger
              value="goals"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Target className="w-5 h-5" />
              <span className="hidden sm:block">Metas</span>
            </TabsTrigger>
            <TabsTrigger
              value="feegow"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="hidden sm:block">FEEGOW</span>
            </TabsTrigger>
            <TabsTrigger
              value="contestations"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="hidden sm:block">Contestações</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Shield className="w-5 h-5" />
              <span className="hidden sm:block">Histórico</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:block">Usuários</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="animate-scale-in">
            <CardForm />
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

          <TabsContent value="goals" className="animate-scale-in">
            <GoalNotifications />
          </TabsContent>

          <TabsContent value="feegow" className="animate-scale-in">
            <FeegowSync />
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
