import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CommercialAssistant } from "@/components/CommercialAssistant";
import { AnalyticsAIFloating } from "@/components/AnalyticsAIFloating";
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
const Guides = lazy(() => import("./pages/Guides"));
const ReferralLeads = lazy(() => import("./pages/ReferralLeads"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const OnboardingGoals = lazy(() => import("./pages/OnboardingGoals"));
const SalesDashboard = lazy(() => import("./pages/SalesDashboard"));
const HistoricalUpload = lazy(() => import("./pages/HistoricalUpload"));
const AnalyzePersona = lazy(() => import("./pages/AnalyzePersona"));
const RFVDashboard = lazy(() => import("./pages/RFVDashboard"));
const TVDisplay = lazy(() => import("./pages/TVDisplay"));
const CommercialGuides = lazy(() => import("./pages/CommercialGuides"));
const Cancellations = lazy(() => import("./pages/Cancellations"));
const CommercialAssistantPage = lazy(() => import("./pages/CommercialAssistantPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - data considered fresh
      gcTime: 1000 * 60 * 10,   // 10 minutes - cache retention
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      refetchOnMount: false,    // Use cached data on mount
      retry: 1,                 // Reduce retry attempts
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
              <Route path="/onboarding-goals" element={<ProtectedRoute><OnboardingGoals /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/data-reports" element={<ProtectedRoute><DataReports /></ProtectedRoute>} />
              <Route path="/guides" element={<ProtectedRoute><Guides /></ProtectedRoute>} />
              <Route path="/referral-leads" element={<ProtectedRoute><ReferralLeads /></ProtectedRoute>} />
              <Route path="/campanhas" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/guias-comerciais" element={<ProtectedRoute><CommercialGuides /></ProtectedRoute>} />
              <Route path="/cancellations" element={<ProtectedRoute><Cancellations /></ProtectedRoute>} />
              <Route path="/assistente-comercial" element={<ProtectedRoute><CommercialAssistantPage /></ProtectedRoute>} />
              <Route path="/rfv" element={<ProtectedRoute><RFVDashboard /></ProtectedRoute>} />
              <Route path="/historical-upload" element={<ProtectedRoute requireAdmin><HistoricalUpload /></ProtectedRoute>} />
              <Route path="/sales-dashboard" element={<ProtectedRoute requireAdmin><SalesDashboard /></ProtectedRoute>} />
              <Route path="/analyze-persona" element={<ProtectedRoute requireAdmin><AnalyzePersona /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="/tv" element={<TVDisplay />} />
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
