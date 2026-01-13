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
  Target, Sparkles, ArrowUpDown, Check, Eye, Bot, 
  Flame, Thermometer, Snowflake, Shield, Building2
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types
interface CRMClient {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  prontuario: string | null;
  feegow_id: string | null;
  // Team info
  team_id: string | null;
  team_name: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  // Values
  estimated_value: number;
  contract_value: number | null;
  // RFV data
  rfv_segment: string | null;
  rfv_score_r: number | null;
  rfv_score_f: number | null;
  rfv_score_v: number | null;
  total_value: number;
  total_purchases: number;
  days_since_last_purchase: number | null;
  last_purchase_date: string | null;
  // CRM data
  pipeline_id: string | null;
  pipeline_name: string | null;
  stage_id: string | null;
  stage_name: string | null;
  temperature: string | null;
  is_priority: boolean;
  // AI data
  ai_intent: string | null;
  ai_next_action: string | null;
  ai_summary: string | null;
  ai_analyzed_at: string | null;
  // Recurrence
  is_recurrence_lead: boolean;
  recurrence_due_date: string | null;
  recurrence_days_overdue: number | null;
  recurrence_group: string | null;
  // Dates
  created_at: string;
  last_activity_at: string | null;
  source: string | null;
  tags: string[] | null;
}

interface Team {
  id: string;
  name: string;
}

interface Pipeline {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  team_id: string;
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

const TEMPERATURE_CONFIG = {
  quente: { icon: Flame, color: 'text-red-500', bg: 'bg-red-100' },
  morno: { icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-100' },
  frio: { icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-100' },
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

const TemperatureBadge = memo(({ temperature }: { temperature: string | null }) => {
  if (!temperature) return <span className="text-muted-foreground text-sm">-</span>;
  
  const config = TEMPERATURE_CONFIG[temperature as keyof typeof TEMPERATURE_CONFIG];
  if (!config) return <Badge variant="outline">{temperature}</Badge>;
  
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", config.bg, config.color, "border-0")}>
      <Icon className="h-3 w-3" />
      {temperature.charAt(0).toUpperCase() + temperature.slice(1)}
    </Badge>
  );
});

const TeamBadge = memo(({ teamName }: { teamName: string | null }) => {
  if (!teamName) return <Badge variant="outline" className="text-muted-foreground">Sem Time</Badge>;
  
  const isLioness = teamName.toLowerCase().includes('lioness');
  const isTroia = teamName.toLowerCase().includes('troia') || teamName.toLowerCase().includes('tróia');
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1",
        isLioness && "bg-amber-100 text-amber-700 border-amber-300",
        isTroia && "bg-purple-100 text-purple-700 border-purple-300",
        !isLioness && !isTroia && "bg-gray-100 text-gray-700"
      )}
    >
      <Shield className="h-3 w-3" />
      {teamName}
    </Badge>
  );
});

const AISuggestionBadge = memo(({ client }: { client: CRMClient }) => {
  if (!client.ai_intent && !client.ai_next_action) {
    return (
      <span className="text-muted-foreground text-xs flex items-center gap-1">
        <Bot className="h-3 w-3" />
        Não analisado
      </span>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-1 max-w-[180px]">
            {client.ai_intent && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3 text-primary" />
                {client.ai_intent}
              </Badge>
            )}
            {client.ai_next_action && (
              <span className="text-xs text-muted-foreground truncate">
                {client.ai_next_action}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[300px]">
          <div className="space-y-2">
            <p className="font-medium">Sugestão da IA</p>
            {client.ai_summary && <p className="text-sm">{client.ai_summary}</p>}
            {client.ai_next_action && (
              <p className="text-sm text-muted-foreground">
                <strong>Próxima ação:</strong> {client.ai_next_action}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

const RecurrenceStatus = memo(({ client }: { client: CRMClient }) => {
  if (!client.is_recurrence_lead) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const days = client.recurrence_days_overdue || 0;
  let colorClass = "text-muted-foreground";
  let label = "No prazo";
  
  if (days > 60) {
    colorClass = "text-destructive";
    label = `${days}d atraso`;
  } else if (days > 0) {
    colorClass = "text-orange-500";
    label = `${days}d atraso`;
  } else if (days > -30) {
    colorClass = "text-amber-500";
    label = `Em ${Math.abs(days)}d`;
  }

  return (
    <div className="flex flex-col">
      <span className={cn("text-sm font-medium", colorClass)}>{label}</span>
      {client.recurrence_group && (
        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
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
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedTemperature, setSelectedTemperature] = useState('all');
  const [selectedPipeline, setSelectedPipeline] = useState('all');
  const [selectedRecurrence, setSelectedRecurrence] = useState('all');
  const [selectedAI, setSelectedAI] = useState('all');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'name' | 'estimated_value' | 'days_since_last_purchase' | 'created_at'>('estimated_value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [classifyingAI, setClassifyingAI] = useState(false);
  
  // Profile drawer state
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const openClientProfile = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    setProfileOpen(true);
  }, []);

  // Fetch clients from crm_leads with all joined data
  const { data: clients = [], isLoading: loadingClients, refetch } = useQuery({
    queryKey: ['crm-clients-list', selectedTeam, selectedSegment, selectedPipeline],
    queryFn: async (): Promise<CRMClient[]> => {
      // Função para buscar todos os registros com paginação
      const fetchAllPages = async () => {
        const allData: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from('crm_leads')
            .select(`
              id, name, phone, whatsapp, email, cpf, prontuario, feegow_id,
              team_id, assigned_to, estimated_value, contract_value,
              pipeline_id, stage_id, temperature, is_priority,
              ai_intent, ai_next_action, ai_summary, ai_analyzed_at,
              is_recurrence_lead, recurrence_due_date, recurrence_days_overdue, recurrence_group,
              created_at, last_activity_at, source, tags,
              teams:team_id (name),
              pipelines:pipeline_id (name),
              stages:stage_id (name),
              rfv_customer:rfv_customer_id (
                segment, recency_score, frequency_score, value_score,
                total_value, total_purchases, days_since_last_purchase, last_purchase_date
              )
            `)
            .order('estimated_value', { ascending: false, nullsFirst: false })
            .range(from, from + pageSize - 1);

          // Apply team filter at query level for performance
          if (selectedTeam !== 'all') {
            query = query.eq('team_id', selectedTeam);
          }

          // Apply pipeline filter
          if (selectedPipeline !== 'all') {
            query = query.eq('pipeline_id', selectedPipeline);
          }

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
            allData.push(...data);
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        return allData;
      };

      const data = await fetchAllPages();

      // Transform to flat structure
      return (data || []).map((lead: any): CRMClient => {
        const rfv = lead.rfv_customer;
        return {
          id: lead.id,
          name: lead.name || 'Sem nome',
          phone: lead.phone,
          whatsapp: lead.whatsapp,
          email: lead.email,
          cpf: lead.cpf,
          prontuario: lead.prontuario,
          feegow_id: lead.feegow_id,
          team_id: lead.team_id,
          team_name: lead.teams?.name || null,
          assigned_to: lead.assigned_to,
          assigned_name: null, // assigned_to doesn't have FK to users
          estimated_value: lead.estimated_value || rfv?.total_value || 0,
          contract_value: lead.contract_value,
          rfv_segment: rfv?.segment || null,
          rfv_score_r: rfv?.recency_score || null,
          rfv_score_f: rfv?.frequency_score || null,
          rfv_score_v: rfv?.value_score || null,
          total_value: rfv?.total_value || lead.estimated_value || 0,
          total_purchases: rfv?.total_purchases || 0,
          days_since_last_purchase: rfv?.days_since_last_purchase || null,
          last_purchase_date: rfv?.last_purchase_date || null,
          pipeline_id: lead.pipeline_id,
          pipeline_name: lead.pipelines?.name || null,
          stage_id: lead.stage_id,
          stage_name: lead.stages?.name || null,
          temperature: lead.temperature,
          is_priority: lead.is_priority || false,
          ai_intent: lead.ai_intent,
          ai_next_action: lead.ai_next_action,
          ai_summary: lead.ai_summary,
          ai_analyzed_at: lead.ai_analyzed_at,
          is_recurrence_lead: lead.is_recurrence_lead || false,
          recurrence_due_date: lead.recurrence_due_date,
          recurrence_days_overdue: lead.recurrence_days_overdue,
          recurrence_group: lead.recurrence_group,
          created_at: lead.created_at,
          last_activity_at: lead.last_activity_at,
          source: lead.source,
          tags: lead.tags,
        };
      });
    },
    staleTime: 30000,
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

  // Fetch pipelines
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines-list'],
    queryFn: async (): Promise<Pipeline[]> => {
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('id, name')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Fetch team members
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

  // Get stats
  const stats = useMemo(() => {
    const total = clients.length;
    const withTeam = clients.filter(c => c.team_id).length;
    const withAI = clients.filter(c => c.ai_analyzed_at).length;
    const totalValue = clients.reduce((sum, c) => sum + (c.estimated_value || 0), 0);
    
    const byTeam: Record<string, { count: number; value: number }> = {};
    clients.forEach(c => {
      const teamName = c.team_name || 'Sem Time';
      if (!byTeam[teamName]) byTeam[teamName] = { count: 0, value: 0 };
      byTeam[teamName].count++;
      byTeam[teamName].value += c.estimated_value || 0;
    });

    return { total, withTeam, withAI, totalValue, byTeam };
  }, [clients]);

  // Filter clients
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
        c.email?.toLowerCase().includes(searchLower) ||
        c.prontuario?.includes(search)
      );
    }

    // Segment filter
    if (selectedSegment !== 'all') {
      const segmentNames = Object.entries(SEGMENT_NAME_TO_KEY)
        .filter(([_, key]) => key === selectedSegment)
        .map(([name, _]) => name);
      result = result.filter(c => segmentNames.includes(c.rfv_segment || ''));
    }

    // Temperature filter
    if (selectedTemperature !== 'all') {
      result = result.filter(c => c.temperature === selectedTemperature);
    }

    // Recurrence filter
    if (selectedRecurrence !== 'all') {
      if (selectedRecurrence === 'has_recurrence') {
        result = result.filter(c => c.is_recurrence_lead);
      } else if (selectedRecurrence === 'overdue') {
        result = result.filter(c => c.is_recurrence_lead && (c.recurrence_days_overdue || 0) > 0);
      } else if (selectedRecurrence === 'critical') {
        result = result.filter(c => c.is_recurrence_lead && (c.recurrence_days_overdue || 0) > 60);
      }
    }

    // AI filter
    if (selectedAI !== 'all') {
      if (selectedAI === 'analyzed') {
        result = result.filter(c => c.ai_analyzed_at);
      } else if (selectedAI === 'not_analyzed') {
        result = result.filter(c => !c.ai_analyzed_at);
      } else if (selectedAI === 'priority') {
        result = result.filter(c => c.is_priority);
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
        case 'estimated_value':
          valA = a.estimated_value;
          valB = b.estimated_value;
          break;
        case 'days_since_last_purchase':
          valA = a.days_since_last_purchase || 9999;
          valB = b.days_since_last_purchase || 9999;
          break;
        case 'created_at':
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return result;
  }, [clients, search, selectedSegment, selectedTemperature, selectedRecurrence, selectedAI, sortField, sortDirection]);

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
      
      const { error } = await supabase
        .from('crm_leads')
        .update({ assigned_to: assigneeId, team_id: teamId })
        .in('id', clientIds);

      if (error) throw error;
      return { updated: clientIds.length };
    },
    onSuccess: (result) => {
      toast.success(`${result.updated} clientes atribuídos com sucesso`);
      setSelectedClients([]);
      setBulkAssigning(false);
      queryClient.invalidateQueries({ queryKey: ['crm-clients-list'] });
    },
    onError: (error) => {
      toast.error(`Erro na atribuição: ${error.message}`);
      setBulkAssigning(false);
    },
  });

  // AI Classification
  const classifyWithAI = useCallback(async () => {
    setClassifyingAI(true);
    try {
      const response = await supabase.functions.invoke('ai-lead-classifier', {
        body: { mode: 'batch', batchSize: 20 }
      });
      
      if (response.error) throw response.error;
      
      toast.success(`IA classificou ${response.data.classified} clientes`);
      refetch();
    } catch (error: any) {
      toast.error(`Erro na classificação: ${error.message}`);
    } finally {
      setClassifyingAI(false);
    }
  }, [refetch]);

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

  return (
    <div className="p-6 space-y-6">
      {/* Header Stats - Team Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(stats.byTeam).slice(0, 2).map(([teamName, data]) => (
          <Card 
            key={teamName}
            className={cn(
              "cursor-pointer transition-all",
              selectedTeam !== 'all' && teams.find(t => t.name === teamName)?.id === selectedTeam && "ring-2 ring-primary"
            )}
            onClick={() => {
              const team = teams.find(t => t.name === teamName);
              if (team) {
                setSelectedTeam(selectedTeam === team.id ? 'all' : team.id);
                setPage(1);
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  teamName.toLowerCase().includes('lioness') ? "bg-amber-100" : "bg-purple-100"
                )}>
                  <Shield className={cn(
                    "h-5 w-5",
                    teamName.toLowerCase().includes('lioness') ? "text-amber-600" : "text-purple-600"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{teamName}</p>
                  <p className="text-xl font-bold">{data.count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(data.value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
                {filteredClients.length} clientes • {stats.withAI} analisados por IA
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
                  className="pl-9 w-[200px]"
                />
              </div>

              {/* Team Filter */}
              <Select value={selectedTeam} onValueChange={(v) => { setSelectedTeam(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Times</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Pipeline Filter */}
              <Select value={selectedPipeline} onValueChange={(v) => { setSelectedPipeline(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Pipelines</SelectItem>
                  {pipelines.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Temperature Filter */}
              <Select value={selectedTemperature} onValueChange={(v) => { setSelectedTemperature(v); setPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Temperatura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="quente">🔥 Quente</SelectItem>
                  <SelectItem value="morno">🌡️ Morno</SelectItem>
                  <SelectItem value="frio">❄️ Frio</SelectItem>
                </SelectContent>
              </Select>

              {/* AI Filter */}
              <Select value={selectedAI} onValueChange={(v) => { setSelectedAI(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="IA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="analyzed">✅ Analisados</SelectItem>
                  <SelectItem value="not_analyzed">⏳ Não analisados</SelectItem>
                  <SelectItem value="priority">⚡ Prioridade</SelectItem>
                </SelectContent>
              </Select>

              {/* AI Classify Button */}
              <Button 
                variant="outline" 
                onClick={classifyWithAI} 
                disabled={classifyingAI}
                className="gap-2"
              >
                {classifyingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                Classificar IA
              </Button>

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
                      Atribuir ({selectedClients.length})
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
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
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
                      <TableHead>Time</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('estimated_value')}
                      >
                        <div className="flex items-center gap-1">
                          Valor
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Temp.</TableHead>
                      <TableHead>Sugestão IA</TableHead>
                      <TableHead>Pipeline</TableHead>
                      <TableHead className="w-[40px]" />
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
                        <TableRow 
                          key={client.id} 
                          className={cn(
                            selectedClients.includes(client.id) && "bg-primary/5",
                            client.is_priority && "bg-amber-50"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedClients.includes(client.id)}
                              onCheckedChange={() => toggleClient(client.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => openClientProfile(client.id)}
                              className="flex flex-col text-left hover:text-primary transition-colors group"
                            >
                              <span className="font-medium flex items-center gap-1">
                                {client.is_priority && <Sparkles className="h-3 w-3 text-amber-500" />}
                                {client.name}
                                <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {client.phone && <span>{client.phone}</span>}
                                {client.prontuario && <span>• #{client.prontuario}</span>}
                              </div>
                            </button>
                          </TableCell>
                          <TableCell>
                            <TeamBadge teamName={client.team_name} />
                          </TableCell>
                          <TableCell>
                            <RFVBadge segment={client.rfv_segment} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-primary">
                                {formatCurrency(client.estimated_value)}
                              </span>
                              {client.total_purchases > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {client.total_purchases} compras
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <TemperatureBadge temperature={client.temperature} />
                          </TableCell>
                          <TableCell>
                            <AISuggestionBadge client={client} />
                          </TableCell>
                          <TableCell>
                            {client.pipeline_name ? (
                              <Badge variant="outline" className="text-xs">
                                {client.pipeline_name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
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
                                  Ver Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleClient(client.id)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  {selectedClients.includes(client.id) ? 'Desmarcar' : 'Selecionar'}
                                </DropdownMenuItem>
                                {client.phone && (
                                  <DropdownMenuItem asChild>
                                    <a href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`} target="_blank">
                                      <Phone className="h-4 w-4 mr-2" />
                                      WhatsApp
                                    </a>
                                  </DropdownMenuItem>
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
                <div className="mt-4">
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
                    onPageSizeChange={() => {}}
                  />
                </div>
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
        clientSource="crm"
      />
    </div>
  );
}

export default ClientListDashboard;
