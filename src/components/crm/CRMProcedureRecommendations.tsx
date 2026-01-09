import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Sparkles, Target, TrendingUp, Gift, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Lightbulb, Star, Zap, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CRMProcedureRecommendationsProps {
  leadId: string;
  leadName: string;
  compact?: boolean;
}

interface Recommendation {
  id: string;
  name: string;
  type: 'procedure' | 'protocol' | 'campaign';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedValue?: number;
}

interface RecommendationData {
  success: boolean;
  data: {
    recommendations: Recommendation[];
    crossSellOpportunities: Recommendation[];
    aiInsight: string;
  };
  leadName: string;
  generatedAt: string;
}

const TYPE_CONFIG = {
  procedure: { icon: Target, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', label: 'Procedimento' },
  protocol: { icon: Package, color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', label: 'Protocolo' },
  campaign: { icon: Gift, color: 'bg-green-500/10 text-green-600 border-green-500/30', label: 'Campanha' },
};

const PRIORITY_CONFIG = {
  high: { color: 'bg-red-500/20 text-red-600', label: '🔥 Alta' },
  medium: { color: 'bg-yellow-500/20 text-yellow-600', label: '⚡ Média' },
  low: { color: 'bg-gray-500/20 text-gray-600', label: '💡 Baixa' },
};

export function CRMProcedureRecommendations({ 
  leadId, 
  leadName,
  compact = false 
}: CRMProcedureRecommendationsProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [manualRefresh, setManualRefresh] = useState(0);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['procedure-recommendations', leadId, manualRefresh],
    queryFn: async (): Promise<RecommendationData> => {
      const { data, error } = await supabase.functions.invoke('get-procedure-recommendation', {
        body: { leadId }
      });

      if (error) throw error;
      return data as RecommendationData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const handleRefresh = () => {
    setManualRefresh(prev => prev + 1);
    toast.info('Gerando novas recomendações...');
  };

  const recommendations = data?.data?.recommendations || [];
  const crossSell = data?.data?.crossSellOpportunities || [];
  const aiInsight = data?.data?.aiInsight;

  const RecommendationCard = ({ item, isCrossSell = false }: { item: Recommendation; isCrossSell?: boolean }) => {
    const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.procedure;
    const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
    const Icon = typeConfig.icon;

    return (
      <div className={cn(
        "p-3 rounded-lg border transition-all hover:shadow-sm",
        item.priority === 'high' && "border-primary/30 bg-primary/5"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", typeConfig.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm">{item.name}</span>
              <Badge variant="outline" className={cn("text-[10px] px-1.5", priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
              {isCrossSell && (
                <Badge variant="secondary" className="text-[10px] px-1.5 bg-amber-500/20 text-amber-600">
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                  Cross-sell
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.reason}
            </p>
            <Badge variant="outline" className={cn("text-[10px] mt-2", typeConfig.color)}>
              {typeConfig.label}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">Cross-sell & Upsell</CardTitle>
                  {recommendations.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {recommendations.length + crossSell.length} sugestões
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRefresh}
                  disabled={isFetching}
                >
                  <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Erro ao carregar recomendações
                </div>
              ) : recommendations.length > 0 || crossSell.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-2">
                    {recommendations.slice(0, 2).map((item, i) => (
                      <RecommendationCard key={i} item={item} />
                    ))}
                    {crossSell.slice(0, 1).map((item, i) => (
                      <RecommendationCard key={`cs-${i}`} item={item} isCrossSell />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Lightbulb className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  Clique em atualizar para gerar recomendações
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Recomendações Inteligentes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sugestões de cross-sell e upsell para {leadName}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Analisando perfil e gerando recomendações...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-500 mb-2">Erro ao carregar recomendações</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {/* AI Insight */}
            {aiInsight && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">Insight da IA</p>
                    <p className="text-sm text-muted-foreground">{aiInsight}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-amber-500" />
                  <h4 className="font-medium text-sm">Recomendações Principais</h4>
                  <Badge variant="secondary">{recommendations.length}</Badge>
                </div>
                <div className="space-y-2">
                  {recommendations.map((item, i) => (
                    <RecommendationCard key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Cross-sell Opportunities */}
            {crossSell.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium text-sm">Oportunidades de Cross-sell</h4>
                    <Badge variant="secondary">{crossSell.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {crossSell.map((item, i) => (
                      <RecommendationCard key={i} item={item} isCrossSell />
                    ))}
                  </div>
                </div>
              </>
            )}

            {recommendations.length === 0 && crossSell.length === 0 && (
              <div className="py-8 text-center">
                <Lightbulb className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma recomendação disponível ainda.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione mais informações ao lead para receber sugestões personalizadas.
                </p>
              </div>
            )}

            {/* Generated timestamp */}
            {data?.generatedAt && (
              <p className="text-[10px] text-muted-foreground text-right">
                Gerado em: {new Date(data.generatedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
