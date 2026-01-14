import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, Download, User, TrendingUp, Clock, 
  CheckCircle2, XCircle, Calendar, DollarSign, Target,
  BarChart3, Users, Filter, X, RefreshCw, Search,
  ChevronDown, Layers, Briefcase, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CRMCommercialReportsProps {
  pipelineId?: string;
}

// Position labels map
const positionLabels: Record<string, string> = {
  'comercial_1_captacao': 'Captação',
  'comercial_2_closer': 'Closer',
  'comercial_3_experiencia': 'Experiência',
  'comercial_4_farmer': 'Farmer',
  'sdr': 'SDR',
  'coordenador': 'Coordenador',
  'gerente': 'Gerente',
};

export function CRMCommercialReports({ pipelineId: initialPipelineId }: CRMCommercialReportsProps) {
  const [reportType, setReportType] = useState<'lead' | 'seller'>('lead');
  
  // Filter states
  const [period, setPeriod] = useState('current');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(initialPipelineId || 'all');
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [valueRange, setValueRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Fetch pipelines
  const { data: pipelines = [] } = useQuery({
    queryKey: ['report-pipelines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch stages
  const { data: allStages = [] } = useQuery({
    queryKey: ['report-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_stages')
        .select('id, name, pipeline_id, color')
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sellers/profiles
  const { data: allSellers = [] } = useQuery({
    queryKey: ['report-sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, position')
        .in('position', ['comercial_1_captacao', 'comercial_2_closer', 'comercial_3_experiencia', 'comercial_4_farmer', 'sdr', 'coordenador', 'gerente'])
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Get available stages for selected pipeline
  const availableStages = useMemo(() => {
    if (selectedPipelineId === 'all') return allStages;
    return allStages.filter(s => s.pipeline_id === selectedPipelineId);
  }, [allStages, selectedPipelineId]);

  // Get unique procedures from leads
  const { data: allProcedures = [] } = useQuery({
    queryKey: ['report-procedures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('interested_procedures')
        .not('interested_procedures', 'is', null);
      if (error) throw error;
      
      const proceduresSet = new Set<string>();
      (data || []).forEach(lead => {
        (lead.interested_procedures || []).forEach((p: string) => proceduresSet.add(p));
      });
      return Array.from(proceduresSet).sort();
    },
  });

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'current':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last':
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'last3':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'last6':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case 'year':
        return { start: new Date(now.getFullYear(), 0, 1), end: endOfMonth(now) };
      case 'week':
        return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case 'last7':
        return { start: subDays(now, 7), end: now };
      case 'last30':
        return { start: subDays(now, 30), end: now };
      case 'custom':
        return {
          start: customStartDate ? parseISO(customStartDate) : startOfMonth(now),
          end: customEndDate ? parseISO(customEndDate) : endOfMonth(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  // Fetch leads with all data
  const { data: leadsData = [], isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ['commercial-reports-leads', selectedPipelineId, period, customStartDate, customEndDate],
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
          pipeline_id,
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
          temperature,
          ai_score,
          stage:crm_stages(id, name, color),
          pipeline:crm_pipelines(id, name),
          assigned_profile:profiles!crm_leads_assigned_to_fkey(id, full_name, position)
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (selectedPipelineId && selectedPipelineId !== 'all') {
        query = query.eq('pipeline_id', selectedPipelineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Apply client-side filters
  const filteredLeads = useMemo(() => {
    let result = [...leadsData];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((lead: any) => 
        lead.name?.toLowerCase().includes(q) ||
        lead.phone?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q)
      );
    }

    // Stage filter
    if (selectedStageIds.length > 0) {
      result = result.filter((lead: any) => selectedStageIds.includes(lead.stage_id));
    }

    // Seller filter
    if (selectedSellerIds.length > 0) {
      result = result.filter((lead: any) => selectedSellerIds.includes(lead.assigned_to));
    }

    // Position filter
    if (selectedPositions.length > 0) {
      result = result.filter((lead: any) => 
        lead.assigned_profile && selectedPositions.includes(lead.assigned_profile.position)
      );
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      result = result.filter((lead: any) => {
        if (selectedStatuses.includes('won') && lead.won_at) return true;
        if (selectedStatuses.includes('lost') && lead.lost_at) return true;
        if (selectedStatuses.includes('active') && !lead.won_at && !lead.lost_at) return true;
        return false;
      });
    }

    // Procedures filter
    if (selectedProcedures.length > 0) {
      result = result.filter((lead: any) =>
        lead.interested_procedures?.some((p: string) => selectedProcedures.includes(p))
      );
    }

    // Value range filter
    if (valueRange.min) {
      const minVal = parseFloat(valueRange.min);
      result = result.filter((lead: any) => (lead.estimated_value || 0) >= minVal);
    }
    if (valueRange.max) {
      const maxVal = parseFloat(valueRange.max);
      result = result.filter((lead: any) => (lead.estimated_value || 0) <= maxVal);
    }

    return result;
  }, [leadsData, searchQuery, selectedStageIds, selectedSellerIds, selectedPositions, selectedStatuses, selectedProcedures, valueRange]);

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

  // Calculate sellers data from filtered leads
  const sellersData = useMemo(() => {
    const sellerMap = new Map<string, any>();
    
    filteredLeads.forEach((lead: any) => {
      if (!lead.assigned_to) return;
      
      if (!sellerMap.has(lead.assigned_to)) {
        sellerMap.set(lead.assigned_to, {
          id: lead.assigned_to,
          full_name: lead.assigned_profile?.full_name || 'Desconhecido',
          position: lead.assigned_profile?.position || '',
          totalLeads: 0,
          wonLeads: 0,
          lostLeads: 0,
          totalValue: 0,
          wonValue: 0,
          totalTasks: 0,
          completedTasks: 0,
          totalInteractions: 0,
        });
      }
      
      const seller = sellerMap.get(lead.assigned_to);
      seller.totalLeads++;
      if (lead.won_at) {
        seller.wonLeads++;
        seller.wonValue += lead.estimated_value || 0;
      }
      if (lead.lost_at) seller.lostLeads++;
      seller.totalValue += lead.estimated_value || 0;
      seller.totalTasks += lead.checklist_total || 0;
      seller.completedTasks += lead.checklist_completed || 0;
      seller.totalInteractions += lead.total_interactions || 0;
    });

    return Array.from(sellerMap.values())
      .map(seller => ({
        ...seller,
        conversionRate: seller.totalLeads > 0 ? (seller.wonLeads / seller.totalLeads) * 100 : 0,
        taskCompletionRate: seller.totalTasks > 0 ? (seller.completedTasks / seller.totalTasks) * 100 : 0,
        avgInteractionsPerLead: seller.totalLeads > 0 ? seller.totalInteractions / seller.totalLeads : 0,
      }))
      .sort((a, b) => b.wonValue - a.wonValue);
  }, [filteredLeads]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredLeads.length;
    const won = filteredLeads.filter((l: any) => l.won_at).length;
    const lost = filteredLeads.filter((l: any) => l.lost_at).length;
    const active = filteredLeads.filter((l: any) => !l.won_at && !l.lost_at).length;
    const totalValue = filteredLeads.reduce((acc: number, l: any) => acc + (l.estimated_value || 0), 0);
    const wonValue = filteredLeads.filter((l: any) => l.won_at).reduce((acc: number, l: any) => acc + (l.estimated_value || 0), 0);

    return { total, won, lost, active, totalValue, wonValue };
  }, [filteredLeads]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const clearAllFilters = () => {
    setSelectedStageIds([]);
    setSelectedSellerIds([]);
    setSelectedPositions([]);
    setSelectedStatuses([]);
    setSelectedProcedures([]);
    setValueRange({ min: '', max: '' });
    setSearchQuery('');
  };

  const activeFiltersCount = [
    selectedStageIds.length > 0,
    selectedSellerIds.length > 0,
    selectedPositions.length > 0,
    selectedStatuses.length > 0,
    selectedProcedures.length > 0,
    valueRange.min || valueRange.max,
    searchQuery,
  ].filter(Boolean).length;

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h];
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value ?? '';
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportLeadsReport = () => {
    const exportData = filteredLeads.map((lead: any) => ({
      Nome: lead.name,
      Email: lead.email || '',
      Telefone: lead.phone || '',
      Procedimentos: lead.interested_procedures?.join(', ') || '',
      Valor: lead.estimated_value || 0,
      Funil: lead.pipeline?.name || '',
      Etapa: lead.stage?.name || '',
      Responsavel: lead.assigned_profile?.full_name || '',
      Cargo: positionLabels[lead.assigned_profile?.position] || lead.assigned_profile?.position || '',
      DataCriacao: format(new Date(lead.created_at), 'dd/MM/yyyy'),
      DataCirurgia: lead.surgery_date ? format(new Date(lead.surgery_date), 'dd/MM/yyyy') : '',
      TarefasTotal: lead.checklist_total || 0,
      TarefasConcluidas: lead.checklist_completed || 0,
      TarefasAtrasadas: lead.checklist_overdue || 0,
      TotalInteracoes: lead.total_interactions || 0,
      Temperatura: lead.temperature || '',
      ScoreIA: lead.ai_score || '',
      Status: lead.won_at ? 'Ganho' : lead.lost_at ? 'Perdido' : 'Em andamento',
      DataGanho: lead.won_at ? format(new Date(lead.won_at), 'dd/MM/yyyy') : '',
      DataPerdido: lead.lost_at ? format(new Date(lead.lost_at), 'dd/MM/yyyy') : '',
    }));
    exportToCSV(exportData, 'relatorio_leads_completo');
  };

  const exportSellersReport = () => {
    const exportData = sellersData.map((seller: any) => ({
      Vendedor: seller.full_name,
      Cargo: positionLabels[seller.position] || seller.position || '',
      TotalLeads: seller.totalLeads,
      LeadsGanhos: seller.wonLeads,
      LeadsPerdidos: seller.lostLeads,
      LeadsAtivos: seller.totalLeads - seller.wonLeads - seller.lostLeads,
      TaxaConversao: `${seller.conversionRate.toFixed(1)}%`,
      ValorTotal: seller.totalValue,
      ValorGanho: seller.wonValue,
      TarefasTotal: seller.totalTasks,
      TarefasConcluidas: seller.completedTasks,
      TaxaConclusaoTarefas: `${seller.taskCompletionRate.toFixed(1)}%`,
      TotalInteracoes: seller.totalInteractions,
      MediaInteracoesPorLead: seller.avgInteractionsPerLead.toFixed(1),
    }));
    exportToCSV(exportData, 'relatorio_vendedores_completo');
  };

  const toggleArrayFilter = (array: string[], setArray: (val: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Relatórios Comerciais</h2>
          <Badge variant="secondary" className="ml-2">
            {filteredLeads.length} leads
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(activeFiltersCount > 0 && "border-primary text-primary")}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetchLeads()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-4">
              {/* Row 1: Period & Pipeline & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Período
                  </Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Esta Semana</SelectItem>
                      <SelectItem value="last7">Últimos 7 dias</SelectItem>
                      <SelectItem value="current">Mês Atual</SelectItem>
                      <SelectItem value="last">Mês Anterior</SelectItem>
                      <SelectItem value="last30">Últimos 30 dias</SelectItem>
                      <SelectItem value="last3">Últimos 3 Meses</SelectItem>
                      <SelectItem value="last6">Últimos 6 Meses</SelectItem>
                      <SelectItem value="year">Este Ano</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {period === 'custom' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Data Início</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Data Fim</Label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Funil
                  </Label>
                  <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos os funis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Funis</SelectItem>
                      {pipelines.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Search className="h-3 w-3" /> Buscar
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome, telefone, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pl-8"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Stage, Seller, Position, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Stage Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-between text-left font-normal">
                      <span className="truncate">
                        {selectedStageIds.length > 0 
                          ? `${selectedStageIds.length} etapa(s)` 
                          : 'Etapa'}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <ScrollArea className="h-64">
                      <div className="space-y-1">
                        {availableStages.map((stage: any) => (
                          <div
                            key={stage.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleArrayFilter(selectedStageIds, setSelectedStageIds, stage.id)}
                          >
                            <Checkbox checked={selectedStageIds.includes(stage.id)} />
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-sm truncate">{stage.name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Seller Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-between text-left font-normal">
                      <span className="truncate">
                        {selectedSellerIds.length > 0 
                          ? `${selectedSellerIds.length} vendedor(es)` 
                          : 'Vendedor'}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <ScrollArea className="h-64">
                      <div className="space-y-1">
                        {allSellers.map((seller: any) => (
                          <div
                            key={seller.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleArrayFilter(selectedSellerIds, setSelectedSellerIds, seller.id)}
                          >
                            <Checkbox checked={selectedSellerIds.includes(seller.id)} />
                            <span className="text-sm truncate">{seller.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Position Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-between text-left font-normal">
                      <span className="truncate">
                        {selectedPositions.length > 0 
                          ? `${selectedPositions.length} cargo(s)` 
                          : 'Cargo'}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1">
                      {Object.entries(positionLabels).map(([key, label]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                          onClick={() => toggleArrayFilter(selectedPositions, setSelectedPositions, key)}
                        >
                          <Checkbox checked={selectedPositions.includes(key)} />
                          <span className="text-sm">{label}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Status Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-between text-left font-normal">
                      <span className="truncate">
                        {selectedStatuses.length > 0 
                          ? `${selectedStatuses.length} status` 
                          : 'Status'}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-2" align="start">
                    <div className="space-y-1">
                      {[
                        { key: 'active', label: 'Em andamento', color: 'bg-blue-500' },
                        { key: 'won', label: 'Ganho', color: 'bg-green-500' },
                        { key: 'lost', label: 'Perdido', color: 'bg-destructive' },
                      ].map((status) => (
                        <div
                          key={status.key}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                          onClick={() => toggleArrayFilter(selectedStatuses, setSelectedStatuses, status.key)}
                        >
                          <Checkbox checked={selectedStatuses.includes(status.key)} />
                          <div className={cn("w-2 h-2 rounded-full", status.color)} />
                          <span className="text-sm">{status.label}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Row 3: Procedures & Value Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Procedures Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 justify-between text-left font-normal">
                      <span className="flex items-center gap-1 truncate">
                        <Tag className="h-3 w-3" />
                        {selectedProcedures.length > 0 
                          ? `${selectedProcedures.length} procedimento(s)` 
                          : 'Procedimentos'}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    <ScrollArea className="h-64">
                      <div className="space-y-1">
                        {allProcedures.map((proc: string) => (
                          <div
                            key={proc}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                            onClick={() => toggleArrayFilter(selectedProcedures, setSelectedProcedures, proc)}
                          >
                            <Checkbox checked={selectedProcedures.includes(proc)} />
                            <span className="text-sm truncate">{proc}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {/* Value Range */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Valor Mínimo
                  </Label>
                  <Input
                    type="number"
                    placeholder="R$ 0"
                    value={valueRange.min}
                    onChange={(e) => setValueRange({ ...valueRange, min: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Valor Máximo
                  </Label>
                  <Input
                    type="number"
                    placeholder="Sem limite"
                    value={valueRange.max}
                    onChange={(e) => setValueRange({ ...valueRange, max: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{summaryMetrics.total}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{summaryMetrics.won}</p>
            <p className="text-xs text-muted-foreground">Ganhos</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{summaryMetrics.lost}</p>
            <p className="text-xs text-muted-foreground">Perdidos</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{summaryMetrics.active}</p>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{formatCurrency(summaryMetrics.totalValue)}</p>
            <p className="text-xs text-muted-foreground">Valor Pipeline</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-green-600">{formatCurrency(summaryMetrics.wonValue)}</p>
            <p className="text-xs text-muted-foreground">Valor Ganho</p>
          </CardContent>
        </Card>
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
                      <TableHead>Funil</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Tarefas</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead: any) => (
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
                          <span className="text-xs text-muted-foreground">{lead.pipeline?.name || '-'}</span>
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
                          <div>
                            <span className="text-sm">{lead.assigned_profile?.full_name || '-'}</span>
                            {lead.assigned_profile?.position && (
                              <p className="text-xs text-muted-foreground">
                                {positionLabels[lead.assigned_profile.position] || lead.assigned_profile.position}
                              </p>
                            )}
                          </div>
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
                    {filteredLeads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhum lead encontrado com os filtros selecionados
                        </TableCell>
                      </TableRow>
                    )}
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
                    <Badge variant="outline">
                      {positionLabels[seller.position] || seller.position || 'Vendedor'}
                    </Badge>
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

          {sellersData.length === 0 && (
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
