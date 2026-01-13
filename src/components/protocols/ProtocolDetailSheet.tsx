import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare, Target, CheckCircle, AlertCircle, Clock,
  RefreshCw, Users, Sparkles, Video, FileText, Package,
  ArrowRight, Zap, Copy, ExternalLink, Phone, Heart,
  Stethoscope, Scissors, Activity, Star, User, Play
} from "lucide-react";

// Journey stages config
const JOURNEY_STAGES = [
  { id: "first_contact", label: "Primeiro Contato", icon: Phone, color: "bg-blue-500" },
  { id: "medical_evaluation", label: "Avaliação Médica", icon: Stethoscope, color: "bg-purple-500" },
  { id: "pre_op", label: "Pré-Operatório", icon: Activity, color: "bg-amber-500" },
  { id: "intra_op", label: "Intra-Operatório", icon: Scissors, color: "bg-red-500" },
  { id: "post_op_recent", label: "Pós-Op Recente", icon: Heart, color: "bg-green-500" },
  { id: "post_op_late", label: "Pós-Op Tardio", icon: Clock, color: "bg-teal-500" },
  { id: "extras", label: "Extras", icon: Star, color: "bg-orange-500" },
];

const RESPONSIBLE_ROLES = [
  { id: "sdr", label: "SDR" },
  { id: "social_selling", label: "Social Selling" },
  { id: "closer", label: "Closer" },
  { id: "cs", label: "Customer Success" },
  { id: "farmer", label: "Farmer" },
  { id: "comercial", label: "Comercial" },
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
  group_script?: string | null;
  doctor_recommended_script?: string | null;
}

interface Procedure {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
}

interface ProtocolDetailSheetProps {
  protocol: Protocol | null;
  procedures: Procedure[];
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

const formatCurrency = (value: number | null) => {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const ProtocolDetailSheet = ({
  protocol,
  procedures,
  open,
  onClose,
  onEdit,
}: ProtocolDetailSheetProps) => {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");

  if (!protocol) return null;

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
    toast.success(`Script copiado!`);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const ScriptCard = ({ 
    label, 
    text, 
    icon: Icon, 
    color,
    subtitle
  }: { 
    label: string; 
    text: string | null | undefined; 
    icon: any; 
    color: string;
    subtitle?: string;
  }) => {
    if (!text) return null;
    return (
      <div className="space-y-3 p-4 bg-card rounded-xl border shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}/10`}>
              <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <h4 className="font-semibold text-sm">{label}</h4>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => copyScript(text, label)}
          >
            {copiedScript === label ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copiar
          </Button>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {text}
          </p>
        </div>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 text-muted-foreground">
      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-br from-primary/5 to-purple-500/5">
          <div className="flex items-start gap-4">
            {protocol.image_url ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-lg shrink-0">
                <img 
                  src={protocol.image_url} 
                  alt={protocol.name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                />
              </div>
            ) : (
              <div className={`w-20 h-20 rounded-xl shrink-0 flex items-center justify-center ${stage?.color || 'bg-primary'} shadow-lg`}>
                <StageIcon className="h-10 w-10 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl leading-tight mb-2">
                {protocol.name}
              </SheetTitle>
              <div className="flex flex-wrap gap-2">
                {stage && (
                  <Badge variant="secondary" className="gap-1">
                    <StageIcon className="h-3 w-3" />
                    {stage.label}
                  </Badge>
                )}
                {role && (
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3" />
                    {role.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-green-500/10 rounded-xl border border-primary/20">
            <div className="flex items-center gap-4">
              {protocol.price && protocol.promotional_price && protocol.promotional_price < protocol.price ? (
                <>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground font-medium">DE</p>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatCurrency(protocol.price)}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-green-600" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-green-600 font-bold">POR</p>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(protocol.promotional_price)}
                    </span>
                  </div>
                  <Badge className="ml-auto bg-green-600 hover:bg-green-600 text-white text-sm">
                    {Math.round((1 - protocol.promotional_price / protocol.price) * 100)}% OFF
                  </Badge>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(protocol.promotional_price || protocol.price)}
                </span>
              )}
            </div>
            {protocol.promotional_price && (
              <p className="text-sm text-muted-foreground mt-2">
                ou 12x de {formatCurrency(protocol.promotional_price / 12)} sem juros
              </p>
            )}
          </div>
        </SheetHeader>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b">
            <TabsList className="w-full grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="info" className="text-xs py-2 gap-1.5">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Detalhes</span>
              </TabsTrigger>
              <TabsTrigger value="scripts" className="text-xs py-2 gap-1.5">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Oferta</span>
              </TabsTrigger>
              <TabsTrigger value="objections" className="text-xs py-2 gap-1.5">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Objeções</span>
              </TabsTrigger>
              <TabsTrigger value="followup" className="text-xs py-2 gap-1.5">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Follow-up</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            {/* Tab: Info */}
            <TabsContent value="info" className="m-0 p-6 space-y-6">
              {/* Description */}
              {protocol.description && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Sobre o Protocolo
                  </h3>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm leading-relaxed">{protocol.description}</p>
                  </div>
                </div>
              )}

              {/* Trigger */}
              {protocol.offer_trigger && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Quando Ofertar
                  </h3>
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/50">
                    <Zap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900 dark:text-amber-100">{protocol.offer_trigger}</p>
                  </div>
                </div>
              )}

              {/* Procedures Included */}
              {includedProcedures.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    O Que Inclui ({includedProcedures.length} procedimentos)
                  </h3>
                  <div className="grid gap-2">
                    {includedProcedures.map(proc => (
                      <div key={proc.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="flex-1 text-sm">{proc.name}</span>
                        {proc.price && (
                          <span className="text-sm font-medium text-muted-foreground">
                            {formatCurrency(proc.price)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials */}
              {(protocol.video_url || (protocol.materials_urls && protocol.materials_urls.length > 0)) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Materiais de Apoio
                  </h3>
                  <div className="grid gap-2">
                    {protocol.video_url && (
                      <a 
                        href={protocol.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <Play className="h-4 w-4 text-red-600" />
                        </div>
                        <span className="flex-1 text-sm font-medium">Vídeo do Protocolo</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {protocol.materials_urls?.map((url, idx) => (
                      <a 
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="flex-1 text-sm truncate">Material {idx + 1}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab: Scripts de Oferta */}
            <TabsContent value="scripts" className="m-0 p-6 space-y-4">
              <ScriptCard
                label="Script de Apresentação"
                subtitle="Primeiro contato - como apresentar o protocolo"
                text={protocol.sales_script}
                icon={Target}
                color="bg-green-500"
              />
              <ScriptCard
                label="🩺 Doutor Recomendou"
                subtitle="Quando o médico pediu para apresentar ao paciente"
                text={protocol.doctor_recommended_script}
                icon={Heart}
                color="bg-teal-500"
              />
              <ScriptCard
                label="Script de Fechamento"
                subtitle="Como conduzir para fechar a venda"
                text={protocol.closing_script}
                icon={CheckCircle}
                color="bg-primary"
              />
              <ScriptCard
                label="Script de Indicação"
                subtitle="Pedir indicação após a venda"
                text={protocol.referral_script}
                icon={Users}
                color="bg-purple-500"
              />
              {!protocol.sales_script && !protocol.closing_script && !protocol.referral_script && !protocol.doctor_recommended_script && (
                <EmptyState message="Nenhum script de oferta cadastrado" />
              )}
            </TabsContent>

            {/* Tab: Objeções */}
            <TabsContent value="objections" className="m-0 p-6 space-y-4">
              {protocol.objection_scripts && Object.keys(protocol.objection_scripts).length > 0 ? (
                <>
                  <ScriptCard
                    label="💰 'Está caro...'"
                    subtitle="Contorno de objeção de preço"
                    text={(protocol.objection_scripts as any).preco}
                    icon={AlertCircle}
                    color="bg-amber-500"
                  />
                  <ScriptCard
                    label="⏰ 'Não tenho tempo...'"
                    subtitle="Contorno de objeção de tempo"
                    text={(protocol.objection_scripts as any).tempo}
                    icon={Clock}
                    color="bg-amber-500"
                  />
                  <ScriptCard
                    label="🏢 'Vou pesquisar em outro lugar...'"
                    subtitle="Contorno de objeção de concorrência"
                    text={(protocol.objection_scripts as any).concorrencia}
                    icon={AlertCircle}
                    color="bg-amber-500"
                  />
                  <ScriptCard
                    label="🤔 'Preciso pensar...'"
                    subtitle="Contorno de dúvida/indecisão"
                    text={(protocol.objection_scripts as any).duvida}
                    icon={AlertCircle}
                    color="bg-amber-500"
                  />
                </>
              ) : (
                <EmptyState message="Nenhum script de objeção cadastrado" />
              )}
            </TabsContent>

            {/* Tab: Follow-up */}
            <TabsContent value="followup" className="m-0 p-6 space-y-4">
              <ScriptCard
                label="Follow-up 1"
                subtitle="24-48h após primeiro contato"
                text={protocol.followup_script}
                icon={RefreshCw}
                color="bg-blue-500"
              />
              <ScriptCard
                label="Follow-up 2"
                subtitle="3-5 dias após primeiro follow-up"
                text={protocol.followup_script_2}
                icon={RefreshCw}
                color="bg-amber-500"
              />
              <ScriptCard
                label="Follow-up 3 - Última Tentativa"
                subtitle="Urgência e escassez"
                text={protocol.followup_script_3}
                icon={RefreshCw}
                color="bg-red-500"
              />
              
              <Separator />
              
              <ScriptCard
                label="Script de Reativação"
                subtitle="Cliente que sumiu por mais de 30 dias"
                text={protocol.reactivation_script}
                icon={Sparkles}
                color="bg-orange-500"
              />

              <Separator />

              <ScriptCard
                label="📢 Script para Grupo"
                subtitle="Mensagem para enviar em grupos de WhatsApp/Telegram (sem nome específico)"
                text={protocol.group_script}
                icon={Users}
                color="bg-purple-500"
              />
              
              {!protocol.followup_script && !protocol.followup_script_2 && !protocol.followup_script_3 && !protocol.reactivation_script && !protocol.group_script && (
                <EmptyState message="Nenhum script de follow-up cadastrado" />
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Fechar
          </Button>
          {onEdit && (
            <Button className="flex-1" onClick={onEdit}>
              Editar Protocolo
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProtocolDetailSheet;
