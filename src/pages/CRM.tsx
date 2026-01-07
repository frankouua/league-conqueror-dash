import { useState, useEffect, useMemo, useRef } from "react";
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
import { CRMRFVMatrixImport } from "@/components/crm/CRMRFVMatrixImport";
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
import { CRMLeadActivities } from "@/components/crm/CRMLeadActivities";
import { CRMTeamRoutine } from "@/components/crm/CRMTeamRoutine";
import { CRMGroupChat } from "@/components/crm/CRMGroupChat";
import { CRMContactPoints } from "@/components/crm/CRMContactPoints";
import { CRMWhatsAppMonitor } from "@/components/crm/CRMWhatsAppMonitor";
import { CRMWhatsAppChat } from "@/components/crm/CRMWhatsAppChat";
import { CRMWhatsAppConnections } from "@/components/crm/CRMWhatsAppConnections";
import { CRMMarketingAutomations } from "@/components/crm/CRMMarketingAutomations";
import { CRMKeyboardShortcuts } from "@/components/crm/CRMKeyboardShortcuts";
import { CRMGlobalSearch } from "@/components/crm/CRMGlobalSearch";
import { CRMProposalTemplates } from "@/components/crm/CRMProposalTemplates";
import { CRMCalendarIntegration } from "@/components/crm/CRMCalendarIntegration";
import { CRMPredictiveAnalytics } from "@/components/crm/CRMPredictiveAnalytics";
import { CRMConversionFunnel } from "@/components/crm/CRMConversionFunnel";
import { CRMTeamPerformance } from "@/components/crm/CRMTeamPerformance";
import { CRMGamificationDashboard } from "@/components/crm/CRMGamificationDashboard";
import { CRMIntegrations } from "@/components/crm/CRMIntegrations";
import { CRMNavigationMenu, CRMViewMode } from "@/components/crm/CRMNavigationMenu";
import { CRMSurgeryDashboard } from "@/components/crm/CRMSurgeryDashboard";
import { CRMWhatsAppTemplates } from "@/components/crm/CRMWhatsAppTemplates";
import { CRMSmartAlerts } from "@/components/crm/CRMSmartAlerts";
import { CRMPipelineManager } from "@/components/crm/CRMPipelineManager";
import { useCRM, useCRMLeads, CRMLead } from "@/hooks/useCRM";
import { useAuth } from "@/contexts/AuthContext";
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
  Mail,
  Calendar,
  FileText,
  Search,
  Brain,
  Filter as FilterIcon,
  UserCheck,
  Gamepad2,
  Link2,
  Settings
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
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [chatLead, setChatLead] = useState<CRMLead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [viewMode, setViewMode] = useState<CRMViewMode>('kanban');
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
      
      {/* Keyboard Shortcuts */}
      <CRMKeyboardShortcuts
        onNavigate={(view) => setViewMode(view as typeof viewMode)}
        onNewLead={() => setNewLeadDialogOpen(true)}
        onRefresh={() => refetch()}
        onFocusSearch={() => setShowGlobalSearch(true)}
      />
      
      {/* Global Search */}
      <CRMGlobalSearch
        leads={leads}
        onSelectLead={handleLeadClick}
        onNavigate={(view) => setViewMode(view as typeof viewMode)}
        isOpen={showGlobalSearch}
        onOpenChange={setShowGlobalSearch}
      />
      
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

        {/* Simplified Navigation Menu */}
        <Card className="border-dashed">
          <CardContent className="p-3">
            <CRMNavigationMenu
              viewMode={viewMode}
              onViewChange={setViewMode}
              staleCount={quickStats.staleCount}
            />
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
            filteredLeads={filteredLeads}
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
          <CRMLeadActivities />
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

        {viewMode === 'rfv-matrix' && (
          <div className="space-y-6">
            <CRMRFVMatrixImport />
            <CRMKanban 
              pipelineId="66666666-6666-6666-6666-666666666666"
              stages={stages.filter(s => s.pipeline_id === "66666666-6666-6666-6666-666666666666")}
              onLeadClick={handleLeadClick}
              onNewLead={handleNewLead}
            />
          </div>
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

        {viewMode === 'calendar' && (
          <CRMCalendarIntegration />
        )}

        {viewMode === 'proposals' && (
          <CRMProposalTemplates />
        )}

        {viewMode === 'predictive' && (
          <CRMPredictiveAnalytics />
        )}

        {viewMode === 'funnel' && (
          <CRMConversionFunnel />
        )}

        {viewMode === 'team-performance' && (
          <CRMTeamPerformance />
        )}

        {viewMode === 'gamification' && (
          <CRMGamificationDashboard />
        )}

        {viewMode === 'integrations' && (
          <CRMIntegrations />
        )}

        {viewMode === 'surgery' && (
          <CRMSurgeryDashboard />
        )}

        {viewMode === 'templates' && (
          <CRMWhatsAppTemplates />
        )}

        {viewMode === 'alerts' && (
          <CRMSmartAlerts onLeadClick={(leadId) => {
            const lead = leads.find(l => l.id === leadId);
            if (lead) setSelectedLead(lead);
          }} />
        )}

        {viewMode === 'pipeline-manager' && isAdmin && (
          <CRMPipelineManager />
        )}
        
        {viewMode === 'pipeline-manager' && !isAdmin && (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Settings className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Acesso Restrito</h3>
              <p className="text-muted-foreground">
                Apenas gestores e administradores podem gerenciar pipelines e etapas.
              </p>
            </div>
          </Card>
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
