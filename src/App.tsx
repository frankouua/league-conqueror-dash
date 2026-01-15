import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CommercialAssistant } from "@/components/CommercialAssistant";
import { AnalyticsAIFloating } from "@/components/AnalyticsAIFloating";
import { FeatureOnboardingDialog } from "@/components/onboarding/FeatureOnboardingDialog";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load non-critical pages for faster initial load
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Admin = lazy(() => import("./pages/Admin"));
const DataReports = lazy(() => import("./pages/DataReports"));
const Guides = lazy(() => import("./pages/wrappers/GuidesPage"));
const ReferralLeads = lazy(() => import("./pages/wrappers/ReferralLeadsPage"));
const Campaigns = lazy(() => import("./pages/wrappers/CampaignsPage"));
const OnboardingGoals = lazy(() => import("./pages/wrappers/OnboardingGoalsPage"));
const SalesDashboard = lazy(() => import("./pages/SalesDashboard"));
const HistoricalUpload = lazy(() => import("./pages/HistoricalUpload"));
const AnalyzePersona = lazy(() => import("./pages/AnalyzePersona"));
const RFVDashboard = lazy(() => import("./pages/wrappers/RFVDashboardPage"));
const TVDisplay = lazy(() => import("./pages/TVDisplay"));
const CommercialGuides = lazy(() => import("./pages/CommercialGuides"));
const Cancellations = lazy(() => import("./pages/wrappers/CancellationsPage"));
const CommercialAssistantPage = lazy(() => import("./pages/wrappers/CommercialAssistantPageWrapper"));
const CRM = lazy(() => import("./pages/CRM"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PatientForm = lazy(() => import("./pages/PatientForm"));
// New hub pages
const Comercial = lazy(() => import("./pages/Comercial"));
const Alavancas = lazy(() => import("./pages/Alavancas"));
const Calendario = lazy(() => import("./pages/Calendario"));
const ProposalAnalytics = lazy(() => import("./pages/ProposalAnalytics"));

// Optimized QueryClient with balanced caching for performance and freshness
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - data considered fresh
      gcTime: 1000 * 60 * 10,   // 10 minutes - cache retention
      refetchOnWindowFocus: true, // Refetch on tab focus for fresh data
      refetchOnMount: 'always',   // Always check if data is stale on mount
      refetchOnReconnect: true, // Refetch when connection restored
      retry: 2,                 // Allow 2 retries for reliability
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
  </div>
);

// Floating assistants component that checks role
const FloatingAssistants = () => {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';
  
  return (
    <>
      {/* Feature Onboarding - shows once for new features */}
      {user && <FeatureOnboardingDialog />}
      
      {/* Commercial Assistant - visible for all logged in users */}
      {user && <CommercialAssistant />}
      
      {/* Analytics AI - visible only for admins/coordinators */}
      {isAdmin && <AnalyticsAIFloating />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
              {/* New Hub Pages */}
              <Route path="/comercial" element={<ProtectedRoute><Comercial /></ProtectedRoute>} />
              <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
              <Route path="/alavancas" element={<ProtectedRoute><Alavancas /></ProtectedRoute>} />
              {/* Legacy routes - redirect or keep for direct access */}
              <Route path="/onboarding-goals" element={<ProtectedRoute><OnboardingGoals /></ProtectedRoute>} />
              <Route path="/data-reports" element={<ProtectedRoute><DataReports /></ProtectedRoute>} />
              <Route path="/guides" element={<ProtectedRoute><Guides /></ProtectedRoute>} />
              <Route path="/referral-leads" element={<ProtectedRoute><ReferralLeads /></ProtectedRoute>} />
              <Route path="/campanhas" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/guias-comerciais" element={<ProtectedRoute><CommercialGuides /></ProtectedRoute>} />
              <Route path="/cancellations" element={<ProtectedRoute><Cancellations /></ProtectedRoute>} />
              <Route path="/assistente-comercial" element={<ProtectedRoute><CommercialAssistantPage /></ProtectedRoute>} />
              <Route path="/rfv" element={<ProtectedRoute><RFVDashboard /></ProtectedRoute>} />
              <Route path="/analise-propostas" element={<ProtectedRoute><ProposalAnalytics /></ProtectedRoute>} />
              <Route path="/historical-upload" element={<ProtectedRoute requireAdmin><HistoricalUpload /></ProtectedRoute>} />
              <Route path="/sales-dashboard" element={<ProtectedRoute requireAdmin><SalesDashboard /></ProtectedRoute>} />
              <Route path="/analyze-persona" element={<ProtectedRoute requireAdmin><AnalyzePersona /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="/tv" element={<TVDisplay />} />
              <Route path="/form/:token" element={<PatientForm />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <FloatingAssistants />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
