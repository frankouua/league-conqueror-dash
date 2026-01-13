import { useState, useMemo, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  Phone,
  MessageSquare,
  Search,
  Calendar,
  Users,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RecurrenceLeadRow } from './RecurrenceLeadRow';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useRecurrencePagination } from '@/hooks/useRecurrencePagination';

interface RecurrenceLead {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  last_procedure_date: string | null;
  last_procedure_name: string | null;
  recurrence_due_date: string | null;
  recurrence_days_overdue: number;
  recurrence_group: string | null;
  temperature: string | null;
  assigned_to: string | null;
  stage: {
    name: string;
    color: string;
  } | null;
}

interface RecurrenceStats {
  total_pending: number;
  upcoming_30_days: number;
  overdue_recent: number;
  overdue_critical: number;
  by_procedure_group: Record<string, number>;
}

const PROCEDURE_GROUPS = [
  { value: 'all', label: 'Todos os Procedimentos' },
  { value: '04 - SOROTERAPIA', label: 'Soroterapia / Implantes' },
  { value: '03 - PÓS OPERATÓRIO', label: 'Pós-Operatório' },
  { value: '08 - HARMONIZAÇÃO', label: 'Harmonização Facial' },
  { value: '09 - SPA', label: 'SPA e Estética' },
];

const URGENCY_FILTERS = [
  { value: 'all', label: 'Todas as Urgências' },
  { value: 'critical', label: 'Crítico (60+ dias)' },
  { value: 'overdue', label: 'Vencido (1-60 dias)' },
  { value: 'upcoming', label: 'Por Vencer (30 dias)' },
];

const YEAR_FILTERS = [
  { value: '2024', label: 'Desde 2024' },
  { value: '2025', label: 'Apenas 2025' },
];

const ASSIGNMENT_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'unassigned', label: 'Sem Atribuição' },
  { value: 'assigned', label: 'Com Atribuição' },
];

function CRMRecurrenceDashboardComponent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [isExpanded, setIsExpanded] = useState(true);
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);

  // Fetch recurrence stats with year filter
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['recurrence-stats', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recurrence_stats', { 
        p_year_from: parseInt(selectedYear) 
      });
      if (error) throw error;
      return data?.[0] as RecurrenceStats | null;
    },
    staleTime: 30000 // 30 seconds cache
  });

  // Fetch recurrence leads with optimized query
  const { data: leads, isLoading: loadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['recurrence-leads'],
    queryFn: async (): Promise<RecurrenceLead[]> => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          id, name, phone, whatsapp, email, cpf, temperature, assigned_to,
          last_procedure_date, last_procedure_name, recurrence_due_date,
          recurrence_days_overdue, recurrence_group,
          stage:crm_stages(name, color)
        `)
        .eq('is_recurrence_lead', true)
        .order('recurrence_days_overdue', { ascending: false, nullsFirst: false })
        .limit(2000);

      if (error) throw error;
      
      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        name: item.name as string,
        phone: item.phone as string | null,
        whatsapp: item.whatsapp as string | null,
        email: item.email as string | null,
        cpf: item.cpf as string | null,
        last_procedure_date: item.last_procedure_date as string | null,
        last_procedure_name: item.last_procedure_name as string | null,
        recurrence_due_date: item.recurrence_due_date as string | null,
        recurrence_days_overdue: (item.recurrence_days_overdue as number) || 0,
        recurrence_group: item.recurrence_group as string | null,
        temperature: item.temperature as string | null,
        assigned_to: item.assigned_to as string | null,
        stage: item.stage as { name: string; color: string } | null,
      }));
    },
    staleTime: 30000
  });

  // Fetch team members for assignment
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-sellers'],
    queryFn: async (): Promise<{ id: string; full_name: string; team_id: string }[]> => {
      const { data, error } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => Promise<{ data: unknown[]; error: unknown }> } })
        .from('users')
        .select('id, full_name, team_id, role, is_approved');
      if (error) throw error;
      const users = data as { id: string; full_name: string; team_id: string; role: string; is_approved: boolean }[];
      return users.filter(u => u.role === 'seller' && u.is_approved);
    },
    staleTime: 60000
  });

  // Run identification mutation with progress
  const identifyMutation = useMutation({
    mutationFn: async () => {
      setProcessingProgress(10);
      const { data, error } = await supabase.functions.invoke('identify-recurrences', {
        body: { daysAhead: 30, limit: 2000, createLeads: true, yearFrom: parseInt(selectedYear) }
      });
      setProcessingProgress(90);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setProcessingProgress(100);
      setTimeout(() => setProcessingProgress(null), 1000);
      toast.success(`${data.stats?.leadsCreated || 0} criados, ${data.stats?.leadsUpdated || 0} atualizados`);
      queryClient.invalidateQueries({ queryKey: ['recurrence-leads'] });
      queryClient.invalidateQueries({ queryKey: ['recurrence-stats'] });
    },
    onError: (error) => {
      setProcessingProgress(null);
      console.error('Identify error:', error);
      toast.error('Erro ao identificar: ' + (error as Error).message);
    }
  });

  // Auto-assign mutation
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      if (!teamMembers?.length) throw new Error('Nenhum vendedor disponível');
      
      const unassignedLeads = leads?.filter(l => !l.assigned_to) || [];
      if (unassignedLeads.length === 0) throw new Error('Todos os leads já estão atribuídos');
      
      let assignedCount = 0;
      for (let i = 0; i < unassignedLeads.length; i++) {
        const lead = unassignedLeads[i];
        const member = teamMembers[i % teamMembers.length];
        
        const { error } = await supabase
          .from('crm_leads')
          .update({ assigned_to: member.id })
          .eq('id', lead.id);
        
        if (!error) assignedCount++;
      }
      
      return { assignedCount, total: unassignedLeads.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.assignedCount} leads atribuídos automaticamente`);
      refetchLeads();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    }
  });

  // Filter leads with memoization
  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter(lead => {
      // Search filter - check name, phone, CPF, procedure
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = lead.name?.toLowerCase().includes(searchLower);
        const matchesPhone = lead.phone?.includes(search);
        const matchesCPF = lead.cpf?.includes(search);
        const matchesProcedure = lead.last_procedure_name?.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesPhone && !matchesCPF && !matchesProcedure) {
          return false;
        }
      }

      // Group filter
      if (selectedGroup !== 'all' && !lead.recurrence_group?.includes(selectedGroup)) {
        return false;
      }

      // Urgency filter
      if (selectedUrgency !== 'all') {
        const overdue = lead.recurrence_days_overdue || 0;
        if (selectedUrgency === 'critical' && overdue < 60) return false;
        if (selectedUrgency === 'overdue' && (overdue < 1 || overdue >= 60)) return false;
        if (selectedUrgency === 'upcoming' && overdue >= 0) return false;
      }

      // Assignment filter
      if (selectedAssignment === 'unassigned' && lead.assigned_to) return false;
      if (selectedAssignment === 'assigned' && !lead.assigned_to) return false;

      return true;
    });
  }, [leads, search, selectedGroup, selectedUrgency, selectedAssignment]);

  // Pagination hook
  const pagination = useRecurrencePagination(filteredLeads, { pageSize: 50 });

  // Toggle lead selection
  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  }, []);

  // Select all visible leads
  const selectAllVisible = useCallback(() => {
    const allIds = pagination.paginatedItems.map(l => l.id);
    setSelectedLeads(prev => {
      const newSelection = new Set([...prev, ...allIds]);
      return Array.from(newSelection);
    });
  }, [pagination.paginatedItems]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedLeads([]);
  }, []);

  // Handle WhatsApp dispatch
  const handleWhatsAppDispatch = useCallback(() => {
    if (selectedLeads.length === 0) {
      toast.warning('Selecione pelo menos um lead para disparar');
      return;
    }
    
    const selectedData = filteredLeads.filter(l => selectedLeads.includes(l.id));
    const firstLead = selectedData[0];
    
    if (firstLead?.whatsapp || firstLead?.phone) {
      const phone = (firstLead.whatsapp || firstLead.phone || '').replace(/\D/g, '');
      const message = encodeURIComponent(
        `Olá ${firstLead.name}! 💛 Tudo bem? Aqui é da Unique! Seu procedimento de ${firstLead.last_procedure_name || 'tratamento'} está próximo do vencimento. Que tal agendarmos sua renovação?`
      );
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    }

    toast.info(`${selectedLeads.length} leads selecionados para disparo`);
  }, [selectedLeads, filteredLeads]);

  // Stats for unassigned leads
  const unassignedCount = useMemo(() => {
    return leads?.filter(l => !l.assigned_to).length || 0;
  }, [leads]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Gestão de Recorrências
          </h2>
          <p className="text-sm text-muted-foreground">
            Identifique e recupere pacientes com procedimentos vencidos
          </p>
        </div>
        <div className="flex gap-2">
          {unassignedCount > 0 && (
            <Button 
              variant="outline"
              onClick={() => autoAssignMutation.mutate()}
              disabled={autoAssignMutation.isPending}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Atribuir ({unassignedCount})
            </Button>
          )}
          <Button 
            onClick={() => identifyMutation.mutate()}
            disabled={identifyMutation.isPending}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {identifyMutation.isPending ? 'Identificando...' : 'Identificar Recorrências'}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {processingProgress !== null && (
        <div className="space-y-1">
          <Progress value={processingProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Processando recorrências... {processingProgress}%
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Por Vencer</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.upcoming_30_days || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vencido Recente</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.overdue_recent || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Crítico (60+ dias)</p>
                <p className="text-2xl font-bold text-red-600">{stats?.overdue_critical || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pendentes</p>
                <p className="text-2xl font-bold text-green-600">{stats?.total_pending || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Procedure Groups Breakdown */}
      {stats?.by_procedure_group && Object.keys(stats.by_procedure_group).length > 0 && (
        <Card>
          <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Recorrências por Grupo de Procedimento
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
          {isExpanded && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(stats.by_procedure_group).map(([group, count], idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground truncate">{group}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Filters & Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* First row: Search and year */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone, CPF ou procedimento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_FILTERS.map(filter => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Second row: Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCEDURE_GROUPS.map(group => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_FILTERS.map(filter => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger className="w-[150px]">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_FILTERS.map(filter => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selection Actions */}
          {selectedLeads.length > 0 && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-primary/10 rounded-lg">
              <Badge variant="secondary">{selectedLeads.length} selecionados</Badge>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Limpar
              </Button>
              <Button size="sm" onClick={handleWhatsAppDispatch} className="gap-1 bg-green-600 hover:bg-green-700">
                <MessageSquare className="w-4 h-4" />
                Disparar WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pacientes com Recorrência ({filteredLeads.length})
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={selectAllVisible}>
              Selecionar Página
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {loadingLeads ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum paciente encontrado</p>
                <p className="text-xs mt-1">Execute a identificação de recorrências</p>
              </div>
            ) : (
              <div className="divide-y">
                {pagination.paginatedItems.map(lead => (
                  <RecurrenceLeadRow
                    key={lead.id}
                    lead={lead}
                    isSelected={selectedLeads.includes(lead.id)}
                    onToggleSelection={toggleLeadSelection}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {filteredLeads.length > 0 && (
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={filteredLeads.length}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
              onNextPage={pagination.nextPage}
              onPreviousPage={pagination.previousPage}
              onGoToPage={pagination.goToPage}
              onPageSizeChange={pagination.setPageSize}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const CRMRecurrenceDashboard = memo(CRMRecurrenceDashboardComponent);
