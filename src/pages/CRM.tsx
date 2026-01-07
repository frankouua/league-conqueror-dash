import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { CRMKanban } from "@/components/crm/CRMKanban";
import { CRMStats } from "@/components/crm/CRMStats";
import { CRMNewLeadDialog } from "@/components/crm/CRMNewLeadDialog";
import { CRMLeadDetail } from "@/components/crm/CRMLeadDetail";
import { useCRM, useCRMLeads, CRMLead } from "@/hooks/useCRM";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  RefreshCw, 
  Filter,
  Search,
  Users,
  Target,
  Zap,
  LayoutGrid
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CRM = () => {
  const { pipelines, stages, pipelinesLoading, stagesLoading } = useCRM();
  
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssigned, setFilterAssigned] = useState<string>("all");
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

  const currentPipeline = pipelines.find(p => p.id === selectedPipeline);
  const pipelineStages = stages.filter(s => s.pipeline_id === selectedPipeline);

  // Apply filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);
    
    const matchesAssigned = filterAssigned === "all" || 
      (filterAssigned === "unassigned" && !lead.assigned_to) ||
      lead.assigned_to === filterAssigned;

    return matchesSearch && matchesAssigned;
  });

  const isLoading = pipelinesLoading || stagesLoading || leadsLoading;

  const handleNewLead = (stageId?: string) => {
    setInitialStageId(stageId);
    setNewLeadDialogOpen(true);
  };

  const handleLeadClick = (lead: CRMLead) => {
    setSelectedLead(lead);
  };

  const getPipelineIcon = (type: string) => {
    switch (type) {
      case 'sdr': return Users;
      case 'closer': return Target;
      case 'cs': return Zap;
      case 'farmer': return LayoutGrid;
      default: return Users;
    }
  };

  const getPipelineColor = (type: string) => {
    switch (type) {
      case 'sdr': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'closer': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'cs': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'farmer': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Count leads per pipeline (need all leads for this)
  const getLeadsCountForPipeline = (pipelineId: string) => {
    if (pipelineId === selectedPipeline) {
      return leads.length;
    }
    return 0; // We only have leads for selected pipeline
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              CRM Unique
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie leads, oportunidades e relacionamentos
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Pipeline Tabs */}
        <Tabs 
          value={selectedPipeline} 
          onValueChange={setSelectedPipeline}
          className="space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <TabsList className="h-auto p-1 bg-muted/50 flex-wrap">
              {pipelines.map((pipeline) => {
                const Icon = getPipelineIcon(pipeline.pipeline_type);
                const leadsCount = getLeadsCountForPipeline(pipeline.id);
                return (
                  <TabsTrigger
                    key={pipeline.id}
                    value={pipeline.id}
                    className="gap-2 data-[state=active]:bg-background"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{pipeline.name}</span>
                    {selectedPipeline === pipeline.id && (
                      <Badge 
                        variant="secondary" 
                        className={`ml-1 ${getPipelineColor(pipeline.pipeline_type)}`}
                      >
                        {leadsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-1 lg:justify-end">
              <div className="relative flex-1 lg:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lead..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <CRMStats pipelineId={selectedPipeline || undefined} />

          {/* Kanban for each pipeline */}
          {pipelines.map((pipeline) => (
            <TabsContent key={pipeline.id} value={pipeline.id} className="mt-0">
              <CRMKanban
                pipelineId={pipeline.id}
                stages={stages.filter(s => s.pipeline_id === pipeline.id)}
                onLeadClick={handleLeadClick}
                onNewLead={handleNewLead}
              />
            </TabsContent>
          ))}
        </Tabs>

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
      </main>
    </div>
  );
};

export default CRM;
