import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plane, Car, Utensils, HeartHandshake, Star, Gift, Sparkles,
  Check, Copy, Crown, Minus, Plus, Building, Stethoscope, Scissors,
  MessageSquare, ChevronDown, ChevronUp
} from "lucide-react";
import uniqueTravelLogo from "@/assets/unique-travel-logo.png";

// ================ PRICING CONSTANTS (UT.PAC - Pacote) ================
const PRICES = {
  hospedagemPremium: 450,    // Residenciais Premium
  hospedagemBasic: 280,      // Residenciais Basic
  motoristaExecutivo: 300,   // 4 trechos/dia
  motoristaTransfer: 300,    // Transfer aero ida/volta (fixo)
  alimentacao2: 167,         // 2 refeições/dia
  alimentacao4: 315,         // 4 refeições/dia
  enfermeira12h: 333,        // 12 horas/dia
  enfermeira24h: 667,        // 24 horas/dia
  spaPremium: 300,           // Com banheira + acompanhante
  spaBasic: 150,             // Basic
  jantarGourmet: 538,        // Com acompanhante
  salao: 230,                // Salão de beleza
  kitMedicamentos: 1000,     // Kit medicamentos
  kitBoasVindas: 230,        // Presente boas-vindas
  surpresasUnique: 231,      // Surpresas Unique Experience
};

// ================ TYPES ================
interface PackageResult {
  total: number;
  perDay: number;
}

type HospedagemType = "premium" | "basic" | "none";
type MotoristaType = "executivo" | "transfer" | "none";
type EnfermeiraType = "12h" | "24h" | "none";
type AlimentacaoType = "2refeicoes" | "4refeicoes" | "none";

interface CustomPackage {
  hospedagem: HospedagemType;
  motorista: MotoristaType;
  alimentacao: AlimentacaoType;
  enfermeira: EnfermeiraType;
  enfermeiraDias: number;
  spaPremium: boolean;
  spaBasic: boolean;
  jantar: boolean;
  salao: boolean;
  kitMedicamentos: boolean;
  kitBoasVindas: boolean;
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
    const duration = 500;
    const steps = 20;
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

// ================ SERVICE TOOLTIP ================
const ServiceTooltip = ({ text }: { text: string }) => (
  <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">{text}</p>
);

// ================ MAIN COMPONENT ================
const UniqueTravelCalculator = () => {
  const [days, setDays] = useState(7);
  const [showCustom, setShowCustom] = useState(false);
  const [customPackage, setCustomPackage] = useState<CustomPackage>({
    hospedagem: "premium",
    motorista: "executivo",
    alimentacao: "2refeicoes",
    enfermeira: "12h",
    enfermeiraDias: 7,
    spaPremium: false,
    spaBasic: false,
    jantar: false,
    salao: false,
    kitMedicamentos: false,
    kitBoasVindas: false,
  });

  // Calculate All Inclusive Package (usando alimentação 2 refeições como padrão)
  const calculateAllInclusive = useCallback((): PackageResult => {
    const dailyRate = PRICES.hospedagemPremium + PRICES.motoristaExecutivo + PRICES.alimentacao2 + PRICES.enfermeira12h;
    const total = dailyRate * days;
    return { total, perDay: dailyRate };
  }, [days]);

  // Calculate Basic Package
  const calculateBasic = useCallback((): PackageResult => {
    const total = PRICES.hospedagemBasic * days + PRICES.motoristaTransfer;
    const perDay = total / days;
    return { total, perDay };
  }, [days]);

  // Calculate Custom Package
  const calculateCustom = useCallback((): PackageResult => {
    let dailyTotal = 0;
    let fixedTotal = 0;
    let enfermeiraTotal = 0;

    // Hospedagem
    if (customPackage.hospedagem === "premium") dailyTotal += PRICES.hospedagemPremium;
    if (customPackage.hospedagem === "basic") dailyTotal += PRICES.hospedagemBasic;

    // Motorista
    if (customPackage.motorista === "executivo") dailyTotal += PRICES.motoristaExecutivo;
    if (customPackage.motorista === "transfer") fixedTotal += PRICES.motoristaTransfer;

    // Alimentação
    if (customPackage.alimentacao === "2refeicoes") dailyTotal += PRICES.alimentacao2;
    if (customPackage.alimentacao === "4refeicoes") dailyTotal += PRICES.alimentacao4;

    // Enfermeira (dias específicos, não multiplicado por dias totais)
    const enfermeiraDiasEfetivos = Math.min(customPackage.enfermeiraDias, days);
    if (customPackage.enfermeira === "12h") enfermeiraTotal = PRICES.enfermeira12h * enfermeiraDiasEfetivos;
    if (customPackage.enfermeira === "24h") enfermeiraTotal = PRICES.enfermeira24h * enfermeiraDiasEfetivos;

    // Extras (Fixed)
    if (customPackage.spaPremium) fixedTotal += PRICES.spaPremium;
    if (customPackage.spaBasic) fixedTotal += PRICES.spaBasic;
    if (customPackage.jantar) fixedTotal += PRICES.jantarGourmet;
    if (customPackage.salao) fixedTotal += PRICES.salao;
    if (customPackage.kitMedicamentos) fixedTotal += PRICES.kitMedicamentos;
    if (customPackage.kitBoasVindas) fixedTotal += PRICES.kitBoasVindas;

    const total = dailyTotal * days + fixedTotal + enfermeiraTotal;
    return { total, perDay: total / days };
  }, [days, customPackage]);

  const allInclusive = calculateAllInclusive();
  const basic = calculateBasic();
  const custom = calculateCustom();

  // Copy to WhatsApp
  const copyToWhatsApp = (packageType: "all" | "basic" | "custom") => {
    let message = "";

    if (packageType === "all") {
      message = `🌟 *Orçamento Unique Travel Experience* 🌟

📅 Período: ${days} dias

📦 *Pacote All Inclusive*
✅ Hospedagem Premium
✅ Motorista Executivo Diário
✅ Alimentação Personalizada
✅ Enfermeira 12h

🎁 *Bônus Inclusos:*
✨ Concierge Aéreo
✨ Spa Pré-Cirúrgico Premium (com acompanhante)
✨ Jantar Especial Gourmet (com acompanhante)
✨ Comunicação Grupo Equipe
✨ Surpresas Unique Experience

💰 *Investimento Total:* ${formatCurrency(allInclusive.total)}
📊 (Aprox. ${formatCurrency(allInclusive.perDay)}/dia)

Podemos reservar sua data? ✨`;
    } else if (packageType === "basic") {
      message = `🌟 *Orçamento Unique Travel Experience* 🌟

📅 Período: ${days} dias

📦 *Pacote Basic*
✅ Hospedagem Confortável
✅ Transfer Ida/Volta

🎁 *Bônus Inclusos:*
✨ Concierge Aéreo
✨ Kit de Boas-Vindas
✨ Spa Pré-Cirúrgico Basic
✨ Comunicação Grupo Equipe

💰 *Investimento Total:* ${formatCurrency(basic.total)}
📊 (Aprox. ${formatCurrency(basic.perDay)}/dia)

Podemos reservar sua data? ✨`;
    } else {
      const items: string[] = [];
      if (customPackage.hospedagem === "premium") items.push("✅ Hospedagem Premium");
      if (customPackage.hospedagem === "basic") items.push("✅ Hospedagem Basic");
      if (customPackage.motorista === "executivo") items.push("✅ Motorista Executivo Diário");
      if (customPackage.motorista === "transfer") items.push("✅ Transfer Ida/Volta");
      if (customPackage.alimentacao === "2refeicoes") items.push("✅ Alimentação 2 Refeições/dia");
      if (customPackage.alimentacao === "4refeicoes") items.push("✅ Alimentação 4 Refeições/dia");
      const enfermeiraDiasEfetivos = Math.min(customPackage.enfermeiraDias, days);
      if (customPackage.enfermeira === "12h") items.push(`✅ Enfermeira 12h (${enfermeiraDiasEfetivos} dias)`);
      if (customPackage.enfermeira === "24h") items.push(`✅ Enfermeira 24h (${enfermeiraDiasEfetivos} dias)`);
      if (customPackage.spaPremium) items.push("✅ Spa Premium");
      if (customPackage.spaBasic) items.push("✅ Spa Basic");
      if (customPackage.jantar) items.push("✅ Jantar Gourmet");
      if (customPackage.salao) items.push("✅ Salão de Beleza");
      if (customPackage.kitMedicamentos) items.push("✅ Kit Medicamentos");
      if (customPackage.kitBoasVindas) items.push("✅ Kit Boas-Vindas");

      message = `🌟 *Orçamento Unique Travel Experience* 🌟

📅 Período: ${days} dias

📦 *Pacote Personalizado*
${items.join("\n")}

💰 *Investimento Total:* ${formatCurrency(custom.total)}
📊 (Aprox. ${formatCurrency(custom.perDay)}/dia)

Podemos reservar sua data? ✨`;
    }

    navigator.clipboard.writeText(message);
    toast.success("Orçamento copiado para o WhatsApp!");
  };

  const adjustDays = (delta: number) => {
    const newDays = days + delta;
    if (newDays >= 1 && newDays <= 60) {
      setDays(newDays);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <img 
            src={uniqueTravelLogo} 
            alt="Unique Travel Experience" 
            className="h-20 md:h-28 mx-auto object-contain"
          />
          <p className="text-amber-200/60 text-sm md:text-base tracking-widest uppercase">
            Planejamento de Viagem & Concierge
          </p>
        </div>

        {/* Days Input */}
        <Card className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border-amber-500/30 max-w-md mx-auto">
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4">
              <label className="text-amber-200/70 text-sm uppercase tracking-wider">
                Período de Estadia
              </label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => adjustDays(-1)}
                  className="border-amber-500/50 bg-transparent hover:bg-amber-500/10 text-amber-400 h-12 w-12"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <div className="text-center min-w-[120px]">
                  <span className="text-5xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                    {days}
                  </span>
                  <p className="text-amber-200/50 text-sm">dias</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => adjustDays(1)}
                  className="border-amber-500/50 bg-transparent hover:bg-amber-500/10 text-amber-400 h-12 w-12"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {[7, 14, 21, 30].map((d) => (
                  <Button
                    key={d}
                    variant="ghost"
                    size="sm"
                    onClick={() => setDays(d)}
                    className={cn(
                      "text-xs border",
                      days === d
                        ? "border-amber-400 text-amber-400 bg-amber-500/10"
                        : "border-amber-500/30 text-amber-200/50 hover:text-amber-300"
                    )}
                  >
                    {d} dias
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Package Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* All Inclusive Card */}
          <Card className="bg-gradient-to-br from-[#1a1a2e] via-[#1f2937] to-[#1a1a2e] border-2 border-amber-500/50 relative overflow-hidden group hover:border-amber-400 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 gap-1">
                  <Crown className="h-3 w-3" />
                  Experiência Completa
                </Badge>
                <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-amber-100 mt-4">
                All Inclusive
              </CardTitle>
              <p className="text-amber-200/60 text-sm">Tudo que você precisa em um só pacote</p>
            </CardHeader>

            <CardContent className="relative space-y-6">
              {/* Price Display */}
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 rounded-xl p-6 border border-amber-500/30">
                <div className="text-center">
                  <p className="text-amber-200/50 text-sm mb-1">Investimento Total</p>
                  <AnimatedNumber value={allInclusive.total} className="text-4xl md:text-5xl font-bold text-amber-400" />
                  <p className="text-amber-200/70 text-sm mt-2">
                    {formatCurrency(allInclusive.perDay)}/dia
                  </p>
                </div>
              </div>

              {/* Included Items */}
              <div className="space-y-3">
                <h4 className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Incluso no Pacote</h4>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <Building className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-amber-100 font-medium">Hospedagem Premium</p>
                      <ServiceTooltip text="Apartamentos decorados com identidade Unique, conforto de hotel com calor de lar." />
                    </div>
                    <Check className="h-5 w-5 text-green-400 shrink-0" />
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <Car className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-amber-100 font-medium">Motorista Executivo Diário</p>
                      <ServiceTooltip text="Conforto e discrição, sem se preocupar com aplicativos ou rotas." />
                    </div>
                    <Check className="h-5 w-5 text-green-400 shrink-0" />
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <Utensils className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-amber-100 font-medium">Alimentação Exclusiva</p>
                      <ServiceTooltip text="Refeições personalizadas para seu pós-operatório." />
                    </div>
                    <Check className="h-5 w-5 text-green-400 shrink-0" />
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <Stethoscope className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-amber-100 font-medium">Enfermeira Home Care 12h</p>
                      <ServiceTooltip text="Segurança total no pós-operatório, monitoramento de sinais vitais e auxílio no banho." />
                    </div>
                    <Check className="h-5 w-5 text-green-400 shrink-0" />
                  </div>
                </div>

                <Separator className="bg-amber-500/20 my-4" />

                <h4 className="text-amber-300 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Bônus Exclusivos
                </h4>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    "Concierge Aéreo",
                    "Spa Premium (com acompanhante)",
                    "Jantar Gourmet (com acompanhante)",
                    "Grupo Equipe WhatsApp",
                    "Surpresas Unique",
                  ].map((bonus) => (
                    <div key={bonus} className="flex items-center gap-2 text-amber-200/70">
                      <Star className="h-3 w-3 text-amber-500" />
                      <span>{bonus}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => copyToWhatsApp("all")}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold py-6 text-lg gap-2"
              >
                <Copy className="h-5 w-5" />
                Copiar Orçamento
              </Button>
            </CardContent>
          </Card>

          {/* Basic Card */}
          <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-slate-600/50 relative overflow-hidden group hover:border-slate-500 transition-all duration-300">
            <CardHeader className="relative">
              <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/50 w-fit">
                Essencial
              </Badge>
              <CardTitle className="text-2xl md:text-3xl font-bold text-slate-100 mt-4">
                Basic
              </CardTitle>
              <p className="text-slate-400 text-sm">O essencial para sua viagem</p>
            </CardHeader>

            <CardContent className="relative space-y-6">
              {/* Price Display */}
              <div className="bg-slate-500/10 rounded-xl p-6 border border-slate-500/30">
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-1">Investimento Total</p>
                  <AnimatedNumber value={basic.total} className="text-4xl md:text-5xl font-bold text-slate-200" />
                  <p className="text-slate-400 text-sm mt-2">
                    {formatCurrency(basic.perDay)}/dia
                  </p>
                </div>
              </div>

              {/* Included Items */}
              <div className="space-y-3">
                <h4 className="text-slate-300 font-semibold text-sm uppercase tracking-wider">Incluso no Pacote</h4>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <Building className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-slate-100 font-medium">Hospedagem Confortável</p>
                      <ServiceTooltip text="Acomodações confortáveis e seguras." />
                    </div>
                    <Check className="h-5 w-5 text-green-400 shrink-0" />
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <Car className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-slate-100 font-medium">Transfer Ida/Volta</p>
                      <ServiceTooltip text="Transporte do aeroporto para a clínica e vice-versa." />
                    </div>
                    <Check className="h-5 w-5 text-green-400 shrink-0" />
                  </div>
                </div>

                <Separator className="bg-slate-500/20 my-4" />

                <h4 className="text-slate-300 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Bônus Inclusos
                </h4>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    "Concierge Aéreo",
                    "Kit Boas-Vindas",
                    "Spa Basic",
                    "Grupo Equipe WhatsApp",
                  ].map((bonus) => (
                    <div key={bonus} className="flex items-center gap-2 text-slate-400">
                      <Star className="h-3 w-3 text-slate-500" />
                      <span>{bonus}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => copyToWhatsApp("basic")}
                variant="outline"
                className="w-full border-slate-500 text-slate-200 hover:bg-slate-500/20 py-6 text-lg gap-2"
              >
                <Copy className="h-5 w-5" />
                Copiar Orçamento
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Custom Package Toggle */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => setShowCustom(!showCustom)}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-2"
          >
            {showCustom ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Montar Pacote Personalizado
          </Button>
        </div>

        {/* Custom Package Builder */}
        {showCustom && (
          <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-xl text-amber-100 flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-amber-400" />
                Personalize sua Experience
              </CardTitle>
              <p className="text-amber-200/60 text-sm">Monte o pacote ideal para seu cliente</p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hospedagem */}
                <div className="space-y-2">
                  <label className="text-amber-200/70 text-sm flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Hospedagem
                  </label>
                  <Select
                    value={customPackage.hospedagem}
                    onValueChange={(v) => setCustomPackage({ ...customPackage, hospedagem: v as HospedagemType })}
                  >
                    <SelectTrigger className="bg-white/5 border-amber-500/30 text-amber-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium ({formatCurrency(PRICES.hospedagemPremium)}/dia)</SelectItem>
                      <SelectItem value="basic">Basic ({formatCurrency(PRICES.hospedagemBasic)}/dia)</SelectItem>
                      <SelectItem value="none">Sem hospedagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Motorista */}
                <div className="space-y-2">
                  <label className="text-amber-200/70 text-sm flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Motorista
                  </label>
                  <Select
                    value={customPackage.motorista}
                    onValueChange={(v) => setCustomPackage({ ...customPackage, motorista: v as MotoristaType })}
                  >
                    <SelectTrigger className="bg-white/5 border-amber-500/30 text-amber-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executivo">Executivo Diário ({formatCurrency(PRICES.motoristaExecutivo)}/dia)</SelectItem>
                      <SelectItem value="transfer">Transfer Apenas ({formatCurrency(PRICES.motoristaTransfer)})</SelectItem>
                      <SelectItem value="none">Sem motorista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Enfermeira */}
                <div className="space-y-2">
                  <label className="text-amber-200/70 text-sm flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Enfermeira Home Care
                  </label>
                  <Select
                    value={customPackage.enfermeira}
                    onValueChange={(v) => setCustomPackage({ ...customPackage, enfermeira: v as EnfermeiraType })}
                  >
                    <SelectTrigger className="bg-white/5 border-amber-500/30 text-amber-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 horas ({formatCurrency(PRICES.enfermeira12h)}/dia)</SelectItem>
                      <SelectItem value="24h">24 horas ({formatCurrency(PRICES.enfermeira24h)}/dia)</SelectItem>
                      <SelectItem value="none">Sem enfermeira</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Dias de Enfermeira - só mostra se enfermeira != none */}
                  {customPackage.enfermeira !== "none" && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <label className="text-amber-200/70 text-xs uppercase tracking-wider block mb-2">
                        Quantos dias de enfermeira?
                      </label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCustomPackage({ 
                            ...customPackage, 
                            enfermeiraDias: Math.max(1, customPackage.enfermeiraDias - 1) 
                          })}
                          className="border-amber-500/50 bg-transparent hover:bg-amber-500/10 text-amber-400 h-8 w-8"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="text-center min-w-[60px]">
                          <span className="text-2xl font-bold text-amber-400">
                            {Math.min(customPackage.enfermeiraDias, days)}
                          </span>
                          <p className="text-amber-200/50 text-xs">de {days} dias</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCustomPackage({ 
                            ...customPackage, 
                            enfermeiraDias: Math.min(days, customPackage.enfermeiraDias + 1) 
                          })}
                          className="border-amber-500/50 bg-transparent hover:bg-amber-500/10 text-amber-400 h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-amber-200/60 text-xs mt-2">
                        Custo enfermeira: {formatCurrency(
                          (customPackage.enfermeira === "12h" ? PRICES.enfermeira12h : PRICES.enfermeira24h) * 
                          Math.min(customPackage.enfermeiraDias, days)
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Alimentação Select */}
                <div className="space-y-2">
                  <label className="text-amber-200/70 text-sm flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Alimentação
                  </label>
                  <Select
                    value={customPackage.alimentacao}
                    onValueChange={(v) => setCustomPackage({ ...customPackage, alimentacao: v as AlimentacaoType })}
                  >
                    <SelectTrigger className="bg-white/5 border-amber-500/30 text-amber-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2refeicoes">2 Refeições/dia ({formatCurrency(PRICES.alimentacao2)}/dia)</SelectItem>
                      <SelectItem value="4refeicoes">4 Refeições/dia ({formatCurrency(PRICES.alimentacao4)}/dia)</SelectItem>
                      <SelectItem value="none">Sem alimentação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-amber-500/20" />

              <h4 className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Extras</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Spa Premium */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-amber-100 font-medium">Spa Premium</p>
                      <p className="text-amber-200/50 text-xs">{formatCurrency(PRICES.spaPremium)}</p>
                    </div>
                  </div>
                  <Switch
                    checked={customPackage.spaPremium}
                    onCheckedChange={(v) => setCustomPackage({ ...customPackage, spaPremium: v, spaBasic: v ? false : customPackage.spaBasic })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>

                {/* Spa Basic */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-amber-100 font-medium">Spa Basic</p>
                      <p className="text-amber-200/50 text-xs">{formatCurrency(PRICES.spaBasic)}</p>
                    </div>
                  </div>
                  <Switch
                    checked={customPackage.spaBasic}
                    onCheckedChange={(v) => setCustomPackage({ ...customPackage, spaBasic: v, spaPremium: v ? false : customPackage.spaPremium })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>

                {/* Jantar Gourmet */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Utensils className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-amber-100 font-medium">Jantar Gourmet</p>
                      <p className="text-amber-200/50 text-xs">{formatCurrency(PRICES.jantarGourmet)}</p>
                    </div>
                  </div>
                  <Switch
                    checked={customPackage.jantar}
                    onCheckedChange={(v) => setCustomPackage({ ...customPackage, jantar: v })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>

                {/* Salão */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Scissors className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-amber-100 font-medium">Salão de Beleza</p>
                      <p className="text-amber-200/50 text-xs">{formatCurrency(PRICES.salao)}</p>
                    </div>
                  </div>
                  <Switch
                    checked={customPackage.salao}
                    onCheckedChange={(v) => setCustomPackage({ ...customPackage, salao: v })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>

                {/* Kit Medicamentos */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <HeartHandshake className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-amber-100 font-medium">Kit Medicamentos</p>
                      <p className="text-amber-200/50 text-xs">{formatCurrency(PRICES.kitMedicamentos)}</p>
                    </div>
                  </div>
                  <Switch
                    checked={customPackage.kitMedicamentos}
                    onCheckedChange={(v) => setCustomPackage({ ...customPackage, kitMedicamentos: v })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>

                {/* Kit Boas-Vindas */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Gift className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-amber-100 font-medium">Kit Boas-Vindas</p>
                      <p className="text-amber-200/50 text-xs">{formatCurrency(PRICES.kitBoasVindas)}</p>
                    </div>
                  </div>
                  <Switch
                    checked={customPackage.kitBoasVindas}
                    onCheckedChange={(v) => setCustomPackage({ ...customPackage, kitBoasVindas: v })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>

              {/* Custom Total */}
              <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 rounded-xl p-6 border border-amber-500/30">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <p className="text-amber-200/50 text-sm mb-1">Total Personalizado</p>
                    <AnimatedNumber value={custom.total} className="text-3xl md:text-4xl font-bold text-amber-400" />
                    <p className="text-amber-200/70 text-sm mt-1">
                      {formatCurrency(custom.perDay)}/dia
                    </p>
                  </div>
                  <Button
                    onClick={() => copyToWhatsApp("custom")}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold py-4 px-8 gap-2"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Copiar para WhatsApp
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UniqueTravelCalculator;
