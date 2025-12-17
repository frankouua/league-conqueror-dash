import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Users, Star, ThumbsUp, Heart, XCircle } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RevenueForm from "@/components/forms/RevenueForm";
import ReferralForm from "@/components/forms/ReferralForm";
import TestimonialForm from "@/components/forms/TestimonialForm";
import NPSForm from "@/components/forms/NPSForm";
import OtherIndicatorsForm from "@/components/forms/OtherIndicatorsForm";
import CancellationForm from "@/components/forms/CancellationForm";

const Register = () => {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-black text-gradient-gold mb-2">
            Registrar Dados
          </h1>
          <p className="text-muted-foreground">
            Registre os resultados da sua equipe e ganhe pontos
          </p>
          {profile?.team_id && (
            <p className="text-primary font-medium mt-2">
              Registrando para sua equipe
            </p>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="revenue" className="max-w-2xl mx-auto">
          <TabsList className="grid grid-cols-6 h-auto bg-secondary/50 p-1 rounded-xl mb-8">
            <TabsTrigger
              value="revenue"
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-xs hidden sm:block">Faturamento</span>
            </TabsTrigger>
            <TabsTrigger
              value="referrals"
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Users className="w-5 h-5" />
              <span className="text-xs hidden sm:block">Indicações</span>
            </TabsTrigger>
            <TabsTrigger
              value="testimonials"
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Star className="w-5 h-5" />
              <span className="text-xs hidden sm:block">Depoimentos</span>
            </TabsTrigger>
            <TabsTrigger
              value="nps"
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <ThumbsUp className="w-5 h-5" />
              <span className="text-xs hidden sm:block">NPS</span>
            </TabsTrigger>
            <TabsTrigger
              value="other"
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg"
            >
              <Heart className="w-5 h-5" />
              <span className="text-xs hidden sm:block">Outros</span>
            </TabsTrigger>
            <TabsTrigger
              value="cancellation"
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground rounded-lg"
            >
              <XCircle className="w-5 h-5" />
              <span className="text-xs hidden sm:block">Cancelamento</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="animate-scale-in">
            <RevenueForm />
          </TabsContent>

          <TabsContent value="referrals" className="animate-scale-in">
            <ReferralForm />
          </TabsContent>

          <TabsContent value="testimonials" className="animate-scale-in">
            <TestimonialForm />
          </TabsContent>

          <TabsContent value="nps" className="animate-scale-in">
            <NPSForm />
          </TabsContent>

          <TabsContent value="other" className="animate-scale-in">
            <OtherIndicatorsForm />
          </TabsContent>

          <TabsContent value="cancellation" className="animate-scale-in">
            <CancellationForm />
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

export default Register;
