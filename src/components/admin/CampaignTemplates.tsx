import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  Bookmark, 
  Calendar,
  Target,
  CheckCircle2,
  Loader2,
  Trash2
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  goal_description: string | null;
  goal_value: number | null;
  goal_metric: string | null;
  prize_description: string | null;
  prize_value: number | null;
}

interface TemplateAction {
  id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  order_index: number;
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  mensal: "Mensal",
  semestral: "Semestral",
  anual: "Anual",
  oportuna: "Oportuna",
  estrategica: "Estratégica",
};

const CampaignTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["campaign-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_template", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Template[];
    },
  });

  // Fetch template actions
  const { data: templateActions = [] } = useQuery({
    queryKey: ["template-actions", selectedTemplate?.id],
    queryFn: async () => {
      if (!selectedTemplate) return [];
      const { data, error } = await supabase
        .from("campaign_actions")
        .select("*")
        .eq("campaign_id", selectedTemplate.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as TemplateAction[];
    },
    enabled: !!selectedTemplate,
  });

  // Create campaign from template
  const createFromTemplateMutation = useMutation({
    mutationFn: async (template: Template) => {
      // Create the new campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: `${template.name} - ${new Date().toLocaleDateString('pt-BR')}`,
          description: template.description,
          campaign_type: template.campaign_type,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          goal_description: template.goal_description,
          goal_value: template.goal_value,
          goal_metric: template.goal_metric,
          prize_description: template.prize_description,
          prize_value: template.prize_value,
          template_id: template.id,
          is_template: false,
          is_active: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Copy actions from template
      const { data: actions } = await supabase
        .from("campaign_actions")
        .select("*")
        .eq("campaign_id", template.id);

      if (actions && actions.length > 0) {
        const newActions = actions.map(a => ({
          campaign_id: newCampaign.id,
          title: a.title,
          description: a.description,
          is_required: a.is_required,
          order_index: a.order_index,
        }));

        const { error: actionsError } = await supabase
          .from("campaign_actions")
          .insert(newActions);

        if (actionsError) throw actionsError;
      }

      // Copy materials from template
      const { data: materials } = await supabase
        .from("campaign_materials")
        .select("*")
        .eq("campaign_id", template.id);

      if (materials && materials.length > 0) {
        const newMaterials = materials.map(m => ({
          campaign_id: newCampaign.id,
          title: m.title,
          material_type: m.material_type,
          url: m.url,
          content: m.content,
          order_index: m.order_index,
          created_by: user?.id,
        }));

        const { error: materialsError } = await supabase
          .from("campaign_materials")
          .insert(newMaterials);

        if (materialsError) throw materialsError;
      }

      return newCampaign;
    },
    onSuccess: () => {
      toast({ title: "Campanha criada a partir do template!", description: "Edite as datas e ative a campanha." });
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setIsConfirmOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao criar campanha", description: error.message, variant: "destructive" });
    },
  });

  // Delete template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template excluído!" });
      queryClient.invalidateQueries({ queryKey: ["campaign-templates"] });
    },
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          Templates de Campanha
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-2">Nenhum template salvo</p>
            <p className="text-xs">Crie uma campanha e marque como template para reutilizar</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {CAMPAIGN_TYPE_LABELS[template.campaign_type]}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {template.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {template.goal_value && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="w-3 h-3" />
                      <span>Meta: {template.goal_value}</span>
                    </div>
                  )}
                  {template.prize_value && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Prêmio: R$ {template.prize_value}</span>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsConfirmOpen(true);
                  }}
                >
                  <Copy className="w-3 h-3" />
                  Usar Template
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Campanha a partir do Template</DialogTitle>
              <DialogDescription>
                Uma nova campanha será criada com base em "{selectedTemplate?.name}". 
                Você poderá editar as datas e detalhes depois.
              </DialogDescription>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="space-y-3 py-4">
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Tipo: {CAMPAIGN_TYPE_LABELS[selectedTemplate.campaign_type]}</span>
                  </div>
                  {selectedTemplate.goal_description && (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{selectedTemplate.goal_description}</span>
                    </div>
                  )}
                  {templateActions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{templateActions.length} ações no checklist</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setIsConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => selectedTemplate && createFromTemplateMutation.mutate(selectedTemplate)}
                disabled={createFromTemplateMutation.isPending}
                className="gap-2"
              >
                {createFromTemplateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Criar Campanha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CampaignTemplates;
