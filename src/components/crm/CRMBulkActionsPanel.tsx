import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Send, 
  MessageSquare, 
  Mail, 
  Smartphone,
  Users,
  Zap,
  FileText,
  Trophy,
  Star,
  Heart,
  Gift,
  TrendingUp,
  RefreshCcw,
  X,
  Check,
  Copy,
  Eye,
  Sparkles
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
  usage_count?: number;
  bonus_condition: string | null;
  bonus_points: number;
  variables: string[];
}

interface CRMBulkActionsPanelProps {
  selectedLeads: string[];
  onClose: () => void;
  open: boolean;
}

const ACTION_ICONS: Record<string, any> = {
  nps: Star,
  campaign: Zap,
  referral: Users,
  ambassador: Trophy,
  protocol: FileText,
  rfv_reactivation: RefreshCcw,
  rfv_bonus: Gift,
  rfv_upgrade: TrendingUp,
  rfv_crosssell: Sparkles,
  rfv_upsell: TrendingUp,
  pre_consultation: FileText,
  post_procedure: Heart,
  feedback: MessageSquare,
  custom: MessageSquare,
};

const CATEGORY_LABELS: Record<string, string> = {
  script: "Scripts",
  form: "Formulários",
  campaign: "Campanhas",
  rfv: "Estratégias RFV",
  general: "Geral",
};

export default function CRMBulkActionsPanel({ selectedLeads, onClose, open }: CRMBulkActionsPanelProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<ActionTemplate | null>(null);
  const [messagePreview, setMessagePreview] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [channel, setChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");

  // Buscar templates
  const { data: templates = [] } = useQuery({
    queryKey: ["action-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_templates")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });
      
      if (error) throw error;
      return data as ActionTemplate[];
    },
  });

  // Buscar dados dos leads selecionados
  const { data: leadsData = [] } = useQuery({
    queryKey: ["selected-leads", selectedLeads],
    queryFn: async () => {
      if (selectedLeads.length === 0) return [];
      
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, name, phone, whatsapp, email")
        .in("id", selectedLeads);
      
      if (error) throw error;
      return data;
    },
    enabled: selectedLeads.length > 0,
  });

  // Atualizar preview quando template ou variáveis mudam
  useEffect(() => {
    if (selectedTemplate) {
      let preview = selectedTemplate.template_text;
      
      // Substituir variáveis com valores
      Object.entries(variableValues).forEach(([key, value]) => {
        preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
      });
      
      setMessagePreview(preview);
    }
  }, [selectedTemplate, variableValues]);

  // Quando selecionar template, inicializar variáveis
  useEffect(() => {
    if (selectedTemplate?.variables) {
      const vars = Array.isArray(selectedTemplate.variables) 
        ? selectedTemplate.variables 
        : [];
      const initialValues: Record<string, string> = {};
      vars.forEach(v => {
        initialValues[v] = v === 'nome' ? '{{nome}}' : '';
      });
      setVariableValues(initialValues);
      setChannel(selectedTemplate.channel as any);
    }
  }, [selectedTemplate]);

  // Mutation para disparar ações
  const dispatchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || leadsData.length === 0) return;

      setSending(true);
      setProgress(0);
      setSentCount(0);

      // Criar batch
      const { data: batch, error: batchError } = await supabase
        .from("action_batches")
        .insert({
          name: `${selectedTemplate.name} - ${new Date().toLocaleDateString('pt-BR')}`,
          template_id: selectedTemplate.id,
          action_type: selectedTemplate.type,
          channel,
          total_leads: leadsData.length,
          status: "processing",
          created_by: profile?.user_id,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Disparar para cada lead
      let sent = 0;
      let failed = 0;

      for (const lead of leadsData) {
        try {
          // Personalizar mensagem
          let message = messagePreview.replace(/{{nome}}/g, lead.name || '');
          
          // Criar dispatch
          await supabase.from("action_dispatches").insert({
            lead_id: lead.id,
            template_id: selectedTemplate.id,
            action_type: selectedTemplate.type,
            channel,
            message_content: message,
            variables_used: { ...variableValues, nome: lead.name },
            status: "sent",
            batch_id: batch.id,
            sent_by: profile?.user_id,
          });

          sent++;
          setSentCount(sent);
          setProgress(Math.round((sent / leadsData.length) * 100));
        } catch (err) {
          console.error("Erro ao enviar para lead:", lead.id, err);
          failed++;
        }
      }

      // Atualizar batch
      await supabase.from("action_batches").update({
        sent_count: sent,
        failed_count: failed,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", batch.id);

      // Atualizar usage_count do template
      await supabase.from("action_templates").update({
        usage_count: (selectedTemplate.usage_count || 0) + sent,
      }).eq("id", selectedTemplate.id);

      return { sent, failed, batchId: batch.id };
    },
    onSuccess: (result) => {
      if (result) {
        toast.success(`Ações enviadas com sucesso!`, {
          description: `${result.sent} enviados, ${result.failed} falhas`,
        });
        queryClient.invalidateQueries({ queryKey: ["action-dispatches"] });
        queryClient.invalidateQueries({ queryKey: ["action-batches"] });
        setTimeout(() => {
          onClose();
          setSending(false);
          setProgress(0);
        }, 2000);
      }
    },
    onError: (error) => {
      console.error("Erro ao disparar ações:", error);
      toast.error("Erro ao disparar ações");
      setSending(false);
    },
  });

  const filteredTemplates = templates.filter(t => 
    activeCategory === "all" || t.category === activeCategory
  );

  const categories = ["all", ...new Set(templates.map(t => t.category))];

  const getIcon = (type: string) => {
    const Icon = ACTION_ICONS[type] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(messagePreview);
    toast.success("Mensagem copiada!");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Ações em Massa
            <Badge variant="secondary">{selectedLeads.length} leads selecionados</Badge>
          </DialogTitle>
        </DialogHeader>

        {sending ? (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{sentCount}/{leadsData.length}</div>
              <p className="text-muted-foreground">Enviando mensagens...</p>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-center text-sm text-muted-foreground">
              {progress}% concluído
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 h-[60vh]">
            {/* Coluna 1: Seleção de Template */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Escolha a Ação</Label>
              </div>
              
              <div className="flex gap-1 flex-wrap">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat)}
                    className="text-xs"
                  >
                    {cat === "all" ? "Todos" : CATEGORY_LABELS[cat] || cat}
                  </Button>
                ))}
              </div>

              <ScrollArea className="h-[45vh] pr-2">
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate?.id === template.id
                          ? "ring-2 ring-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {getIcon(template.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {template.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                +{template.points_value} pts
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                            {template.bonus_condition && (
                              <p className="text-xs text-green-600 mt-1">
                                +{template.bonus_points} bônus: {template.bonus_condition}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum template encontrado</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Coluna 2: Configuração e Preview */}
            <div className="space-y-3">
              {selectedTemplate ? (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Configurar Mensagem</Label>
                    <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            SMS
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Variáveis */}
                  {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Variáveis</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables : [])
                          .filter(v => v !== 'nome')
                          .map((variable) => (
                          <div key={variable}>
                            <Label className="text-xs">{variable}</Label>
                            <Input
                              value={variableValues[variable] || ''}
                              onChange={(e) => setVariableValues({
                                ...variableValues,
                                [variable]: e.target.value,
                              })}
                              placeholder={`{{${variable}}}`}
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Preview da Mensagem</Label>
                      <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <div className="bg-muted rounded-lg p-4 min-h-[150px] max-h-[200px] overflow-auto">
                      <pre className="whitespace-pre-wrap text-sm font-sans">
                        {messagePreview}
                      </pre>
                    </div>
                  </div>

                  {/* Info de pontos */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Pontos por resposta:</span>
                        <Badge>{selectedTemplate.points_value} pts</Badge>
                      </div>
                      {selectedTemplate.bonus_condition && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-green-600">Bônus ({selectedTemplate.bonus_condition}):</span>
                          <Badge variant="outline" className="text-green-600">
                            +{selectedTemplate.bonus_points} pts
                          </Badge>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Potencial: até {(selectedTemplate.points_value + (selectedTemplate.bonus_points || 0)) * selectedLeads.length} pontos
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Selecione uma ação para ver o preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={() => dispatchMutation.mutate()}
            disabled={!selectedTemplate || sending || selectedLeads.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar para {selectedLeads.length} leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
