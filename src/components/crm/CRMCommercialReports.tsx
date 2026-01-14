import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, Download, User, TrendingUp, Clock, 
  CheckCircle2, XCircle, Calendar, DollarSign, Target,
  BarChart3, Users, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CRMCommercialReportsProps {
  pipelineId?: string;
}

export function CRMCommercialReports({ pipelineId }: CRMCommercialReportsProps) {
  const [reportType, setReportType] = useState<'lead' | 'seller'>('lead');
  const [period, setPeriod] = useState('current');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last':
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'last3':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  // Fetch leads with checklist data
  const { data: leadsData = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['commercial-reports-leads', pipelineId, period],
    queryFn: async () => {
      let query = supabase
        .from('crm_leads')
        .select(`
          id,
          name,
          phone,
          email,
          estimated_value,
          interested_procedures,
          stage_id,
          assigned_to,
          created_at,
          won_at,
          lost_at,
          surgery_date,
          checklist_total,
          checklist_completed,
          checklist_overdue,
          last_activity_at,
          total_interactions,
          stage:crm_stages(name, color),
          assigned_profile:profiles!crm_leads_assigned_to_fkey(full_name)
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch checklist items for detailed view
  const { data: checklistItems = [] } = useQuery({
    queryKey: ['lead-checklist-items', selectedLeadId],
    queryFn: async () => {
      if (!selectedLeadId) return [];
      
      const { data, error } = await supabase
        .from('lead_checklist_items')
        .select('*')
        .eq('lead_id', selectedLeadId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLeadId,
  });

  // Fetch sellers performance
  const { data: sellersData = [], isLoading: sellersLoading } = useQuery({
    queryKey: ['commercial-reports-sellers', pipelineId, period],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position')
        .in('position', ['comercial_1_captacao', 'comercial_2_closer', 'comercial_3_experiencia', 'comercial_4_farmer', 'sdr', 'coordenador', 'gerente']);
        
      if (profilesError) throw profilesError;

      const sellersStats = await Promise.all((profiles || []).map(async (profile) => {
        let query = supabase
          .from('crm_leads')
          .select('id, estimated_value, won_at, lost_at, checklist_total, checklist_completed, total_interactions')
          .eq('assigned_to', profile.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (pipelineId) {
          query = query.eq('pipeline_id', pipelineId);
        }

        const { data: leads } = await query;
        
        const totalLeads = leads?.length || 0;
        const wonLeads = leads?.filter(l => l.won_at).length || 0;
        const lostLeads = leads?.filter(l => l.lost_at).length || 0;
        const totalValue = leads?.reduce((acc, l) => acc + (l.estimated_value || 0), 0) || 0;
        const wonValue = leads?.filter(l => l.won_at).reduce((acc, l) => acc + (l.estimated_value || 0), 0) || 0;
        const totalTasks = leads?.reduce((acc, l) => acc + (l.checklist_total || 0), 0) || 0;
        const completedTasks = leads?.reduce((acc, l) => acc + (l.checklist_completed || 0), 0) || 0;
        const totalInteractions = leads?.reduce((acc, l) => acc + (l.total_interactions || 0), 0) || 0;

        return {
          ...profile,
          totalLeads,
          wonLeads,
          lostLeads,
          conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
          totalValue,
          wonValue,
          totalTasks,
          completedTasks,
          taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
          totalInteractions,
          avgInteractionsPerLead: totalLeads > 0 ? totalInteractions / totalLeads : 0,
        };
      }));

      return sellersStats.filter(s => s.totalLeads > 0).sort((a, b) => b.wonValue - a.wonValue);
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h];
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportLeadsReport = () => {
    const exportData = leadsData.map((lead: any) => ({
      Nome: lead.name,
      Email: lead.email || '',
      Telefone: lead.phone || '',
      Procedimentos: lead.interested_procedures?.join(', ') || '',
      Valor: lead.estimated_value || 0,
      Etapa: lead.stage?.name || '',
      Responsavel: lead.assigned_profile?.full_name || '',
      DataCriacao: format(new Date(lead.created_at), 'dd/MM/yyyy'),
      DataCirurgia: lead.surgery_date ? format(new Date(lead.surgery_date), 'dd/MM/yyyy') : '',
      TarefasTotal: lead.checklist_total || 0,
      TarefasConcluidas: lead.checklist_completed || 0,
      Status: lead.won_at ? 'Ganho' : lead.lost_at ? 'Perdido' : 'Em andamento',
    }));
    exportToCSV(exportData, 'relatorio_leads');
  };

  const exportSellersReport = () => {
    const exportData = sellersData.map((seller: any) => ({
      Vendedor: seller.full_name,
      Cargo: seller.position || '',
      TotalLeads: seller.totalLeads,
      LeadsGanhos: seller.wonLeads,
      LeadsPerdidos: seller.lostLeads,
      TaxaConversao: `${seller.conversionRate.toFixed(1)}%`,
      ValorTotal: seller.totalValue,
      ValorGanho: seller.wonValue,
      TarefasTotal: seller.totalTasks,
      TarefasConcluidas: seller.completedTasks,
      TaxaConclusaoTarefas: `${seller.taskCompletionRate.toFixed(1)}%`,
      TotalInteracoes: seller.totalInteractions,
    }));
    exportToCSV(exportData, 'relatorio_vendedores');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Relatórios Comerciais</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Mês Atual</SelectItem>
              <SelectItem value="last">Mês Anterior</SelectItem>
              <SelectItem value="last3">Últimos 3 Meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'lead' | 'seller')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lead" className="gap-2">
            <FileText className="h-4 w-4" />
            Por Lead/Paciente
          </TabsTrigger>
          <TabsTrigger value="seller" className="gap-2">
            <Users className="h-4 w-4" />
            Por Vendedor
          </TabsTrigger>
        </TabsList>

        {/* Lead Report */}
        <TabsContent value="lead" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportLeadsReport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Procedimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Tarefas</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsData.map((lead: any) => (
                      <TableRow 
                        key={lead.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedLeadId(selectedLeadId === lead.id ? null : lead.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.phone || lead.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{lead.interested_procedures?.[0] || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {lead.estimated_value ? formatCurrency(lead.estimated_value) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: lead.stage?.color, color: lead.stage?.color }}
                          >
                            {lead.stage?.name || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(lead.checklist_completed || 0) / Math.max(lead.checklist_total || 1, 1) * 100} 
                              className="w-16 h-2"
                            />
                            <span className="text-xs">
                              {lead.checklist_completed || 0}/{lead.checklist_total || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{lead.assigned_profile?.full_name || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {lead.won_at ? (
                            <Badge className="bg-green-500">Ganho</Badge>
                          ) : lead.lost_at ? (
                            <Badge variant="destructive">Perdido</Badge>
                          ) : (
                            <Badge variant="secondary">Em andamento</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Lead Detail Panel */}
          {selectedLeadId && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Detalhes das Tarefas do Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklistItems.map((item: any) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded border",
                        item.is_completed && "bg-green-500/10 border-green-500/30",
                        item.is_overdue && !item.is_completed && "bg-destructive/10 border-destructive/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {item.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : item.is_overdue ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.due_date && (
                          <span>Prazo: {format(new Date(item.due_date), 'dd/MM/yyyy HH:mm')}</span>
                        )}
                        {item.completed_at && (
                          <span className="text-green-600">
                            Concluído: {format(new Date(item.completed_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {checklistItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma tarefa registrada para este lead
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Seller Report */}
        <TabsContent value="seller" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportSellersReport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sellersData.map((seller: any) => (
              <Card key={seller.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{seller.full_name}</CardTitle>
                    </div>
                    <Badge variant="outline">{seller.position || 'Vendedor'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Leads Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold">{seller.totalLeads}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded">
                      <p className="text-lg font-bold text-green-600">{seller.wonLeads}</p>
                      <p className="text-[10px] text-muted-foreground">Ganhos</p>
                    </div>
                    <div className="p-2 bg-destructive/10 rounded">
                      <p className="text-lg font-bold text-destructive">{seller.lostLeads}</p>
                      <p className="text-[10px] text-muted-foreground">Perdidos</p>
                    </div>
                  </div>

                  {/* Conversion Rate */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Taxa de Conversão</span>
                      <span className="font-medium">{seller.conversionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={seller.conversionRate} className="h-2" />
                  </div>

                  {/* Value */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Valor Ganho</span>
                    <span className="font-bold text-green-600">{formatCurrency(seller.wonValue)}</span>
                  </div>

                  {/* Task Completion */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Tarefas Concluídas</span>
                      <span className="font-medium">
                        {seller.completedTasks}/{seller.totalTasks} ({seller.taskCompletionRate.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={seller.taskCompletionRate} className="h-2" />
                  </div>

                  {/* Interactions */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <span className="text-muted-foreground">Média interações/lead</span>
                    <span className="font-medium">{seller.avgInteractionsPerLead.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sellersData.length === 0 && !sellersLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum vendedor com leads no período selecionado</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
