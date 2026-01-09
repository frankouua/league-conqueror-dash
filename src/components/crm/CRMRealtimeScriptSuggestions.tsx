import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Sparkles, Copy, Check, ChevronDown, ChevronUp, 
  Lightbulb, MessageSquare, Loader2, RefreshCw,
  ThermometerSun, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CRMRealtimeScriptSuggestionsProps {
  leadId: string;
  leadName: string;
  currentIntention?: string | null;
  stageKey?: string;
  temperature?: string | null;
}

interface Script {
  id: string;
  titulo: string;
  conteudo: string;
  tags: string[] | null;
  categoria: string | null;
  etapa_funil: string | null;
}

interface SuggestionResponse {
  scripts: Script[];
  temperatureTip: string | null;
  meta: {
    intention: string | null;
    stage: string | null;
    resultsCount: number;
  };
}

export function CRMRealtimeScriptSuggestions({
  leadId,
  leadName,
  currentIntention,
  stageKey,
  temperature
}: CRMRealtimeScriptSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [manualRefresh, setManualRefresh] = useState(0);

  // Fetch script suggestions
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['script-suggestions', leadId, currentIntention, stageKey, manualRefresh],
    queryFn: async (): Promise<SuggestionResponse> => {
      const { data, error } = await supabase.functions.invoke('get-script-suggestion', {
        body: {
          leadId,
          intencao: currentIntention,
          stageKey,
          temperature
        }
      });

      if (error) throw error;
      return data as SuggestionResponse;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Auto-refresh when intention changes
  useEffect(() => {
    if (currentIntention) {
      refetch();
    }
  }, [currentIntention, refetch]);

  const handleCopy = async (script: Script) => {
    try {
      // Create personalized script
      const personalizedScript = script.conteudo
        .replace(/\{nome\}/gi, leadName)
        .replace(/\{lead\}/gi, leadName);

      await navigator.clipboard.writeText(personalizedScript);
      setCopiedId(script.id);
      toast.success('Script copiado para a área de transferência!');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Erro ao copiar script');
    }
  };

  const handleRefresh = () => {
    setManualRefresh(prev => prev + 1);
  };

  const scripts = data?.scripts || [];
  const temperatureTip = data?.temperatureTip;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  Copiloto de Vendas
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Sugestões em tempo real
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefresh}
                disabled={isFetching}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Temperature Tip */}
            {temperatureTip && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border">
                <ThermometerSun className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                <p className="text-xs">{temperatureTip}</p>
              </div>
            )}

            {/* Current Intention Badge */}
            {currentIntention && (
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-amber-500" />
                <Badge variant="secondary" className="text-xs">
                  Intenção: {currentIntention}
                </Badge>
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : scripts.length > 0 ? (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2 pr-2">
                  {scripts.map((script, index) => (
                    <div
                      key={script.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all hover:border-primary/50",
                        index === 0 && "border-primary/30 bg-primary/5"
                      )}
                    >
                      {/* Script Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {index === 0 && (
                            <Badge className="bg-primary/20 text-primary text-[10px] px-1.5">
                              Recomendado
                            </Badge>
                          )}
                          <span className="text-xs font-medium truncate">
                            {script.titulo}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleCopy(script)}
                        >
                          {copiedId === script.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {/* Script Content */}
                      <div 
                        className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border-l-2 border-primary/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleCopy(script)}
                      >
                        <p className="line-clamp-4 whitespace-pre-wrap">
                          {script.conteudo.replace(/\{nome\}/gi, leadName).replace(/\{lead\}/gi, leadName)}
                        </p>
                      </div>

                      {/* Tags */}
                      {script.tags && script.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {script.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-6 text-center">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground">
                  Registre interações para receber sugestões personalizadas
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-2 border-t">
              <p className="text-[10px] text-muted-foreground mb-2">Dica rápida:</p>
              <div className="flex flex-wrap gap-1">
                <Badge 
                  variant="outline" 
                  className="text-[10px] cursor-pointer hover:bg-primary/10"
                  onClick={() => {
                    navigator.clipboard.writeText(`Olá ${leadName}! Tudo bem?`);
                    toast.success('Saudação copiada!');
                  }}
                >
                  <MessageSquare className="h-2.5 w-2.5 mr-1" />
                  Saudação
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-[10px] cursor-pointer hover:bg-primary/10"
                  onClick={() => {
                    navigator.clipboard.writeText(`${leadName}, posso tirar mais alguma dúvida?`);
                    toast.success('Pergunta copiada!');
                  }}
                >
                  <MessageSquare className="h-2.5 w-2.5 mr-1" />
                  Dúvidas?
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-[10px] cursor-pointer hover:bg-primary/10"
                  onClick={() => {
                    navigator.clipboard.writeText(`${leadName}, quando podemos agendar sua consulta?`);
                    toast.success('Fechamento copiado!');
                  }}
                >
                  <MessageSquare className="h-2.5 w-2.5 mr-1" />
                  Agendar
                </Badge>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
