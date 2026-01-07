import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Settings,
  LayoutGrid,
  Loader2,
  ChevronUp,
  ChevronDown,
  Users,
  Target,
  Zap,
  Star,
  Briefcase,
  TrendingUp,
  Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Pipeline {
  id: string;
  name: string;
  pipeline_type: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  order_index: number | null;
  is_active: boolean | null;
}

interface Stage {
  id: string;
  name: string;
  pipeline_id: string;
  order_index: number | null;
  color: string | null;
  description: string | null;
  is_win_stage: boolean | null;
  is_lost_stage: boolean | null;
  sla_hours: number | null;
}

const PIPELINE_TYPES = [
  { value: 'sdr', label: 'Prospecção (SDR)', icon: Users, color: 'from-blue-500 to-cyan-500' },
  { value: 'closer', label: 'Vendas (Closer)', icon: Target, color: 'from-green-500 to-emerald-500' },
  { value: 'cs', label: 'Pós-Venda (CS)', icon: Zap, color: 'from-purple-500 to-pink-500' },
  { value: 'farmer', label: 'Fidelização (Farmer)', icon: LayoutGrid, color: 'from-orange-500 to-amber-500' },
  { value: 'social_selling', label: 'Social Selling', icon: Share2, color: 'from-pink-500 to-rose-500' },
  { value: 'resgate', label: 'Resgate de Leads', icon: TrendingUp, color: 'from-red-500 to-orange-500' },
  { value: 'influencer', label: 'Influencers', icon: Star, color: 'from-yellow-500 to-amber-500' },
  { value: 'custom', label: 'Personalizado', icon: Briefcase, color: 'from-gray-500 to-slate-500' },
];

const STAGE_COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f59e0b'
];

export const CRMPipelineManager = () => {
  const [isAddPipelineOpen, setIsAddPipelineOpen] = useState(false);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  
  // Form states
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineType, setPipelineType] = useState('custom');
  const [pipelineDescription, setPipelineDescription] = useState('');
  
  const [stageName, setStageName] = useState('');
  const [stageColor, setStageColor] = useState(STAGE_COLORS[0]);
  const [stageDescription, setStageDescription] = useState('');
  const [isWinStage, setIsWinStage] = useState(false);
  const [isLostStage, setIsLostStage] = useState(false);
  const [stageSLA, setStageSLA] = useState('');

  const queryClient = useQueryClient();

  // Fetch pipelines
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines-manager'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data as Pipeline[];
    }
  });

  // Fetch stages for selected pipeline
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ['stages-manager', selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      const { data, error } = await supabase
        .from('crm_stages')
        .select('*')
        .eq('pipeline_id', selectedPipelineId)
        .order('order_index');
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!selectedPipelineId
  });

  // Create pipeline mutation
  const createPipelineMutation = useMutation({
    mutationFn: async (data: { name: string; pipeline_type: string; description: string }) => {
      const maxOrder = pipelines.length > 0 
        ? Math.max(...pipelines.map(p => p.order_index || 0)) + 1 
        : 0;
      
      const { error } = await supabase
        .from('crm_pipelines')
        .insert({
          name: data.name,
          pipeline_type: data.pipeline_type,
          description: data.description,
          order_index: maxOrder,
          is_active: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines-manager'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipelines'] });
      toast.success('Pipeline criado com sucesso!');
      setIsAddPipelineOpen(false);
      resetPipelineForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar pipeline: ' + error.message);
    }
  });

  // Update pipeline mutation
  const updatePipelineMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; pipeline_type: string; description: string }) => {
      const { error } = await supabase
        .from('crm_pipelines')
        .update({
          name: data.name,
          pipeline_type: data.pipeline_type,
          description: data.description
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines-manager'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipelines'] });
      toast.success('Pipeline atualizado!');
      setEditingPipeline(null);
      resetPipelineForm();
    }
  });

  // Delete pipeline mutation
  const deletePipelineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_pipelines')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines-manager'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipelines'] });
      toast.success('Pipeline excluído!');
      if (selectedPipelineId) setSelectedPipelineId(null);
    }
  });

  // Create stage mutation
  const createStageMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      pipeline_id: string; 
      color: string; 
      description: string;
      is_win_stage: boolean;
      is_lost_stage: boolean;
      sla_hours: number | null;
    }) => {
      const maxOrder = stages.length > 0 
        ? Math.max(...stages.map(s => s.order_index || 0)) + 1 
        : 0;
      
      const { error } = await supabase
        .from('crm_stages')
        .insert({
          ...data,
          order_index: maxOrder
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages-manager'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stages'] });
      toast.success('Etapa criada com sucesso!');
      setIsAddStageOpen(false);
      resetStageForm();
    }
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async (data: { 
      id: string;
      name: string; 
      color: string; 
      description: string;
      is_win_stage: boolean;
      is_lost_stage: boolean;
      sla_hours: number | null;
    }) => {
      const { error } = await supabase
        .from('crm_stages')
        .update({
          name: data.name,
          color: data.color,
          description: data.description,
          is_win_stage: data.is_win_stage,
          is_lost_stage: data.is_lost_stage,
          sla_hours: data.sla_hours
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages-manager'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stages'] });
      toast.success('Etapa atualizada!');
      setEditingStage(null);
      resetStageForm();
    }
  });

  // Delete stage mutation
  const deleteStageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_stages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages-manager'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stages'] });
      toast.success('Etapa excluída!');
    }
  });

  // Reorder stage mutation
  const reorderStageMutation = useMutation({
    mutationFn: async ({ stageId, newOrder }: { stageId: string; newOrder: number }) => {
      const { error } = await supabase
        .from('crm_stages')
        .update({ order_index: newOrder })
        .eq('id', stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages-manager'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stages'] });
    }
  });

  const moveStage = (stage: Stage, direction: 'up' | 'down') => {
    const currentIndex = stages.findIndex(s => s.id === stage.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= stages.length) return;
    
    const otherStage = stages[newIndex];
    
    // Swap order_index
    reorderStageMutation.mutate({ stageId: stage.id, newOrder: otherStage.order_index || newIndex });
    reorderStageMutation.mutate({ stageId: otherStage.id, newOrder: stage.order_index || currentIndex });
  };

  const resetPipelineForm = () => {
    setPipelineName('');
    setPipelineType('custom');
    setPipelineDescription('');
  };

  const resetStageForm = () => {
    setStageName('');
    setStageColor(STAGE_COLORS[0]);
    setStageDescription('');
    setIsWinStage(false);
    setIsLostStage(false);
    setStageSLA('');
  };

  const handleEditPipeline = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline);
    setPipelineName(pipeline.name);
    setPipelineType(pipeline.pipeline_type);
    setPipelineDescription(pipeline.description || '');
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setStageName(stage.name);
    setStageColor(stage.color || STAGE_COLORS[0]);
    setStageDescription(stage.description || '');
    setIsWinStage(stage.is_win_stage || false);
    setIsLostStage(stage.is_lost_stage || false);
    setStageSLA(stage.sla_hours?.toString() || '');
  };

  const handleSavePipeline = () => {
    if (!pipelineName.trim()) {
      toast.error('Nome do pipeline é obrigatório');
      return;
    }

    if (editingPipeline) {
      updatePipelineMutation.mutate({
        id: editingPipeline.id,
        name: pipelineName,
        pipeline_type: pipelineType,
        description: pipelineDescription
      });
    } else {
      createPipelineMutation.mutate({
        name: pipelineName,
        pipeline_type: pipelineType,
        description: pipelineDescription
      });
    }
  };

  const handleSaveStage = () => {
    if (!stageName.trim()) {
      toast.error('Nome da etapa é obrigatório');
      return;
    }

    if (!selectedPipelineId && !editingStage) {
      toast.error('Selecione um pipeline primeiro');
      return;
    }

    if (editingStage) {
      updateStageMutation.mutate({
        id: editingStage.id,
        name: stageName,
        color: stageColor,
        description: stageDescription,
        is_win_stage: isWinStage,
        is_lost_stage: isLostStage,
        sla_hours: stageSLA ? parseInt(stageSLA) : null
      });
    } else {
      createStageMutation.mutate({
        name: stageName,
        pipeline_id: selectedPipelineId!,
        color: stageColor,
        description: stageDescription,
        is_win_stage: isWinStage,
        is_lost_stage: isLostStage,
        sla_hours: stageSLA ? parseInt(stageSLA) : null
      });
    }
  };

  const getTypeConfig = (type: string) => {
    return PIPELINE_TYPES.find(t => t.value === type) || PIPELINE_TYPES[PIPELINE_TYPES.length - 1];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Pipelines</h2>
          <p className="text-muted-foreground">Configure seus pipelines e etapas do CRM</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipelines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                Pipelines
              </CardTitle>
              <Dialog open={isAddPipelineOpen || !!editingPipeline} onOpenChange={(open) => {
                if (!open) {
                  setIsAddPipelineOpen(false);
                  setEditingPipeline(null);
                  resetPipelineForm();
                } else {
                  setIsAddPipelineOpen(true);
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Pipeline
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPipeline ? 'Editar Pipeline' : 'Novo Pipeline'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome do Pipeline</Label>
                      <Input
                        value={pipelineName}
                        onChange={(e) => setPipelineName(e.target.value)}
                        placeholder="Ex: Social Selling"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={pipelineType} onValueChange={setPipelineType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PIPELINE_TYPES.map(type => {
                            const Icon = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={pipelineDescription}
                        onChange={(e) => setPipelineDescription(e.target.value)}
                        placeholder="Descreva o objetivo deste pipeline..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setIsAddPipelineOpen(false);
                      setEditingPipeline(null);
                      resetPipelineForm();
                    }}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSavePipeline}
                      disabled={createPipelineMutation.isPending || updatePipelineMutation.isPending}
                    >
                      {(createPipelineMutation.isPending || updatePipelineMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {pipelinesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {pipelines.map(pipeline => {
                    const config = getTypeConfig(pipeline.pipeline_type);
                    const Icon = config.icon;
                    const isSelected = selectedPipelineId === pipeline.id;

                    return (
                      <div
                        key={pipeline.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedPipelineId(pipeline.id)}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${config.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{pipeline.name}</p>
                          <p className="text-xs text-muted-foreground">{config.label}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPipeline(pipeline);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Excluir este pipeline?')) {
                                deletePipelineMutation.mutate(pipeline.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Stages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Etapas (Colunas)
                {selectedPipelineId && (
                  <Badge variant="secondary">
                    {pipelines.find(p => p.id === selectedPipelineId)?.name}
                  </Badge>
                )}
              </CardTitle>
              {selectedPipelineId && (
                <Dialog open={isAddStageOpen || !!editingStage} onOpenChange={(open) => {
                  if (!open) {
                    setIsAddStageOpen(false);
                    setEditingStage(null);
                    resetStageForm();
                  } else {
                    setIsAddStageOpen(true);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Nova Etapa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingStage ? 'Editar Etapa' : 'Nova Etapa'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da Etapa</Label>
                        <Input
                          value={stageName}
                          onChange={(e) => setStageName(e.target.value)}
                          placeholder="Ex: Qualificação"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <div className="flex gap-2 flex-wrap">
                          {STAGE_COLORS.map(color => (
                            <button
                              key={color}
                              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                                stageColor === color ? 'border-white scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setStageColor(color)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          value={stageDescription}
                          onChange={(e) => setStageDescription(e.target.value)}
                          placeholder="Descrição da etapa..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SLA (horas)</Label>
                        <Input
                          type="number"
                          value={stageSLA}
                          onChange={(e) => setStageSLA(e.target.value)}
                          placeholder="Ex: 24"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Etapa de Ganho (Fechamento)</Label>
                        <Switch checked={isWinStage} onCheckedChange={setIsWinStage} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Etapa de Perda</Label>
                        <Switch checked={isLostStage} onCheckedChange={setIsLostStage} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setIsAddStageOpen(false);
                        setEditingStage(null);
                        resetStageForm();
                      }}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSaveStage}
                        disabled={createStageMutation.isPending || updateStageMutation.isPending}
                      >
                        {(createStageMutation.isPending || updateStageMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPipelineId ? (
              <div className="text-center py-12 text-muted-foreground">
                <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um pipeline para ver as etapas</p>
              </div>
            ) : stagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() => moveStage(stage, 'up')}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={index === stages.length - 1}
                          onClick={() => moveStage(stage, 'down')}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div
                        className="w-4 h-full min-h-[40px] rounded"
                        style={{ backgroundColor: stage.color || STAGE_COLORS[0] }}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{stage.name}</p>
                          {stage.is_win_stage && (
                            <Badge className="bg-green-500 text-white text-xs">Ganho</Badge>
                          )}
                          {stage.is_lost_stage && (
                            <Badge variant="destructive" className="text-xs">Perda</Badge>
                          )}
                        </div>
                        {stage.sla_hours && (
                          <p className="text-xs text-muted-foreground">SLA: {stage.sla_hours}h</p>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditStage(stage)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Excluir esta etapa?')) {
                              deleteStageMutation.mutate(stage.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
