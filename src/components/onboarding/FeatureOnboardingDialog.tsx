import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  FileText, 
  Megaphone, 
  Users,
  Target,
  Zap,
  CheckCircle,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface FeatureStep {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tips: string[];
  path: string;
}

const FEATURES: FeatureStep[] = [
  {
    key: 'recorrencias',
    title: '🔄 Central de Recorrências',
    description: 'Agora você pode gerenciar todos os pacientes com procedimentos vencidos em um só lugar!',
    icon: RefreshCw,
    color: 'text-blue-500',
    tips: [
      'Acesse via Alavancas → Recorrências',
      'Veja pacientes agrupados por tipo de procedimento',
      'Clique em um paciente para ver scripts de reativação prontos',
      'Use os filtros para priorizar pacientes críticos',
      'Selecione múltiplos pacientes para ações em lote'
    ],
    path: '/alavancas'
  },
  {
    key: 'protocolos',
    title: '📋 Protocolos de Jornada',
    description: 'Configure jornadas personalizadas para cada tipo de paciente e automatize o follow-up.',
    icon: FileText,
    color: 'text-purple-500',
    tips: [
      'Crie protocolos com etapas e prazos definidos',
      'Associe protocolos a procedimentos específicos',
      'Receba lembretes automáticos de próximos passos',
      'Acompanhe o progresso de cada paciente na jornada',
      'Scripts prontos para cada etapa do protocolo'
    ],
    path: '/alavancas'
  },
  {
    key: 'campanhas',
    title: '🎯 Campanhas Inteligentes',
    description: 'Crie e gerencie campanhas de vendas com metas, materiais e acompanhamento em tempo real.',
    icon: Megaphone,
    color: 'text-orange-500',
    tips: [
      'Acesse via Calendário → Campanhas',
      'Defina metas e acompanhe o progresso',
      'Materiais de apoio disponíveis para cada campanha',
      'Checklist de ações para não esquecer nada',
      'Alertas automáticos de início e fim de campanha'
    ],
    path: '/calendario'
  },
  {
    key: 'lista_clientes',
    title: '👥 Lista de Clientes Avançada',
    description: 'Visualize todos os seus clientes com filtros poderosos e acesso rápido ao histórico.',
    icon: Users,
    color: 'text-green-500',
    tips: [
      'Acesse via Alavancas → Lista de Clientes',
      'Filtre por recorrência, valor, data',
      'Veja o perfil completo com um clique',
      'Identifique oportunidades de upsell',
      'Exporte listas para ações externas'
    ],
    path: '/alavancas'
  },
  {
    key: 'alavancas_hub',
    title: '⚡ Hub Alavancas',
    description: 'Todas as ferramentas de crescimento reunidas em um só lugar para maximizar suas vendas.',
    icon: Zap,
    color: 'text-yellow-500',
    tips: [
      'Dashboard com KPIs consolidados',
      'Acesso rápido a Recorrências, RFV, Indicações',
      'Campanhas e Protocolos centralizados',
      'Menos cliques = mais tempo vendendo',
      'Visão 360° das oportunidades'
    ],
    path: '/alavancas'
  }
];

const ONBOARDING_VERSION = 'v2_jan2026';

export function FeatureOnboardingDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Check if user has seen this onboarding version
  const { data: readFeatures, isLoading } = useQuery({
    queryKey: ['feature-onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('feature_onboarding_reads')
        .select('feature_key')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.map(r => r.feature_key) || [];
    },
    enabled: !!user?.id
  });

  // Mark feature as read
  const markAsReadMutation = useMutation({
    mutationFn: async (featureKey: string) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('feature_onboarding_reads')
        .upsert({
          user_id: user.id,
          feature_key: featureKey
        }, {
          onConflict: 'user_id,feature_key'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-onboarding'] });
    }
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const records = FEATURES.map(f => ({
        user_id: user.id,
        feature_key: f.key
      }));
      
      const { error } = await supabase
        .from('feature_onboarding_reads')
        .upsert(records, {
          onConflict: 'user_id,feature_key'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-onboarding'] });
      setOpen(false);
    }
  });

  // Check if should show onboarding
  useEffect(() => {
    if (isLoading || !user?.id) return;
    
    const hasSeenOnboarding = readFeatures?.includes(`onboarding_${ONBOARDING_VERSION}`);
    if (!hasSeenOnboarding && !hasInteracted) {
      // Small delay to not show immediately on page load
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [readFeatures, isLoading, user?.id, hasInteracted]);

  const currentFeature = FEATURES[currentStep];
  const progress = ((currentStep + 1) / FEATURES.length) * 100;
  const isLastStep = currentStep === FEATURES.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      // Mark the version as seen
      markAsReadMutation.mutate(`onboarding_${ONBOARDING_VERSION}`);
      markAllAsReadMutation.mutate();
    } else {
      markAsReadMutation.mutate(currentFeature.key);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    setHasInteracted(true);
    markAsReadMutation.mutate(`onboarding_${ONBOARDING_VERSION}`);
    markAllAsReadMutation.mutate();
  };

  const handleClose = () => {
    setHasInteracted(true);
    setOpen(false);
    // Mark as seen so it doesn't show again
    markAsReadMutation.mutate(`onboarding_${ONBOARDING_VERSION}`);
  };

  if (!user || isLoading) return null;

  const Icon = currentFeature?.icon || Sparkles;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Novidades do Sistema
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center",
              currentFeature?.color
            )}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl text-white mb-1">
                {currentFeature?.title}
              </DialogTitle>
              <DialogDescription className="text-white/80">
                {currentFeature?.description}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Passo {currentStep + 1} de {FEATURES.length}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Tips */}
        <div className="p-6 pt-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Como usar:
          </h4>
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-2">
              {currentFeature?.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Step indicators */}
        <div className="px-6 pb-2">
          <div className="flex justify-center gap-2">
            {FEATURES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentStep 
                    ? "w-6 bg-primary" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 pt-2 flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="flex-1">
            Pular tudo
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}