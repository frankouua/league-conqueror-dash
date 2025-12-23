import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, Crown, Diamond, Star, Award, Medal, Users, Target, Search, MessageSquare, Phone, Mail, Instagram, Rocket, Sparkles, TrendingUp, CheckCircle, AlertTriangle, Clock, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";

// ============================================
// CATEGORIAS DE INFLUENCIADORAS
// ============================================
interface InfluencerCategory {
  id: string;
  name: string;
  score: string;
  followers: string;
  engagement: string;
  reach: string;
  benefits: string[];
  obligations: string[];
  commission: string;
  color: string;
  icon: React.ReactNode;
}

const INFLUENCER_CATEGORIES: InfluencerCategory[] = [
  {
    id: "celebrity",
    name: "Celebrity",
    score: "90-100",
    followers: ">1M",
    engagement: ">3%",
    reach: ">300K",
    benefits: [
      "Procedimento cirúrgico completo com método CPI (até R$ 50.000)",
      "Atendimento VIP exclusivo",
      "Equipe dedicada de suporte",
      "Comissão de 15% sobre vendas geradas",
      "Benefícios para acompanhante",
      "Acesso prioritário a novos procedimentos"
    ],
    obligations: [
      "24+ publicações estratégicas em 12 meses",
      "Participação em campanhas principais",
      "Exclusividade no segmento",
      "Disponibilidade para eventos presenciais"
    ],
    commission: "15%",
    color: "from-purple-500 to-pink-500",
    icon: <Crown className="h-5 w-5" />
  },
  {
    id: "diamond",
    name: "Diamond",
    score: "80-89",
    followers: "500K-1M",
    engagement: "2,5-4%",
    reach: "150K-300K",
    benefits: [
      "Procedimento cirúrgico completo com método CPI (até R$ 35.000)",
      "Acompanhamento pós-operatório diferenciado",
      "Suporte para criação de conteúdo",
      "Comissão de 12% sobre vendas geradas",
      "Upgrade para Celebrity conforme performance"
    ],
    obligations: [
      "20 publicações estratégicas em 12 meses",
      "Participação em campanhas digitais",
      "Exclusividade no segmento",
      "Criação de conteúdo regular"
    ],
    commission: "12%",
    color: "from-cyan-400 to-blue-500",
    icon: <Diamond className="h-5 w-5" />
  },
  {
    id: "gold",
    name: "Gold",
    score: "70-79",
    followers: "200K-500K",
    engagement: "3-5%",
    reach: "60K-150K",
    benefits: [
      "Procedimento cirúrgico com método CPI (até R$ 25.000)",
      "Acompanhamento pós-operatório completo",
      "Mentoria para criação de conteúdo",
      "Comissão de 10% sobre vendas geradas",
      "Oportunidades de upgrade"
    ],
    obligations: [
      "18 publicações estratégicas em 12 meses",
      "Participação em campanhas digitais",
      "Exclusividade no segmento",
      "Criação de conteúdo colaborativo"
    ],
    commission: "10%",
    color: "from-yellow-400 to-amber-500",
    icon: <Star className="h-5 w-5" />
  },
  {
    id: "platinum",
    name: "Platinum",
    score: "60-69",
    followers: "100K-200K",
    engagement: ">5%",
    reach: "30K-60K",
    benefits: [
      "Procedimento cirúrgico com método CPI (até R$ 18.000)",
      "Acompanhamento pós-operatório completo",
      "Suporte para conteúdo",
      "Comissão de 8% sobre vendas geradas"
    ],
    obligations: [
      "16 publicações estratégicas em 12 meses",
      "Criação de conteúdo regular",
      "Exclusividade no segmento"
    ],
    commission: "8%",
    color: "from-slate-400 to-slate-600",
    icon: <Award className="h-5 w-5" />
  },
  {
    id: "silver",
    name: "Silver",
    score: "50-59",
    followers: "30K-100K",
    engagement: ">6%",
    reach: "10K-30K",
    benefits: [
      "Procedimento cirúrgico com método CPI (até R$ 15.000)",
      "Acompanhamento pós-operatório completo",
      "Mentoria para crescimento",
      "Comissão de 7% sobre vendas geradas"
    ],
    obligations: [
      "15 publicações estratégicas em 12 meses",
      "Criação de conteúdo regular",
      "Exclusividade no segmento"
    ],
    commission: "7%",
    color: "from-gray-300 to-gray-500",
    icon: <Medal className="h-5 w-5" />
  }
];

// ============================================
// SCRIPTS DE PROSPECÇÃO
// ============================================
interface ProspectionScript {
  id: string;
  title: string;
  channel: string;
  type: string;
  script: string;
}

const PROSPECTION_SCRIPTS: ProspectionScript[] = [
  {
    id: "dm_first",
    title: "DM - Primeiro Contato",
    channel: "Instagram DM",
    type: "Prospecção",
    script: `Olá [Nome da Influenciadora]!

Sou [Seu Nome] da UNIQUE Plástica Avançada. Acompanho seu trabalho e admiro especialmente seu conteúdo sobre [tema específico/publicação recente].

Estamos selecionando influenciadoras para nosso programa exclusivo UNI Influencers, que oferece a experiência completa do método CPI (Cirurgia Plástica Integrativa) e uma parceria estratégica de longo prazo.

Pelo seu perfil e qualidade de conteúdo, acreditamos que seria uma embaixadora incrível para a UNIQUE. Podemos conversar mais sobre essa oportunidade?

Aguardo seu retorno!`
  },
  {
    id: "dm_followup",
    title: "DM - Follow-up",
    channel: "Instagram DM",
    type: "Follow-up",
    script: `Olá [Nome da Influenciadora]!

Passei para reforçar nosso interesse em tê-la como embaixadora do programa UNI Influencers da UNIQUE Plástica Avançada.

Além da experiência completa com o método CPI, oferecemos:

• Parceria de longo prazo (12 meses)
• Suporte completo para criação de conteúdo
• Sistema de comissões por vendas geradas
• Plataforma exclusiva para gerenciamento

Seria um prazer apresentar todos os detalhes em uma conversa. Temos disponibilidade para adaptar à sua agenda.`
  },
  {
    id: "email_first",
    title: "E-mail - Primeiro Contato",
    channel: "E-mail",
    type: "Prospecção",
    script: `Assunto: Convite Exclusivo: Programa UNI Influencers da UNIQUE Plástica Avançada

Olá [Nome da Influenciadora],

Meu nome é [Seu Nome], Coordenador(a) do Programa UNI Influencers da UNIQUE Plástica Avançada, referência nacional em cirurgia plástica integrativa.

Acompanhamos seu trabalho nas redes sociais e ficamos impressionados com [mencionar algo específico]. Seu perfil se alinha perfeitamente com os valores que buscamos em nossas embaixadoras.

O Programa UNI Influencers é uma iniciativa exclusiva que vai além das parcerias convencionais:

• Experiência completa com o método CPI (Cirurgia Plástica Integrativa)
• Parceria estratégica de 12 meses
• Suporte completo para produção de conteúdo
• Sistema de comissões por vendas geradas
• Plataforma exclusiva para gerenciamento de campanhas
• Possibilidade de crescimento e upgrade de categoria

Gostaríamos de convidá-la para uma conversa para apresentar todos os detalhes do programa e discutir como podemos construir uma parceria de sucesso.

Podemos agendar uma call na próxima semana? Estamos disponíveis para adaptar à sua agenda.

Atenciosamente,
[Seu Nome]
Coordenador(a) do Programa UNI Influencers
UNIQUE Plástica Avançada`
  },
  {
    id: "whatsapp_first",
    title: "WhatsApp - Primeiro Contato",
    channel: "WhatsApp",
    type: "Prospecção",
    script: `Olá [Nome da Influenciadora]! 👋

Sou [Seu Nome] da UNIQUE Plástica Avançada. Obtive seu contato através de [fonte] e gostaria de apresentar uma oportunidade exclusiva.

Estamos selecionando influenciadoras para nosso programa UNI Influencers, que oferece:

✨ Experiência completa com o método CPI
✨ Parceria estratégica de 12 meses
✨ Suporte para produção de conteúdo
✨ Sistema de comissões por vendas

Seu perfil chamou nossa atenção e acreditamos que seria uma parceria incrível! Podemos conversar mais sobre essa oportunidade?

Aguardo seu retorno! 😊`
  },
  {
    id: "agency",
    title: "Contato com Agência/Empresário",
    channel: "E-mail",
    type: "Formal",
    script: `Assunto: Proposta de Parceria - Programa UNI Influencers da UNIQUE Plástica Avançada

Prezado(a) [Nome do Contato],

Meu nome é [Seu Nome], Coordenador(a) do Programa UNI Influencers da UNIQUE Plástica Avançada, referência nacional em cirurgia plástica integrativa.

Entramos em contato para apresentar uma proposta de parceria para [Nome da Influenciadora]. Após uma análise criteriosa, identificamos que seu perfil se alinha perfeitamente com os valores e objetivos do nosso programa de embaixadoras.

O Programa UNI Influencers é uma iniciativa premium que oferece:

• Experiência completa com o método CPI (procedimento cirúrgico)
• Parceria estratégica de 12 meses
• Suporte completo para produção de conteúdo
• Sistema de comissões por vendas geradas
• Plataforma exclusiva para gerenciamento de campanhas

Gostaríamos de agendar uma reunião para discutir os termos específicos e possibilidades de colaboração.

Estamos disponíveis para adaptar nossa proposta às necessidades e particularidades da [Nome da Influenciadora], criando uma parceria verdadeiramente personalizada.

Aguardo seu retorno para agendarmos esta conversa inicial.

Atenciosamente,
[Seu Nome]
Coordenador(a) do Programa UNI Influencers
UNIQUE Plástica Avançada`
  }
];

// ============================================
// MISSÕES ESTRATÉGICAS
// ============================================
interface Mission {
  id: string;
  category: string;
  title: string;
  objective: string;
  priority: "MÁXIMA" | "ALTA" | "MÉDIA";
  description: string;
  elements?: string[];
  copy?: string;
}

const STRATEGIC_MISSIONS: Mission[] = [
  {
    id: "bio_update",
    category: "Otimização de Perfil",
    title: "Atualização Completa da Bio",
    objective: "Transformar a bio em vitrine da UNIQUE",
    priority: "ALTA",
    description: "Atualize completamente sua bio do Instagram para incluir sua experiência com a UNIQUE de forma estratégica.",
    elements: [
      "Mencionar 'Transformada pela @uniqueplasticaavancada'",
      "Incluir 'Método CPI'",
      "Link direto para UNIQUE na bio",
      "Emoji relacionado à transformação",
      "Localização da UNIQUE"
    ],
    copy: `✨ Transformada pelo Método CPI
🏥 @uniqueplasticaavancada
💫 Cirurgia Plástica Integrativa
📍 [Cidade da UNIQUE]
👇🏻 Minha jornada completa`
  },
  {
    id: "highlight_unique",
    category: "Destaques",
    title: "Destaque 'MINHA UNIQUE'",
    objective: "Criar destaque permanente sobre a experiência",
    priority: "ALTA",
    description: "Crie um destaque fixo no Instagram chamado 'MINHA UNIQUE' ou 'MÉTODO CPI' com todos os melhores momentos da sua jornada na clínica.",
    elements: [
      "Stories do UNIQUE Day",
      "Preparação pré-operatória",
      "Dia da cirurgia",
      "Evolução dos resultados",
      "Bastidores da clínica",
      "Depoimentos emocionados"
    ]
  },
  {
    id: "grwm_trend",
    category: "Trends Virais",
    title: "Get Ready With Me - Consulta UNIQUE",
    objective: "Viralizar preparação para consulta",
    priority: "ALTA",
    description: "Crie trend 'Get Ready With Me' se arrumando para ir à consulta na UNIQUE.",
    elements: [
      "Acordando para o dia da consulta",
      "Escolhendo look para UNIQUE",
      "Preparativos e ansiedade",
      "Chegada na clínica",
      "'Pronta para minha consulta na @uniqueplasticaavancada'"
    ],
    copy: "#GRWM #ConsultaUNIQUE #MetodoCPI"
  },
  {
    id: "before_after",
    category: "Trends Virais",
    title: "Antes VS Depois - Método CPI",
    objective: "Viralizar transformação",
    priority: "MÁXIMA",
    description: "Crie trend de antes vs depois usando transição viral do momento.",
    elements: [
      "Parte 1: 'Eu antes do método CPI'",
      "Transição: Movimento viral",
      "Parte 2: 'Eu depois do método CPI da @uniqueplasticaavancada'",
      "Texto: 'O método CPI mudou minha vida'"
    ]
  },
  {
    id: "pov_unique",
    category: "Trends Virais",
    title: "POV: Você Escolheu a UNIQUE",
    objective: "Criar trend sobre escolha da clínica",
    priority: "ALTA",
    description: "Crie trend POV (Point of View) sobre escolher a UNIQUE.",
    elements: [
      "'POV: Você pesquisou muito e escolheu a melhor clínica do Brasil'",
      "Mostra estrutura da UNIQUE",
      "Equipe médica de elite",
      "Método CPI exclusivo",
      "Resultados incríveis",
      "'Escolhi @uniqueplasticaavancada e não me arrependo'"
    ]
  },
  {
    id: "podcast_external",
    category: "Participações em Mídia",
    title: "Podcast Externo",
    objective: "Expandir alcance falando sobre UNIQUE",
    priority: "ALTA",
    description: "Participe de podcasts externos falando sobre sua transformação e sempre mencionando a UNIQUE e o método CPI.",
    elements: [
      "Conte sua história de transformação",
      "Explique por que escolheu a UNIQUE",
      "Detalhe o método CPI",
      "Mencione a equipe de elite",
      "Dê dicas baseadas na experiência"
    ]
  },
  {
    id: "challenge_cpi",
    category: "Desafios",
    title: "#DesafioMetodoCPI",
    objective: "Criar movimento viral sobre método CPI",
    priority: "ALTA",
    description: "Lance desafio para outras influenciadoras conhecerem o método CPI.",
    elements: [
      "Poste sobre sua experiência com método CPI",
      "Desafie 3 amigas a conhecerem a UNIQUE",
      "Use hashtag #DesafioMetodoCPI",
      "Marque @uniqueplasticaavancada",
      "Compartilhe nos stories"
    ],
    copy: "Desafio vocês a conhecerem o método CPI da @uniqueplasticaavancada! Transformação que vai além da cirurgia tradicional. Quem topa? #DesafioMetodoCPI"
  }
];

// ============================================
// PROCESSO DE PROSPECÇÃO
// ============================================
const PROSPECTION_PROCESS = {
  title: "Processo de Prospecção e Seleção",
  steps: [
    {
      step: 1,
      title: "IDENTIFICAÇÃO",
      description: "Pesquisa ativa por influenciadoras potenciais",
      actions: [
        "Busca por hashtags (#cirurgiaplastica, #antesedepois, #estetica)",
        "Análise de seguidores de perfis concorrentes",
        "Monitoramento de trends e conteúdos virais",
        "Networking e indicações de influenciadoras parceiras"
      ]
    },
    {
      step: 2,
      title: "PRÉ-QUALIFICAÇÃO",
      description: "Verificação de critérios mínimos",
      actions: [
        "Mínimo 30K seguidores",
        "Taxa de engajamento > 2%",
        "Conteúdo alinhado com valores UNIQUE",
        "Ausência de polêmicas graves",
        "Verificação de autenticidade dos seguidores"
      ]
    },
    {
      step: 3,
      title: "ANÁLISE QUANTITATIVA",
      description: "Coleta e análise de métricas (2-3 dias)",
      actions: [
        "Métricas de todas as plataformas",
        "Análise de crescimento histórico (6 meses)",
        "Cálculo da taxa de engajamento real",
        "Verificação de seguidores falsos"
      ]
    },
    {
      step: 4,
      title: "ANÁLISE QUALITATIVA",
      description: "Avaliação de conteúdo e alinhamento (2-3 dias)",
      actions: [
        "Qualidade visual do conteúdo",
        "Alinhamento com valores UNIQUE",
        "Capacidade de influência real",
        "Histórico de parcerias",
        "Potencial de crescimento"
      ]
    },
    {
      step: 5,
      title: "CATEGORIZAÇÃO E PROPOSTA",
      description: "Definição de categoria e elaboração de proposta",
      actions: [
        "Cálculo do score final",
        "Definição da categoria",
        "Elaboração das opções de parceria",
        "Preparação da proposta personalizada"
      ]
    },
    {
      step: 6,
      title: "ABORDAGEM",
      description: "Primeiro contato com a influenciadora",
      actions: [
        "Mensagem personalizada via DM/E-mail",
        "Follow-up após 3 dias sem resposta",
        "Segundo follow-up após 7 dias",
        "Limite de 3 tentativas"
      ]
    },
    {
      step: 7,
      title: "NEGOCIAÇÃO",
      description: "Apresentação e fechamento",
      actions: [
        "Apresentação detalhada do programa",
        "Esclarecimento de dúvidas",
        "7 dias para análise da proposta",
        "Fechamento e agendamento do UNIQUE Day"
      ]
    }
  ]
};

const InfluencerStrategies = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(title);
      toast.success("Script copiado!");
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar script");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "MÁXIMA":
        return "bg-red-500";
      case "ALTA":
        return "bg-orange-500";
      case "MÉDIA":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3">
            <Sparkles className="h-7 w-7" />
            Programa UNI Influencers
          </CardTitle>
          <CardDescription className="text-white/90">
            Prospecção, categorização, scripts de abordagem e missões estratégicas para o programa de influenciadoras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">5</p>
              <p className="text-white/80 text-xs">Categorias</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">7-15%</p>
              <p className="text-white/80 text-xs">Comissão</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">12</p>
              <p className="text-white/80 text-xs">Meses Parceria</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">30K+</p>
              <p className="text-white/80 text-xs">Seguidores Mín.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">24h</p>
              <p className="text-white/80 text-xs">Tempo Abordagem</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="categories" className="gap-2 py-3">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="prospection" className="gap-2 py-3">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Prospecção</span>
          </TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2 py-3">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Scripts</span>
          </TabsTrigger>
          <TabsTrigger value="missions" className="gap-2 py-3">
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">Missões</span>
          </TabsTrigger>
        </TabsList>

        {/* Categorias Tab */}
        <TabsContent value="categories">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4 pr-4">
              {INFLUENCER_CATEGORIES.map((category) => (
                <Card key={category.id} className="overflow-hidden">
                  <CardHeader className={`bg-gradient-to-r ${category.color} text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                          {category.icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{category.name}</CardTitle>
                          <CardDescription className="text-white/90">
                            Score: {category.score} | Comissão: {category.commission}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-bold">{category.followers}</p>
                        <p className="text-white/80">seguidores</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="font-semibold">{category.followers}</p>
                        <p className="text-xs text-muted-foreground">Seguidores</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="font-semibold">{category.engagement}</p>
                        <p className="text-xs text-muted-foreground">Engajamento</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="font-semibold">{category.reach}</p>
                        <p className="text-xs text-muted-foreground">Alcance</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          Benefícios
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {category.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-1 shrink-0" />
                              <span className="text-muted-foreground">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <FileText className="h-4 w-4" />
                          Obrigações
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {category.obligations.map((obligation, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="h-3 w-3 text-amber-500 mt-1 shrink-0" />
                              <span className="text-muted-foreground">{obligation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Scoring Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Critérios de Pontuação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Métricas Quantitativas (60%)</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span>Número de Seguidores</span>
                          <Badge variant="secondary">20%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span>Taxa de Engajamento</span>
                          <Badge variant="secondary">25%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span>Alcance Médio</span>
                          <Badge variant="secondary">15%</Badge>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Métricas Qualitativas (40%)</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span>Qualidade do Conteúdo</span>
                          <Badge variant="secondary">15%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span>Alinhamento com Marca</span>
                          <Badge variant="secondary">10%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span>Influência Real</span>
                          <Badge variant="secondary">10%</Badge>
                        </li>
                        <li className="flex justify-between">
                          <span>Potencial de Crescimento</span>
                          <Badge variant="secondary">5%</Badge>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Prospecção Tab */}
        <TabsContent value="prospection">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4 pr-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    {PROSPECTION_PROCESS.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {PROSPECTION_PROCESS.steps.map((step, idx) => (
                      <div key={step.step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                            {step.step}
                          </div>
                          {idx < PROSPECTION_PROCESS.steps.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <h4 className="font-semibold text-lg">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 mb-3">
                            {step.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {step.actions.map((action, actionIdx) => (
                              <Badge key={actionIdx} variant="outline" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cadência de Follow-up */}
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Cadência de Follow-up
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">1º Follow-up</p>
                      <p className="text-muted-foreground">3 dias após contato inicial</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">2º Follow-up</p>
                      <p className="text-muted-foreground">7 dias após 1º follow-up</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">3º Follow-up</p>
                      <p className="text-muted-foreground">14 dias após 2º follow-up</p>
                    </div>
                    <div className="bg-background rounded-lg p-3">
                      <p className="font-semibold">Limite</p>
                      <p className="text-muted-foreground">3 tentativas sem resposta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fontes de Prospecção */}
              <Card>
                <CardHeader>
                  <CardTitle>Fontes de Prospecção</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Pesquisa em Redes Sociais
                      </h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Hashtags: #cirurgiaplastica #antesedepois #estetica</li>
                        <li>• Seguidores de perfis concorrentes</li>
                        <li>• Trends e conteúdos virais</li>
                        <li>• Criadoras emergentes em crescimento</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Networking e Indicações
                      </h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Indicações de influenciadoras parceiras</li>
                        <li>• Indicações da equipe médica</li>
                        <li>• Contatos em eventos do setor</li>
                        <li>• Parcerias com agências</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4 pr-4">
              {PROSPECTION_SCRIPTS.map((script) => (
                <Card key={script.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {script.channel === "Instagram DM" && <Instagram className="h-5 w-5 text-primary" />}
                          {script.channel === "E-mail" && <Mail className="h-5 w-5 text-primary" />}
                          {script.channel === "WhatsApp" && <Phone className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{script.title}</CardTitle>
                          <CardDescription>{script.channel} • {script.type}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{script.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="relative bg-muted/50 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                        {script.script}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(script.script, script.title)}
                      >
                        {copiedText === script.title ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Missões Tab */}
        <TabsContent value="missions">
          <ScrollArea className="h-[calc(100vh-450px)]">
            <div className="space-y-4 pr-4">
              {Object.entries(
                STRATEGIC_MISSIONS.reduce((acc, mission) => {
                  if (!acc[mission.category]) acc[mission.category] = [];
                  acc[mission.category].push(mission);
                  return acc;
                }, {} as Record<string, Mission[]>)
              ).map(([category, missions]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="h-5 w-5" />
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {missions.map((mission) => (
                        <AccordionItem key={mission.id} value={mission.id}>
                          <AccordionTrigger className="text-sm">
                            <div className="flex items-center gap-3">
                              <Badge className={`${getPriorityColor(mission.priority)} text-white text-xs`}>
                                {mission.priority}
                              </Badge>
                              <span className="font-medium">{mission.title}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Objetivo:</p>
                                <p className="text-sm">{mission.objective}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Descrição:</p>
                                <p className="text-sm">{mission.description}</p>
                              </div>
                              {mission.elements && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Elementos:</p>
                                  <ul className="space-y-1">
                                    {mission.elements.map((element, idx) => (
                                      <li key={idx} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="h-3 w-3 text-primary mt-1 shrink-0" />
                                        {element}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {mission.copy && (
                                <div className="relative bg-muted/50 rounded-lg p-3">
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Copy Sugerida:</p>
                                  <pre className="whitespace-pre-wrap text-sm font-mono">
                                    {mission.copy}
                                  </pre>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="absolute top-2 right-2"
                                    onClick={() => copyToClipboard(mission.copy!, mission.title)}
                                  >
                                    {copiedText === mission.title ? (
                                      <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InfluencerStrategies;
