import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plane, Car, Utensils, HeartHandshake, Star, Sparkles,
  Check, Copy, Minus, Plus, Building, Stethoscope, Scissors,
  MessageSquare, ChevronDown, Info, Calendar, BadgeCheck
} from "lucide-react";
import uniqueTravelLogo from "@/assets/unique-travel-logo.png";

// ================ PRICING CONSTANTS ================
const PRICES = {
  hospedagemPremium: 450,
  hospedagemBasic: 280,
  motoristaExecutivo: 360,
  motoristaTransfer: 300,
  alimentacao: 166.67,
  enfermeira12h: 383,
  enfermeira24h: 766.67,
  spaPremium: 300,
  spaBasic: 150,
  jantarGourmet: 538.46,
  salao: 200,
  kitMedicamentos: 1000,
};

// ================ TYPES ================
type HospedagemType = "premium" | "basic" | "none";
type MotoristaType = "executivo" | "transfer" | "none";
type EnfermeiraType = "12h" | "24h" | "none";

interface PackageConfig {
  diasEstadia: number;
  diasEnfermagem: number;
  hospedagem: HospedagemType;
  motorista: MotoristaType;
  alimentacao: boolean;
  enfermeira: EnfermeiraType;
  spaPremium: boolean;
  spaBasic: boolean;
  jantar: boolean;
  salao: boolean;
  kitMedicamentos: boolean;
}

// ================ UTILITY FUNCTIONS ================
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
};

// ================ ANIMATED NUMBER COMPONENT ================
const AnimatedNumber = ({ value, className }: { value: number; className?: string }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 400;
    const steps = 15;
    const stepDuration = duration / steps;
    const increment = (value - displayValue) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue((prev) => prev + increment);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return <span className={className}>{formatCurrency(displayValue)}</span>;
};

// ================ MAIN COMPONENT ================
const UniqueTravelCalculator = () => {
  const [pitchOpen, setPitchOpen] = useState(false);
  const [config, setConfig] = useState<PackageConfig>({
    diasEstadia: 7,
    diasEnfermagem: 7,
    hospedagem: "premium",
    motorista: "executivo",
    alimentacao: true,
    enfermeira: "12h",
    spaPremium: false,
    spaBasic: false,
    jantar: false,
    salao: false,
    kitMedicamentos: false,
  });

  // Calculate total
  const calculateTotal = useCallback((): { total: number; items: string[] } => {
    let total = 0;
    const items: string[] = [];

    // Hospedagem
    if (config.hospedagem === "premium") {
      total += PRICES.hospedagemPremium * config.diasEstadia;
      items.push(`${config.diasEstadia} dias de Hospedagem Premium`);
    } else if (config.hospedagem === "basic") {
      total += PRICES.hospedagemBasic * config.diasEstadia;
      items.push(`${config.diasEstadia} dias de Hospedagem Basic`);
    }

    // Enfermeira (dias independentes!)
    if (config.enfermeira === "12h" && config.diasEnfermagem > 0) {
      total += PRICES.enfermeira12h * config.diasEnfermagem;
      items.push(`${config.diasEnfermagem} dias de Enfermeira 12h`);
    } else if (config.enfermeira === "24h" && config.diasEnfermagem > 0) {
      total += PRICES.enfermeira24h * config.diasEnfermagem;
      items.push(`${config.diasEnfermagem} dias de Enfermeira 24h`);
    }

    // Alimentação
    if (config.alimentacao) {
      total += PRICES.alimentacao * config.diasEstadia;
      items.push(`Alimentação Personalizada`);
    }

    // Motorista
    if (config.motorista === "executivo") {
      total += PRICES.motoristaExecutivo * config.diasEstadia;
      items.push(`Motorista Executivo Diário`);
    } else if (config.motorista === "transfer") {
      total += PRICES.motoristaTransfer;
      items.push(`Transfer Ida/Volta`);
    }

    // Extras
    if (config.spaPremium) {
      total += PRICES.spaPremium;
      items.push(`Spa Pré-Cirúrgico Premium`);
    }
    if (config.spaBasic) {
      total += PRICES.spaBasic;
      items.push(`Spa Pré-Cirúrgico Basic`);
    }
    if (config.jantar) {
      total += PRICES.jantarGourmet;
      items.push(`Jantar Gourmet`);
    }
    if (config.salao) {
      total += PRICES.salao;
      items.push(`Salão de Beleza`);
    }
    if (config.kitMedicamentos) {
      total += PRICES.kitMedicamentos;
      items.push(`Kit Medicamentos`);
    }

    return { total, items };
  }, [config]);

  const { total, items } = calculateTotal();
  const dailyAverage = config.diasEstadia > 0 ? total / config.diasEstadia : 0;

  // Quick presets
  const applyPreset = (days: number, type: "all" | "basic" = "all") => {
    setConfig({
      diasEstadia: days,
      diasEnfermagem: Math.min(7, days),
      hospedagem: type === "all" ? "premium" : "basic",
      motorista: type === "all" ? "executivo" : "transfer",
      alimentacao: type === "all",
      enfermeira: type === "all" ? "12h" : "none",
      spaPremium: type === "all",
      spaBasic: type === "basic",
      jantar: type === "all",
      salao: false,
      kitMedicamentos: false,
    });
  };

  // Adjust number inputs
  const adjustValue = (field: "diasEstadia" | "diasEnfermagem", delta: number) => {
    const newValue = config[field] + delta;
    if (newValue >= 0 && newValue <= 60) {
      setConfig({ ...config, [field]: newValue });
    }
  };

  // Copy to WhatsApp
  const copyToWhatsApp = () => {
    const enfText = config.diasEnfermagem > 0 && config.enfermeira !== "none"
      ? `\n👩‍⚕️ *Cuidado:* ${config.diasEnfermagem} dias de Enfermagem ${config.enfermeira}`
      : "";

    const message = `✨ *Proposta Unique Travel* ✨

🗓️ *Período:* ${config.diasEstadia} dias de Estadia${enfText}

*Incluso no seu pacote:*
${items.map(item => `✅ ${item}`).join("\n")}

💎 *Investimento:* ${formatCurrency(total)}
📊 Média: ${formatCurrency(dailyAverage)}/dia

Vamos agendar sua transformação? 🦋`;

    navigator.clipboard.writeText(message);
    toast.success("Orçamento copiado para o WhatsApp!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3 py-6">
          <img 
            src={uniqueTravelLogo} 
            alt="Unique Travel Experience" 
            className="h-16 md:h-24 mx-auto object-contain"
          />
          <p className="text-[#D4A574]/70 text-sm tracking-widest uppercase">
            Planejamento de Viagem & Concierge
          </p>
        </div>

        {/* Pitch de Vendas Accordion */}
        <Collapsible open={pitchOpen} onOpenChange={setPitchOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full bg-gradient-to-r from-[#D4A574]/10 to-[#F4D03F]/5 border border-[#D4A574]/30 hover:border-[#D4A574]/50 text-[#D4A574] justify-between py-6"
            >
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Pitch de Vendas - O que é o Unique Travel?
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", pitchOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="bg-[#1a1a2e]/80 border-[#D4A574]/20 mt-2">
              <CardContent className="p-6">
                <p className="text-[#D4A574]/90 leading-relaxed italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                  "O Unique Travel é a nossa solução completa de concierge para pacientes de fora. 
                  Nós cuidamos de toda a logística — hospedagem, transporte, alimentação, enfermagem — 
                  para que você foque apenas na sua transformação. Somos de Uberlândia, mas recebemos 
                  pacientes do mundo todo com segurança e conforto de hotel 5 estrelas, mas com o calor de um lar."
                </p>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Quick Presets */}
        <Card className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border-[#D4A574]/30">
          <CardContent className="py-4">
            <div className="space-y-3">
              <p className="text-[#D4A574]/70 text-xs uppercase tracking-wider text-center">Pacotes Prontos</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[3, 7, 14, 21, 30].map((days) => (
                  <div key={days} className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset(days, "all")}
                      className={cn(
                        "border-[#D4A574]/40 text-[#D4A574] hover:bg-[#D4A574]/20 text-xs",
                        config.diasEstadia === days && config.hospedagem === "premium" && "bg-[#D4A574]/20 border-[#D4A574]"
                      )}
                    >
                      {days}d All Inc
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset(days, "basic")}
                      className={cn(
                        "border-slate-500/40 text-slate-400 hover:bg-slate-500/20 text-xs",
                        config.diasEstadia === days && config.hospedagem === "basic" && "bg-slate-500/20 border-slate-400"
                      )}
                    >
                      {days}d Basic
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-[#D4A574]/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-[#D4A574] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                <Sparkles className="h-5 w-5" />
                Monte seu Pacote
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Dias de Estadia */}
              <div className="space-y-2">
                <label className="text-[#D4A574]/70 text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dias de Estadia
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustValue("diasEstadia", -1)}
                    className="border-[#D4A574]/40 bg-transparent hover:bg-[#D4A574]/10 text-[#D4A574] h-10 w-10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-[#F4D03F]">{config.diasEstadia}</span>
                    <span className="text-[#D4A574]/50 ml-2">dias</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustValue("diasEstadia", 1)}
                    className="border-[#D4A574]/40 bg-transparent hover:bg-[#D4A574]/10 text-[#D4A574] h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Dias de Enfermagem */}
              <div className="space-y-2">
                <label className="text-[#D4A574]/70 text-sm flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Dias de Enfermagem
                  <span className="text-[10px] text-[#D4A574]/40">(independente da estadia)</span>
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustValue("diasEnfermagem", -1)}
                    className="border-[#D4A574]/40 bg-transparent hover:bg-[#D4A574]/10 text-[#D4A574] h-10 w-10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-[#F4D03F]">{config.diasEnfermagem}</span>
                    <span className="text-[#D4A574]/50 ml-2">dias</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjustValue("diasEnfermagem", 1)}
                    className="border-[#D4A574]/40 bg-transparent hover:bg-[#D4A574]/10 text-[#D4A574] h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator className="bg-[#D4A574]/20" />

              {/* Selects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hospedagem */}
                <div className="space-y-2">
                  <label className="text-[#D4A574]/70 text-sm flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Hospedagem
                  </label>
                  <Select
                    value={config.hospedagem}
                    onValueChange={(v) => setConfig({ ...config, hospedagem: v as HospedagemType })}
                  >
                    <SelectTrigger className="bg-white/5 border-[#D4A574]/30 text-[#D4A574]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium (R$ 450/dia)</SelectItem>
                      <SelectItem value="basic">Basic (R$ 280/dia)</SelectItem>
                      <SelectItem value="none">Sem hospedagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Motorista */}
                <div className="space-y-2">
                  <label className="text-[#D4A574]/70 text-sm flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Motorista
                  </label>
                  <Select
                    value={config.motorista}
                    onValueChange={(v) => setConfig({ ...config, motorista: v as MotoristaType })}
                  >
                    <SelectTrigger className="bg-white/5 border-[#D4A574]/30 text-[#D4A574]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executivo">Executivo (R$ 360/dia)</SelectItem>
                      <SelectItem value="transfer">Transfer (R$ 300)</SelectItem>
                      <SelectItem value="none">Sem motorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Enfermeira */}
                <div className="space-y-2">
                  <label className="text-[#D4A574]/70 text-sm flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4" />
                    Tipo de Enfermagem
                  </label>
                  <Select
                    value={config.enfermeira}
                    onValueChange={(v) => setConfig({ ...config, enfermeira: v as EnfermeiraType })}
                  >
                    <SelectTrigger className="bg-white/5 border-[#D4A574]/30 text-[#D4A574]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 horas (R$ 383/dia)</SelectItem>
                      <SelectItem value="24h">24 horas (R$ 767/dia)</SelectItem>
                      <SelectItem value="none">Sem enfermeira</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Alimentação Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-[#D4A574]/20">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-[#D4A574]" />
                    <div>
                      <p className="text-[#D4A574] text-sm">Alimentação</p>
                      <p className="text-[#D4A574]/40 text-[10px]">R$ 167/dia</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.alimentacao}
                    onCheckedChange={(v) => setConfig({ ...config, alimentacao: v })}
                    className="data-[state=checked]:bg-[#D4A574]"
                  />
                </div>
              </div>

              <Separator className="bg-[#D4A574]/20" />

              {/* Extras */}
              <div className="space-y-3">
                <p className="text-[#D4A574]/70 text-sm flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Extras
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "spaPremium", label: "Spa Premium", price: PRICES.spaPremium, icon: Sparkles },
                    { key: "spaBasic", label: "Spa Basic", price: PRICES.spaBasic, icon: Sparkles },
                    { key: "jantar", label: "Jantar Gourmet", price: PRICES.jantarGourmet, icon: Utensils },
                    { key: "salao", label: "Salão de Beleza", price: PRICES.salao, icon: Scissors },
                    { key: "kitMedicamentos", label: "Kit Medicamentos", price: PRICES.kitMedicamentos, icon: HeartHandshake },
                  ].map(({ key, label, price, icon: Icon }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-[#D4A574]/20"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[#D4A574]/60" />
                        <div>
                          <p className="text-[#D4A574] text-xs">{label}</p>
                          <p className="text-[#D4A574]/40 text-[10px]">{formatCurrency(price)}</p>
                        </div>
                      </div>
                      <Switch
                        checked={config[key as keyof PackageConfig] as boolean}
                        onCheckedChange={(v) => {
                          const updates: Partial<PackageConfig> = { [key]: v };
                          // Mutual exclusion for spa types
                          if (key === "spaPremium" && v) updates.spaBasic = false;
                          if (key === "spaBasic" && v) updates.spaPremium = false;
                          setConfig({ ...config, ...updates });
                        }}
                        className="data-[state=checked]:bg-[#D4A574] scale-90"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Printable Summary Card */}
          <div className="space-y-4">
            <Card 
              className="bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0f0f1a] border-2 border-[#D4A574]/60 relative overflow-hidden"
              style={{ 
                boxShadow: "0 0 40px rgba(212, 165, 116, 0.15)",
              }}
            >
              {/* Decorative corner elements */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#D4A574]/40 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#D4A574]/40 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#D4A574]/40 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#D4A574]/40 rounded-br-lg" />

              <CardContent className="p-8 relative">
                {/* Logo */}
                <div className="text-center mb-6">
                  <img 
                    src={uniqueTravelLogo} 
                    alt="Unique Travel" 
                    className="h-14 mx-auto object-contain mb-3"
                  />
                  <h2 
                    className="text-xl text-[#D4A574] tracking-wide"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Seu Orçamento Unique Travel
                  </h2>
                </div>

                <Separator className="bg-gradient-to-r from-transparent via-[#D4A574]/40 to-transparent mb-6" />

                {/* Period Info */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-[#D4A574]/50 text-xs uppercase tracking-wider">Estadia</p>
                    <p className="text-2xl font-bold text-[#F4D03F]">{config.diasEstadia} <span className="text-sm font-normal text-[#D4A574]/60">dias</span></p>
                  </div>
                  {config.diasEnfermagem > 0 && config.enfermeira !== "none" && (
                    <div className="text-center">
                      <p className="text-[#D4A574]/50 text-xs uppercase tracking-wider">Enfermagem</p>
                      <p className="text-2xl font-bold text-[#F4D03F]">{config.diasEnfermagem} <span className="text-sm font-normal text-[#D4A574]/60">dias</span></p>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-2 mb-6">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#D4A574]/5">
                        <BadgeCheck className="h-4 w-4 text-[#D4A574] shrink-0" />
                        <span className="text-[#D4A574]/90 text-sm">{item}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-[#D4A574]/40 italic py-4">
                      Selecione os serviços desejados
                    </p>
                  )}
                </div>

                <Separator className="bg-gradient-to-r from-transparent via-[#D4A574]/40 to-transparent mb-6" />

                {/* Total */}
                <div className="text-center space-y-2">
                  <p className="text-[#D4A574]/50 text-xs uppercase tracking-wider">Investimento Total</p>
                  <AnimatedNumber 
                    value={total} 
                    className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#D4A574] to-[#F4D03F] bg-clip-text text-transparent"
                  />
                  <p className="text-[#D4A574]/60 text-sm">
                    Média: {formatCurrency(dailyAverage)}/dia
                  </p>
                </div>

                {/* Validity */}
                <div className="mt-6 text-center">
                  <p className="text-[#D4A574]/40 text-xs italic">
                    ✨ Validade da proposta: 7 dias ✨
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={copyToWhatsApp}
                className="flex-1 bg-gradient-to-r from-[#D4A574] to-[#F4D03F] hover:from-[#F4D03F] hover:to-[#D4A574] text-black font-bold py-6 gap-2"
              >
                <MessageSquare className="h-5 w-5" />
                Copiar para WhatsApp
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  toast.info("Dica: Use Print Screen ou Ctrl+Shift+S para capturar o card!");
                }}
                className="border-[#D4A574]/50 text-[#D4A574] hover:bg-[#D4A574]/10 h-auto py-6 px-4"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniqueTravelCalculator;
