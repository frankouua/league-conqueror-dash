import { useState, useMemo, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Users, Search, Filter, UserPlus, Download, Phone, Mail,
  Crown, Heart, Zap, AlertTriangle, Clock, RefreshCw,
  ChevronDown, ChevronUp, MoreHorizontal, Loader2, 
  Calendar, DollarSign, TrendingUp, History, CheckCircle,
  Target, Sparkles, ArrowUpDown, Check, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientProfileDrawer } from './ClientProfileDrawer';

// Types
interface UnifiedClient {
  id: string;
  source: 'rfv' | 'patient' | 'crm';
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  prontuario: string | null;
  // RFV data
  rfv_segment: string | null;
  rfv_score_r: number | null;
  rfv_score_f: number | null;
  rfv_score_v: number | null;
  total_value: number;
  total_purchases: number;
  average_ticket: number;
  days_since_last_purchase: number | null;
  last_purchase_date: string | null;
  // Recurrence data
  has_recurrence: boolean;
  recurrence_due_date: string | null;
  recurrence_days_overdue: number | null;
  recurrence_group: string | null;
  // Assignment
  assigned_to: string | null;
  assigned_team: string | null;
  // CRM reference
  crm_lead_id: string | null;
}

interface TeamMember {
  id: string;
  full_name: string;
  team_id: string;
  team_name?: string;
}

interface Team {
  id: string;
  name: string;
}

// Constants
const RFV_SEGMENTS = {
  champions: { name: 'Campeões', icon: Crown, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  loyal: { name: 'Fiéis', icon: Heart, color: 'bg-blue-500', textColor: 'text-blue-600' },
  potential: { name: 'Potenciais', icon: Zap, color: 'bg-amber-500', textColor: 'text-amber-600' },
  at_risk: { name: 'Em Risco', icon: AlertTriangle, color: 'bg-orange-500', textColor: 'text-orange-600' },
  hibernating: { name: 'Hibernando', icon: Clock, color: 'bg-purple-500', textColor: 'text-purple-600' },
  lost: { name: 'Perdidos', icon: RefreshCw, color: 'bg-red-500', textColor: 'text-red-600' },
};

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

const PAGE_SIZE = 50;

// Helper Components
const ClientRowSkeleton = memo(() => (
  <TableRow className="animate-pulse">
    <TableCell><div className="h-4 w-4 bg-muted rounded" /></TableCell>
    <TableCell><div className="h-5 w-40 bg-muted rounded" /></TableCell>
    <TableCell><div className="h-5 w-24 bg-muted rounded" /></TableCell>
    <TableCell><div className="h-5 w-20 bg-muted rounded" /></TableCell>
    <TableCell><div className="h-5 w-16 bg-muted rounded" /></TableCell>
    <TableCell><div className="h-5 w-24 bg-muted rounded" /></TableCell>
    <TableCell><div className="h-5 w-24 bg-muted rounded" /></TableCell>
    <TableCell><div className="h-5 w-8 bg-muted rounded" /></TableCell>
  </TableRow>
));

const RFVBadge = memo(({ segment }: { segment: string | null }) => {
  if (!segment) return <span className="text-muted-foreground text-sm">-</span>;
  
  const key = SEGMENT_NAME_TO_KEY[segment] || segment;
  const config = RFV_SEGMENTS[key as keyof typeof RFV_SEGMENTS];
  if (!config) return <Badge variant="outline">{segment}</Badge>;
  
  const Icon = config.icon;
  return (
    <Badge className={cn("gap-1", config.color, "text-white border-0")}>
      <Icon className="h-3 w-3" />
      {config.name}
    </Badge>
  );
});

const RecurrenceStatus = memo(({ client }: { client: UnifiedClient }) => {
  if (!client.has_recurrence) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const days = client.recurrence_days_overdue || 0;
  let colorClass = "text-muted-foreground";
  let label = "No prazo";
  
  if (days > 60) {
    colorClass = "text-destructive";
    label = `${days} dias atraso`;
  } else if (days > 0) {
    colorClass = "text-orange-500";
    label = `${days} dias atraso`;
  } else if (days > -30) {
    colorClass = "text-amber-500";
    label = `Vence em ${Math.abs(days)} dias`;
  }

  return (
    <div className="flex flex-col">
      <span className={cn("text-sm font-medium", colorClass)}>{label}</span>
      {client.recurrence_group && (
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {client.recurrence_group}
        </span>
      )}
    </div>
  );
});

// Main Component
export function ClientListDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedRecurrence, setSelectedRecurrence] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState('all');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'name' | 'total_value' | 'days_since_last_purchase' | 'recurrence_days_overdue'>('total_value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  // Profile drawer state
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const openClientProfile = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    setProfileOpen(true);
  }, []);

  // Fetch unified client list from RFV customers with recurrence info
  const { data: clients = [], isLoading: loadingClients, refetch } = useQuery({
    queryKey: ['unified-clients', selectedSegment],
    queryFn: async (): Promise<UnifiedClient[]> => {
      // Fetch RFV customers as base
      let rfvQuery = supabase
        .from('rfv_customers')
        .select('*')
        .order('total_value', { ascending: false })
        .limit(5000);

      if (selectedSegment !== 'all') {
        const segmentNames = Object.entries(SEGMENT_NAME_TO_KEY)
          .filter(([_, key]) => key === selectedSegment)
          .map(([name, _]) => name);
        if (segmentNames.length > 0) {
          rfvQuery = rfvQuery.in('segment', segmentNames);
        }
      }

      const { data: rfvData, error: rfvError } = await rfvQuery;
      if (rfvError) throw rfvError;

      // Fetch existing CRM leads to check assignments and recurrences
      const { data: crmLeads, error: crmError } = await supabase
        .from('crm_leads')
        .select('id, rfv_customer_id, assigned_to, team_id, is_recurrence_lead, recurrence_due_date, recurrence_days_overdue, recurrence_group')
        .not('rfv_customer_id', 'is', null);

      if (crmError) console.warn('CRM leads fetch error:', crmError);

      // Create lookup map for CRM data
      const crmLookup = new Map<string, {
        id: string;
        assigned_to: string | null;
        team_id: string | null;
        is_recurrence_lead: boolean;
        recurrence_due_date: string | null;
        recurrence_days_overdue: number | null;
        recurrence_group: string | null;
      }>();

      crmLeads?.forEach(lead => {
        if (lead.rfv_customer_id) {
          crmLookup.set(lead.rfv_customer_id, {
            id: lead.id,
            assigned_to: lead.assigned_to,
            team_id: lead.team_id,
            is_recurrence_lead: lead.is_recurrence_lead || false,
            recurrence_due_date: lead.recurrence_due_date,
            recurrence_days_overdue: lead.recurrence_days_overdue,
            recurrence_group: lead.recurrence_group,
          });
        }
      });

      // Transform to unified format
      return (rfvData || []).map((rfv): UnifiedClient => {
        const crm = crmLookup.get(rfv.id);
        return {
          id: rfv.id,
          source: 'rfv',
          name: rfv.name || 'Sem nome',
          phone: rfv.phone,
          whatsapp: rfv.whatsapp,
          email: rfv.email,
          cpf: rfv.cpf,
          prontuario: rfv.prontuario,
          rfv_segment: rfv.segment,
          rfv_score_r: rfv.recency_score,
          rfv_score_f: rfv.frequency_score,
          rfv_score_v: rfv.value_score,
          total_value: rfv.total_value || 0,
          total_purchases: rfv.total_purchases || 0,
          average_ticket: rfv.average_ticket || 0,
          days_since_last_purchase: rfv.days_since_last_purchase,
          last_purchase_date: rfv.last_purchase_date,
          has_recurrence: crm?.is_recurrence_lead || false,
          recurrence_due_date: crm?.recurrence_due_date || null,
          recurrence_days_overdue: crm?.recurrence_days_overdue || null,
          recurrence_group: crm?.recurrence_group || null,
          assigned_to: crm?.assigned_to || null,
          assigned_team: crm?.team_id || null,
          crm_lead_id: crm?.id || null,
        };
      });
    },
    staleTime: 60000,
  });

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-distribution'],
    queryFn: async (): Promise<TeamMember[]> => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?select=id,full_name,team_id&role=eq.seller&is_approved=eq.true`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
    staleTime: 60000,
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Get segment stats
  const segmentStats = useMemo(() => {
    const stats: Record<string, number> = {};
    clients.forEach(c => {
      const key = SEGMENT_NAME_TO_KEY[c.rfv_segment || ''] || 'unknown';
      stats[key] = (stats[key] || 0) + 1;
    });
    return stats;
  }, [clients]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let result = clients;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search) ||
        c.whatsapp?.includes(search) ||
        c.cpf?.includes(search) ||
        c.email?.toLowerCase().includes(searchLower)
      );
    }

    // Recurrence filter
    if (selectedRecurrence !== 'all') {
      if (selectedRecurrence === 'has_recurrence') {
        result = result.filter(c => c.has_recurrence);
      } else if (selectedRecurrence === 'overdue') {
        result = result.filter(c => c.has_recurrence && (c.recurrence_days_overdue || 0) > 0);
      } else if (selectedRecurrence === 'critical') {
        result = result.filter(c => c.has_recurrence && (c.recurrence_days_overdue || 0) > 60);
      }
    }

    // Assignment filter
    if (selectedAssignment !== 'all') {
      if (selectedAssignment === 'unassigned') {
        result = result.filter(c => !c.assigned_to);
      } else if (selectedAssignment === 'assigned') {
        result = result.filter(c => c.assigned_to);
      } else {
        // Filter by specific team
        result = result.filter(c => c.assigned_team === selectedAssignment);
      }
    }

    // Sort
    result = [...result].sort((a, b) => {
      let valA: number | string | null = 0;
      let valB: number | string | null = 0;
      
      switch (sortField) {
        case 'name':
          valA = a.name;
          valB = b.name;
          break;
        case 'total_value':
          valA = a.total_value;
          valB = b.total_value;
          break;
        case 'days_since_last_purchase':
          valA = a.days_since_last_purchase || 9999;
          valB = b.days_since_last_purchase || 9999;
          break;
        case 'recurrence_days_overdue':
          valA = a.recurrence_days_overdue || -9999;
          valB = b.recurrence_days_overdue || -9999;
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return result;
  }, [clients, search, selectedRecurrence, selectedAssignment, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, page]);

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ clientIds, assigneeId, teamId }: { clientIds: string[]; assigneeId: string; teamId: string }) => {
      setBulkAssigning(true);
      
      // Get or create CRM leads for these clients
      const { data: pipelines } = await supabase
        .from('crm_pipelines')
        .select('id')
        .eq('pipeline_type', 'farmer')
        .single();
      
      if (!pipelines) throw new Error('Pipeline Farmer não encontrado');

      const { data: stages } = await supabase
        .from('crm_stages')
        .select('id')
        .eq('pipeline_id', pipelines.id)
        .order('order_index', { ascending: true })
        .limit(1);

      if (!stages || stages.length === 0) throw new Error('Estágio não encontrado');

      const stageId = stages[0].id;

      // Check which clients already have leads
      const { data: existingLeads } = await supabase
        .from('crm_leads')
        .select('id, rfv_customer_id')
        .in('rfv_customer_id', clientIds);

      const existingMap = new Map(existingLeads?.map(l => [l.rfv_customer_id, l.id]) || []);

      // Update existing leads
      const existingIds = Array.from(existingMap.values());
      if (existingIds.length > 0) {
        await supabase
          .from('crm_leads')
          .update({ assigned_to: assigneeId, team_id: teamId })
          .in('id', existingIds);
      }

      // Create new leads for clients without them
      const newClientIds = clientIds.filter(id => !existingMap.has(id));
      if (newClientIds.length > 0) {
        const clientsToCreate = clients.filter(c => newClientIds.includes(c.id));
        
        const newLeads = clientsToCreate.map(client => ({
          name: client.name,
          phone: client.phone,
          whatsapp: client.whatsapp,
          email: client.email,
          cpf: client.cpf,
          pipeline_id: pipelines.id,
          stage_id: stageId,
          rfv_customer_id: client.id,
          assigned_to: assigneeId,
          team_id: teamId,
          source: 'client_list_distribution',
          created_by: assigneeId,
          tags: [client.rfv_segment || 'Novo'].filter(Boolean),
        }));

        await supabase.from('crm_leads').insert(newLeads);
      }

      return { updated: existingIds.length, created: newClientIds.length };
    },
    onSuccess: (result) => {
      toast.success(`Distribuição concluída: ${result.updated} atualizados, ${result.created} criados`);
      setSelectedClients([]);
      setBulkAssigning(false);
      queryClient.invalidateQueries({ queryKey: ['unified-clients'] });
    },
    onError: (error) => {
      toast.error(`Erro na distribuição: ${error.message}`);
      setBulkAssigning(false);
    },
  });

  // Handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedClients.length === paginatedClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(paginatedClients.map(c => c.id));
    }
  }, [selectedClients.length, paginatedClients]);

  const toggleClient = useCallback((id: string) => {
    setSelectedClients(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }, []);

  const handleSort = useCallback((field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const handleBulkAssign = useCallback((assigneeId: string) => {
    const member = teamMembers.find(m => m.id === assigneeId);
    if (!member) return;
    
    bulkAssignMutation.mutate({
      clientIds: selectedClients,
      assigneeId,
      teamId: member.team_id,
    });
  }, [selectedClients, teamMembers, bulkAssignMutation]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getMemberName = useCallback((id: string | null) => {
    if (!id) return '-';
    const member = teamMembers.find(m => m.id === id);
    return member?.full_name || '-';
  }, [teamMembers]);

  return (
    <div className="p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedSegment === 'all' && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedSegment('all')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary">
                <Users className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(RFV_SEGMENTS).map(([key, config]) => {
          const SegmentIcon = config.icon;
          const count = segmentStats[key] || 0;
          return (
            <Card 
              key={key} 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedSegment === key && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedSegment(selectedSegment === key ? 'all' : key)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", config.color)}>
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

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Clientes
              </CardTitle>
              <CardDescription>
                Visão unificada de clientes com RFV, histórico e recorrências
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome, CPF, telefone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 w-[220px]"
                />
              </div>

              {/* Recurrence Filter */}
              <Select value={selectedRecurrence} onValueChange={(v) => { setSelectedRecurrence(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Recorrência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="has_recurrence">Com Recorrência</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="critical">Críticas (60+ dias)</SelectItem>
                </SelectContent>
              </Select>

              {/* Assignment Filter */}
              <Select value={selectedAssignment} onValueChange={(v) => { setSelectedAssignment(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Atribuição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unassigned">Sem Atribuição</SelectItem>
                  <SelectItem value="assigned">Com Atribuição</SelectItem>
                  <DropdownMenuSeparator />
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Bulk Actions */}
              {selectedClients.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" className="gap-2" disabled={bulkAssigning}>
                      {bulkAssigning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      Distribuir ({selectedClients.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Atribuir para</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[300px]">
                      {teamMembers.map(member => (
                        <DropdownMenuItem 
                          key={member.id}
                          onClick={() => handleBulkAssign(member.id)}
                        >
                          <Check className="h-4 w-4 mr-2 opacity-0" />
                          {member.full_name}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className={cn("h-4 w-4", loadingClients && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loadingClients ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <ClientRowSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedClients.length === paginatedClients.length && paginatedClients.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Cliente
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Segmento RFV</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('total_value')}
                      >
                        <div className="flex items-center gap-1">
                          Valor Total
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('days_since_last_purchase')}
                      >
                        <div className="flex items-center gap-1">
                          Última Compra
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('recurrence_days_overdue')}
                      >
                        <div className="flex items-center gap-1">
                          Recorrência
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedClients.map(client => (
                        <TableRow key={client.id} className={cn(selectedClients.includes(client.id) && "bg-primary/5")}>
                          <TableCell>
                            <Checkbox
                              checked={selectedClients.includes(client.id)}
                              onCheckedChange={() => toggleClient(client.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => openClientProfile(client.id)}
                              className="flex flex-col text-left hover:text-primary transition-colors"
                            >
                              <span className="font-medium flex items-center gap-1">
                                {client.name}
                                <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                              </span>
                              {client.cpf && (
                                <span className="text-xs text-muted-foreground">CPF: {client.cpf}</span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {client.phone && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                  <a href={`tel:${client.phone}`}><Phone className="h-3 w-3" /></a>
                                </Button>
                              )}
                              {client.email && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                  <a href={`mailto:${client.email}`}><Mail className="h-3 w-3" /></a>
                                </Button>
                              )}
                              {!client.phone && !client.email && <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <RFVBadge segment={client.rfv_segment} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-primary">{formatCurrency(client.total_value)}</span>
                              <span className="text-xs text-muted-foreground">{client.total_purchases} compras</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {client.last_purchase_date ? (
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {format(new Date(client.last_purchase_date), 'dd/MM/yyyy')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {client.days_since_last_purchase} dias atrás
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <RecurrenceStatus client={client} />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{getMemberName(client.assigned_to)}</span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openClientProfile(client.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Perfil Completo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleClient(client.id)}>
                                  {selectedClients.includes(client.id) ? 'Desmarcar' : 'Selecionar'}
                                </DropdownMenuItem>
                                {client.crm_lead_id && (
                                  <DropdownMenuItem>Ver no CRM</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={PAGE_SIZE}
                  totalItems={filteredClients.length}
                  startIndex={(page - 1) * PAGE_SIZE}
                  endIndex={Math.min(page * PAGE_SIZE, filteredClients.length)}
                  hasNextPage={page < totalPages}
                  hasPreviousPage={page > 1}
                  onNextPage={() => setPage(p => Math.min(p + 1, totalPages))}
                  onPreviousPage={() => setPage(p => Math.max(p - 1, 1))}
                  onGoToPage={setPage}
                  onPageSizeChange={() => {}} // Fixed page size for now
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Client Profile Drawer */}
      <ClientProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        clientId={selectedClientId || ''}
        clientSource="rfv"
      />
    </div>
  );
}

export default ClientListDashboard;
