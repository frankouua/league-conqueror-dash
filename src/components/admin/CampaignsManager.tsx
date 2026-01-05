import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, Trash2, Edit, Loader2, Target, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  goal_description: string | null;
  goal_value: number | null;
  goal_metric: string | null;
  is_active: boolean;
  created_at: string;
}

interface CampaignAction {
  id?: string;
  title: string;
  description: string;
  is_required: boolean;
  order_index: number;
}

const CAMPAIGN_TYPES = [
  { value: "mensal", label: "Mensal" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "oportuna", label: "Oportuna" },
  { value: "estrategica", label: "Estratégica" },
];

const CampaignsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [actions, setActions] = useState<CampaignAction[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    campaign_type: "mensal",
    start_date: "",
    end_date: "",
    goal_description: "",
    goal_value: "",
    goal_metric: "unidades",
  });

  // Fetch all campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Fetch actions for editing campaign
  const { data: existingActions = [] } = useQuery({
    queryKey: ["campaign-actions-edit", editingId],
    queryFn: async () => {
      if (!editingId) return [];
      const { data, error } = await supabase
        .from("campaign_actions")
        .select("*")
        .eq("campaign_id", editingId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!editingId,
  });

  // Create campaign
  const createMutation = useMutation({
    mutationFn: async () => {
      // Create campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: formData.name,
          description: formData.description || null,
          campaign_type: formData.campaign_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          goal_description: formData.goal_description || null,
          goal_value: formData.goal_value ? parseFloat(formData.goal_value) : null,
          goal_metric: formData.goal_metric,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (campaignError) throw campaignError;

      // Create actions if any
      if (actions.length > 0 && campaignData) {
        const actionsToInsert = actions.map((a, idx) => ({
          campaign_id: campaignData.id,
          title: a.title,
          description: a.description || null,
          is_required: a.is_required,
          order_index: idx,
        }));

        const { error: actionsError } = await supabase
          .from("campaign_actions")
          .insert(actionsToInsert);
        
        if (actionsError) throw actionsError;
      }
    },
    onSuccess: () => {
      toast({ title: "Campanha criada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-active"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-upcoming"] });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar campanha", description: error.message, variant: "destructive" });
    },
  });

  // Update campaign
  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      // Update campaign
      const { error: campaignError } = await supabase
        .from("campaigns")
        .update({
          name: formData.name,
          description: formData.description || null,
          campaign_type: formData.campaign_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          goal_description: formData.goal_description || null,
          goal_value: formData.goal_value ? parseFloat(formData.goal_value) : null,
          goal_metric: formData.goal_metric,
        })
        .eq("id", id);
      
      if (campaignError) throw campaignError;

      // Delete existing actions and recreate
      await supabase.from("campaign_actions").delete().eq("campaign_id", id);

      if (actions.length > 0) {
        const actionsToInsert = actions.map((a, idx) => ({
          campaign_id: id,
          title: a.title,
          description: a.description || null,
          is_required: a.is_required,
          order_index: idx,
        }));

        const { error: actionsError } = await supabase
          .from("campaign_actions")
          .insert(actionsToInsert);
        
        if (actionsError) throw actionsError;
      }
    },
    onSuccess: () => {
      toast({ title: "Campanha atualizada!" });
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-active"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-actions"] });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("campaigns")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-active"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-upcoming"] });
    },
  });

  // Delete campaign
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Campanha excluída!" });
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-active"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns-upcoming"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      campaign_type: "mensal",
      start_date: "",
      end_date: "",
      goal_description: "",
      goal_value: "",
      goal_metric: "unidades",
    });
    setActions([]);
    setIsCreating(false);
    setEditingId(null);
    setShowActions(false);
  };

  const startEdit = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      campaign_type: campaign.campaign_type,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      goal_description: campaign.goal_description || "",
      goal_value: campaign.goal_value?.toString() || "",
      goal_metric: campaign.goal_metric || "unidades",
    });
    setEditingId(campaign.id);
    setIsCreating(true);
    setShowActions(true);
  };

  // Load existing actions when editing
  useState(() => {
    if (existingActions.length > 0) {
      setActions(existingActions.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description || "",
        is_required: a.is_required,
        order_index: a.order_index,
      })));
    }
  });

  const addAction = () => {
    setActions([...actions, { title: "", description: "", is_required: false, order_index: actions.length }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof CampaignAction, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const getTypeBadge = (type: string) => {
    const typeInfo = CAMPAIGN_TYPES.find(t => t.value === type);
    const colors: Record<string, string> = {
      mensal: "bg-blue-500",
      semestral: "bg-purple-500",
      anual: "bg-amber-500",
      oportuna: "bg-emerald-500",
      estrategica: "bg-rose-500",
    };
    return (
      <Badge className={`${colors[type]} text-white`}>
        {typeInfo?.label || type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Gerenciar Campanhas
        </h2>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Campanha
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingId ? "Editar Campanha" : "Criar Nova Campanha"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Campanha *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Black Friday 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.campaign_type}
                  onValueChange={(v) => setFormData({ ...formData, campaign_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o objetivo e contexto da campanha..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Meta da Campanha</Label>
                <Input
                  value={formData.goal_description}
                  onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
                  placeholder="Ex: Vender 50 procedimentos de lipoaspiração"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    value={formData.goal_value}
                    onChange={(e) => setFormData({ ...formData, goal_value: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Métrica</Label>
                  <Select
                    value={formData.goal_metric}
                    onValueChange={(v) => setFormData({ ...formData, goal_metric: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidades">Unidades</SelectItem>
                      <SelectItem value="currency">R$</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions/Checklist Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowActions(!showActions)}
              >
                <Label className="cursor-pointer flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Checklist de Ações ({actions.length})
                </Label>
                {showActions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>

              {showActions && (
                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-2 cursor-grab" />
                      <div className="flex-1 space-y-2">
                        <Input
                          value={action.title}
                          onChange={(e) => updateAction(index, "title", e.target.value)}
                          placeholder="Título da ação"
                        />
                        <Input
                          value={action.description}
                          onChange={(e) => updateAction(index, "description", e.target.value)}
                          placeholder="Descrição (opcional)"
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={action.is_required}
                            onCheckedChange={(checked) => updateAction(index, "is_required", checked)}
                          />
                          <span className="text-sm text-muted-foreground">Obrigatória</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeAction(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addAction} className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Ação
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => editingId ? updateMutation.mutate(editingId) : createMutation.mutate()}
                disabled={!formData.name || !formData.start_date || !formData.end_date || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingId ? "Salvar Alterações" : "Criar Campanha"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma campanha criada ainda</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        {campaign.goal_description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{campaign.goal_description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(campaign.campaign_type)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(campaign.start_date), "dd/MM", { locale: ptBR })} - {format(new Date(campaign.end_date), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={campaign.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: campaign.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(campaign)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(campaign.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignsManager;
