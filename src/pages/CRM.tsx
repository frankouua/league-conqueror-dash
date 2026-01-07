import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { CRMKanban } from "@/components/crm/CRMKanban";
import { CRMStats } from "@/components/crm/CRMStats";
import { CRMNewLeadDialog } from "@/components/crm/CRMNewLeadDialog";
import { CRMLeadDetail } from "@/components/crm/CRMLeadDetail";
import { CRMPipelineSelector } from "@/components/crm/CRMPipelineSelector";
import { CRMQuickFilters } from "@/components/crm/CRMQuickFilters";
import { CRMPipelineMetrics } from "@/components/crm/CRMPipelineMetrics";
import { CRMExportButton } from "@/components/crm/CRMExportButton";
import { CRMRFVIntegration } from "@/components/crm/CRMRFVIntegration";
import { CRMCampaignIntegration } from "@/components/crm/CRMCampaignIntegration";
import { CRMProtocolIntegration } from "@/components/crm/CRMProtocolIntegration";
import { CRMSalesMetrics } from "@/components/crm/CRMSalesMetrics";
import { CRMAutomations } from "@/components/crm/CRMAutomations";
import { CRMActivityFeed } from "@/components/crm/CRMActivityFeed";
import { CRMLeaderboard } from "@/components/crm/CRMLeaderboard";
import { CRMSalesCoachGeneral } from "@/components/crm/CRMSalesCoachGeneral";
import { CRMGoalIntegration } from "@/components/crm/CRMGoalIntegration";
import { CRMSmartSuggestions } from "@/components/crm/CRMSmartSuggestions";
import { CRMNotificationsPanel } from "@/components/crm/CRMNotificationsPanel";
import { CRMAIAssistant } from "@/components/crm/CRMAIAssistant";
import { CRMPerformanceDashboard } from "@/components/crm/CRMPerformanceDashboard";
import { CRMPostSaleFlow } from "@/components/crm/CRMPostSaleFlow";
import { CRMTeamRoutine } from "@/components/crm/CRMTeamRoutine";
import { CRMGroupChat } from "@/components/crm/CRMGroupChat";
import { CRMContactPoints } from "@/components/crm/CRMContactPoints";
import { CRMWhatsAppMonitor } from "@/components/crm/CRMWhatsAppMonitor";
import { CRMWhatsAppChat } from "@/components/crm/CRMWhatsAppChat";
import { CRMWhatsAppConnections } from "@/components/crm/CRMWhatsAppConnections";
import { CRMMarketingAutomations } from "@/components/crm/CRMMarketingAutomations";
import { useCRM, useCRMLeads, CRMLead } from "@/hooks/useCRM";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  RefreshCw, 
  Users,
  Sparkles,
  Activity,
  BarChart3,
  LayoutGrid,
  PieChart,
  Target,
  Zap,
  Trophy,
  TrendingUp,
  Package,
  MessageSquare,
  Clock,
  Phone,
  Heart,
  Bot,
  Smartphone,
  Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Fetch lead counts per pipeline
const useLeadCountsPerPipeline = () => {
  return useQuery({
    queryKey: ['crm-lead-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('pipeline_id, estimated_value');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      const values: Record<string, number> = {};
      
      data?.forEach(lead => {
        counts[lead.pipeline_id] = (counts[lead.pipeline_id] || 0) + 1;
        values[lead.pipeline_id] = (values[lead.pipeline_id] || 0) + (lead.estimated_value || 0);
      });
      
      return { counts, values };
    },
  });
};

const CRM = () => {
  const { pipelines, stages, pipelinesLoading, stagesLoading } = useCRM();
  const { data: leadCountData } = useLeadCountsPerPipeline();
  
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [chatLead, setChatLead] = useState<CRMLead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<
    'overview' | 'kanban' | 'metrics' | 'rfv' | 'campaigns' | 'protocols' | 
    'automations' | 'leaderboard' | 'whatsapp' | 'routine' | 'chat' | 
    'contacts' | 'postsale' | 'connections' | 'marketing'
  >('kanban');
  const [filters, setFilters] = useState({
    staleOnly: false,
    priorityOnly: false,
    aiAnalyzedOnly: false,
    unassignedOnly: false,
    recentOnly: false,
    highValueOnly: false,
    qualifiedOnly: false,
    wonOnly: false,
    lostOnly: false,
  });
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);
  const [initialStageId, setInitialStageId] = useState<string | undefined>();

  // Set default pipeline to SDR
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipeline) {
      const sdrPipeline = pipelines.find(p => p.pipeline_type === 'sdr');
      if (sdrPipeline) {
        setSelectedPipeline(sdrPipeline.id);
      } else {
        setSelectedPipeline(pipelines[0].id);
      }
    }
  }, [pipelines, selectedPipeline]);

  // Use the leads hook for the selected pipeline
  const { leads, isLoading: leadsLoading, refetch } = useCRMLeads(selectedPipeline);

  const pipelineStages = stages.filter(s => s.pipeline_id === selectedPipeline);

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  // Apply filters
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return leads.filter(lead => {
      // Search filter
      const matchesSearch = !searchQuery || 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.whatsapp?.includes(searchQuery);
      
      // Quick filters
      const matchesStale = !filters.staleOnly || lead.is_stale;
      const matchesPriority = !filters.priorityOnly || lead.is_priority;
      const matchesAI = !filters.aiAnalyzedOnly || !!lead.ai_analyzed_at;
      const matchesUnassigned = !filters.unassignedOnly || !lead.assigned_to;
      const matchesRecent = !filters.recentOnly || new Date(lead.created_at) > oneDayAgo;
      const matchesHighValue = !filters.highValueOnly || (lead.estimated_value && lead.estimated_value >= 10000);
      const matchesQualified = !filters.qualifiedOnly || (lead.lead_score && lead.lead_score >= 25);
      const matchesWon = !filters.wonOnly || !!lead.won_at;
      const matchesLost = !filters.lostOnly || !!lead.lost_at;

      return matchesSearch && matchesStale && matchesPriority && matchesAI && 
             matchesUnassigned && matchesRecent && matchesHighValue && 
             matchesQualified && matchesWon && matchesLost;
    });
  }, [leads, searchQuery, filters]);

  const isLoading = pipelinesLoading || stagesLoading || leadsLoading;

  const handleNewLead = (stageId?: string) => {
    setInitialStageId(stageId);
    setNewLeadDialogOpen(true);
  };

  const handleLeadClick = (lead: CRMLead) => {
    setSelectedLead(lead);
    // Also open chat if WhatsApp is available
    if (lead.whatsapp || lead.phone) {
      setChatLead(lead);
    }
  };

  // Calculate quick stats for current pipeline
  const quickStats = useMemo(() => {
    const staleCount = leads.filter(l => l.is_stale).length;
    const aiCount = leads.filter(l => l.ai_analyzed_at).length;
    const totalValue = leads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);
    return { staleCount, aiCount, totalValue };
  }, [leads]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              CRM Unique
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie leads, oportunidades e relacionamentos com inteligência
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <CRMExportButton 
              leads={filteredLeads} 
              pipelineName={pipelines.find(p => p.id === selectedPipeline)?.name}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => handleNewLead()}>
              <Plus className="w-4 h-4" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Navigation Tabs - Expanded */}
        <Card className="border-dashed">
          <CardContent className="p-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
                <TabsTrigger value="overview" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <PieChart className="w-4 h-4" />
                  <span className="hidden md:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden md:inline">Kanban</span>
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-1.5 px-3 data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  <Bot className="w-4 h-4" />
                  <span className="hidden md:inline">WhatsApp IA</span>
                </TabsTrigger>
                <TabsTrigger value="contacts" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="hidden md:inline">Contatos</span>
                </TabsTrigger>
                <TabsTrigger value="routine" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="hidden md:inline">Rotina</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden md:inline">Chat Equipe</span>
                </TabsTrigger>
                <TabsTrigger value="postsale" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Heart className="w-4 h-4" />
                  <span className="hidden md:inline">Pós-Venda</span>
                </TabsTrigger>
                <TabsTrigger value="metrics" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden md:inline">Métricas</span>
                </TabsTrigger>
                <TabsTrigger value="rfv" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Target className="w-4 h-4" />
                  <span className="hidden md:inline">RFV</span>
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden md:inline">Campanhas</span>
                </TabsTrigger>
                <TabsTrigger value="protocols" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Package className="w-4 h-4" />
                  <span className="hidden md:inline">Protocolos</span>
                </TabsTrigger>
                <TabsTrigger value="automations" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Zap className="w-4 h-4" />
                  <span className="hidden md:inline">Automações</span>
                </TabsTrigger>
                <TabsTrigger value="marketing" className="gap-1.5 px-3 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                  <Mail className="w-4 h-4" />
                  <span className="hidden md:inline">Marketing</span>
                </TabsTrigger>
                <TabsTrigger value="connections" className="gap-1.5 px-3 data-[state=active]:bg-green-600 data-[state=active]:text-white">
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden md:inline">Conexões</span>
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="gap-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Trophy className="w-4 h-4" />
                  <span className="hidden md:inline">Ranking</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Pipeline Selector - Only show for relevant views */}
        {['kanban', 'metrics', 'overview'].includes(viewMode) && (
          <Card className="border-dashed">
            <CardContent className="p-4">
              <CRMPipelineSelector
                pipelines={pipelines}
                selectedPipeline={selectedPipeline}
                onSelect={setSelectedPipeline}
                leadCounts={leadCountData?.counts}
                valueCounts={leadCountData?.values}
              />
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Bar - Only show for kanban/metrics */}
        {['kanban', 'metrics'].includes(viewMode) && (
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span><strong>{leads.length}</strong> leads no pipeline</span>
            </div>
            {quickStats.staleCount > 0 && (
              <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                {quickStats.staleCount} parados
              </Badge>
            )}
            {quickStats.aiCount > 0 && (
              <Badge variant="outline" className="border-purple-500/50 text-purple-500">
                <Sparkles className="w-3 h-3 mr-1" />
                {quickStats.aiCount} analisados
              </Badge>
            )}
            {quickStats.totalValue > 0 && (
              <Badge variant="outline" className="border-green-500/50 text-green-500">
                R$ {(quickStats.totalValue / 1000).toFixed(0)}k em pipeline
              </Badge>
            )}
          </div>
        )}

        {/* Filters - Only for kanban/overview */}
        {['kanban', 'overview'].includes(viewMode) && (
          <CRMQuickFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            activeFiltersCount={activeFiltersCount}
          />
        )}

        {/* Stats - Only for kanban */}
        {viewMode === 'kanban' && (
          <CRMStats pipelineId={selectedPipeline || undefined} />
        )}

        {/* View Mode Content */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            <CRMSmartSuggestions />
            <CRMPerformanceDashboard />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CRMGoalIntegration />
              </div>
              <div className="space-y-6">
                <CRMNotificationsPanel />
                <CRMSalesCoachGeneral />
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <CRMActivityFeed />
              <CRMAIAssistant />
            </div>
          </div>
        )}
        
        {viewMode === 'kanban' && (
          <CRMKanban
            pipelineId={selectedPipeline}
            stages={pipelineStages}
            onLeadClick={handleLeadClick}
            onNewLead={handleNewLead}
          />
        )}

        {viewMode === 'whatsapp' && (
          <CRMWhatsAppMonitor />
        )}

        {viewMode === 'contacts' && (
          <CRMContactPoints />
        )}

        {viewMode === 'routine' && (
          <CRMTeamRoutine />
        )}

        {viewMode === 'chat' && (
          <CRMGroupChat />
        )}

        {viewMode === 'postsale' && (
          <CRMPostSaleFlow />
        )}
        
        {viewMode === 'metrics' && (
          <div className="space-y-6">
            <CRMSalesMetrics />
            <div className="grid lg:grid-cols-2 gap-6">
              <CRMPipelineMetrics pipelineId={selectedPipeline} />
              <CRMStats pipelineId={selectedPipeline || undefined} />
            </div>
          </div>
        )}
        
        {viewMode === 'rfv' && (
          <CRMRFVIntegration />
        )}
        
        {viewMode === 'campaigns' && (
          <CRMCampaignIntegration />
        )}
        
        {viewMode === 'protocols' && (
          <CRMProtocolIntegration />
        )}
        
        {viewMode === 'automations' && (
          <CRMAutomations />
        )}

        {viewMode === 'marketing' && (
          <CRMMarketingAutomations />
        )}

        {viewMode === 'connections' && (
          <CRMWhatsAppConnections />
        )}
        
        {viewMode === 'leaderboard' && (
          <div className="space-y-6">
            <CRMLeaderboard />
            <CRMActivityFeed />
          </div>
        )}

        {/* New Lead Dialog */}
        <CRMNewLeadDialog
          open={newLeadDialogOpen}
          onClose={() => {
            setNewLeadDialogOpen(false);
            setInitialStageId(undefined);
          }}
          pipelineId={selectedPipeline}
          initialStageId={initialStageId}
          stages={pipelineStages}
        />

        {/* Lead Detail Drawer */}
        <CRMLeadDetail
          lead={selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
        />

        {/* WhatsApp Chat Drawer */}
        <CRMWhatsAppChat
          lead={chatLead}
          open={!!chatLead}
          onClose={() => setChatLead(null)}
        />
      </main>
    </div>
  );
};

export default CRM;
