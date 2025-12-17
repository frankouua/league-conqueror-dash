import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import ContestationForm from "@/components/contestation/ContestationForm";
import ContestationList from "@/components/contestation/ContestationList";

const Contestation = () => {
  const { user, isLoading } = useAuth();
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

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 text-warning mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Sistema de Contestação</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gradient-gold mb-2">
            Contestações
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Conteste pontuações ou decisões em até 48 horas após o registro original.
            Todas as contestações serão analisadas pela coordenação.
          </p>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto grid gap-6 lg:grid-cols-2">
          <div className="animate-scale-in">
            <ContestationForm onSuccess={handleSuccess} />
          </div>
          <div className="animate-scale-in" style={{ animationDelay: "100ms" }}>
            <ContestationList refresh={refreshKey} />
          </div>
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

export default Contestation;
