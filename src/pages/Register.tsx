import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Star, ThumbsUp, Heart, XCircle, AlertCircle, FileSpreadsheet, PenLine, Upload, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RevenueForm from "@/components/forms/RevenueForm";
import TestimonialForm from "@/components/forms/TestimonialForm";
import NPSForm from "@/components/forms/NPSForm";
import OtherIndicatorsForm from "@/components/forms/OtherIndicatorsForm";
import CancellationForm from "@/components/forms/CancellationForm";
import ContestationForm from "@/components/contestation/ContestationForm";
import ContestationList from "@/components/contestation/ContestationList";
import SalesSpreadsheetUpload from "@/components/admin/SalesSpreadsheetUpload";
import uniqueLogo from "@/assets/logo-unique-cpa.png";

type RevenueMode = 'select' | 'upload-vendas' | 'upload-executado' | 'manual';

const Register = () => {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [revenueMode, setRevenueMode] = useState<RevenueMode>('select');

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

  const RevenueModeSelector = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground mb-2">Como deseja registrar?</h3>
        <p className="text-muted-foreground text-sm">Escolha entre upload de planilha ou registro manual</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upload Vendas */}
        <Card 
          className="cursor-pointer border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
          onClick={() => setRevenueMode('upload-vendas')}
        >
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-gold-shine flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg">Upload Vendas</CardTitle>
            <CardDescription className="text-xs">Planilha de Competência</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Importe dados de vendas do Feegow
            </p>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Upload className="w-4 h-4" />
              Selecionar
            </Button>
          </CardContent>
        </Card>

        {/* Upload Execução */}
        <Card 
          className="cursor-pointer border-2 border-border hover:border-success/50 hover:bg-success/5 transition-all group"
          onClick={() => setRevenueMode('upload-executado')}
        >
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-success flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="w-8 h-8 text-success-foreground" />
            </div>
            <CardTitle className="text-lg">Upload Execução</CardTitle>
            <CardDescription className="text-xs">Planilha de Executados</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Importe dados de procedimentos realizados
            </p>
            <Button variant="outline" size="sm" className="w-full gap-2 border-success/50 text-success hover:bg-success/10">
              <Upload className="w-4 h-4" />
              Selecionar
            </Button>
          </CardContent>
        </Card>

        {/* Registro Manual */}
        <Card 
          className="cursor-pointer border-2 border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
          onClick={() => setRevenueMode('manual')}
        >
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PenLine className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-lg">Registro Manual</CardTitle>
            <CardDescription className="text-xs">Inserir dados manualmente</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Registre vendas individuais uma a uma
            </p>
            <Button variant="outline" size="sm" className="w-full gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
              <PenLine className="w-4 h-4" />
              Registrar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const RevenueContent = () => {
    if (revenueMode === 'select') {
      return <RevenueModeSelector />;
    }

    return (
      <div className="space-y-4">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setRevenueMode('select')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          ← Voltar para opções
        </Button>

        {/* Content based on mode */}
        {revenueMode === 'upload-vendas' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-gradient-gold">Upload Planilha de Vendas</h3>
            </div>
            <SalesSpreadsheetUpload defaultUploadType="vendas" />
          </div>
        )}

        {revenueMode === 'upload-executado' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-success" />
              <h3 className="text-lg font-bold text-success">Upload Planilha de Execução</h3>
            </div>
            <SalesSpreadsheetUpload defaultUploadType="executado" />
          </div>
        )}

        {revenueMode === 'manual' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PenLine className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-amber-600">Registro Manual</h3>
            </div>
            <RevenueForm />
          </div>
        )}
      </div>
    );
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

        <Tabs defaultValue="revenue" className="max-w-5xl mx-auto">
          {/* Mobile: scrollable horizontal tabs */}
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-6 sm:mb-8">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-6 h-auto bg-secondary/50 p-1 rounded-xl gap-1">
              <TabsTrigger value="revenue" className="flex flex-col items-center gap-1 py-2 sm:py-3 px-3 sm:px-4 data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg whitespace-nowrap">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs">Fat.</span>
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

          <TabsContent value="revenue" className="animate-scale-in"><RevenueContent /></TabsContent>
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

        <footer className="mt-16 pb-8">
          <div className="flex flex-col items-center gap-4">
            <img 
              src={uniqueLogo} 
              alt="Unique Cirurgia Plástica Avançada" 
              className="h-10 w-auto object-contain"
            />
            <p className="text-muted-foreground text-sm">© 2026 Unique CPI • Copa Unique League</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Register;
