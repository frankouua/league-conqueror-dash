import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Database, 
  Phone, 
  Mail, 
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface EnrichmentDetail {
  id: string;
  name: string;
  prontuario: string;
  fields_updated: string[];
}

interface EnrichmentResult {
  total_processed: number;
  total_enriched: number;
  total_phone_added: number;
  total_email_added: number;
  total_cpf_added: number;
  errors: string[];
  details: EnrichmentDetail[];
}

export const FeegowEnrichment = () => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<EnrichmentResult | null>(null);

  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['enrichment-stats'],
    queryFn: async () => {
      // Get total counts
      const { count: total } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true });

      // Missing phone
      const { count: semTelefone } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .or('phone.is.null,phone.eq.');

      // Missing email
      const { count: semEmail } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .or('email.is.null,email.eq.');

      // Missing CPF
      const { count: semCpf } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .or('cpf.is.null,cpf.eq.');

      // With prontuario
      const { count: comProntuario } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .not('prontuario', 'is', null)
        .neq('prontuario', '');

      // Candidates for enrichment (has prontuario + missing data)
      const { count: candidatos } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .not('prontuario', 'is', null)
        .neq('prontuario', '')
        .or('phone.is.null,phone.eq.,email.is.null,email.eq.,cpf.is.null,cpf.eq.');

      return {
        total: total || 0,
        semTelefone: semTelefone || 0,
        semEmail: semEmail || 0,
        semCpf: semCpf || 0,
        comProntuario: comProntuario || 0,
        candidatos: candidatos || 0,
      };
    }
  });

  const handleEnrich = async () => {
    setIsEnriching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('feegow-enrich-contacts', {
        body: { batchSize: 100, dryRun }
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.result);
        toast.success(
          dryRun 
            ? `Simulação: ${data.result.total_enriched} clientes seriam enriquecidos` 
            : `${data.result.total_enriched} clientes enriquecidos com sucesso!`
        );
        if (!dryRun) {
          refetchStats();
        }
      } else {
        throw new Error(data.error || 'Erro no enriquecimento');
      }
    } catch (error) {
      console.error('Error enriching:', error);
      toast.error('Erro ao enriquecer dados: ' + (error as Error).message);
    } finally {
      setIsEnriching(false);
    }
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'phone':
      case 'whatsapp':
        return <Phone className="h-3 w-3" />;
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'cpf':
        return <CreditCard className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Enriquecimento de Dados via Feegow
          </CardTitle>
          <CardDescription>
            Busca dados de contato no Feegow para clientes que têm prontuário mas estão sem telefone, email ou CPF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Clientes</div>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.comProntuario.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Com Prontuário</div>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.semTelefone.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Sem Telefone</div>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.semEmail.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Sem Email</div>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.semCpf.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Sem CPF</div>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 text-center">
                <div className="text-2xl font-bold text-primary">{stats.candidatos.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Candidatos</div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <Switch
                id="dry-run"
                checked={dryRun}
                onCheckedChange={setDryRun}
              />
              <Label htmlFor="dry-run" className="cursor-pointer">
                <span className="font-medium">Modo Simulação</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {dryRun ? '(apenas visualiza, não altera dados)' : '(ATENÇÃO: vai alterar dados!)'}
                </span>
              </Label>
            </div>

            <Button 
              onClick={handleEnrich} 
              disabled={isEnriching}
              variant={dryRun ? 'outline' : 'default'}
              className="gap-2"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  {dryRun ? 'Simular Enriquecimento' : 'Executar Enriquecimento'}
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium">
                {dryRun ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {dryRun ? 'Resultado da Simulação' : 'Enriquecimento Concluído'}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xl font-bold">{result.total_processed}</div>
                  <div className="text-xs text-muted-foreground">Processados</div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 text-center">
                  <div className="text-xl font-bold text-green-600">{result.total_enriched}</div>
                  <div className="text-xs text-muted-foreground">Enriquecidos</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                  <div className="text-xl font-bold text-blue-600">
                    +{result.total_phone_added} / +{result.total_email_added} / +{result.total_cpf_added}
                  </div>
                  <div className="text-xs text-muted-foreground">Tel / Email / CPF</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 text-center">
                  <div className="text-xl font-bold text-red-600">{result.errors.length}</div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              </div>

              {/* Progress indicator */}
              {result.total_processed > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taxa de Enriquecimento</span>
                    <span>{Math.round((result.total_enriched / result.total_processed) * 100)}%</span>
                  </div>
                  <Progress value={(result.total_enriched / result.total_processed) * 100} />
                </div>
              )}

              {/* Details */}
              {result.details.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Detalhes ({result.details.length} registros)</div>
                  <ScrollArea className="h-64 rounded-lg border">
                    <div className="p-4 space-y-2">
                      {result.details.map((detail, idx) => (
                        <div key={detail.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <div className="font-medium text-sm">{detail.name}</div>
                            <div className="text-xs text-muted-foreground">Prontuário: {detail.prontuario}</div>
                          </div>
                          <div className="flex gap-1">
                            {detail.fields_updated.map(field => (
                              <Badge key={field} variant="outline" className="gap-1 text-xs">
                                {getFieldIcon(field)}
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-red-600">Erros</div>
                  <ScrollArea className="h-32 rounded-lg border border-red-200 bg-red-50">
                    <div className="p-4 space-y-1">
                      {result.errors.map((error, idx) => (
                        <div key={idx} className="text-xs text-red-700">{error}</div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="text-sm text-muted-foreground p-4 rounded-lg bg-muted/30">
            <p className="font-medium mb-2">Como funciona:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Busca clientes com prontuário mas sem telefone, email ou CPF</li>
              <li>Cruza o prontuário com a base do Feegow</li>
              <li>Preenche os campos faltantes com os dados encontrados</li>
              <li>Processa até 100 clientes por vez para evitar timeout</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
