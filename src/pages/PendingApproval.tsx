import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Shield, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import logoUnique from '@/assets/logo-unique.png';

const PendingApproval = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<'pending' | 'rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const checkApprovalStatus = async () => {
    if (!user) return;
    
    setIsChecking(true);
    try {
      // Check profile approval
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .single();

      if (profile?.is_approved) {
        // User has been approved, redirect to main page
        navigate('/', { replace: true });
        return;
      }

      // Check approval request status
      const { data: request } = await supabase
        .from('user_approval_requests')
        .select('status, rejection_reason')
        .eq('user_id', user.id)
        .single();

      if (request) {
        setStatus(request.status as 'pending' | 'rejected');
        setRejectionReason(request.rejection_reason);
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkApprovalStatus();

    // Set up realtime subscription for approval updates
    const channel = supabase
      .channel('approval-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).is_approved) {
            navigate('/', { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoUnique} alt="Unique CPA" className="h-16" />
        </div>

        <Card className="border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent">
          <CardContent className="pt-8 pb-6">
            {status === 'rejected' ? (
              <>
                <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Shield className="h-10 w-10 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Acesso Negado
                </h1>
                <p className="text-muted-foreground mb-4">
                  Infelizmente seu acesso não foi aprovado pelos coordenadores.
                </p>
                {rejectionReason && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-6">
                    <strong>Motivo:</strong> {rejectionReason}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Se você acredita que isso foi um erro, entre em contato com a coordenação.
                </p>
              </>
            ) : (
              <>
                <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse">
                  <Clock className="h-10 w-10 text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Aguardando Aprovação
                </h1>
                <p className="text-muted-foreground mb-6">
                  Seu cadastro está sendo analisado pela coordenação.
                  <br />
                  Você receberá acesso assim que for aprovado.
                </p>
                <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">O que está acontecendo?</p>
                  <p>
                    Para proteger nossos dados e garantir a segurança do sistema, 
                    todos os novos cadastros precisam ser aprovados por um coordenador.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button 
            variant="outline" 
            onClick={checkApprovalStatus}
            disabled={isChecking}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            Verificar Status
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Unique CPI • Sistema de Gestão Comercial
        </p>
      </div>
    </div>
  );
};

export default PendingApproval;
