import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, Target, Star, DollarSign, MessageSquare, Users, Video, Instagram,
  Award, TrendingUp, Gift, Calendar, AlertTriangle, CheckCircle2, Clock, Sparkles,
  UserPlus, CalendarCheck, Stethoscope, Scissors, HeartPulse, ArrowRight,
  ChevronDown, ChevronUp, RotateCcw, Cloud, BookOpen, Route, Phone, HandshakeIcon, Heart, Lightbulb, Megaphone
} from "lucide-react";
import copaLogo from "@/assets/logo-copa-unique-league.png";
import cardsSystem from "@/assets/cards-system.png";
import { useJourneyChecklist } from "@/hooks/useJourneyChecklist";
import PrizeRulesAndHistory from "@/components/PrizeRulesAndHistory";

const journeyStages = [
  {
    id: 1,
    title: "Lead",
    subtitle: "Captação e Primeiro Contato",
    icon: UserPlus,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    accentColor: "text-blue-500",
    team: ["Comercial", "Marketing"],
    actions: [
      "Identificar potenciais pacientes",
      "Responder mensagens e DMs",
      "Qualificar interesse do lead",
      "Registrar dados no sistema",
      "Apresentar a clínica e procedimentos"
    ],
    indicators: ["Indicações coletadas", "Menções no Instagram"]
  },
  {
    id: 2,
    title: "Agendamento",
    subtitle: "Conversão para Consulta",
    icon: CalendarCheck,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    accentColor: "text-purple-500",
    team: ["Comercial"],
    actions: [
      "Confirmar interesse do paciente",
      "Agendar consulta com o médico",
      "Enviar confirmação e lembretes",
      "Preparar documentação necessária",
      "Orientar sobre o que levar"
    ],
    indicators: ["Indicações → Consulta"]
  },
  {
    id: 3,
    title: "Consulta",
    subtitle: "Avaliação Médica",
    icon: Stethoscope,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    accentColor: "text-amber-500",
    team: ["Médico", "Comercial"],
    actions: [
      "Acolher o paciente na clínica",
      "Apresentar o médico e equipe",
      "Acompanhar durante a consulta",
      "Explicar procedimentos e valores",
      "Negociar formas de pagamento"
    ],
    indicators: ["NPS", "Faturamento"]
  },
  {
    id: 4,
    title: "Cirurgia",
    subtitle: "Procedimento Realizado",
    icon: Scissors,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    accentColor: "text-emerald-500",
    team: ["Médico", "Comercial", "Enfermagem"],
    actions: [
      "Confirmar procedimento agendado",
      "Orientar preparação pré-operatória",
      "Acompanhar no dia da cirurgia",
      "Garantir conforto do paciente",
      "Registrar indicação → Cirurgia"
    ],
    indicators: ["Indicações → Cirurgia", "Faturamento"]
  },
  {
    id: 5,
    title: "Pós-op",
    subtitle: "Acompanhamento e Fidelização",
    icon: HeartPulse,
    color: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    accentColor: "text-rose-500",
    team: ["Comercial", "Médico"],
    actions: [
      "Ligar para saber como está",
      "Agendar retornos necessários",
      "Solicitar avaliação NPS",
      "Pedir depoimento (Google/Vídeo)",
      "Incentivar indicações de amigos"
    ],
    indicators: ["NPS", "Depoimentos Google", "Depoimentos Vídeo", "UniLovers", "Embaixadores"]
  }
];

// Commercial Process Guide - Static educational content
const commercialPhases = [
  {
    id: 1,
    title: "Atração",
    responsible: "Social Selling (Comercial 1)",
    mission: "Gerar desejo, educar o mercado e capturar a atenção de potenciais pacientes.",
    activities: [
      "Criar conteúdo de valor (posts, stories)",
      "Engajar com a audiência (comentários, DMs)",
      "Prospectar ativamente novos perfis"
    ],
    opportunities: [
      { icon: "📚", text: "Oferecer materiais ricos (e-books, guias) para capturar contatos" }
    ],
    handoffCriteria: "Lead demonstra interesse claro e fornece contato para o SDR.",
    icon: Megaphone,
    gradient: "from-amber-500/20 to-yellow-500/10",
    borderColor: "border-amber-500/30"
  },
  {
    id: 2,
    title: "Qualificação",
    responsible: "SDR (Comercial 1.5)",
    mission: "Transformar o interesse em uma consulta de valor agendada.",
    activities: [
      "Contato em até 5 minutos",
      "Qualificação profunda (dores, sonhos, orçamento)",
      "Agendamento e confirmação da consulta"
    ],
    opportunities: [
      { icon: "💡", text: "Vender a 'Consulta Premium' (diagnóstico completo)" },
      { icon: "🎯", text: "Mapear desejos para upsell do Closer" },
      { icon: "✨", text: "Gerar curiosidade sobre protocolos pré-operatórios" }
    ],
    handoffCriteria: "Consulta agendada e confirmada, com dossiê completo do paciente preenchido no CRM.",
    icon: Phone,
    gradient: "from-blue-500/20 to-cyan-500/10",
    borderColor: "border-blue-500/30"
  },
  {
    id: 3,
    title: "Conversão",
    responsible: "Closer (Comercial 2)",
    mission: "Conduzir a consulta e converter o sonho do paciente em um plano de ação.",
    activities: [
      "Estudar o dossiê do paciente",
      "Conduzir a consulta consultiva (SPIN Selling)",
      "Apresentar o plano de tratamento e negociar",
      "Fechar o contrato"
    ],
    opportunities: [
      { icon: "💰", text: "Upsell: Procedimentos combinados" },
      { icon: "🛍️", text: "Cross-sell: Protocolos pré e pós-operatórios" },
      { icon: "💄", text: "Produtos de skincare para manutenção" }
    ],
    handoffCriteria: "Contrato assinado e pagamento da entrada efetuado.",
    icon: HandshakeIcon,
    gradient: "from-green-500/20 to-emerald-500/10",
    borderColor: "border-green-500/30"
  },
  {
    id: 4,
    title: "Experiência",
    responsible: "Customer Success (Comercial 3)",
    mission: "Orquestrar uma experiência pós-venda memorável (até 90 dias).",
    activities: [
      "Onboarding do paciente",
      "Acompanhamento intensivo pós-operatório",
      "Coleta de depoimentos e NPS"
    ],
    opportunities: [
      { icon: "❤️", text: "Cuidado: Sessões extras de drenagem, tratamentos para cicatriz" },
      { icon: "🧴", text: "Manutenção: Produtos de skincare" },
      { icon: "⭐", text: "'Efeito Uau': Protocolos estéticos complementares (bioestimuladores)" }
    ],
    handoffCriteria: "Paciente completa 90 dias de pós-operatório com alta satisfação.",
    icon: Heart,
    gradient: "from-pink-500/20 to-rose-500/10",
    borderColor: "border-pink-500/30"
  },
  {
    id: 5,
    title: "Relacionamento",
    responsible: "Farmer (Comercial 4)",
    mission: "Transformar pacientes satisfeitos em fãs leais e fonte de receita recorrente (após 90 dias).",
    activities: [
      "Gestão e segmentação da base de pacientes",
      "Contatos de relacionamento de longo prazo",
      "Campanhas de reativação"
    ],
    opportunities: [
      { icon: "🔄", text: "Recorrência: Pacotes de manutenção anual" },
      { icon: "🎁", text: "Reativação: Ofertas de novos procedimentos" },
      { icon: "👥", text: "Indicação: Campanhas para o círculo de confiança" }
    ],
    handoffCriteria: "Aumento do LTV, taxa de recompra e indicações.",
    icon: Users,
    gradient: "from-purple-500/20 to-violet-500/10",
    borderColor: "border-purple-500/30"
  }
];

const Guides = () => {
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});
  const { checklist, isLoading, toggleAction, resetStageChecklist, getStageProgress, getTotalProgress } = useJourneyChecklist();

  const toggleStage = (stageId: number) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const totalProgress = getTotalProgress(journeyStages);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Guias & Referência</h1>
          <p className="text-muted-foreground">Regras da competição e jornada do paciente</p>
        </div>

        <Tabs defaultValue="rules" className="space-y-6">
          {/* Mobile: scrollable horizontal tabs */}
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:max-w-2xl md:mx-auto md:grid-cols-4 gap-1">
              <TabsTrigger value="rules" className="gap-2 whitespace-nowrap text-xs sm:text-sm px-3">
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                Regras
              </TabsTrigger>
              <TabsTrigger value="prizes" className="gap-2 whitespace-nowrap text-xs sm:text-sm px-3">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                Prêmios
              </TabsTrigger>
              <TabsTrigger value="commercial" className="gap-2 whitespace-nowrap text-xs sm:text-sm px-3">
                <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                Comercial
              </TabsTrigger>
              <TabsTrigger value="journey" className="gap-2 whitespace-nowrap text-xs sm:text-sm px-3">
                <Route className="w-3 h-3 sm:w-4 sm:h-4" />
                Jornada
              </TabsTrigger>
            </TabsList>
          </div>

          {/* REGRAS */}
          <TabsContent value="rules" className="space-y-6">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <img src={copaLogo} alt="Copa Unique League 2026" className="w-24 h-24 mx-auto mb-4 drop-shadow-lg" />
              <h2 className="text-2xl font-bold text-primary mb-1">Copa Unique League 2026</h2>
              <p className="text-muted-foreground">Regulamento Oficial</p>
            </div>

            {/* Period */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Período: Janeiro a Dezembro de 2026</span>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Pontuação por Faturamento (80%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <TrendingUp className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">1 ponto</p>
                      <p className="text-muted-foreground">a cada R$ 10.000 faturados</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Indicadores de Qualidade (20%)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* NPS */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    NPS
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg text-sm">
                      <span>NPS 9</span>
                      <Badge variant="secondary" className="bg-blue-500/20">3 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg text-sm">
                      <span>NPS 10</span>
                      <Badge variant="secondary" className="bg-blue-500/20">5 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg text-sm">
                      <span>Citou membro</span>
                      <Badge className="bg-primary">+10 pts</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Testimonials */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Depoimentos
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-orange-500/10 rounded-lg text-center">
                      <Award className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                      <p className="text-xs font-medium">Google</p>
                      <Badge className="mt-1 bg-orange-500 text-xs">10 pts</Badge>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                      <Video className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                      <p className="text-xs font-medium">Vídeo</p>
                      <Badge className="mt-1 bg-purple-500 text-xs">20 pts</Badge>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg text-center border border-primary/30">
                      <Trophy className="w-6 h-6 text-primary mx-auto mb-1" />
                      <p className="text-xs font-medium">Gold</p>
                      <Badge className="mt-1 bg-primary text-xs">40 pts</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Referrals */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-cyan-500" />
                    Indicações
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center justify-between p-2 bg-cyan-500/10 rounded-lg text-sm">
                      <span>Coletada</span>
                      <Badge variant="secondary" className="bg-cyan-500/20">5 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-cyan-500/15 rounded-lg text-sm">
                      <span>Consulta</span>
                      <Badge variant="secondary" className="bg-cyan-500/30">15 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-cyan-500/20 rounded-lg text-sm">
                      <span>Cirurgia</span>
                      <Badge className="bg-cyan-500">30 pts</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Other */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-pink-500" />
                    Outros
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center justify-between p-2 bg-pink-500/10 rounded-lg text-sm">
                      <span>UniLovers</span>
                      <Badge variant="secondary" className="bg-pink-500/20">5 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-pink-500/15 rounded-lg text-sm">
                      <span>Embaixadora</span>
                      <Badge className="bg-pink-500">50 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-pink-500/10 rounded-lg text-sm">
                      <span>Instagram</span>
                      <Badge variant="secondary" className="bg-pink-500/20">2 pts</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards System */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Sistema de Cartões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cartão Azul */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-900/80 to-blue-800/60 rounded-xl border-l-4 border-blue-500 shadow-lg">
                    <div className="w-5 h-7 bg-blue-500 rounded-sm shadow-md" />
                    <span className="flex-1 font-semibold text-blue-400">Azul</span>
                    <Badge className="bg-blue-500/90 text-white font-bold px-2.5">+30</Badge>
                  </div>
                  
                  {/* Cartão Branco */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-100 to-white rounded-xl border-l-4 border-gray-300 shadow-lg">
                    <div className="w-5 h-7 bg-white border-2 border-gray-300 rounded-sm shadow-md" />
                    <span className="flex-1 font-semibold text-gray-800">Branco</span>
                    <Badge className="bg-gray-800 text-white font-bold px-2.5">+20</Badge>
                  </div>
                  
                  {/* Cartão Amarelo */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-900/80 to-amber-800/60 rounded-xl border-l-4 border-amber-500 shadow-lg">
                    <div className="w-5 h-7 bg-amber-400 rounded-sm shadow-md" />
                    <span className="flex-1 font-semibold text-amber-400">Amarelo</span>
                    <Badge className="bg-amber-500/90 text-black font-bold px-2.5">-10</Badge>
                  </div>
                  
                  {/* Cartão Vermelho */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-900/80 to-red-800/60 rounded-xl border-l-4 border-red-500 shadow-lg">
                    <div className="w-5 h-7 bg-red-500 rounded-sm shadow-md" />
                    <span className="flex-1 font-semibold text-red-400">Vermelho</span>
                    <Badge className="bg-red-500/90 text-white font-bold px-2.5">-30</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clinic Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-500" />
                  Metas Coletivas da Clínica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-center border border-emerald-500/20">
                    <p className="text-lg font-bold text-emerald-600">R$ 2.5M</p>
                    <Badge className="bg-emerald-500 mt-1">+50 pts</Badge>
                  </div>
                  <div className="p-3 bg-emerald-500/15 rounded-lg text-center border border-emerald-500/30">
                    <p className="text-lg font-bold text-emerald-600">R$ 2.7M</p>
                    <Badge className="bg-emerald-500 mt-1">+50 pts</Badge>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center border border-primary/30">
                    <p className="text-lg font-bold text-primary">R$ 3M</p>
                    <Badge className="bg-primary mt-1">+100 pts</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREMIAÇÕES */}
          <TabsContent value="prizes" className="space-y-6">
            <PrizeRulesAndHistory />
          </TabsContent>

          {/* GUIA COMERCIAL */}
          <TabsContent value="commercial" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-primary mb-1">Processo Comercial Unique CPI</h2>
              <p className="text-sm text-muted-foreground">Guia de referência para cada fase da jornada do paciente</p>
            </div>

            {/* Desktop: Horizontal scroll */}
            <div className="hidden xl:grid xl:grid-cols-5 gap-4">
              {commercialPhases.map((phase) => (
                <div key={phase.id} className={`bg-gradient-to-br ${phase.gradient} border ${phase.borderColor} rounded-xl p-4 flex flex-col h-full`}>
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary">
                      <phase.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Fase {phase.id}</span>
                      <h3 className="text-base font-bold text-foreground">{phase.title}</h3>
                    </div>
                  </div>

                  {/* Responsible */}
                  <div className="mb-3 p-2 rounded-lg bg-background/50 border border-border/30">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">Responsável</span>
                    <p className="text-xs font-medium text-foreground mt-0.5">{phase.responsible}</p>
                  </div>

                  {/* Mission */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase">Missão</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{phase.mission}</p>
                  </div>

                  {/* Activities */}
                  <div className="mb-3 flex-grow">
                    <div className="flex items-center gap-1 mb-1.5">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase">Atividades</span>
                    </div>
                    <ul className="space-y-1">
                      {phase.activities.map((activity, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Opportunities */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Lightbulb className="h-3 w-3 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase">Oportunidades</span>
                    </div>
                    <div className="space-y-1">
                      {phase.opportunities.map((opp, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs">
                          <span>{opp.icon}</span>
                          <span className="text-muted-foreground">{opp.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Handoff Criteria */}
                  <div className="mt-auto pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase">Passar o Bastão</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">{phase.handoffCriteria}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet: Stacked cards */}
            <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {commercialPhases.map((phase) => (
                <div key={phase.id} className={`bg-gradient-to-br ${phase.gradient} border ${phase.borderColor} rounded-xl p-5 flex flex-col`}>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-lg bg-primary/20 text-primary">
                      <phase.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Fase {phase.id}</span>
                      <h3 className="text-lg font-bold text-foreground">{phase.title}</h3>
                    </div>
                  </div>

                  {/* Responsible */}
                  <div className="mb-4 p-2.5 rounded-lg bg-background/50 border border-border/30">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">Responsável</span>
                    <p className="text-sm font-medium text-foreground mt-0.5">{phase.responsible}</p>
                  </div>

                  {/* Mission */}
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">Missão</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{phase.mission}</p>
                  </div>

                  {/* Activities */}
                  <div className="mb-4 flex-grow">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">Atividades</span>
                    </div>
                    <ul className="space-y-1.5">
                      {phase.activities.map((activity, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Opportunities */}
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">Oportunidades</span>
                    </div>
                    <div className="space-y-1.5">
                      {phase.opportunities.map((opp, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span>{opp.icon}</span>
                          <span className="text-muted-foreground">{opp.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Handoff Criteria */}
                  <div className="mt-auto pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">Passar o Bastão</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">{phase.handoffCriteria}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Note */}
            <div className="text-center pt-4">
              <p className="text-xs text-muted-foreground">
                📖 Extraído do Mega Playbook Comercial Unique CPI 2026
              </p>
            </div>
          </TabsContent>

          {/* JORNADA */}
          <TabsContent value="journey" className="space-y-6">
            {/* Overall Progress */}
            <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Progresso Geral</span>
                  <Cloud className="h-3 w-3 text-muted-foreground" />
                </div>
                {isLoading ? <Skeleton className="h-5 w-10" /> : <span className="text-sm font-bold text-primary">{totalProgress}%</span>}
              </div>
              {isLoading ? <Skeleton className="h-3 w-full" /> : <Progress value={totalProgress} className="h-3" />}
            </div>

            {/* Journey Timeline - Desktop */}
            <div className="hidden lg:flex items-center justify-center gap-2 mb-8">
              {journeyStages.map((stage, index) => {
                const progress = getStageProgress(stage.id, stage.actions.length);
                return (
                  <div key={stage.id} className="flex items-center">
                    <div 
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r ${stage.color} text-white font-medium cursor-pointer transition-transform hover:scale-105 text-sm`}
                      onClick={() => toggleStage(stage.id)}
                    >
                      <stage.icon className="h-4 w-4" />
                      <span>{stage.title}</span>
                      {progress === 100 && <CheckCircle2 className="h-4 w-4 ml-1" />}
                    </div>
                    {index < journeyStages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />}
                  </div>
                );
              })}
            </div>

            {/* Journey Cards */}
            <div className="grid gap-4">
              {journeyStages.map((stage) => {
                const progress = getStageProgress(stage.id, stage.actions.length);
                const isExpanded = expandedStages[stage.id];
                const isComplete = progress === 100;
                
                return (
                  <Card key={stage.id} className={`${stage.bgColor} ${stage.borderColor} border-2 overflow-hidden transition-all hover:shadow-lg ${isComplete ? 'ring-2 ring-green-500/50' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stage.color} text-white shadow-lg`}>
                          <stage.icon className="h-6 w-6" />
                          {isComplete && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground">Etapa {stage.id}</span>
                            {stage.team.map((member) => (
                              <Badge key={member} variant="secondary" className="text-xs">{member}</Badge>
                            ))}
                          </div>
                          <CardTitle className="text-lg">{stage.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{stage.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Checklist</p>
                            {isLoading ? <Skeleton className="h-5 w-10" /> : <p className={`font-bold ${isComplete ? 'text-green-500' : stage.accentColor}`}>{progress}%</p>}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => toggleStage(stage.id)} className="gap-1">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3">
                        {isLoading ? <Skeleton className="h-2 w-full" /> : <Progress value={progress} className="h-2" />}
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-sm">Checklist de Ações</h4>
                          {progress > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => resetStageChecklist(stage.id)} className="text-muted-foreground hover:text-destructive gap-1 text-xs">
                              <RotateCcw className="h-3 w-3" />
                              Resetar
                            </Button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {stage.actions.map((action, actionIndex) => {
                            const isChecked = checklist[stage.id]?.[actionIndex] || false;
                            return (
                              <label key={actionIndex} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all text-sm ${isChecked ? 'bg-green-500/10 border border-green-500/30' : 'bg-background/60 border border-transparent hover:border-primary/30'}`}>
                                <Checkbox checked={isChecked} onCheckedChange={() => toggleAction(stage.id, actionIndex)} className="mt-0.5" disabled={isLoading} />
                                <span className={`${isChecked ? 'text-green-600 line-through' : ''}`}>{action}</span>
                              </label>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Guides;
