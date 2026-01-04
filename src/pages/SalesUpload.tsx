import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import SalesSpreadsheetUpload from "@/components/admin/SalesSpreadsheetUpload";

const SalesUpload = () => {
  const { user, isLoading } = useAuth();
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-sm font-medium">Importação de Vendas</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gradient-gold mb-2">
            Upload de Planilha
          </h1>
          <p className="text-muted-foreground">
            Importe suas vendas diretamente do Feegow para o sistema
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          <SalesSpreadsheetUpload />
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

export default SalesUpload;
