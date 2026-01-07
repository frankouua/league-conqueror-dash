import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Download, 
  Loader2, 
  CheckCircle2, 
  Users, 
  AlertTriangle,
  RefreshCw,
  Crown,
  Heart,
  Star,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ShieldAlert,
  Moon,
  XCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const RFV_PIPELINE_ID = '66666666-6666-6666-6666-666666666666';

// Mapeamento de segmentos RFV para estágios
const SEGMENT_MAPPING: Record<string, { stageName: string; icon: React.ElementType; color: string }> = {
  'champions': { stageName: 'Campeões', icon: Crown, color: 'text-emerald-500' },
  'Campeões': { stageName: 'Campeões', icon: Crown, color: 'text-emerald-500' },
  'loyal': { stageName: 'Leais', icon: Heart, color: 'text-green-500' },
  'Leais': { stageName: 'Leais', icon: Heart, color: 'text-green-500' },
  'potential': { stageName: 'Potenciais Leais', icon: Star, color: 'text-lime-500' },
  'Potenciais Leais': { stageName: 'Potenciais Leais', icon: Star, color: 'text-lime-500' },
  'Novos': { stageName: 'Novos', icon: Sparkles, color: 'text-blue-500' },
  'Promissores': { stageName: 'Promissores', icon: TrendingUp, color: 'text-indigo-500' },
  'Precisam Atenção': { stageName: 'Precisam Atenção', icon: AlertCircle, color: 'text-amber-500' },
  'at_risk': { stageName: 'Em Risco', icon: AlertTriangle, color: 'text-red-500' },
  'Em Risco': { stageName: 'Em Risco', icon: AlertTriangle, color: 'text-red-500' },
  'Não Podem Perder': { stageName: 'Não Podem Perder', icon: ShieldAlert, color: 'text-red-600' },
  'hibernating': { stageName: 'Hibernando', icon: Moon, color: 'text-gray-500' },
  'Hibernando': { stageName: 'Hibernando', icon: Moon, color: 'text-gray-500' },
  'Quase Dormindo': { stageName: 'Hibernando', icon: Moon, color: 'text-gray-500' },
  'lost': { stageName: 'Perdidos', icon: XCircle, color: 'text-gray-600' },
};

interface RFVCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  segment: string;
  total_value: number | null;
  recency_score: number | null;
  frequency_score: number | null;
  value_score: number | null;
  last_purchase_date: string | null;
  cpf: string | null;
  prontuario: string | null;
}

interface Stage {
  id: string;
  name: string;
  order_index: number | null;
}

export const CRMRFVMatrixImport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{
    total: number;
    imported: number;
    skipped: number;
    errors: number;
  } | null>(null);

  // Buscar estágios da pipeline RFV
  const { data: stages = [] } = useQuery({
    queryKey: ['rfv-matrix-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_stages')
        .select('id, name, order_index')
        .eq('pipeline_id', RFV_PIPELINE_ID)
        .order('order_index');
      if (error) throw error;
      return data as Stage[];
    }
  });

  // Buscar estatísticas RFV
  const { data: rfvStats, isLoading: statsLoading } = useQuery({
    queryKey: ['rfv-stats-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfv_customers')
        .select('segment');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(c => {
        const mapping = SEGMENT_MAPPING[c.segment];
        const stageName = mapping?.stageName || 'Perdidos';
        counts[stageName] = (counts[stageName] || 0) + 1;
      });
      
      return {
        total: data.length,
        bySegment: counts
      };
    }
  });

  // Buscar leads já importados
  const { data: existingLeads = [] } = useQuery({
    queryKey: ['rfv-imported-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('rfv_customer_id')
        .eq('pipeline_id', RFV_PIPELINE_ID)
        .not('rfv_customer_id', 'is', null);
      if (error) throw error;
      return data.map(l => l.rfv_customer_id);
    }
  });

  // Mutation para importar
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar todos os clientes RFV
      const { data: customers, error: customersError } = await supabase
        .from('rfv_customers')
        .select('id, name, email, phone, whatsapp, segment, total_value, recency_score, frequency_score, value_score, last_purchase_date, cpf, prontuario');
      
      if (customersError) throw customersError;

      const stats = { total: customers.length, imported: 0, skipped: 0, errors: 0 };
      const existingSet = new Set(existingLeads);
      const stageMap = new Map(stages.map(s => [s.name, s.id]));

      // Processar em lotes
      const batchSize = 50;
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const leadsToInsert: any[] = [];

        for (const customer of batch) {
          // Pular se já importado
          if (existingSet.has(customer.id)) {
            stats.skipped++;
            continue;
          }

          // Encontrar o estágio correto
          const mapping = SEGMENT_MAPPING[customer.segment];
          const stageName = mapping?.stageName || 'Perdidos';
          const stageId = stageMap.get(stageName);

          if (!stageId) {
            stats.errors++;
            continue;
          }

          leadsToInsert.push({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            whatsapp: customer.whatsapp,
            cpf: customer.cpf,
            prontuario: customer.prontuario,
            pipeline_id: RFV_PIPELINE_ID,
            stage_id: stageId,
            rfv_customer_id: customer.id,
            estimated_value: customer.total_value,
            source: 'rfv_import',
            source_detail: `Segmento: ${customer.segment}`,
            created_by: user.id,
            notes: `Importado da Matriz RFV\nSegmento: ${customer.segment}\nR: ${customer.recency_score} | F: ${customer.frequency_score} | V: ${customer.value_score}`,
            tags: ['RFV', customer.segment]
          });
        }

        if (leadsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('crm_leads')
            .insert(leadsToInsert);

          if (insertError) {
            console.error('Erro ao inserir lote:', insertError);
            stats.errors += leadsToInsert.length;
          } else {
            stats.imported += leadsToInsert.length;
          }
        }

        setImportProgress(Math.round(((i + batchSize) / customers.length) * 100));
      }

      return stats;
    },
    onSuccess: (stats) => {
      setImportStats(stats);
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['rfv-imported-leads'] });
      toast.success(`Importação concluída! ${stats.imported} leads importados.`);
    },
    onError: (error) => {
      toast.error('Erro na importação: ' + error.message);
    }
  });

  const handleImport = () => {
    setImportProgress(0);
    setImportStats(null);
    importMutation.mutate();
  };

  const alreadyImported = existingLeads.length;
  const pendingImport = (rfvStats?.total || 0) - alreadyImported;

  return (
    <Card className="border-cyan-200 dark:border-cyan-800">
      <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30">
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-cyan-600" />
          Importar Clientes RFV para a Matriz
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-cyan-600" />
            <p className="text-2xl font-bold">{rfvStats?.total || 0}</p>
            <p className="text-sm text-muted-foreground">Total RFV</p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{alreadyImported}</p>
            <p className="text-sm text-muted-foreground">Já importados</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-bold text-amber-700">{pendingImport}</p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <RefreshCw className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{stages.length}</p>
            <p className="text-sm text-muted-foreground">Estágios</p>
          </div>
        </div>

        {/* Distribuição por segmento */}
        {rfvStats?.bySegment && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Distribuição por Segmento:</h4>
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(rfvStats.bySegment).sort((a, b) => b[1] - a[1]).map(([segment, count]) => {
                  const mapping = Object.values(SEGMENT_MAPPING).find(m => m.stageName === segment);
                  const Icon = mapping?.icon || Users;
                  const colorClass = mapping?.color || 'text-muted-foreground';
                  
                  return (
                    <div key={segment} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Icon className={`h-4 w-4 ${colorClass}`} />
                      <span className="text-sm flex-1">{segment}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Progresso de importação */}
        {importMutation.isPending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Importando...</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="h-2" />
          </div>
        )}

        {/* Resultado da importação */}
        {importStats && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Importação Concluída!</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-green-700">{importStats.imported}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-700">{importStats.skipped}</p>
                <p className="text-xs text-muted-foreground">Já existiam</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-700">{importStats.errors}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
          </div>
        )}

        {/* Botão de importação */}
        <Button 
          onClick={handleImport} 
          disabled={importMutation.isPending || pendingImport === 0}
          className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
          size="lg"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-2" />
              Importar {pendingImport} Clientes para a Matriz RFV
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Os clientes serão organizados automaticamente nos estágios conforme seu segmento RFV.
        </p>
      </CardContent>
    </Card>
  );
};
