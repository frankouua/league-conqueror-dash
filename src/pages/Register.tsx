import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Users, Star, ThumbsUp, Heart, XCircle, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RevenueForm from "@/components/forms/RevenueForm";
import ReferralForm from "@/components/forms/ReferralForm";
import TestimonialForm from "@/components/forms/TestimonialForm";
import NPSForm from "@/components/forms/NPSForm";
import OtherIndicatorsForm from "@/components/forms/OtherIndicatorsForm";
import CancellationForm from "@/components/forms/CancellationForm";
import ContestationForm from "@/components/contestation/ContestationForm";
import ContestationList from "@/components/contestation/ContestationList";

const Register = () => {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleContestationSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-black text-gradient-gold mb-2">
            Registrar Dados
          </h1>
          <p className="text-muted-foreground">
            Registre resultados e conteste pontuações
          </p>
        </div>

        <Tabs defaultValue="revenue" className="max-w-4xl mx-auto">
          {/* Mobile: scrollable horizontal tabs */}
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-6 sm:mb-8">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-7 h-auto bg-secondary/50 p-1 rounded-xl gap-1">
              <TabsTrigger value="revenue" className="flex flex-col items-center gap-1 py-2 sm:py-3 px-3 sm:px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs">Fat.</span>
              </TabsTrigger>
              <TabsTrigger value="referrals" className="flex flex-col items-center gap-1 py-2 sm:py-3 px-3 sm:px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs">Ind.</span>
              </TabsTrigger>
              <TabsTrigger value="testimonials" className="flex flex-col items-center gap-1 py-2 sm:py-3 px-3 sm:px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap">
                <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs">Dep.</span>
              </TabsTrigger>
              <TabsTrigger value="nps" className="flex flex-col items-center gap-1 py-2 sm:py-3 px-3 sm:px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap">
                <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs">NPS</span>
              </TabsTrigger>
              <TabsTrigger value="other" className="flex flex-col items-center gap-1 py-2 sm:py-3 px-3 sm:px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs">Outros</span>
              </TabsTrigger>
              <TabsTrigger value="cancellation" className="flex flex-col items-center gap-1 py-2 sm:py-3 px-3 sm:px-4 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground rounded-lg whitespace-nowrap">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs">Cancel.</span>
              </TabsTrigger>
              <TabsTrigger value="contestation" className="flex flex-col items-center gap-1 py-2 sm:py-3 px-3 sm:px-4 data-[state=active]:bg-warning data-[state=active]:text-warning-foreground rounded-lg whitespace-nowrap">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs">Contest.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="revenue" className="animate-scale-in"><RevenueForm /></TabsContent>
          <TabsContent value="referrals" className="animate-scale-in"><ReferralForm /></TabsContent>
          <TabsContent value="testimonials" className="animate-scale-in"><TestimonialForm /></TabsContent>
          <TabsContent value="nps" className="animate-scale-in"><NPSForm /></TabsContent>
          <TabsContent value="other" className="animate-scale-in"><OtherIndicatorsForm /></TabsContent>
          <TabsContent value="cancellation" className="animate-scale-in"><CancellationForm /></TabsContent>
          <TabsContent value="contestation" className="animate-scale-in">
            <div className="grid gap-6 lg:grid-cols-2">
              <ContestationForm onSuccess={handleContestationSuccess} />
              <ContestationList refresh={refreshKey} />
            </div>
          </TabsContent>
        </Tabs>

        <footer className="mt-16 pb-8 text-center">
          <p className="text-muted-foreground text-sm">© 2026 Unique CPI • Copa Unique League</p>
        </footer>
      </main>
    </div>
  );
};

export default Register;
