import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Plus, Phone, MessageSquare, Stethoscope, Scissors, 
  Heart, Clock, ArrowRight, Search, Trash2, Edit2, 
  Save, X, Package, User, Zap, ChevronRight, Sparkles,
  Users, Activity, Image, Video, FileText, RefreshCw,
  AlertCircle, CheckCircle, Target, Star
} from "lucide-react";

// Configuração das etapas da jornada
const JOURNEY_STAGES = [
  { 
    id: "first_contact", 
    label: "Primeiro Contato", 
    icon: Phone, 
    color: "bg-blue-500",
    description: "Cliente nos conheceu - tirar dúvidas e oferecer consulta"
  },
  { 
    id: "medical_evaluation", 
    label: "Avaliação Médica", 
    icon: Stethoscope, 
    color: "bg-purple-500",
    description: "Cliente veio para avaliação - oferecer procedimentos recomendados"
  },
  { 
    id: "pre_op", 
    label: "Pré-Operatório", 
    icon: Activity, 
    color: "bg-amber-500",
    description: "Preparação para cirurgia"
  },
  { 
    id: "intra_op", 
    label: "Intra-Operatório", 
    icon: Scissors, 
    color: "bg-red-500",
    description: "Durante a cirurgia"
  },
  { 
    id: "post_op_recent", 
    label: "Pós-Op Recente", 
    icon: Heart, 
    color: "bg-green-500",
    description: "Até 1 ano após cirurgia"
  },
  { 
    id: "post_op_late", 
    label: "Pós-Op Tardio", 
    icon: Clock, 
    color: "bg-teal-500",
    description: "Acima de 1 ano - manutenção e recorrência"
  },
  { 
    id: "extras", 
    label: "Extras", 
    icon: Star, 
    color: "bg-orange-500",
    description: "Protocolos avulsos - não relacionados à jornada cirúrgica"
  },
];

const RESPONSIBLE_ROLES = [
  { id: "sdr", label: "SDR" },
  { id: "social_selling", label: "Social Selling" },
  { id: "closer", label: "Closer" },
  { id: "cs", label: "Customer Success" },
  { id: "farmer", label: "Farmer" },
  { id: "todos", label: "Todos" },
];

interface Protocol {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  promotional_price: number | null;
  journey_stage: string | null;
  responsible_role: string | null;
  offer_trigger: string | null;
  procedure_ids: string[] | null;
  sales_script: string | null;
  referral_script: string | null;
  is_active: boolean;
  image_url?: string | null;
  video_url?: string | null;
  followup_script?: string | null;
  followup_script_2?: string | null;
  followup_script_3?: string | null;
  objection_scripts?: Record<string, string> | null;
  closing_script?: string | null;
  reactivation_script?: string | null;
  materials_urls?: string[] | null;
}

interface Procedure {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
}

const formatCurrency = (value: number | null) => {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const ProtocolsJourneyManager = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = (profile as any)?.is_admin === true;
  
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    promotional_price: "",
    journey_stage: "",
    responsible_role: "",
    offer_trigger: "",
    sales_script: "",
    referral_script: "",
    procedure_ids: [] as string[],
    image_url: "",
    video_url: "",
    followup_script: "",
    followup_script_2: "",
    followup_script_3: "",
    objection_preco: "",
    objection_tempo: "",
    objection_concorrencia: "",
    objection_duvida: "",
    closing_script: "",
    reactivation_script: "",
    materials_urls: [] as string[],
    new_material_url: "",
  });

  // Fetch protocols
  const { data: protocols = [], isLoading: loadingProtocols } = useQuery({
    queryKey: ["protocols-journey"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocols")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data as Protocol[];
    },
  });

  // Fetch procedures for selection
  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures-for-selection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name, price, category")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data as Procedure[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const objectionScripts: Record<string, string> = {};
      if (data.objection_preco) objectionScripts.preco = data.objection_preco;
      if (data.objection_tempo) objectionScripts.tempo = data.objection_tempo;
      if (data.objection_concorrencia) objectionScripts.concorrencia = data.objection_concorrencia;
      if (data.objection_duvida) objectionScripts.duvida = data.objection_duvida;

      const payload = {
        name: data.name,
        description: data.description || null,
        price: data.price ? parseFloat(data.price) : null,
        promotional_price: data.promotional_price ? parseFloat(data.promotional_price) : null,
        journey_stage: data.journey_stage || null,
        responsible_role: data.responsible_role || null,
        offer_trigger: data.offer_trigger || null,
        sales_script: data.sales_script || null,
        referral_script: data.referral_script || null,
        procedure_ids: data.procedure_ids,
        protocol_type: "pacote",
        is_active: true,
        image_url: data.image_url || null,
        video_url: data.video_url || null,
        followup_script: data.followup_script || null,
        followup_script_2: data.followup_script_2 || null,
        followup_script_3: data.followup_script_3 || null,
        objection_scripts: Object.keys(objectionScripts).length > 0 ? objectionScripts : null,
        closing_script: data.closing_script || null,
        reactivation_script: data.reactivation_script || null,
        materials_urls: data.materials_urls.length > 0 ? data.materials_urls : null,
      };

      if (data.id) {
        const { error } = await supabase
          .from("protocols")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("protocols")
          .insert([{ ...payload, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols-journey"] });
      toast.success(editingProtocol ? "Protocolo atualizado!" : "Protocolo criado!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Erro ao salvar protocolo: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("protocols")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols-journey"] });
      toast.success("Protocolo removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const handleOpenNew = () => {
    setEditingProtocol(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      promotional_price: "",
      journey_stage: selectedStage || "",
      responsible_role: "",
      offer_trigger: "",
      sales_script: "",
      referral_script: "",
      procedure_ids: [],
      image_url: "",
      video_url: "",
      followup_script: "",
      followup_script_2: "",
      followup_script_3: "",
      objection_preco: "",
      objection_tempo: "",
      objection_concorrencia: "",
      objection_duvida: "",
      closing_script: "",
      reactivation_script: "",
      materials_urls: [],
      new_material_url: "",
    });
    setActiveTab("info");
    setDialogOpen(true);
  };

  const handleEdit = (protocol: Protocol) => {
    setEditingProtocol(protocol);
    const objections = protocol.objection_scripts || {};
    setFormData({
      name: protocol.name,
      description: protocol.description || "",
      price: protocol.price?.toString() || "",
      promotional_price: protocol.promotional_price?.toString() || "",
      journey_stage: protocol.journey_stage || "",
      responsible_role: protocol.responsible_role || "",
      offer_trigger: protocol.offer_trigger || "",
      sales_script: protocol.sales_script || "",
      referral_script: protocol.referral_script || "",
      procedure_ids: protocol.procedure_ids || [],
      image_url: protocol.image_url || "",
      video_url: protocol.video_url || "",
      followup_script: protocol.followup_script || "",
      followup_script_2: protocol.followup_script_2 || "",
      followup_script_3: protocol.followup_script_3 || "",
      objection_preco: (objections as any).preco || "",
      objection_tempo: (objections as any).tempo || "",
      objection_concorrencia: (objections as any).concorrencia || "",
      objection_duvida: (objections as any).duvida || "",
      closing_script: protocol.closing_script || "",
      reactivation_script: protocol.reactivation_script || "",
      materials_urls: protocol.materials_urls || [],
      new_material_url: "",
    });
    setActiveTab("info");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProtocol(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Nome do protocolo é obrigatório");
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingProtocol?.id,
    });
  };

  const toggleProcedure = (procId: string) => {
    setFormData(prev => ({
      ...prev,
      procedure_ids: prev.procedure_ids.includes(procId)
        ? prev.procedure_ids.filter(id => id !== procId)
        : [...prev.procedure_ids, procId],
    }));
  };

  const addMaterialUrl = () => {
    if (formData.new_material_url.trim()) {
      setFormData(prev => ({
        ...prev,
        materials_urls: [...prev.materials_urls, prev.new_material_url.trim()],
        new_material_url: "",
      }));
    }
  };

  const removeMaterialUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials_urls: prev.materials_urls.filter((_, i) => i !== index),
    }));
  };

  // Group protocols by journey stage
  const protocolsByStage = JOURNEY_STAGES.reduce((acc, stage) => {
    acc[stage.id] = protocols.filter(p => p.journey_stage === stage.id);
    return acc;
  }, {} as Record<string, Protocol[]>);

  const filteredProtocols = selectedStage 
    ? protocols.filter(p => p.journey_stage === selectedStage)
    : protocols;

  const searchFiltered = filteredProtocols.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate selected procedures total
  const selectedProceduresTotal = formData.procedure_ids.reduce((sum, id) => {
    const proc = procedures.find(p => p.id === id);
    return sum + (proc?.price || 0);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Journey Timeline */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Jornada do Cliente
          </CardTitle>
          <CardDescription>
            Clique em uma etapa para filtrar os protocolos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedStage === null ? "default" : "outline"}
              className="cursor-pointer py-2 px-3"
              onClick={() => setSelectedStage(null)}
            >
              Todos ({protocols.length})
            </Badge>
            {JOURNEY_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const count = protocolsByStage[stage.id]?.length || 0;
              return (
                <Badge
                  key={stage.id}
                  variant={selectedStage === stage.id ? "default" : "outline"}
                  className="cursor-pointer py-2 px-3 gap-1.5"
                  onClick={() => setSelectedStage(stage.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {stage.label} ({count})
                  {idx < JOURNEY_STAGES.length - 1 && (
                    <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground" />
                  )}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar protocolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Protocolo
        </Button>
      </div>

      {/* Protocols by Stage */}
      {selectedStage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const stage = JOURNEY_STAGES.find(s => s.id === selectedStage);
                const Icon = stage?.icon || Activity;
                return (
                  <>
                    <div className={`p-2 rounded-lg ${stage?.color}/20`}>
                      <Icon className={`h-5 w-5 ${stage?.color?.replace("bg-", "text-")}`} />
                    </div>
                    {stage?.label}
                  </>
                );
              })()}
            </CardTitle>
            <CardDescription>
              {JOURNEY_STAGES.find(s => s.id === selectedStage)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchFiltered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum protocolo nesta etapa</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleOpenNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar protocolo
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {searchFiltered.map(protocol => (
                  <ProtocolCard
                    key={protocol.id}
                    protocol={protocol}
                    procedures={procedures}
                    onEdit={() => handleEdit(protocol)}
                    onDelete={() => isAdmin && deleteMutation.mutate(protocol.id)}
                    canDelete={isAdmin}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {JOURNEY_STAGES.map(stage => {
            const stageProtocols = protocolsByStage[stage.id] || [];
            const Icon = stage.icon;
            return (
              <AccordionItem key={stage.id} value={stage.id} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stage.color}/20`}>
                      <Icon className={`h-5 w-5 ${stage.color.replace("bg-", "text-")}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{stage.label}</p>
                      <p className="text-xs text-muted-foreground">{stage.description}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto mr-4">
                      {stageProtocols.length} protocolo{stageProtocols.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {stageProtocols.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">Nenhum protocolo cadastrado</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setSelectedStage(stage.id);
                          handleOpenNew();
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {stageProtocols
                        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                        .map(protocol => (
                          <ProtocolCard
                            key={protocol.id}
                            protocol={protocol}
                            procedures={procedures}
                            onEdit={() => handleEdit(protocol)}
                            onDelete={() => isAdmin && deleteMutation.mutate(protocol.id)}
                            canDelete={isAdmin}
                          />
                        ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingProtocol ? "Editar Protocolo" : "Novo Protocolo"}
            </DialogTitle>
            <DialogDescription>
              {editingProtocol ? "Atualize as informações do protocolo" : "Crie um novo protocolo de jornada"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="info" className="gap-1.5">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Info</span>
              </TabsTrigger>
              <TabsTrigger value="procedures" className="gap-1.5">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Procedimentos</span>
              </TabsTrigger>
              <TabsTrigger value="scripts" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Scripts</span>
              </TabsTrigger>
              <TabsTrigger value="followup" className="gap-1.5">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Follow-up</span>
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-1.5">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Materiais</span>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pr-4 -mr-4">
              {/* Tab: Info */}
              <TabsContent value="info" className="m-0 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome do Protocolo *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Protocolo Pós-Op Lipo 30 dias"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Etapa da Jornada</Label>
                    <Select
                      value={formData.journey_stage}
                      onValueChange={(v) => setFormData({ ...formData, journey_stage: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {JOURNEY_STAGES.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do protocolo..."
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Preço DE (R$)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="Preço original"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço POR (R$)</Label>
                    <Input
                      type="number"
                      value={formData.promotional_price}
                      onChange={(e) => setFormData({ ...formData, promotional_price: e.target.value })}
                      placeholder="Preço promocional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={formData.responsible_role}
                      onValueChange={(v) => setFormData({ ...formData, responsible_role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Quem oferece?" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESPONSIBLE_ROLES.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Gatilho para Ofertar</Label>
                  <Input
                    value={formData.offer_trigger}
                    onChange={(e) => setFormData({ ...formData, offer_trigger: e.target.value })}
                    placeholder="Ex: 7 dias após cirurgia, cliente demonstrou interesse em..."
                  />
                </div>
              </TabsContent>

              {/* Tab: Procedures */}
              <TabsContent value="procedures" className="m-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Procedimentos Inclusos</Label>
                    <Badge variant="outline">
                      {formData.procedure_ids.length} selecionado(s) • Total: {formatCurrency(selectedProceduresTotal)}
                    </Badge>
                  </div>
                  <ScrollArea className="h-80 border rounded-lg p-3">
                    <div className="space-y-2">
                      {procedures.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum procedimento cadastrado. Adicione procedimentos na aba "Procedimentos".
                        </p>
                      ) : (
                        procedures.map(proc => (
                          <div key={proc.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                            <Checkbox
                              id={proc.id}
                              checked={formData.procedure_ids.includes(proc.id)}
                              onCheckedChange={() => toggleProcedure(proc.id)}
                            />
                            <label htmlFor={proc.id} className="flex-1 text-sm cursor-pointer">
                              {proc.name}
                              {proc.category && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {proc.category}
                                </Badge>
                              )}
                            </label>
                            <span className="text-sm font-medium">
                              {formatCurrency(proc.price)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* Tab: Scripts */}
              <TabsContent value="scripts" className="m-0 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Script de Venda (Primeiro Contato)
                  </Label>
                  <Textarea
                    value={formData.sales_script}
                    onChange={(e) => setFormData({ ...formData, sales_script: e.target.value })}
                    placeholder="Como ofertar este protocolo pela primeira vez..."
                    rows={4}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Contorno de Objeções
                  </Label>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">💰 "Está caro..."</Label>
                      <Textarea
                        value={formData.objection_preco}
                        onChange={(e) => setFormData({ ...formData, objection_preco: e.target.value })}
                        placeholder="Resposta para objeção de preço..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">⏰ "Não tenho tempo..."</Label>
                      <Textarea
                        value={formData.objection_tempo}
                        onChange={(e) => setFormData({ ...formData, objection_tempo: e.target.value })}
                        placeholder="Resposta para objeção de tempo..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">🏢 "Vou pesquisar em outro lugar..."</Label>
                      <Textarea
                        value={formData.objection_concorrencia}
                        onChange={(e) => setFormData({ ...formData, objection_concorrencia: e.target.value })}
                        placeholder="Resposta para objeção de concorrência..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">🤔 "Preciso pensar..."</Label>
                      <Textarea
                        value={formData.objection_duvida}
                        onChange={(e) => setFormData({ ...formData, objection_duvida: e.target.value })}
                        placeholder="Resposta para dúvida/indecisão..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Script de Fechamento
                  </Label>
                  <Textarea
                    value={formData.closing_script}
                    onChange={(e) => setFormData({ ...formData, closing_script: e.target.value })}
                    placeholder="Como fechar a venda..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    Script de Indicação (pós-venda)
                  </Label>
                  <Textarea
                    value={formData.referral_script}
                    onChange={(e) => setFormData({ ...formData, referral_script: e.target.value })}
                    placeholder="Como pedir indicação após venda..."
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Tab: Follow-up */}
              <TabsContent value="followup" className="m-0 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    Follow-up 1 (Após primeiro contato)
                  </Label>
                  <Textarea
                    value={formData.followup_script}
                    onChange={(e) => setFormData({ ...formData, followup_script: e.target.value })}
                    placeholder="Ex: Olá {nome}! Tudo bem? Estou passando para saber se você teve a oportunidade de pensar sobre..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-amber-500" />
                    Follow-up 2 (Segunda tentativa)
                  </Label>
                  <Textarea
                    value={formData.followup_script_2}
                    onChange={(e) => setFormData({ ...formData, followup_script_2: e.target.value })}
                    placeholder="Script para segunda tentativa de contato..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-red-500" />
                    Follow-up 3 (Última tentativa)
                  </Label>
                  <Textarea
                    value={formData.followup_script_3}
                    onChange={(e) => setFormData({ ...formData, followup_script_3: e.target.value })}
                    placeholder="Script de urgência/última tentativa..."
                    rows={4}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    Script de Reativação (Cliente inativo)
                  </Label>
                  <Textarea
                    value={formData.reactivation_script}
                    onChange={(e) => setFormData({ ...formData, reactivation_script: e.target.value })}
                    placeholder="Script para reativar clientes que não respondem há muito tempo..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              {/* Tab: Materials */}
              <TabsContent value="materials" className="m-0 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      URL da Imagem Principal
                    </Label>
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                    {formData.image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border">
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-full h-32 object-cover"
                          onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      URL do Vídeo
                    </Label>
                    <Input
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      placeholder="https://youtube.com/... ou https://vimeo.com/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Cole o link do YouTube, Vimeo ou outro serviço de vídeo
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Materiais Adicionais (PDFs, imagens, apresentações)
                  </Label>
                  
                  <div className="flex gap-2">
                    <Input
                      value={formData.new_material_url}
                      onChange={(e) => setFormData({ ...formData, new_material_url: e.target.value })}
                      placeholder="Cole a URL do material..."
                      onKeyDown={(e) => e.key === 'Enter' && addMaterialUrl()}
                    />
                    <Button type="button" variant="outline" onClick={addMaterialUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {formData.materials_urls.length > 0 && (
                    <div className="space-y-2">
                      {formData.materials_urls.map((url, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate flex-1"
                          >
                            {url}
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeMaterialUrl(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar Protocolo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
// Protocol Card Component
const ProtocolCard = ({
  protocol,
  procedures,
  onEdit,
  onDelete,
  canDelete,
}: {
  protocol: Protocol;
  procedures: Procedure[];
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeScriptTab, setActiveScriptTab] = useState("oferta");
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const includedProcedures = procedures.filter(p => 
    protocol.procedure_ids?.includes(p.id)
  );
  const role = RESPONSIBLE_ROLES.find(r => r.id === protocol.responsible_role);
  const stage = JOURNEY_STAGES.find(s => s.id === protocol.journey_stage);
  const StageIcon = stage?.icon || Package;

  const hasScripts = protocol.sales_script || protocol.closing_script || 
    protocol.followup_script || protocol.followup_script_2 || 
    protocol.followup_script_3 || protocol.referral_script || 
    protocol.reactivation_script || (protocol.objection_scripts && Object.keys(protocol.objection_scripts).length > 0);

  const copyScript = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(label);
    toast.success(`Script "${label}" copiado!`);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const ScriptBlock = ({ label, text, icon: Icon, color }: { label: string; text: string | null | undefined; icon: any; color: string }) => {
    if (!text) return null;
    return (
      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-sm font-medium">{label}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1"
            onClick={() => copyScript(text, label)}
          >
            {copiedScript === label ? (
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">Copiar</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {text}
        </p>
      </div>
    );
  };

  return (
    <Card className={`transition-all duration-200 ${expanded ? 'ring-2 ring-primary/20' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            {protocol.image_url ? (
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border bg-muted">
                <img 
                  src={protocol.image_url} 
                  alt={protocol.name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                />
              </div>
            ) : (
              <div className={`w-14 h-14 rounded-lg shrink-0 flex items-center justify-center ${stage?.color || 'bg-primary'}/10`}>
                <StageIcon className={`h-6 w-6 ${stage?.color?.replace('bg-', 'text-') || 'text-primary'}`} />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">{protocol.name}</CardTitle>
              {stage && (
                <Badge variant="outline" className="mt-1 text-xs gap-1">
                  <StageIcon className="h-3 w-3" />
                  {stage.label}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {protocol.description && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {protocol.description}
            </p>
          </div>
        )}

        {/* Price Section */}
        <div className="flex items-baseline gap-3 p-3 bg-gradient-to-r from-primary/5 to-green-500/5 rounded-lg border border-primary/10">
          {protocol.price && protocol.promotional_price && protocol.promotional_price < protocol.price ? (
            <>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">De</p>
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(protocol.price)}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-xs text-green-600 font-medium">Por</p>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(protocol.promotional_price)}
                </span>
              </div>
              <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
                {Math.round((1 - protocol.promotional_price / protocol.price) * 100)}% OFF
              </Badge>
            </>
          ) : (
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(protocol.promotional_price || protocol.price)}
            </span>
          )}
        </div>

        {/* Info Badges */}
        <div className="flex flex-wrap gap-1.5">
          {role && (
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {role.label}
            </Badge>
          )}
          {protocol.video_url && (
            <Badge variant="secondary" className="gap-1">
              <Video className="h-3 w-3" />
              Vídeo
            </Badge>
          )}
          {hasScripts && (
            <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
              <MessageSquare className="h-3 w-3" />
              Scripts
            </Badge>
          )}
          {protocol.materials_urls && protocol.materials_urls.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              {protocol.materials_urls.length} material(is)
            </Badge>
          )}
        </div>

        {/* Procedures Included */}
        {includedProcedures.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              O que inclui ({includedProcedures.length})
            </p>
            <div className="grid gap-1">
              {includedProcedures.map(proc => (
                <div key={proc.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="flex-1 truncate">{proc.name}</span>
                  {proc.price && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatCurrency(proc.price)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trigger */}
        {protocol.offer_trigger && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50">
            <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Quando ofertar</p>
              <p className="text-sm text-amber-900 dark:text-amber-200">{protocol.offer_trigger}</p>
            </div>
          </div>
        )}

        {/* Expand Scripts Button */}
        {hasScripts && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setExpanded(!expanded)}
          >
            <MessageSquare className="h-4 w-4" />
            {expanded ? "Ocultar Scripts" : "Ver Scripts de Venda"}
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
        )}

        {/* Expanded Scripts Section */}
        {expanded && hasScripts && (
          <div className="space-y-4 pt-2 border-t animate-in fade-in-50 slide-in-from-top-2">
            <Tabs value={activeScriptTab} onValueChange={setActiveScriptTab}>
              <TabsList className="w-full grid grid-cols-4 h-auto p-1">
                <TabsTrigger value="oferta" className="text-xs py-1.5">
                  Oferta
                </TabsTrigger>
                <TabsTrigger value="objecoes" className="text-xs py-1.5">
                  Objeções
                </TabsTrigger>
                <TabsTrigger value="followup" className="text-xs py-1.5">
                  Follow-up
                </TabsTrigger>
                <TabsTrigger value="outros" className="text-xs py-1.5">
                  Outros
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oferta" className="space-y-3 mt-3">
                <ScriptBlock
                  label="Script de Oferta"
                  text={protocol.sales_script}
                  icon={Target}
                  color="text-green-500"
                />
                <ScriptBlock
                  label="Script de Fechamento"
                  text={protocol.closing_script}
                  icon={CheckCircle}
                  color="text-primary"
                />
              </TabsContent>

              <TabsContent value="objecoes" className="space-y-3 mt-3">
                {protocol.objection_scripts && (
                  <>
                    <ScriptBlock
                      label='💰 "Está caro..."'
                      text={(protocol.objection_scripts as any).preco}
                      icon={AlertCircle}
                      color="text-amber-500"
                    />
                    <ScriptBlock
                      label='⏰ "Não tenho tempo..."'
                      text={(protocol.objection_scripts as any).tempo}
                      icon={Clock}
                      color="text-amber-500"
                    />
                    <ScriptBlock
                      label='🏢 "Vou pesquisar em outro lugar..."'
                      text={(protocol.objection_scripts as any).concorrencia}
                      icon={AlertCircle}
                      color="text-amber-500"
                    />
                    <ScriptBlock
                      label='🤔 "Preciso pensar..."'
                      text={(protocol.objection_scripts as any).duvida}
                      icon={AlertCircle}
                      color="text-amber-500"
                    />
                  </>
                )}
                {(!protocol.objection_scripts || Object.keys(protocol.objection_scripts).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum script de objeção cadastrado
                  </p>
                )}
              </TabsContent>

              <TabsContent value="followup" className="space-y-3 mt-3">
                <ScriptBlock
                  label="Follow-up 1"
                  text={protocol.followup_script}
                  icon={RefreshCw}
                  color="text-blue-500"
                />
                <ScriptBlock
                  label="Follow-up 2"
                  text={protocol.followup_script_2}
                  icon={RefreshCw}
                  color="text-amber-500"
                />
                <ScriptBlock
                  label="Follow-up 3 (Última tentativa)"
                  text={protocol.followup_script_3}
                  icon={RefreshCw}
                  color="text-red-500"
                />
                {!protocol.followup_script && !protocol.followup_script_2 && !protocol.followup_script_3 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum script de follow-up cadastrado
                  </p>
                )}
              </TabsContent>

              <TabsContent value="outros" className="space-y-3 mt-3">
                <ScriptBlock
                  label="Script de Indicação"
                  text={protocol.referral_script}
                  icon={Users}
                  color="text-purple-500"
                />
                <ScriptBlock
                  label="Script de Reativação"
                  text={protocol.reactivation_script}
                  icon={Sparkles}
                  color="text-orange-500"
                />
                {!protocol.referral_script && !protocol.reactivation_script && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum script adicional cadastrado
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProtocolsJourneyManager;
