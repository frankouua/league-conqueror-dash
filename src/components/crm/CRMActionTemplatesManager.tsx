import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Plus, 
  Edit, 
  Trash2, 
  MessageSquare,
  Star,
  Zap,
  Users,
  Trophy,
  FileText,
  RefreshCcw,
  Gift,
  TrendingUp,
  Sparkles,
  Heart,
  Copy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ActionTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  template_text: string;
  channel: string;
  points_value: number;
  bonus_condition: string | null;
  bonus_points: number;
  variables: string[];
  is_active: boolean;
  usage_count: number;
}

const ACTION_TYPES = [
  { value: "nps", label: "NPS", icon: Star },
  { value: "campaign", label: "Campanha", icon: Zap },
  { value: "referral", label: "Indicação", icon: Users },
  { value: "ambassador", label: "Embaixadora", icon: Trophy },
  { value: "protocol", label: "Protocolo", icon: FileText },
  { value: "rfv_reactivation", label: "Reativação RFV", icon: RefreshCcw },
  { value: "rfv_bonus", label: "Bônus/Presente", icon: Gift },
  { value: "rfv_upgrade", label: "Upgrade", icon: TrendingUp },
  { value: "rfv_crosssell", label: "Cross-sell", icon: Sparkles },
  { value: "rfv_upsell", label: "Upsell", icon: TrendingUp },
  { value: "pre_consultation", label: "Pré-Consulta", icon: FileText },
  { value: "post_procedure", label: "Pós-Procedimento", icon: Heart },
  { value: "feedback", label: "Feedback", icon: MessageSquare },
  { value: "custom", label: "Personalizado", icon: MessageSquare },
];

const CATEGORIES = [
  { value: "script", label: "Scripts" },
  { value: "form", label: "Formulários" },
  { value: "campaign", label: "Campanhas" },
  { value: "rfv", label: "Estratégias RFV" },
  { value: "general", label: "Geral" },
];

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "all", label: "Todos" },
];

export default function CRMActionTemplatesManager() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [editingTemplate, setEditingTemplate] = useState<ActionTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "custom",
    category: "general",
    description: "",
    template_text: "",
    channel: "whatsapp",
    points_value: 10,
    bonus_condition: "",
    bonus_points: 0,
    variables: "",
    is_active: true,
  });

  // Buscar templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["action-templates-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_templates")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as ActionTemplate[];
    },
  });

  // Mutation para criar/editar
  const saveMutation = useMutation({
    mutationFn: async () => {
      const templateData = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        template_text: formData.template_text,
        channel: formData.channel,
        points_value: formData.points_value,
        bonus_condition: formData.bonus_condition || null,
        bonus_points: formData.bonus_points,
        variables: formData.variables.split(",").map(v => v.trim()).filter(Boolean),
        is_active: formData.is_active,
        created_by: profile?.user_id,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("action_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("action_templates")
          .insert(templateData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingTemplate ? "Template atualizado!" : "Template criado!");
      queryClient.invalidateQueries({ queryKey: ["action-templates"] });
      queryClient.invalidateQueries({ queryKey: ["action-templates-all"] });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error("Erro ao salvar template:", error);
      toast.error("Erro ao salvar template");
    },
  });

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("action_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template removido!");
      queryClient.invalidateQueries({ queryKey: ["action-templates"] });
      queryClient.invalidateQueries({ queryKey: ["action-templates-all"] });
    },
    onError: () => {
      toast.error("Erro ao remover template");
    },
  });

  // Mutation para duplicar
  const duplicateMutation = useMutation({
    mutationFn: async (template: ActionTemplate) => {
      const { error } = await supabase.from("action_templates").insert({
        name: `${template.name} (Cópia)`,
        type: template.type,
        category: template.category,
        description: template.description,
        template_text: template.template_text,
        channel: template.channel,
        points_value: template.points_value,
        bonus_condition: template.bonus_condition,
        bonus_points: template.bonus_points,
        variables: template.variables,
        is_active: true,
        created_by: profile?.user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template duplicado!");
      queryClient.invalidateQueries({ queryKey: ["action-templates"] });
      queryClient.invalidateQueries({ queryKey: ["action-templates-all"] });
    },
  });

  const handleOpenNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      type: "custom",
      category: "general",
      description: "",
      template_text: "",
      channel: "whatsapp",
      points_value: 10,
      bonus_condition: "",
      bonus_points: 0,
      variables: "nome",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: ActionTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      category: template.category,
      description: template.description || "",
      template_text: template.template_text,
      channel: template.channel,
      points_value: template.points_value,
      bonus_condition: template.bonus_condition || "",
      bonus_points: template.bonus_points,
      variables: Array.isArray(template.variables) ? template.variables.join(", ") : "",
      is_active: template.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const getTypeIcon = (type: string) => {
    const config = ACTION_TYPES.find(t => t.value === type);
    const Icon = config?.icon || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || "general";
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, ActionTemplate[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Templates de Ações</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os templates de mensagens e scripts
          </p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <ScrollArea className="h-[70vh]">
        <div className="space-y-6 pr-4">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                {CATEGORIES.find(c => c.value === category)?.label || category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryTemplates.map((template) => (
                  <Card key={template.id} className={!template.is_active ? "opacity-50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {getTypeIcon(template.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{template.name}</span>
                              {!template.is_active && (
                                <Badge variant="secondary">Inativo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{template.points_value} pts</Badge>
                              {template.bonus_points > 0 && (
                                <Badge variant="outline" className="text-green-600">
                                  +{template.bonus_points} bônus
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {template.usage_count || 0} usos
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateMutation.mutate(template)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Remover este template?")) {
                                deleteMutation.mutate(template.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum template criado ainda</p>
              <Button className="mt-4" onClick={handleOpenNew}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialog de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome do Template</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: NPS Mensal"
              />
            </div>

            <div>
              <Label>Tipo de Ação</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Canal</Label>
              <Select
                value={formData.channel}
                onValueChange={(v) => setFormData({ ...formData, channel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Variáveis (separadas por vírgula)</Label>
              <Input
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                placeholder="nome, valor, data_final"
              />
            </div>

            <div className="col-span-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição curta do template"
              />
            </div>

            <div className="col-span-2">
              <Label>Texto da Mensagem</Label>
              <Textarea
                value={formData.template_text}
                onChange={(e) => setFormData({ ...formData, template_text: e.target.value })}
                placeholder="Use {{variavel}} para variáveis dinâmicas"
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {"{{nome}}"} para nome do lead, {"{{valor}}"} para valores, etc.
              </p>
            </div>

            <div>
              <Label>Pontos por Resposta</Label>
              <Input
                type="number"
                value={formData.points_value}
                onChange={(e) => setFormData({ ...formData, points_value: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Pontos Bônus</Label>
              <Input
                type="number"
                value={formData.bonus_points}
                onChange={(e) => setFormData({ ...formData, bonus_points: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="col-span-2">
              <Label>Condição do Bônus</Label>
              <Input
                value={formData.bonus_condition}
                onChange={(e) => setFormData({ ...formData, bonus_condition: e.target.value })}
                placeholder="Ex: Se agendar consulta"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>Template ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formData.name || !formData.template_text}>
              {editingTemplate ? "Salvar Alterações" : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
