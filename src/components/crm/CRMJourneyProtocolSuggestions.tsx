import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Phone, Stethoscope, Activity, Scissors, Heart, Clock,
  Sparkles, Send, Copy, Check, MessageSquare, ExternalLink,
  ChevronRight, Zap, Package, DollarSign, User, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CRMLead } from "@/hooks/useCRM";

// Journey stage configuration
const JOURNEY_STAGES = [
  { id: "first_contact", label: "Primeiro Contato", icon: Phone, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { id: "medical_evaluation", label: "Avaliação Médica", icon: Stethoscope, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { id: "pre_op", label: "Pré-Operatório", icon: Activity, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { id: "intra_op", label: "Intra-Operatório", icon: Scissors, color: "text-red-500", bgColor: "bg-red-500/10" },
  { id: "post_op_recent", label: "Pós-Op Recente", icon: Heart, color: "text-green-500", bgColor: "bg-green-500/10" },
  { id: "post_op_late", label: "Pós-Op Tardio", icon: Clock, color: "text-teal-500", bgColor: "bg-teal-500/10" },
];

// Map CRM stage names to journey stages
const STAGE_TO_JOURNEY: Record<string, string> = {
  // Common stage names mapped to journey stages
  "novo_lead": "first_contact",
  "novo lead": "first_contact",
  "primeiro_contato": "first_contact",
  "primeiro contato": "first_contact",
  "contato_inicial": "first_contact",
  "qualificação": "first_contact",
  "qualificacao": "first_contact",
  "agendamento": "medical_evaluation",
  "consulta_agendada": "medical_evaluation",
  "consulta agendada": "medical_evaluation",
  "avaliação": "medical_evaluation",
  "avaliacao": "medical_evaluation",
  "proposta": "pre_op",
  "negociação": "pre_op",
  "negociacao": "pre_op",
  "pré_operatório": "pre_op",
  "pre-operatorio": "pre_op",
  "pré-op": "pre_op",
  "pre-op": "pre_op",
  "cirurgia": "intra_op",
  "operação": "intra_op",
  "operacao": "intra_op",
  "pós_operatório": "post_op_recent",
  "pos-operatorio": "post_op_recent",
  "pós-op": "post_op_recent",
  "pos-op": "post_op_recent",
  "fechado": "post_op_recent",
  "ganho": "post_op_recent",
  "won": "post_op_recent",
  "follow_up": "post_op_late",
  "follow-up": "post_op_late",
  "recorrência": "post_op_late",
  "recorrencia": "post_op_late",
  "manutenção": "post_op_late",
  "manutencao": "post_op_late",
};

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
}

interface Procedure {
  id: string;
  name: string;
  price: number | null;
}

interface CRMJourneyProtocolSuggestionsProps {
  lead: CRMLead;
  stageName?: string;
  compact?: boolean;
  onProtocolOffered?: () => void;
}

const formatCurrency = (value: number | null) => {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function CRMJourneyProtocolSuggestions({ 
  lead, 
  stageName,
  compact = false,
  onProtocolOffered 
}: CRMJourneyProtocolSuggestionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [copiedScript, setCopiedScript] = useState(false);

  // Detect journey stage from CRM stage name
  const normalizedStageName = (stageName || lead.stage?.name || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  const detectedJourneyStage = STAGE_TO_JOURNEY[normalizedStageName] || 
    Object.entries(STAGE_TO_JOURNEY).find(([key]) => 
      normalizedStageName.includes(key.replace(/_/g, " "))
    )?.[1] || 
    "first_contact";

  const currentJourney = JOURNEY_STAGES.find(j => j.id === detectedJourneyStage);

  // Fetch protocols for the detected journey stage
  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ["journey-protocols", detectedJourneyStage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocols")
        .select("*")
        .eq("is_active", true)
        .eq("journey_stage", detectedJourneyStage)
        .order("name");
      
      if (error) throw error;
      return data as Protocol[];
    },
    enabled: !!detectedJourneyStage,
  });

  // Fetch procedures for reference
  const { data: procedures = [] } = useQuery({
    queryKey: ["procedures-ref"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("id, name, price")
        .eq("is_active", true);
      
      if (error) throw error;
      return data as Procedure[];
    },
  });

  // Send offer mutation
  const sendOfferMutation = useMutation({
    mutationFn: async ({ protocol, message }: { protocol: Protocol; message: string }) => {
      // Save offer record
      const { error: offerError } = await supabase
        .from("protocol_offers")
        .insert({
          customer_id: lead.id,
          customer_name: lead.name,
          protocol_id: protocol.id,
          offered_by: user?.id,
          message_sent: message,
          offer_channel: "whatsapp",
          status: "pending",
        });

      if (offerError) throw offerError;

      // Add to lead history
      await supabase.from("crm_lead_history").insert({
        lead_id: lead.id,
        action_type: "protocol_offered",
        title: `Protocolo oferecido: ${protocol.name}`,
        description: `Valor: ${formatCurrency(protocol.promotional_price || protocol.price)}`,
        performed_by: user?.id,
        metadata: { protocol_id: protocol.id, protocol_name: protocol.name },
      });

      // Update lead estimated value if not set
      if (!lead.estimated_value && (protocol.promotional_price || protocol.price)) {
        await supabase
          .from("crm_leads")
          .update({ estimated_value: protocol.promotional_price || protocol.price })
          .eq("id", lead.id);
      }

      // Open WhatsApp with the message
      if (lead.whatsapp || lead.phone) {
        const phone = (lead.whatsapp || lead.phone || "")
          .replace(/\D/g, "")
          .replace(/^0/, "55");
        const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;
        window.open(
          `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`,
          "_blank"
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-lead-history"] });
      toast.success("Protocolo oferecido com sucesso!");
      setShowOfferDialog(false);
      setSelectedProtocol(null);
      setCustomMessage("");
      onProtocolOffered?.();
    },
    onError: (error) => {
      toast.error("Erro ao registrar oferta: " + error.message);
    },
  });

  const handleSelectProtocol = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    
    // Prepare personalized message from script
    let message = protocol.sales_script || "";
    message = message
      .replace(/{nome}/gi, lead.name.split(" ")[0])
      .replace(/{valor}/gi, formatCurrency(protocol.promotional_price || protocol.price))
      .replace(/{protocolo}/gi, protocol.name);
    
    setCustomMessage(message);
    setShowOfferDialog(true);
  };

  const handleCopyScript = (script: string) => {
    let message = script
      .replace(/{nome}/gi, lead.name.split(" ")[0])
      .replace(/{valor}/gi, selectedProtocol ? formatCurrency(selectedProtocol.promotional_price || selectedProtocol.price) : "")
      .replace(/{protocolo}/gi, selectedProtocol?.name || "");
    
    navigator.clipboard.writeText(message);
    setCopiedScript(true);
    toast.success("Script copiado!");
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleSendOffer = () => {
    if (!selectedProtocol || !customMessage.trim()) {
      toast.error("Preencha a mensagem");
      return;
    }
    sendOfferMutation.mutate({ protocol: selectedProtocol, message: customMessage });
  };

  const getIncludedProcedures = (protocol: Protocol) => {
    if (!protocol.procedure_ids?.length) return [];
    return procedures.filter(p => protocol.procedure_ids?.includes(p.id));
  };

  if (isLoading) {
    return (
      <Card className={compact ? "border-dashed" : ""}>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (protocols.length === 0) {
    return (
      <Card className={compact ? "border-dashed" : ""}>
        <CardContent className="p-4 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum protocolo para esta etapa</p>
          {currentJourney && (
            <Badge variant="outline" className="mt-2 gap-1">
              <currentJourney.icon className="h-3 w-3" />
              {currentJourney.label}
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={compact ? "" : "border-primary/20"}>
        <CardHeader className={compact ? "pb-2 p-3" : "pb-3"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${currentJourney?.bgColor || "bg-primary/10"}`}>
                {currentJourney ? (
                  <currentJourney.icon className={`h-4 w-4 ${currentJourney.color}`} />
                ) : (
                  <Sparkles className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-sm">Protocolos Sugeridos</CardTitle>
                {!compact && currentJourney && (
                  <CardDescription className="text-xs">
                    Etapa: {currentJourney.label}
                  </CardDescription>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {protocols.length} opç{protocols.length !== 1 ? "ões" : "ão"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className={compact ? "p-3 pt-0" : "pt-0"}>
          <ScrollArea className={compact ? "max-h-48" : "max-h-64"}>
            <div className="space-y-2">
              {protocols.map((protocol) => {
                const includedProcs = getIncludedProcedures(protocol);
                
                return (
                  <div
                    key={protocol.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{protocol.name}</h4>
                          {protocol.promotional_price && protocol.price && (
                            <Badge variant="destructive" className="text-[10px] px-1">
                              Promo
                            </Badge>
                          )}
                        </div>
                        
                        {/* Price */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-primary">
                            {formatCurrency(protocol.promotional_price || protocol.price)}
                          </span>
                          {protocol.promotional_price && protocol.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(protocol.price)}
                            </span>
                          )}
                        </div>

                        {/* Included procedures */}
                        {includedProcs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {includedProcs.slice(0, 2).map((proc) => (
                              <Badge key={proc.id} variant="outline" className="text-[10px] py-0">
                                {proc.name}
                              </Badge>
                            ))}
                            {includedProcs.length > 2 && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                +{includedProcs.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Offer trigger hint */}
                        {protocol.offer_trigger && !compact && (
                          <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                            💡 {protocol.offer_trigger}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                className="h-7 px-2 gap-1"
                                onClick={() => handleSelectProtocol(protocol)}
                              >
                                <Send className="h-3 w-3" />
                                <span className="hidden sm:inline">Oferecer</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Enviar oferta via WhatsApp</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {protocol.sales_script && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => handleCopyScript(protocol.sales_script || "")}
                                >
                                  {copiedScript ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copiar script</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Oferecer Protocolo
            </DialogTitle>
            <DialogDescription>
              Personalize a mensagem e envie via WhatsApp
            </DialogDescription>
          </DialogHeader>

          {selectedProtocol && (
            <div className="space-y-4">
              {/* Protocol Summary */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{selectedProtocol.name}</h4>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(selectedProtocol.promotional_price || selectedProtocol.price)}
                  </span>
                </div>
                {selectedProtocol.description && (
                  <p className="text-xs text-muted-foreground">{selectedProtocol.description}</p>
                )}
              </div>

              {/* Lead Info */}
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{lead.name}</span>
                {lead.whatsapp || lead.phone ? (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.whatsapp || lead.phone}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Sem telefone
                  </Badge>
                )}
              </div>

              {/* Message Editor */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite a mensagem..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Use {"{nome}"}, {"{valor}"}, {"{protocolo}"} para personalizar
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendOffer}
              disabled={sendOfferMutation.isPending || !customMessage.trim()}
              className="gap-2"
            >
              {sendOfferMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Enviar via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
