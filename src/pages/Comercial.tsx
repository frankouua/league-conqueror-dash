import { useState } from "react";
import { 
  Target, GraduationCap, MessageSquareText, BookOpen, Bot, 
  LayoutDashboard, ChevronLeft, ChevronRight
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getPositionLabel } from "@/constants/sellerPositions";

// Lazy load the content components
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const MyGoalsDashboard = lazy(() => import("@/components/MyGoalsDashboard"));
const OnboardingGoalsContent = lazy(() => import("@/pages/OnboardingGoals").then(m => ({ default: m.default })));
const TrainingAcademy = lazy(() => import("@/components/training/TrainingAcademy"));
const CommercialGuidesContent = lazy(() => import("@/pages/CommercialGuides").then(m => ({ default: m.default })));
const GuidesContent = lazy(() => import("@/pages/Guides").then(m => ({ default: m.default })));
const CommercialAssistantPageContent = lazy(() => import("@/pages/CommercialAssistantPage").then(m => ({ default: m.default })));

const MiniLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

type TabKey = "painel" | "metas" | "treinamento" | "scripts" | "guias" | "ia-coach";

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  { key: "painel", label: "Painel", icon: LayoutDashboard, description: "Visão geral do vendedor" },
  { key: "metas", label: "Metas", icon: Target, description: "Objetivos e acompanhamento" },
  { key: "treinamento", label: "Treinamento", icon: GraduationCap, description: "Materiais, quizzes, simulações" },
  { key: "scripts", label: "Scripts", icon: MessageSquareText, description: "Scripts de atendimento" },
  { key: "guias", label: "Guias", icon: BookOpen, description: "Manuais e documentação" },
  { key: "ia-coach", label: "IA Coach", icon: Bot, description: "Assistente inteligente" },
];

const Comercial = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("painel");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { profile } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case "painel":
        return (
          <Suspense fallback={<MiniLoader />}>
            <MyGoalsDashboard />
          </Suspense>
        );
      case "metas":
        return (
          <Suspense fallback={<MiniLoader />}>
            <div className="p-6">
              <OnboardingGoalsContent />
            </div>
          </Suspense>
        );
      case "treinamento":
        return (
          <Suspense fallback={<MiniLoader />}>
            <div className="p-6">
              <TrainingAcademy />
            </div>
          </Suspense>
        );
      case "scripts":
        return (
          <Suspense fallback={<MiniLoader />}>
            <CommercialGuidesContent />
          </Suspense>
        );
      case "guias":
        return (
          <Suspense fallback={<MiniLoader />}>
            <GuidesContent />
          </Suspense>
        );
      case "ia-coach":
        return (
          <Suspense fallback={<MiniLoader />}>
            <CommercialAssistantPageContent />
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
                  <h2 className="font-bold text-lg text-foreground">Comercial</h2>
                  <p className="text-xs text-muted-foreground">Central do vendedor</p>
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
                    <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
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

            {/* User Info Footer */}
            {!sidebarCollapsed && profile && (
              <div className="p-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground truncate">{profile.full_name}</p>
                  <p className="truncate">{getPositionLabel(profile.position)}</p>
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
                  <activeItem.icon className="h-6 w-6 text-primary" />
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

export default Comercial;
