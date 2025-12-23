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
  GraduationCap,
  Baby,
  Users,
  ShoppingBag,
  PartyPopper,
  Star,
  Clock,
  Target,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Estrutura base das campanhas - será preenchida com dados do documento
const CAMPAIGNS_2026 = [
  {
    month: 1,
    monthName: "Janeiro",
    campaigns: [
      {
        name: "Ano Novo - Renovação",
        date: "01-15 Jan",
        type: "sazonal",
        icon: PartyPopper,
        color: "bg-purple-500",
        description: "Campanha de início de ano focada em renovação e novos objetivos",
        actions: ["Posts motivacionais", "Ofertas especiais primeiro trimestre", "Lançamento programa anual"],
        status: "pendente"
      }
    ]
  },
  {
    month: 2,
    monthName: "Fevereiro",
    campaigns: [
      {
        name: "Carnaval",
        date: "14-17 Fev",
        type: "sazonal",
        icon: PartyPopper,
        color: "bg-yellow-500",
        description: "Campanha de carnaval",
        actions: ["Cuidados pré-carnaval", "Recuperação pós-folia"],
        status: "pendente"
      }
    ]
  },
  {
    month: 3,
    monthName: "Março",
    campaigns: [
      {
        name: "Dia da Mulher",
        date: "08 Mar",
        type: "comemorativo",
        icon: Heart,
        color: "bg-pink-500",
        description: "Celebração do Dia Internacional da Mulher",
        actions: ["Homenagens", "Ofertas especiais", "Conteúdo empoderamento"],
        status: "pendente"
      }
    ]
  },
  {
    month: 4,
    monthName: "Abril",
    campaigns: [
      {
        name: "Páscoa",
        date: "05 Abr",
        type: "sazonal",
        icon: Gift,
        color: "bg-amber-500",
        description: "Campanha de Páscoa",
        actions: ["Ações temáticas", "Brindes especiais"],
        status: "pendente"
      }
    ]
  },
  {
    month: 5,
    monthName: "Maio",
    campaigns: [
      {
        name: "Dia das Mães",
        date: "10 Mai",
        type: "comemorativo",
        icon: Heart,
        color: "bg-rose-500",
        description: "Uma das datas mais importantes do ano para conversão",
        actions: ["Pacotes presente", "Vouchers para mães", "Campanha emocional"],
        status: "pendente"
      }
    ]
  },
  {
    month: 6,
    monthName: "Junho",
    campaigns: [
      {
        name: "Dia dos Namorados",
        date: "12 Jun",
        type: "comemorativo",
        icon: Heart,
        color: "bg-red-500",
        description: "Campanha romântica focada em casais",
        actions: ["Pacotes duplos", "Presentes para o casal", "Conteúdo romântico"],
        status: "pendente"
      },
      {
        name: "Festa Junina",
        date: "24 Jun",
        type: "sazonal",
        icon: PartyPopper,
        color: "bg-orange-500",
        description: "Tema de festa junina",
        actions: ["Decoração temática", "Ações especiais"],
        status: "pendente"
      }
    ]
  },
  {
    month: 7,
    monthName: "Julho",
    campaigns: [
      {
        name: "Férias de Inverno",
        date: "01-31 Jul",
        type: "sazonal",
        icon: Snowflake,
        color: "bg-blue-400",
        description: "Campanha de férias escolares",
        actions: ["Procedimentos para férias", "Pacotes família"],
        status: "pendente"
      }
    ]
  },
  {
    month: 8,
    monthName: "Agosto",
    campaigns: [
      {
        name: "Dia dos Pais",
        date: "09 Ago",
        type: "comemorativo",
        icon: Users,
        color: "bg-blue-600",
        description: "Campanha focada em homenagear os pais",
        actions: ["Pacotes masculinos", "Vouchers para pais", "Conteúdo familiar"],
        status: "pendente"
      }
    ]
  },
  {
    month: 9,
    monthName: "Setembro",
    campaigns: [
      {
        name: "Primavera",
        date: "22 Set",
        type: "sazonal",
        icon: Flower2,
        color: "bg-green-500",
        description: "Início da primavera - renovação",
        actions: ["Campanhas de renovação", "Preparação para o verão"],
        status: "pendente"
      }
    ]
  },
  {
    month: 10,
    monthName: "Outubro",
    campaigns: [
      {
        name: "Dia das Crianças",
        date: "12 Out",
        type: "comemorativo",
        icon: Baby,
        color: "bg-cyan-500",
        description: "Campanha voltada para crianças e famílias",
        actions: ["Ações para crianças", "Pacotes família"],
        status: "pendente"
      },
      {
        name: "Halloween",
        date: "31 Out",
        type: "sazonal",
        icon: Sparkles,
        color: "bg-orange-600",
        description: "Tema de Halloween",
        actions: ["Ações temáticas", "Decoração especial"],
        status: "pendente"
      }
    ]
  },
  {
    month: 11,
    monthName: "Novembro",
    campaigns: [
      {
        name: "Black Friday",
        date: "27 Nov",
        type: "promocional",
        icon: ShoppingBag,
        color: "bg-gray-900",
        description: "Principal data promocional do ano",
        actions: ["Descontos agressivos", "Pacotes especiais", "Urgência e escassez"],
        status: "pendente"
      }
    ]
  },
  {
    month: 12,
    monthName: "Dezembro",
    campaigns: [
      {
        name: "Natal",
        date: "25 Dez",
        type: "comemorativo",
        icon: Gift,
        color: "bg-red-600",
        description: "Campanha de Natal e fim de ano",
        actions: ["Presentes especiais", "Vouchers", "Conteúdo emocional"],
        status: "pendente"
      },
      {
        name: "Réveillon",
        date: "31 Dez",
        type: "sazonal",
        icon: PartyPopper,
        color: "bg-purple-600",
        description: "Preparação para o Ano Novo",
        actions: ["Preparação para festas", "Pacotes de fim de ano"],
        status: "pendente"
      }
    ]
  }
];

const CAMPAIGN_TYPES = {
  comemorativo: { label: "Comemorativo", color: "bg-pink-500", icon: Heart },
  sazonal: { label: "Sazonal", color: "bg-blue-500", icon: Sun },
  promocional: { label: "Promocional", color: "bg-green-500", icon: ShoppingBag },
  institucional: { label: "Institucional", color: "bg-purple-500", icon: Star }
};

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
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Calendário de Campanhas 2026
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Planejamento anual de campanhas e datas especiais
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="por-mes">Por Mês</TabsTrigger>
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
                  setViewMode("calendar");
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
                  <div className="space-y-1">
                    {month.campaigns.slice(0, 2).map((campaign, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${campaign.color}`} />
                        <span className="text-xs truncate">{campaign.name}</span>
                      </div>
                    ))}
                    {month.campaigns.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{month.campaigns.length - 2} mais
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
                    return (
                      <Card key={idx} className="overflow-hidden">
                        <div className={`h-2 ${campaign.color}`} />
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5" />
                              {campaign.name}
                            </div>
                            <Badge variant="outline">{campaign.date}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            {campaign.description}
                          </p>
                          
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
                        {CAMPAIGN_TYPES[campaign.type as keyof typeof CAMPAIGN_TYPES]?.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Resumo por tipo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
                    <p className="text-sm text-muted-foreground">{value.label}</p>
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
