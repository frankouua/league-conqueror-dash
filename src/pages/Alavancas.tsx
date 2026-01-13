import { useState } from "react";
import { 
  Megaphone, UserPlus, Target, ShieldAlert,
  TrendingUp, ChevronLeft, ChevronRight, Users, Package, Dna
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Lazy load the content components
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const CampaignsContent = lazy(() => import("@/pages/Campaigns").then(m => ({ default: m.default })));
const ReferralLeadsContent = lazy(() => import("@/pages/ReferralLeads").then(m => ({ default: m.default })));
const RFVDashboardContent = lazy(() => import("@/pages/RFVDashboard").then(m => ({ default: m.default })));
const CancellationsContent = lazy(() => import("@/pages/Cancellations").then(m => ({ default: m.default })));
const ClientListContent = lazy(() => import("@/components/clients/ClientListDashboard").then(m => ({ default: m.default })));
const ProceduresContent = lazy(() => import("@/components/procedures/ProceduresList").then(m => ({ default: m.default })));
const ProtocolsContent = lazy(() => import("@/components/protocols/ProtocolsJourneyManager").then(m => ({ default: m.default })));

const MiniLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

type TabKey = "clientes" | "campanhas" | "procedimentos" | "protocolos" | "indicacoes" | "rfv" | "cancelamentos";

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const navItems: NavItem[] = [
  { key: "clientes", label: "Lista de Clientes", icon: Users, description: "Visão unificada com distribuição", color: "text-primary" },
  { key: "campanhas", label: "Campanhas", icon: Megaphone, description: "Promoções e ações de vendas", color: "text-purple-500" },
  { key: "procedimentos", label: "Procedimentos", icon: Package, description: "Lista de serviços individuais", color: "text-amber-500" },
  { key: "protocolos", label: "Protocolos", icon: Dna, description: "Jornada do cliente", color: "text-cyan-500" },
  { key: "indicacoes", label: "Indicações", icon: UserPlus, description: "Leads de clientes indicados", color: "text-green-500" },
  { key: "rfv", label: "Clientes RFV", icon: Target, description: "Análise de recência, frequência e valor", color: "text-blue-500" },
  { key: "cancelamentos", label: "Cancelamentos", icon: ShieldAlert, description: "Gestão e retenção", color: "text-orange-500" },
];

const Alavancas = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("clientes");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { profile } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case "clientes":
        return (
          <Suspense fallback={<MiniLoader />}>
            <ClientListContent />
          </Suspense>
        );
      case "campanhas":
        return (
          <Suspense fallback={<MiniLoader />}>
            <CampaignsContent />
          </Suspense>
        );
      case "procedimentos":
        return (
          <Suspense fallback={<MiniLoader />}>
            <ProceduresContent />
          </Suspense>
        );
      case "protocolos":
        return (
          <Suspense fallback={<MiniLoader />}>
            <ProtocolsContent />
          </Suspense>
        );
      case "indicacoes":
        return (
          <Suspense fallback={<MiniLoader />}>
            <ReferralLeadsContent />
          </Suspense>
        );
      case "rfv":
        return (
          <Suspense fallback={<MiniLoader />}>
            <RFVDashboardContent />
          </Suspense>
        );
      case "cancelamentos":
        return (
          <Suspense fallback={<MiniLoader />}>
            <CancellationsContent />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const activeItem = navItems.find(item => item.key === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex">
        {/* Sidebar */}
        <aside 
          className={cn(
            "sticky top-[73px] h-[calc(100vh-73px)] border-r border-border bg-card/50 transition-all duration-300",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className={cn(
              "p-4 border-b border-border flex items-center",
              sidebarCollapsed ? "justify-center" : "justify-between"
            )}>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Alavancas
                  </h2>
                  <p className="text-xs text-muted-foreground">Estratégias de crescimento</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                
                return (
                  <Button
                    key={item.key}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-auto py-3 px-3 transition-all",
                      isActive 
                        ? "bg-primary/10 text-primary border-l-2 border-primary rounded-l-none" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                    onClick={() => setActiveTab(item.key)}
                  >
                    <Icon className={cn(
                      "h-5 w-5 shrink-0", 
                      isActive ? "text-primary" : item.color
                    )} />
                    {!sidebarCollapsed && (
                      <div className="flex flex-col items-start">
                        <span className={cn("font-medium", isActive && "text-primary")}>{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    )}
                  </Button>
                );
              })}
            </nav>

            {/* Stats Footer */}
            {!sidebarCollapsed && (
              <div className="p-4 border-t border-border">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-primary">7</p>
                    <p className="text-[10px] text-muted-foreground">Alavancas</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-green-500">↑</p>
                    <p className="text-[10px] text-muted-foreground">Crescimento</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-73px)]">
          {/* Content Header */}
          <div className="sticky top-[73px] z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              {activeItem && (
                <>
                  <div className={cn("p-2 rounded-lg bg-primary/10")}>
                    <activeItem.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{activeItem.label}</h1>
                    <p className="text-sm text-muted-foreground">{activeItem.description}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Page Content */}
          <div className="animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Alavancas;
