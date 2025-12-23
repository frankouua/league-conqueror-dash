import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import DataReports from "./pages/DataReports";
import Performance from "./pages/Performance";
import Guides from "./pages/Guides";
import ReferralLeads from "./pages/ReferralLeads";
import PatientKanban from "./pages/PatientKanban";
import OnboardingGoals from "./pages/OnboardingGoals";
import SalesDashboard from "./pages/SalesDashboard";
import TVDisplay from "./pages/TVDisplay";
import CommercialGuides from "./pages/CommercialGuides";
import Cancellations from "./pages/Cancellations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding-goals" element={<ProtectedRoute><OnboardingGoals /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/data-reports" element={<ProtectedRoute><DataReports /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
            <Route path="/guides" element={<ProtectedRoute><Guides /></ProtectedRoute>} />
            <Route path="/referral-leads" element={<ProtectedRoute><ReferralLeads /></ProtectedRoute>} />
            <Route path="/patient-kanban" element={<ProtectedRoute><PatientKanban /></ProtectedRoute>} />
            <Route path="/guias-comerciais" element={<ProtectedRoute><CommercialGuides /></ProtectedRoute>} />
            <Route path="/cancellations" element={<ProtectedRoute><Cancellations /></ProtectedRoute>} />
            <Route path="/sales-dashboard" element={<ProtectedRoute requireAdmin><SalesDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
            <Route path="/tv" element={<TVDisplay />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
