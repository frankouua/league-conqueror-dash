import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, role, isLoading } = useAuth();

  // Check if user is approved
  const { data: isApproved, isLoading: isCheckingApproval } = useQuery({
    queryKey: ['user-approval-status', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking approval status:', error);
        return true; // Default to approved if check fails (for backwards compatibility)
      }
      
      return data?.is_approved ?? true; // Default to approved for existing users
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  if (isLoading || isCheckingApproval) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is approved (admins are always approved)
  if (!isApproved && role !== 'admin') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (requireAdmin && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
