import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Crown, Heart, Zap, AlertTriangle, Clock, RefreshCw, 
  UserPlus, Search, ArrowRight, TrendingUp, DollarSign,
  Loader2, CheckCircle, Star, Target, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCRM } from "@/hooks/useCRM";

interface RFVCustomer {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  segment: string;
  total_value: number;
  total_purchases: number;
  average_ticket: number;
  recency_score: number;
  frequency_score: number;
  value_score: number;
  days_since_last_purchase: number;
  last_purchase_date?: string;
}

const RFV_SEGMENTS = {
  champions: { name: 'Campeões', icon: Crown, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  loyal: { name: 'Fiéis', icon: Heart, color: 'bg-blue-500', textColor: 'text-blue-600' },
  potential: { name: 'Potenciais', icon: Zap, color: 'bg-amber-500', textColor: 'text-amber-600' },
  at_risk: { name: 'Em Risco', icon: AlertTriangle, color: 'bg-orange-500', textColor: 'text-orange-600' },
  hibernating: { name: 'Hibernando', icon: Clock, color: 'bg-purple-500', textColor: 'text-purple-600' },
  lost: { name: 'Perdidos', icon: RefreshCw, color: 'bg-red-500', textColor: 'text-red-600' },
};

// Suggested pipeline for each RFV segment
const SEGMENT_TO_PIPELINE_TYPE: Record<string, string> = {
  champions: 'upsell',
  loyal: 'retention',
  potential: 'nurture',
  at_risk: 'reactivation',
  hibernating: 'reactivation',
  lost: 'winback',
};

// Map Portuguese names to segment keys
const SEGMENT_NAME_TO_KEY: Record<string, string> = {
  'Campeões': 'champions',
  'Leais': 'loyal',
  'Fiéis': 'loyal',
  'Potenciais Leais': 'potential',
  'Potenciais': 'potential',
  'Novos': 'potential',
  'Promissores': 'potential',
  'Precisam Atenção': 'at_risk',
  'Em Risco': 'at_risk',
  'Não Podem Perder': 'at_risk',
  'Hibernando': 'hibernating',
  'Quase Dormindo': 'hibernating',
  'Perdidos': 'lost',
};

export function CRMRFVIntegration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pipelines } = useCRM();
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState<string | null>(null);

  // Fetch RFV customers
  const { data: rfvCustomers = [], isLoading } = useQuery({
    queryKey: ['rfv-customers-for-crm', selectedSegment],
    queryFn: async () => {
      let query = supabase
        .from('rfv_customers')
        .select('*')
        .order('total_value', { ascending: false })
        .limit(100);

      if (selectedSegment !== 'all') {
        query = query.eq('segment', selectedSegment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RFVCustomer[];
    },
  });

  // Check which customers are already in CRM
  const { data: existingLeads = [] } = useQuery({
    queryKey: ['crm-leads-rfv-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('rfv_customer_id')
        .not('rfv_customer_id', 'is', null);
      if (error) throw error;
      return data.map(l => l.rfv_customer_id);
    },
  });

  // Fetch segment stats
  const { data: segmentStats = {} } = useQuery({
    queryKey: ['rfv-segment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfv_customers')
        .select('segment');
      
      if (error) throw error;
      
      const stats: Record<string, number> = {};
      data.forEach(c => {
        const key = SEGMENT_NAME_TO_KEY[c.segment] || c.segment;
        stats[key] = (stats[key] || 0) + 1;
      });
      return stats;
    },
  });

  // Import customer to CRM
  const importToCRM = useMutation({
    mutationFn: async (customer: RFVCustomer) => {
      // Find best pipeline based on segment
      const segmentKey = SEGMENT_NAME_TO_KEY[customer.segment] || customer.segment;
      const suggestedPipelineType = SEGMENT_TO_PIPELINE_TYPE[segmentKey] || 'sales';
      
      // Find a pipeline that matches or use first available
      let targetPipeline = pipelines.find(p => 
        p.pipeline_type === suggestedPipelineType || 
        p.name.toLowerCase().includes(suggestedPipelineType)
      );
      
      if (!targetPipeline && pipelines.length > 0) {
        targetPipeline = pipelines[0];
      }

      if (!targetPipeline) {
        throw new Error('Nenhum pipeline disponível');
      }

      // Get first stage of pipeline
      const { data: stages } = await supabase
        .from('crm_stages')
        .select('id')
        .eq('pipeline_id', targetPipeline.id)
        .order('order_index', { ascending: true })
        .limit(1);

      if (!stages || stages.length === 0) {
        throw new Error('Pipeline sem estágios');
      }

      // Create lead
      const { error } = await supabase
        .from('crm_leads')
        .insert({
          name: customer.name,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          email: customer.email,
          pipeline_id: targetPipeline.id,
          stage_id: stages[0].id,
          rfv_customer_id: customer.id,
          source: 'rfv_import',
          source_detail: `Segmento RFV: ${customer.segment}`,
          estimated_value: customer.average_ticket,
          created_by: user?.id || '',
          tags: [customer.segment, `RFV-${segmentKey}`],
          notes: `Cliente importado da Matriz RFV\n\nSegmento: ${customer.segment}\nTicket Médio: R$ ${customer.average_ticket?.toFixed(2)}\nCompras: ${customer.total_purchases}\nÚltima compra: ${customer.last_purchase_date || 'N/A'}`,
        });

      if (error) throw error;
    },
    onSuccess: (_, customer) => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads-rfv-ids'] });
      toast.success(`${customer.name} importado para o CRM!`);
      setImporting(null);
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`);
      setImporting(null);
    },
  });

  // Bulk import
  const bulkImport = useMutation({
    mutationFn: async (customers: RFVCustomer[]) => {
      const notInCRM = customers.filter(c => !existingLeads.includes(c.id));
      
      for (const customer of notInCRM.slice(0, 20)) { // Limit to 20 at a time
        await importToCRM.mutateAsync(customer);
      }
      
      return notInCRM.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} clientes importados para o CRM!`);
    },
  });

  const filteredCustomers = rfvCustomers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSegmentConfig = (segment: string) => {
    const key = SEGMENT_NAME_TO_KEY[segment] || segment;
    return RFV_SEGMENTS[key as keyof typeof RFV_SEGMENTS] || RFV_SEGMENTS.potential;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(RFV_SEGMENTS).map(([key, config]) => {
          const SegmentIcon = config.icon;
          const count = segmentStats[key] || 0;
          return (
            <Card 
              key={key} 
              className={`cursor-pointer transition-all hover:shadow-md ${selectedSegment === key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedSegment(selectedSegment === key ? 'all' : key)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${config.color}`}>
                    <SegmentIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{config.name}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Importar da Matriz RFV
              </CardTitle>
              <CardDescription>
                Traga clientes da matriz RFV para o CRM e inicie jornadas de reativação, upsell ou retenção
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Button 
                onClick={() => bulkImport.mutate(filteredCustomers)}
                disabled={bulkImport.isPending}
                variant="outline"
                className="gap-2"
              >
                {bulkImport.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Importar Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cliente encontrado neste segmento
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredCustomers.map((customer) => {
                  const isInCRM = existingLeads.includes(customer.id);
                  const segmentConfig = getSegmentConfig(customer.segment);
                  const SegmentIcon = segmentConfig.icon;

                  return (
                    <div 
                      key={customer.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${isInCRM ? 'bg-muted/50' : 'hover:bg-accent/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${segmentConfig.color}`}>
                          <SegmentIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{customer.name}</p>
                            {isInCRM && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <CheckCircle className="h-3 w-3" />
                                No CRM
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(customer.average_ticket)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {customer.total_purchases} compras
                            </span>
                            <Badge variant="outline" className={segmentConfig.textColor}>
                              {customer.segment}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {!isInCRM && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setImporting(customer.id);
                            importToCRM.mutate(customer);
                          }}
                          disabled={importing === customer.id}
                          className="gap-1"
                        >
                          {importing === customer.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4" />
                              Importar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* RFV Score Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legenda dos Segmentos RFV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(RFV_SEGMENTS).map(([key, config]) => {
              const SegmentIcon = config.icon;
              const suggestedPipeline = SEGMENT_TO_PIPELINE_TYPE[key];
              return (
                <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-accent/30">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <SegmentIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{config.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Pipeline sugerido: <span className="font-medium capitalize">{suggestedPipeline}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CRMRFVIntegration;
