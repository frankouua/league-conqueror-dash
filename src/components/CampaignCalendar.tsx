import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Gift, 
  Heart, 
  Sparkles, 
  Sun, 
  Snowflake,
  Flower2,
  Users,
  ShoppingBag,
  PartyPopper,
  Star,
  Clock,
  Target,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Zap,
  Syringe,
  Leaf,
  Smile,
  Baby,
  Ribbon,
  Gem,
  RefreshCw,
  TrendingUp,
  Activity,
  Eye,
  Candy
} from "lucide-react";

// Campanhas 2026 - UNIQUE + Datas de Visibilidade
const CAMPAIGNS_2026 = [
  {
    month: 1,
    monthName: "Janeiro",
    campaigns: [
      {
        name: "UNIQUE RESET",
        date: "01-31 Jan",
        type: "mensal",
        icon: RefreshCw,
        color: "bg-cyan-500",
        concept: "Saúde, recuperação e reequilíbrio pós-festas",
        focus: "Soroterapia (Imunidade, Detox, Energia)",
        actions: ["Posts sobre recuperação pós-festas", "Destaque Soroterapia", "Foco em energia e imunidade"],
        status: "pendente"
      },
      {
        name: "Ano Novo",
        date: "01 Jan",
        type: "visibilidade",
        icon: PartyPopper,
        color: "bg-violet-500",
        concept: "Celebração do novo ano",
        focus: "Conteúdo motivacional e metas",
        actions: ["Post de celebração", "Mensagem de ano novo", "Metas de autocuidado 2026"],
        status: "pendente"
      },
      {
        name: "BOTOX DAY",
        date: "Jan/Fev",
        type: "day_especial",
        icon: Syringe,
        color: "bg-purple-500",
        concept: "DAY Especial de alto volume",
        focus: "Aplicação de Toxina Botulínica",
        actions: ["Preço especial", "Meta: 30 pacientes/dia", "Oportunidade de upsell"],
        status: "pendente"
      }
    ]
  },
  {
    month: 2,
    monthName: "Fevereiro",
    campaigns: [
      {
        name: "UNIQUE BALANCE",
        date: "01-28 Fev",
        type: "mensal",
        icon: Activity,
        color: "bg-green-500",
        concept: "Disciplina, constância e autocuidado",
        focus: "Protocolos nutricionais e emagrecimento estratégico",
        actions: ["Conteúdo sobre disciplina", "Protocolos nutricionais", "Emagrecimento estratégico"],
        status: "pendente"
      },
      {
        name: "Carnaval",
        date: "14-17 Fev",
        type: "visibilidade",
        icon: PartyPopper,
        color: "bg-yellow-500",
        concept: "Preparação e recuperação pós-carnaval",
        focus: "Cuidados pré e pós-folia",
        actions: ["Dicas pré-carnaval", "Cuidados com a pele", "Recuperação pós-folia", "Hidratação"],
        status: "pendente"
      }
    ]
  },
  {
    month: 3,
    monthName: "Março",
    campaigns: [
      {
        name: "UNIQUE WOMAN",
        date: "01-31 Mar",
        type: "comemorativo",
        icon: Heart,
        color: "bg-pink-500",
        concept: "Autonomia e autoestima feminina (Dia da Mulher)",
        focus: "Planejamento e cirurgia plástica corporal",
        actions: ["Campanha Dia da Mulher (08/03)", "Empoderamento feminino", "Cirurgias corporais"],
        status: "pendente"
      },
      {
        name: "Dia da Mulher",
        date: "08 Mar",
        type: "visibilidade",
        icon: Heart,
        color: "bg-pink-600",
        concept: "Dia Internacional da Mulher",
        focus: "Empoderamento e autoestima",
        actions: ["Homenagem às mulheres", "Stories especiais", "Depoimentos de pacientes", "Lives"],
        status: "pendente"
      },
      {
        name: "BIOPLASTIA DAY",
        date: "Mar/Abr",
        type: "day_especial",
        icon: Sparkles,
        color: "bg-rose-500",
        concept: "DAY Especial de alto volume",
        focus: "Preenchimento Facial Leve",
        actions: ["Preço especial", "Meta: 30 pacientes/dia", "Conversão para cirurgia: 10%"],
        status: "pendente"
      }
    ]
  },
  {
    month: 4,
    monthName: "Abril",
    campaigns: [
      {
        name: "UNIQUE HARMONY",
        date: "01-30 Abr",
        type: "mensal",
        icon: Smile,
        color: "bg-amber-500",
        concept: "Naturalidade, equilíbrio e elegância",
        focus: "Harmonização facial e procedimentos não cirúrgicos",
        actions: ["Destaque harmonização facial", "Procedimentos não cirúrgicos", "Elegância natural"],
        status: "pendente"
      },
      {
        name: "Páscoa",
        date: "05 Abr",
        type: "visibilidade",
        icon: Gift,
        color: "bg-amber-400",
        concept: "Celebração da Páscoa",
        focus: "Renovação e cuidados",
        actions: ["Post temático", "Mensagem de renovação", "Brindes especiais clínica"],
        status: "pendente"
      }
    ]
  },
  {
    month: 5,
    monthName: "Maio",
    campaigns: [
      {
        name: "UNIQUE ESSENCE",
        date: "01-31 Mai",
        type: "comemorativo",
        icon: Baby,
        color: "bg-rose-500",
        concept: "A mulher além da maternidade (Dia das Mães)",
        focus: "Cirurgias corporais e combinadas (Mommy Makeover)",
        actions: ["Campanha Dia das Mães (10/05)", "Mommy Makeover", "Pacotes especiais mães"],
        status: "pendente"
      },
      {
        name: "Dia das Mães",
        date: "10 Mai",
        type: "visibilidade",
        icon: Heart,
        color: "bg-rose-600",
        concept: "Celebração do Dia das Mães",
        focus: "Homenagem e presentes",
        actions: ["Vouchers presente", "Stories emocionais", "Depoimentos mães", "Sorteios"],
        status: "pendente"
      },
      {
        name: "SOROTERAPIA DAY",
        date: "Mai/Jun",
        type: "day_especial",
        icon: Zap,
        color: "bg-yellow-500",
        concept: "DAY Especial de alto volume",
        focus: "Protocolos de Energia e Imunidade",
        actions: ["Preço especial", "Meta: 30 pacientes/dia", "Foco em energia"],
        status: "pendente"
      }
    ]
  },
  {
    month: 6,
    monthName: "Junho",
    campaigns: [
      {
        name: "UNIQUE DESIRE",
        date: "01-30 Jun",
        type: "comemorativo",
        icon: Heart,
        color: "bg-red-500",
        concept: "Confiança, sensualidade e conexão (Dia dos Namorados)",
        focus: "Procedimentos e cirurgias para casais",
        actions: ["Pacotes de casal", "Descontos progressivos", "Consultas conjuntas", "Recuperação acompanhada"],
        status: "pendente"
      },
      {
        name: "Dia dos Namorados",
        date: "12 Jun",
        type: "visibilidade",
        icon: Heart,
        color: "bg-red-600",
        concept: "Celebração do amor",
        focus: "Casais e presentes",
        actions: ["Pacotes românticos", "Vouchers de presente", "Conteúdo de casal", "Promoções duplas"],
        status: "pendente"
      },
      {
        name: "Festa Junina",
        date: "24 Jun",
        type: "visibilidade",
        icon: PartyPopper,
        color: "bg-orange-500",
        concept: "Festas juninas",
        focus: "Conteúdo temático",
        actions: ["Posts temáticos", "Decoração clínica", "Engajamento redes"],
        status: "pendente"
      }
    ]
  },
  {
    month: 7,
    monthName: "Julho",
    campaigns: [
      {
        name: "UNIQUE CARE",
        date: "01-31 Jul",
        type: "mensal",
        icon: Snowflake,
        color: "bg-blue-400",
        concept: "Cuidado silencioso e sofisticado",
        focus: "Pós-operatório, recuperação e soroterapia de cicatrização",
        actions: ["Foco em pós-operatório", "Recuperação de pacientes", "Soroterapia cicatrização"],
        status: "pendente"
      },
      {
        name: "Férias de Inverno",
        date: "01-31 Jul",
        type: "visibilidade",
        icon: Snowflake,
        color: "bg-blue-500",
        concept: "Férias escolares de inverno",
        focus: "Procedimentos aproveitando férias",
        actions: ["Recuperação em casa", "Pacotes férias", "Cirurgias planejadas"],
        status: "pendente"
      },
      {
        name: "LASER DAY",
        date: "Jul/Ago",
        type: "day_especial",
        icon: Sun,
        color: "bg-orange-500",
        concept: "DAY Especial de alto volume",
        focus: "Rejuvenescimento a Laser",
        actions: ["Preço especial", "Meta: 30 pacientes/dia", "Conversão para cirurgia"],
        status: "pendente"
      }
    ]
  },
  {
    month: 8,
    monthName: "Agosto",
    campaigns: [
      {
        name: "UNIQUE PREP",
        date: "01-31 Ago",
        type: "mensal",
        icon: TrendingUp,
        color: "bg-indigo-500",
        concept: "Organização e antecipação para o verão",
        focus: "Protocolos nutricionais e planejamento corporal",
        actions: ["Planejamento verão", "Protocolos nutricionais", "Antecipação de procedimentos"],
        status: "pendente"
      },
      {
        name: "Dia dos Pais",
        date: "09 Ago",
        type: "visibilidade",
        icon: Users,
        color: "bg-blue-600",
        concept: "Celebração do Dia dos Pais",
        focus: "Procedimentos masculinos",
        actions: ["Pacotes masculinos", "Vouchers para pais", "Conteúdo familiar", "Harmonização masc."],
        status: "pendente"
      }
    ]
  },
  {
    month: 9,
    monthName: "Setembro",
    campaigns: [
      {
        name: "UNIQUE BLOOM",
        date: "01-30 Set",
        type: "sazonal",
        icon: Flower2,
        color: "bg-green-500",
        concept: "Florescer com naturalidade (Primavera)",
        focus: "Harmonização facial e procedimentos refinados",
        actions: ["Início da primavera (22/09)", "Procedimentos refinados", "Renovação natural"],
        status: "pendente"
      },
      {
        name: "Primavera",
        date: "22 Set",
        type: "visibilidade",
        icon: Flower2,
        color: "bg-green-400",
        concept: "Início da Primavera",
        focus: "Renovação e florescimento",
        actions: ["Conteúdo sobre renovação", "Preparação para verão", "Skincare primavera"],
        status: "pendente"
      },
      {
        name: "HARMONIZAÇÃO DAY",
        date: "Set/Out",
        type: "day_especial",
        icon: Gem,
        color: "bg-violet-500",
        concept: "DAY Especial de alto volume",
        focus: "Harmonização Facial Completa",
        actions: ["Preço especial", "Meta: 30 pacientes/dia", "Pacote completo"],
        status: "pendente"
      }
    ]
  },
  {
    month: 10,
    monthName: "Outubro",
    campaigns: [
      {
        name: "UNIQUE ROSA",
        date: "01-31 Out",
        type: "comemorativo",
        icon: Ribbon,
        color: "bg-pink-500",
        concept: "Saúde da mulher e prevenção (Outubro Rosa)",
        focus: "Conteúdo educativo, avaliações e suporte nutricional",
        actions: ["Outubro Rosa", "Conteúdo educativo", "Avaliações especiais", "Suporte nutricional"],
        status: "pendente"
      },
      {
        name: "Dia das Crianças",
        date: "12 Out",
        type: "visibilidade",
        icon: Baby,
        color: "bg-cyan-500",
        concept: "Dia das Crianças",
        focus: "Famílias e crianças",
        actions: ["Conteúdo família", "Ações para mães", "Engajamento redes"],
        status: "pendente"
      },
      {
        name: "Halloween",
        date: "31 Out",
        type: "visibilidade",
        icon: Candy,
        color: "bg-orange-600",
        concept: "Halloween",
        focus: "Conteúdo criativo",
        actions: ["Posts criativos", "Stories temáticos", "Engajamento divertido"],
        status: "pendente"
      }
    ]
  },
  {
    month: 11,
    monthName: "Novembro",
    campaigns: [
      {
        name: "UNIQUE CONFIDENCE",
        date: "01-30 Nov",
        type: "mensal",
        icon: Star,
        color: "bg-amber-600",
        concept: "Autoestima e confiança feminina pré-verão",
        focus: "Procedimentos corporais e faciais não cirúrgicos",
        actions: ["Preparação verão", "Procedimentos não cirúrgicos", "Autoestima feminina"],
        status: "pendente"
      },
      {
        name: "Black Friday",
        date: "27 Nov",
        type: "visibilidade",
        icon: ShoppingBag,
        color: "bg-gray-900",
        concept: "Principal data promocional do ano",
        focus: "Descontos e promoções agressivas",
        actions: ["Descontos especiais", "Pacotes exclusivos", "Urgência e escassez", "Condições únicas"],
        status: "pendente"
      },
      {
        name: "SKINCARE DAY",
        date: "Nov/Dez",
        type: "day_especial",
        icon: Leaf,
        color: "bg-emerald-500",
        concept: "DAY Especial de alto volume",
        focus: "Protocolo de Skincare Premium",
        actions: ["Preço especial", "Meta: 30 pacientes/dia", "Skincare completo"],
        status: "pendente"
      }
    ]
  },
  {
    month: 12,
    monthName: "Dezembro",
    campaigns: [
      {
        name: "UNIQUE CLOSURE",
        date: "01-31 Dez",
        type: "comemorativo",
        icon: Gift,
        color: "bg-red-600",
        concept: "Gratidão, vínculo e encerramento de ciclos",
        focus: "Planejamento cirúrgico e soroterapia de energia",
        actions: ["Encerramento do ano", "Planejamento 2027", "Soroterapia energia", "Gratidão aos pacientes"],
        status: "pendente"
      },
      {
        name: "Natal",
        date: "25 Dez",
        type: "visibilidade",
        icon: Gift,
        color: "bg-red-500",
        concept: "Celebração do Natal",
        focus: "Presentes e família",
        actions: ["Mensagem de Natal", "Vouchers presente", "Conteúdo emocional", "Agradecimento pacientes"],
        status: "pendente"
      },
      {
        name: "Réveillon",
        date: "31 Dez",
        type: "visibilidade",
        icon: PartyPopper,
        color: "bg-purple-600",
        concept: "Virada de ano",
        focus: "Preparação para festas",
        actions: ["Procedimentos express", "Glow up fim de ano", "Mensagem de despedida"],
        status: "pendente"
      }
    ]
  }
];

const CAMPAIGN_TYPES = {
  mensal: { label: "Campanha Mensal", color: "bg-blue-500", icon: Calendar },
  comemorativo: { label: "Data Comemorativa", color: "bg-pink-500", icon: Heart },
  sazonal: { label: "Sazonal", color: "bg-green-500", icon: Sun },
  day_especial: { label: "DAY Especial", color: "bg-purple-500", icon: Zap },
  visibilidade: { label: "Visibilidade", color: "bg-orange-500", icon: Eye }
};

const DAYS_ESPECIAIS = [
  { periodo: "Jan/Fev", nome: "BOTOX DAY", procedimento: "Aplicação de Toxina Botulínica" },
  { periodo: "Mar/Abr", nome: "BIOPLASTIA DAY", procedimento: "Preenchimento Facial Leve" },
  { periodo: "Mai/Jun", nome: "SOROTERAPIA DAY", procedimento: "Protocolos de Energia e Imunidade" },
  { periodo: "Jul/Ago", nome: "LASER DAY", procedimento: "Rejuvenescimento a Laser" },
  { periodo: "Set/Out", nome: "HARMONIZAÇÃO DAY", procedimento: "Harmonização Facial Completa" },
  { periodo: "Nov/Dez", nome: "SKINCARE DAY", procedimento: "Protocolo de Skincare Premium" }
];

const DATAS_VISIBILIDADE = [
  { data: "01 Jan", nome: "Ano Novo", tipo: "Celebração" },
  { data: "14-17 Fev", nome: "Carnaval", tipo: "Feriado" },
  { data: "08 Mar", nome: "Dia da Mulher", tipo: "Comemorativo" },
  { data: "05 Abr", nome: "Páscoa", tipo: "Feriado" },
  { data: "10 Mai", nome: "Dia das Mães", tipo: "Comemorativo" },
  { data: "12 Jun", nome: "Dia dos Namorados", tipo: "Comemorativo" },
  { data: "24 Jun", nome: "Festa Junina", tipo: "Cultural" },
  { data: "09 Ago", nome: "Dia dos Pais", tipo: "Comemorativo" },
  { data: "22 Set", nome: "Primavera", tipo: "Sazonal" },
  { data: "12 Out", nome: "Dia das Crianças", tipo: "Comemorativo" },
  { data: "31 Out", nome: "Halloween", tipo: "Cultural" },
  { data: "27 Nov", nome: "Black Friday", tipo: "Promocional" },
  { data: "25 Dez", nome: "Natal", tipo: "Feriado" },
  { data: "31 Dez", nome: "Réveillon", tipo: "Celebração" }
];

export function CampaignCalendar() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const currentMonthData = CAMPAIGNS_2026.find(m => m.month === selectedMonth);
  
  const filteredCampaigns = selectedType 
    ? CAMPAIGNS_2026.map(m => ({
        ...m,
        campaigns: m.campaigns.filter(c => c.type === selectedType)
      })).filter(m => m.campaigns.length > 0)
    : CAMPAIGNS_2026;

  const allCampaigns = CAMPAIGNS_2026.flatMap(m => 
    m.campaigns.map(c => ({ ...c, month: m.month, monthName: m.monthName }))
  );

  const upcomingCampaigns = allCampaigns
    .filter(c => c.month >= new Date().getMonth() + 1)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Master Calendar UNIQUE 2026
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Estratégia de Campanhas • Meta: R$ 3.000.000/mês
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Calendário
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <Target className="h-4 w-4 mr-1" />
            Lista
          </Button>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={selectedType === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedType(null)}
        >
          Todas
        </Badge>
        {Object.entries(CAMPAIGN_TYPES).map(([key, value]) => (
          <Badge 
            key={key}
            variant={selectedType === key ? "default" : "outline"}
            className={`cursor-pointer ${selectedType === key ? value.color : ""}`}
            onClick={() => setSelectedType(key === selectedType ? null : key)}
          >
            <value.icon className="h-3 w-3 mr-1" />
            {value.label}
          </Badge>
        ))}
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="por-mes">Por Mês</TabsTrigger>
          <TabsTrigger value="days">DAYs Especiais</TabsTrigger>
          <TabsTrigger value="visibilidade">Visibilidade</TabsTrigger>
          <TabsTrigger value="proximas">Próximas</TabsTrigger>
        </TabsList>

        {/* Visão Geral - Calendário Anual */}
        <TabsContent value="visao-geral" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCampaigns.map((month) => (
              <Card 
                key={month.month} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  month.month === selectedMonth ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => {
                  setSelectedMonth(month.month);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {month.monthName}
                    <Badge variant="secondary" className="text-xs">
                      {month.campaigns.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    {month.campaigns.slice(0, 3).map((campaign, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${campaign.color}`} />
                        <span className="text-xs truncate">{campaign.name}</span>
                      </div>
                    ))}
                    {month.campaigns.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{month.campaigns.length - 3} mais
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Por Mês - Detalhado */}
        <TabsContent value="por-mes" className="mt-4">
          <div className="space-y-4">
            {/* Navegação de mês */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedMonth(prev => prev > 1 ? prev - 1 : 12)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {currentMonthData?.monthName || ""}
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedMonth(prev => prev < 12 ? prev + 1 : 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {currentMonthData?.campaigns.length === 0 ? (
                  <Card className="bg-muted/50">
                    <CardContent className="p-6 text-center">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        Nenhuma campanha cadastrada para este mês
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  currentMonthData?.campaigns.map((campaign, idx) => {
                    const Icon = campaign.icon;
                    const typeInfo = CAMPAIGN_TYPES[campaign.type as keyof typeof CAMPAIGN_TYPES];
                    return (
                      <Card key={idx} className="overflow-hidden">
                        <div className={`h-2 ${campaign.color}`} />
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${campaign.color} text-white`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              {campaign.name}
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline">{campaign.date}</Badge>
                              <Badge className={typeInfo?.color}>{typeInfo?.label}</Badge>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground mb-1">Conceito</p>
                              <p className="text-sm font-medium">{campaign.concept}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-primary/10">
                              <p className="text-xs text-muted-foreground mb-1">Foco</p>
                              <p className="text-sm font-medium">{campaign.focus}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Ações Planejadas
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {campaign.actions.map((action, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <Badge 
                              variant={campaign.status === "pendente" ? "outline" : "default"}
                              className={campaign.status === "ativo" ? "bg-green-500" : ""}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {campaign.status === "pendente" ? "Pendente" : "Ativo"}
                            </Badge>
                            <Button size="sm" variant="ghost">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Ver Scripts
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* DAYs Especiais */}
        <TabsContent value="days" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                Estratégia de Volume: DAYs Especiais
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ações bimestrais de alto volume e preço atrativo para gerar fluxo de caixa, atrair novos leads e criar oportunidades de upsell.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Metas */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="bg-purple-500/10 border-purple-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">30</p>
                      <p className="text-sm text-muted-foreground">Pacientes/dia</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">R$ 45k</p>
                      <p className="text-sm text-muted-foreground">Receita média/dia</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">10%</p>
                      <p className="text-sm text-muted-foreground">Conversão p/ cirurgia</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de DAYs */}
                <div className="space-y-3">
                  {DAYS_ESPECIAIS.map((day, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-purple-500/5 to-violet-500/5 border border-purple-500/20"
                    >
                      <div className="p-3 rounded-full bg-purple-500 text-white">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{day.nome}</p>
                          <Badge variant="outline" className="text-xs">{day.periodo}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{day.procedimento}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                KPIs e Rastreamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Todas as ações serão monitoradas via UTMs, cupons de desconto e CRM para garantir a mensuração precisa:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Badge variant="secondary" className="justify-center py-2">CPL (Custo por Lead)</Badge>
                <Badge variant="secondary" className="justify-center py-2">CAC (Custo de Aquisição)</Badge>
                <Badge variant="secondary" className="justify-center py-2">Taxa de Conversão</Badge>
                <Badge variant="secondary" className="justify-center py-2">ROI</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Datas de Visibilidade */}
        <TabsContent value="visibilidade" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-orange-500" />
                Datas de Alta Visibilidade 2026
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Datas importantes para produção de conteúdo e engajamento nas redes sociais
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {DATAS_VISIBILIDADE.map((data, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/20"
                  >
                    <div className="p-2 rounded-full bg-orange-500 text-white">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{data.nome}</p>
                      <p className="text-xs text-muted-foreground">{data.data}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{data.tipo}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dicas de Conteúdo */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Dicas para Conteúdo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">📅 Planejamento Antecipado</p>
                  <p className="text-xs text-muted-foreground">Prepare o conteúdo com pelo menos 7 dias de antecedência</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">📸 Banco de Imagens</p>
                  <p className="text-xs text-muted-foreground">Tenha fotos e vídeos temáticos prontos para cada data</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">📝 Stories e Reels</p>
                  <p className="text-xs text-muted-foreground">Priorize formatos de vídeo curto para maior alcance</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">🎁 Promoções Relâmpago</p>
                  <p className="text-xs text-muted-foreground">Use datas de visibilidade para ofertas exclusivas de 24-48h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Próximas Campanhas */}
        <TabsContent value="proximas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Próximas Campanhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingCampaigns.map((campaign, idx) => {
                  const Icon = campaign.icon;
                  const typeInfo = CAMPAIGN_TYPES[campaign.type as keyof typeof CAMPAIGN_TYPES];
                  return (
                    <div 
                      key={idx}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`p-2 rounded-full ${campaign.color} text-white`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.monthName} • {campaign.date}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {typeInfo?.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resumo por tipo */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            {Object.entries(CAMPAIGN_TYPES).map(([key, value]) => {
              const count = allCampaigns.filter(c => c.type === key).length;
              const Icon = value.icon;
              return (
                <Card key={key} className="text-center">
                  <CardContent className="pt-4">
                    <div className={`inline-flex p-3 rounded-full ${value.color} text-white mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{value.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
