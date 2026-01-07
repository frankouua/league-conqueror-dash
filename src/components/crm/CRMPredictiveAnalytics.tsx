import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Brain, TrendingUp, Target, AlertTriangle, Zap, 
  Sparkles, BarChart3, ArrowUpRight, ArrowDownRight,
  Loader2, Clock, DollarSign, Users, RefreshCw,
  CheckCircle2, XCircle, Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadPrediction {
  leadId: string;
  leadName: string;
  currentScore: number;
  predictedScore: number;
  conversionProbability: number;
  daysToClose: number;
  riskLevel: 'low' | 'medium' | 'high';
  suggestedActions: string[];
  estimatedValue: number;
}

export function CRMPredictiveAnalytics() {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState<LeadPrediction[]>([]);

  // Fetch leads for prediction
  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ['crm-leads-for-prediction', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          *,
          stage:crm_stages(name, order_index),
          history:crm_lead_history(action_type, created_at)
        `)
        .eq('assigned_to', user?.id)
        .is('won_at', null)
        .is('lost_at', null)
        .order('lead_score', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Run AI prediction analysis
  const runPrediction = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      
      // Simulate AI prediction based on lead data
      const predictedLeads: LeadPrediction[] = (leads || []).map(lead => {
        const baseScore = lead.lead_score || 0;
        const daysInStage = lead.days_in_stage || 0;
        const totalInteractions = lead.total_interactions || 0;
        const historyCount = lead.history?.length || 0;
        
        // Calculate conversion probability based on multiple factors
        let conversionProb = baseScore;
        
        // Adjust for BANT scores
        const bantTotal = (lead.budget_score || 0) + (lead.authority_score || 0) + 
                         (lead.need_score || 0) + (lead.timing_score || 0);
        conversionProb += bantTotal * 0.5;
        
        // Adjust for engagement
        if (totalInteractions > 5) conversionProb += 10;
        if (historyCount > 3) conversionProb += 5;
        
        // Penalize stale leads
        if (lead.is_stale) conversionProb -= 20;
        if (daysInStage > 14) conversionProb -= 10;
        
        conversionProb = Math.max(5, Math.min(95, conversionProb));
        
        // Predict days to close based on current stage
        const stageOrder = lead.stage?.order_index || 0;
        const avgDaysPerStage = 7;
        const remainingStages = Math.max(0, 5 - stageOrder);
        const daysToClose = remainingStages * avgDaysPerStage;
        
        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (conversionProb < 30 || daysInStage > 21) riskLevel = 'high';
        else if (conversionProb < 60 || daysInStage > 14) riskLevel = 'medium';
        
        // Generate suggested actions
        const actions: string[] = [];
        if (lead.budget_score && lead.budget_score < 5) actions.push('Apresentar opções de financiamento');
        if (lead.timing_score && lead.timing_score < 5) actions.push('Criar urgência com oferta limitada');
        if (daysInStage > 7) actions.push('Fazer follow-up imediato');
        if (totalInteractions < 3) actions.push('Aumentar frequência de contato');
        if (!lead.first_contact_at) actions.push('Agendar primeira ligação');
        if (actions.length === 0) actions.push('Manter acompanhamento regular');
        
        return {
          leadId: lead.id,
          leadName: lead.name,
          currentScore: baseScore,
          predictedScore: Math.min(100, baseScore + Math.floor(Math.random() * 15)),
          conversionProbability: Math.round(conversionProb),
          daysToClose,
          riskLevel,
          suggestedActions: actions.slice(0, 3),
          estimatedValue: lead.estimated_value || 0,
        };
      });

      // Sort by conversion probability
      predictedLeads.sort((a, b) => b.conversionProbability - a.conversionProbability);
      
      return predictedLeads;
    },
    onSuccess: (data) => {
      setPredictions(data);
      setIsAnalyzing(false);
      toast.success('Análise preditiva concluída!');
    },
    onError: () => {
      setIsAnalyzing(false);
      toast.error('Erro na análise preditiva');
    },
  });

  // Calculate summary metrics
  const highProbabilityLeads = predictions.filter(p => p.conversionProbability >= 70);
  const totalPipelineValue = predictions.reduce((acc, p) => acc + p.estimatedValue, 0);
  const expectedRevenue = predictions.reduce((acc, p) => 
    acc + (p.estimatedValue * p.conversionProbability / 100), 0
  );
  const avgDaysToClose = predictions.length > 0 
    ? predictions.reduce((acc, p) => acc + p.daysToClose, 0) / predictions.length 
    : 0;

  const riskColors = {
    low: 'bg-green-500/10 text-green-600 border-green-500/30',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    high: 'bg-red-500/10 text-red-600 border-red-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Análise Preditiva IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Previsões inteligentes baseadas no comportamento dos leads
          </p>
        </div>
        <Button 
          onClick={() => runPrediction.mutate()}
          disabled={isAnalyzing || isLoading}
          className="gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Rodar Análise
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {highProbabilityLeads.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Alta Probabilidade</div>
                </div>
                <Target className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {(expectedRevenue / 1000).toFixed(0)}k
                  </div>
                  <div className="text-xs text-muted-foreground">Receita Esperada</div>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    R$ {(totalPipelineValue / 1000).toFixed(0)}k
                  </div>
                  <div className="text-xs text-muted-foreground">Pipeline Total</div>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-600">
                    {avgDaysToClose.toFixed(0)}d
                  </div>
                  <div className="text-xs text-muted-foreground">Tempo Médio Fechamento</div>
                </div>
                <Clock className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Predictions List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos ({predictions.length})</TabsTrigger>
          <TabsTrigger value="high" className="text-green-600">
            Alta Prob. ({highProbabilityLeads.length})
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-red-600">
            Em Risco ({predictions.filter(p => p.riskLevel === 'high').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {predictions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">Nenhuma análise realizada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em "Rodar Análise" para gerar previsões inteligentes para seus leads
                </p>
              </CardContent>
            </Card>
          ) : (
            predictions.map((prediction) => (
              <PredictionCard key={prediction.leadId} prediction={prediction} />
            ))
          )}
        </TabsContent>

        <TabsContent value="high" className="space-y-3">
          {highProbabilityLeads.map((prediction) => (
            <PredictionCard key={prediction.leadId} prediction={prediction} />
          ))}
        </TabsContent>

        <TabsContent value="risk" className="space-y-3">
          {predictions.filter(p => p.riskLevel === 'high').map((prediction) => (
            <PredictionCard key={prediction.leadId} prediction={prediction} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: LeadPrediction }) {
  const riskColors = {
    low: 'bg-green-500/10 text-green-600 border-green-500/30',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    high: 'bg-red-500/10 text-red-600 border-red-500/30',
  };

  const riskLabels = {
    low: 'Baixo Risco',
    medium: 'Médio Risco',
    high: 'Alto Risco',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Probability Circle */}
          <div className="relative">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center border-4",
              prediction.conversionProbability >= 70 ? "border-green-500 bg-green-500/10" :
              prediction.conversionProbability >= 40 ? "border-yellow-500 bg-yellow-500/10" :
              "border-red-500 bg-red-500/10"
            )}>
              <span className="text-lg font-bold">
                {prediction.conversionProbability}%
              </span>
            </div>
          </div>

          {/* Lead Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{prediction.leadName}</h3>
              <Badge variant="outline" className={cn(riskColors[prediction.riskLevel])}>
                {riskLabels[prediction.riskLevel]}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <div className="text-xs text-muted-foreground">Score Atual</div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{prediction.currentScore}</span>
                  {prediction.predictedScore > prediction.currentScore ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    → {prediction.predictedScore}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tempo Estimado</div>
                <div className="font-medium">{prediction.daysToClose} dias</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Valor</div>
                <div className="font-medium">
                  R$ {(prediction.estimatedValue / 1000).toFixed(0)}k
                </div>
              </div>
            </div>

            {/* Suggested Actions */}
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Lightbulb className="w-3 h-3" />
                Ações Sugeridas
              </div>
              <div className="flex flex-wrap gap-2">
                {prediction.suggestedActions.map((action, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
