import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap,
  Calendar,
  User,
  MapPin,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface EnrichmentDetail {
  id: string;
  name: string;
  fields_updated: string[];
}

interface EnrichmentResult {
  total_processed: number;
  total_enriched: number;
  fields_summary: Record<string, number>;
  errors: string[];
  details: EnrichmentDetail[];
}

export const FeegowEnrichment = () => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [includeAppointments, setIncludeAppointments] = useState(true);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [enrichmentType, setEnrichmentType] = useState<'basic' | 'full'>('full');

  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['enrichment-stats'],
    queryFn: async () => {
      const { count: total } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true });

      const { count: semTelefone } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .or('phone.is.null,phone.eq.');

      const { count: semEmail } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .or('email.is.null,email.eq.');

      const { count: comProntuario } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .not('prontuario', 'is', null)
        .neq('prontuario', '');

      const { count: comOrigem } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .not('origem_nome', 'is', null)
        .neq('origem_nome', '');

      const { count: comAgendamentos } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .gt('total_agendamentos', 0);

      const { count: comNoShows } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true })
        .gt('no_show_count', 0);

      return {
        total: total || 0,
        semTelefone: semTelefone || 0,
        semEmail: semEmail || 0,
        comProntuario: comProntuario || 0,
        comOrigem: comOrigem || 0,
        comAgendamentos: comAgendamentos || 0,
        comNoShows: comNoShows || 0,
      };
    }
  });

  const handleEnrich = async () => {
    setIsEnriching(true);
    setResult(null);

    try {
      const functionName = enrichmentType === 'full' ? 'feegow-full-enrichment' : 'feegow-enrich-contacts';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          batchSize: 100, 
          dryRun,
          includeAppointments: enrichmentType === 'full' ? includeAppointments : false
        }
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
      case 'rg':
        return <CreditCard className="h-3 w-3" />;
      case 'origem_nome':
      case 'origem_id':
        return <TrendingUp className="h-3 w-3" />;
      case 'total_agendamentos':
      case 'ultimo_atendimento':
      case 'no_show_count':
        return <Calendar className="h-3 w-3" />;
      case 'responsavel_legal':
      case 'nome_mae':
      case 'nome_pai':
        return <User className="h-3 w-3" />;
      case 'observacoes_feegow':
        return <FileText className="h-3 w-3" />;
      default:
        return <Database className="h-3 w-3" />;
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      phone: 'Telefone',
      email: 'Email',
      rg: 'RG',
      origem_nome: 'Origem',
      origem_id: 'ID Origem',
      responsavel_legal: 'Responsável',
      nome_mae: 'Nome Mãe',
      nome_pai: 'Nome Pai',
      observacoes_feegow: 'Observações',
      foto_url: 'Foto',
      data_cadastro_feegow: 'Data Cadastro',
      total_agendamentos: 'Agendamentos',
      no_show_count: 'No-Shows',
      ultimo_atendimento: 'Último Atend.'
    };
    return labels[field] || field;
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
            Importa dados completos do Feegow: contatos, origem, histórico de agendamentos e muito mais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-xl font-bold">{stats.total.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <div className="text-xl font-bold text-green-600">{stats.comProntuario.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Com Prontuário</div>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                <div className="text-xl font-bold text-orange-600">{stats.semTelefone.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Sem Telefone</div>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                <div className="text-xl font-bold text-orange-600">{stats.semEmail.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Sem Email</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                <div className="text-xl font-bold text-blue-600">{stats.comOrigem.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Com Origem</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 text-center">
                <div className="text-xl font-bold text-purple-600">{stats.comAgendamentos.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Com Histórico</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 text-center">
                <div className="text-xl font-bold text-red-600">{stats.comNoShows.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Com No-Shows</div>
              </div>
            </div>
          )}

          {/* Enrichment Type Selection */}
          <Tabs value={enrichmentType} onValueChange={(v) => setEnrichmentType(v as 'basic' | 'full')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">
                <Phone className="h-4 w-4 mr-2" />
                Básico (Contatos)
              </TabsTrigger>
              <TabsTrigger value="full">
                <TrendingUp className="h-4 w-4 mr-2" />
                Completo (Todos os Dados)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4">
              <div className="p-4 rounded-lg bg-muted/30 text-sm">
                <p className="font-medium mb-2">Enriquecimento Básico:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Telefone e WhatsApp</li>
                  <li>Email</li>
                  <li>CPF</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="full" className="mt-4">
              <div className="p-4 rounded-lg bg-muted/30 text-sm">
                <p className="font-medium mb-2">Enriquecimento Completo:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Telefone, Email, CPF, RG</li>
                    <li>Origem de captação</li>
                    <li>Responsável legal</li>
                    <li>Nome dos pais</li>
                    <li>Observações do prontuário</li>
                    <li>Foto do paciente</li>
                    <li>Data de cadastro</li>
                  </ul>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Total de agendamentos</li>
                    <li>Último atendimento</li>
                    <li>Contagem de no-shows</li>
                    <li>Taxa de comparecimento</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <Switch
                  id="include-appointments"
                  checked={includeAppointments}
                  onCheckedChange={setIncludeAppointments}
                />
                <Label htmlFor="include-appointments" className="cursor-pointer">
                  <span className="font-medium">Incluir histórico de agendamentos</span>
                  <span className="text-sm text-muted-foreground ml-2">(mais lento, mas traz no-shows e último atendimento)</span>
                </Label>
              </div>
            </TabsContent>
          </Tabs>

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
                  {dryRun ? '(apenas visualiza)' : '(ATENÇÃO: vai alterar dados!)'}
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
                  {dryRun ? 'Simular' : 'Executar'} Enriquecimento {enrichmentType === 'full' ? 'Completo' : 'Básico'}
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xl font-bold">{result.total_processed}</div>
                  <div className="text-xs text-muted-foreground">Processados</div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 text-center">
                  <div className="text-xl font-bold text-green-600">{result.total_enriched}</div>
                  <div className="text-xs text-muted-foreground">Enriquecidos</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 text-center">
                  <div className="text-xl font-bold text-red-600">{result.errors.length}</div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              </div>

              {/* Fields Summary */}
              {result.fields_summary && Object.keys(result.fields_summary).length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Campos Preenchidos</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.fields_summary)
                      .sort((a, b) => b[1] - a[1])
                      .map(([field, count]) => (
                        <Badge key={field} variant="secondary" className="gap-1">
                          {getFieldIcon(field)}
                          {getFieldLabel(field)}: {count}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              {/* Progress */}
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
                      {result.details.map((detail) => (
                        <div key={detail.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="font-medium text-sm">{detail.name}</div>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {detail.fields_updated.slice(0, 5).map(field => (
                              <Badge key={field} variant="outline" className="gap-1 text-xs">
                                {getFieldIcon(field)}
                                {getFieldLabel(field)}
                              </Badge>
                            ))}
                            {detail.fields_updated.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{detail.fields_updated.length - 5}
                              </Badge>
                            )}
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
        </CardContent>
      </Card>
    </div>
  );
};
