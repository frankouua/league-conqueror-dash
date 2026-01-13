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
  Users, Activity
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
];

const RESPONSIBLE_ROLES = [
  { id: "sdr", label: "SDR" },
  { id: "social_selling", label: "Social Selling" },
  { id: "closer", label: "Closer" },
  { id: "cs", label: "Customer Success" },
  { id: "farmer", label: "Farmer" },
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
    });
    setDialogOpen(true);
  };

  const handleEdit = (protocol: Protocol) => {
    setEditingProtocol(protocol);
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
    });
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingProtocol ? "Editar Protocolo" : "Novo Protocolo"}
            </DialogTitle>
            <DialogDescription>
              {editingProtocol ? "Atualize as informações do protocolo" : "Crie um novo protocolo de jornada"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-4 p-1">
              {/* Basic Info */}
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
                  <Label>Preço (R$)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Promocional</Label>
                  <Input
                    type="number"
                    value={formData.promotional_price}
                    onChange={(e) => setFormData({ ...formData, promotional_price: e.target.value })}
                    placeholder="0.00"
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

              <Separator />

              {/* Procedures Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Procedimentos Inclusos</Label>
                  <Badge variant="outline">
                    {formData.procedure_ids.length} selecionado(s) • Total: {formatCurrency(selectedProceduresTotal)}
                  </Badge>
                </div>
                <ScrollArea className="h-40 border rounded-lg p-3">
                  <div className="space-y-2">
                    {procedures.map(proc => (
                      <div key={proc.id} className="flex items-center gap-2">
                        <Checkbox
                          id={proc.id}
                          checked={formData.procedure_ids.includes(proc.id)}
                          onCheckedChange={() => toggleProcedure(proc.id)}
                        />
                        <label htmlFor={proc.id} className="flex-1 text-sm cursor-pointer">
                          {proc.name}
                        </label>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(proc.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Scripts */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Script de Venda
                </Label>
                <Textarea
                  value={formData.sales_script}
                  onChange={(e) => setFormData({ ...formData, sales_script: e.target.value })}
                  placeholder="Como ofertar este protocolo..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Script de Indicação
                </Label>
                <Textarea
                  value={formData.referral_script}
                  onChange={(e) => setFormData({ ...formData, referral_script: e.target.value })}
                  placeholder="Como pedir indicação após venda..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

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
  const includedProcedures = procedures.filter(p => 
    protocol.procedure_ids?.includes(p.id)
  );
  const role = RESPONSIBLE_ROLES.find(r => r.id === protocol.responsible_role);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{protocol.name}</CardTitle>
          <div className="flex gap-1">
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
        {protocol.description && (
          <CardDescription className="text-xs">{protocol.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(protocol.promotional_price || protocol.price)}
          </span>
          {protocol.promotional_price && protocol.price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(protocol.price)}
            </span>
          )}
        </div>

        {/* Responsible */}
        {role && (
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            {role.label}
          </Badge>
        )}

        {/* Procedures */}
        {includedProcedures.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Procedimentos ({includedProcedures.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {includedProcedures.slice(0, 3).map(proc => (
                <Badge key={proc.id} variant="secondary" className="text-xs">
                  {proc.name}
                </Badge>
              ))}
              {includedProcedures.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{includedProcedures.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Trigger */}
        {protocol.offer_trigger && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Quando ofertar:</span> {protocol.offer_trigger}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProtocolsJourneyManager;
