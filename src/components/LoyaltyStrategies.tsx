import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Trophy, 
  Star, 
  AlertTriangle, 
  Sprout, 
  Moon,
  Target,
  Crown,
  Users,
  Gift,
  Sparkles,
  TrendingUp,
  Copy,
  Heart,
  Award,
  Camera,
  Gem,
  Medal,
  Phone,
  Mail,
  MessageCircle,
  Zap,
  Megaphone,
  Share2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ============ RFV SEGMENTS ============
const RFV_SEGMENTS = [
  {
    id: "campeoes",
    name: "Campeões",
    emoji: "🏆",
    icon: Trophy,
    color: "from-amber-500 to-yellow-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    criteria: { recencia: "4-5", frequencia: "4-5", valor: "4-5" },
    formula: "R≥4 AND F≥4 AND V≥4",
    profile: "Clientes de alto valor que compram frequentemente e recentemente",
    characteristics: [
      "Alta recência (compras recentes)",
      "Alta frequência (compram regularmente)",
      "Alto valor (tickets elevados)"
    ],
    strategy: "Manter satisfação e transformar em embaixadores da marca",
    actions: [
      "Atendimento VIP personalizado",
      "Ofertas exclusivas e lançamentos antecipados",
      "Programa de indicação com benefícios",
      "Feedback contínuo sobre produtos/serviços",
      "Convidar para programa UniLovers como Embaixadora"
    ],
    kpis: [
      "Taxa de retenção: >95%",
      "NPS: >70",
      "Valor médio por transação: +10% a.a."
    ],
    scripts: {
      approach: "Olá [NOME]! 💛 Como nossa paciente especial, queremos te agradecer por fazer parte da família UNIQUE. Você é uma verdadeira CAMPEÃ da nossa comunidade! Temos algumas novidades exclusivas que preparamos pensando em você...",
      unilovers: "Você já conhece o programa UniLovers? Como nossa paciente VIP, você pode acumular UniCoins e trocar por recompensas incríveis! Quer saber mais?"
    }
  },
  {
    id: "fieis",
    name: "Fiéis",
    emoji: "💎",
    icon: Gem,
    color: "from-blue-500 to-cyan-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    criteria: { recencia: "3-5", frequencia: "4-5", valor: "2-3" },
    formula: "F≥4 AND V≤3 AND R≥3",
    profile: "Clientes leais com boa frequência, mas valor médio",
    characteristics: [
      "Boa recência",
      "Alta frequência",
      "Valor médio"
    ],
    strategy: "Aumentar ticket médio através de upsell e cross-sell",
    actions: [
      "Estratégias de upsell e cross-sell",
      "Pacotes e combos personalizados",
      "Educação sobre produtos premium",
      "Programas de fidelidade com recompensas"
    ],
    kpis: [
      "Aumento do ticket médio: +20%",
      "Taxa de conversão upsell: >30%"
    ],
    scripts: {
      approach: "Oi [NOME]! 💎 Adoramos ter você sempre conosco! Notamos que você é super fiel à UNIQUE e queremos te apresentar algumas opções que podem complementar seus tratamentos atuais...",
      unilovers: "Sabia que no UniLovers você pode ganhar pontos toda vez que vem nos visitar? Você já tem potencial para acumular muitos UniCoins!"
    }
  },
  {
    id: "potenciais",
    name: "Potenciais",
    emoji: "⭐",
    icon: Star,
    color: "from-purple-500 to-pink-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    criteria: { recencia: "4-5", frequencia: "1-3", valor: "4-5" },
    formula: "R≥4 AND V≥4 AND F≤3",
    profile: "Clientes recentes com alto valor, mas baixa frequência",
    characteristics: [
      "Alta recência",
      "Baixa frequência",
      "Alto valor"
    ],
    strategy: "Aumentar frequência de compras",
    actions: [
      "Campanhas de relacionamento frequentes",
      "Conteúdo educativo personalizado",
      "Ofertas sazonais e promocionais",
      "Lembretes de recompra"
    ],
    kpis: [
      "Aumento da frequência: +50%",
      "Redução do intervalo entre compras",
      "Taxa de conversão: >25%"
    ],
    scripts: {
      approach: "Olá [NOME]! ⭐ Que bom te ver de volta! Você já conhece todos os nossos tratamentos complementares? Temos algumas novidades que combinam perfeitamente com seu perfil...",
      unilovers: "No UniLovers, quanto mais você participa, mais pontos acumula! Cada visita conta. Vamos te mostrar as missões disponíveis para você?"
    }
  },
  {
    id: "em_risco",
    name: "Em Risco",
    emoji: "⚠️",
    icon: AlertTriangle,
    color: "from-red-500 to-orange-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    criteria: { recencia: "1-2", frequencia: "3-5", valor: "3-5" },
    formula: "R≤2 AND F≥3 AND V≥3",
    profile: "Clientes valiosos que estão se afastando",
    characteristics: [
      "Baixa recência",
      "Boa frequência histórica",
      "Alto valor histórico"
    ],
    strategy: "Ações de reativação e recuperação",
    actions: [
      "Campanhas de win-back personalizadas",
      "Pesquisa de satisfação e feedback",
      "Ofertas especiais de retorno",
      "Contato direto (ligação/WhatsApp)"
    ],
    kpis: [
      "Taxa de reativação: >40%",
      "Tempo médio para recompra: <60 dias"
    ],
    scripts: {
      approach: "Oi [NOME]! ⚠️ Sentimos sua falta por aqui! Faz um tempo que não nos vemos e queremos saber como você está. Aconteceu alguma coisa? Podemos ajudar em algo?",
      unilovers: "Você sabia que ainda tem UniCoins acumulados? Eles podem expirar! Venha resgatar suas recompensas e continuar sua jornada conosco."
    }
  },
  {
    id: "novatos",
    name: "Novatos",
    emoji: "🌱",
    icon: Sprout,
    color: "from-green-500 to-emerald-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    criteria: { recencia: "4-5", frequencia: "1-2", valor: "1-2" },
    formula: "R≥4 AND F≤2 AND V≤2",
    profile: "Clientes recentes que precisam ser desenvolvidos",
    characteristics: [
      "Alta recência",
      "Baixa frequência",
      "Baixo valor"
    ],
    strategy: "Desenvolver relacionamento e aumentar engajamento",
    actions: [
      "Processo de onboarding estruturado",
      "Conteúdo educativo sobre produtos/serviços",
      "Ofertas de primeira compra",
      "Acompanhamento pós-venda intensivo"
    ],
    kpis: [
      "Taxa de conversão para segunda compra: >60%",
      "Tempo para segunda compra: <45 dias",
      "Satisfação inicial: >8/10"
    ],
    scripts: {
      approach: "Bem-vinda à família UNIQUE, [NOME]! 🌱 Estamos muito felizes em ter você conosco! Como foi sua primeira experiência? Queremos te ajudar a aproveitar ao máximo sua jornada de transformação.",
      unilovers: "Você já é uma UniLover! Ao entrar no programa, você ganhou seu cupom exclusivo e pode começar a acumular UniCoins agora mesmo. Vou te explicar como funciona!"
    }
  },
  {
    id: "inativos",
    name: "Inativos",
    emoji: "😴",
    icon: Moon,
    color: "from-gray-500 to-slate-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    criteria: { recencia: "1-2", frequencia: "1-2", valor: "1-2" },
    formula: "R≤2 AND F≤2 AND V≤2",
    profile: "Clientes que não compram há muito tempo",
    characteristics: [
      "Baixa recência",
      "Baixa frequência",
      "Baixo valor"
    ],
    strategy: "Reativar ou limpar base de dados",
    actions: [
      "Campanhas de última chance",
      "Pesquisa de motivo de abandono",
      "Ofertas agressivas de retorno",
      "Limpeza de base (após 6 meses sem resposta)"
    ],
    kpis: [
      "Taxa de reativação: >15%",
      "ROI das campanhas de reativação",
      "Redução de custos de manutenção"
    ],
    scripts: {
      approach: "Olá [NOME]! 💤 Faz muito tempo que não nos vemos e queremos te reconquistar! Preparamos uma oferta especial de retorno só para você. O que acha de marcarmos uma visita?",
      unilovers: "Temos novidades incríveis no programa UniLovers! Novos prêmios, novas missões. Que tal começar uma nova jornada conosco?"
    }
  }
];

// ============ UNILOVERS MISSIONS ============
const UNILOVERS_MISSIONS = {
  pre_operatorio: [
    {
      id: 1,
      title: "Primeira Impressão Única",
      task: "Grave um vídeo ou faça um post contando como foi sua primeira visita à UNIQUE",
      hashtag: "#PrimeiraImpressaoUnique",
      points: 10
    },
    {
      id: 2,
      title: "Meus 3 Motivos Para Escolher a UNIQUE",
      task: "Liste em um vídeo ou post os 3 principais motivos que te fizeram escolher a UNIQUE e o Método CPI",
      hashtag: "#MinhaEscolhaCPI",
      points: 10
    },
    {
      id: 3,
      title: "Carta para Meu Eu do Futuro",
      task: "Escreva uma carta para si mesma, falando de suas expectativas, medos e desejos",
      hashtag: "#CartaCPI",
      points: 10
    },
    {
      id: 4,
      title: "Diário de Preparação",
      task: "Comece um diário de bordo com postagens mensais sobre sua preparação para a cirurgia",
      hashtag: "#DiarioCPI",
      points: 10
    },
    {
      id: 5,
      title: "Academia da Nova Era",
      task: "Poste um vídeo ou foto da sua rotina de preparação física",
      hashtag: "#CorpoEmMovimentoCPI",
      points: 10
    },
    {
      id: 6,
      title: "Ritual de Hidratação",
      task: "Mostre nos stories como você está cuidando da sua hidratação",
      hashtag: "#HidrataçãoCPI",
      points: 10
    },
    {
      id: 7,
      title: "Cheguei no Meu Peso-Alvo",
      task: "Ao atingir o peso combinado, envie uma foto da balança ou compartilhe esse marco",
      hashtag: "#MetaAlcancadaCPI",
      points: 10
    },
    {
      id: 8,
      title: "Minha Rotina Saudável",
      task: "Compartilhe uma refeição preparada dentro do seu plano alimentar personalizado",
      hashtag: "#DiarioCPI",
      points: 10
    }
  ],
  indicacoes: [
    {
      id: 9,
      title: "Indiquei para Consulta",
      task: "Indique uma amiga para agendar uma consulta na UNIQUE usando seu link ou cupom exclusivo",
      hashtag: "#IndiqueiUnique",
      points: 50
    },
    {
      id: 10,
      title: "Indiquei para Cirurgia",
      task: "Se a amiga que você indicou fechar a cirurgia, você ganha ainda mais!",
      hashtag: "#TransformeiComUnique",
      points: 100
    }
  ],
  intra_operatorio: [
    {
      id: 11,
      title: "Caixa dos Sete Pilares",
      task: "Faça o unboxing da sua Caixa dos Sete Pilares, mostrando os itens e o significado",
      hashtag: "#CaixaCPI",
      points: 10
    },
    {
      id: 12,
      title: "Mensagem do Coração",
      task: "Envie uma mensagem de voz ou texto para a equipe durante o dia da cirurgia",
      hashtag: "#MomentoCPI",
      points: 10
    }
  ],
  pos_operatorio: [
    {
      id: 13,
      title: "Meu Antes e Depois Oficial",
      task: "Compartilhe sua transformação com fotos do antes e depois",
      hashtag: "#MinhaTransformacaoCPI",
      points: 10
    },
    {
      id: 14,
      title: "Valeu a Pena?",
      task: "Grave um vídeo contando como foi todo o seu processo e se faria tudo novamente",
      hashtag: "#ValeuACirurgiaCPI",
      points: 10
    },
    {
      id: 15,
      title: "Compartilhando sua Recuperação",
      task: "Poste um conteúdo mostrando como está sendo seu pós-operatório",
      hashtag: "#RecuperacaoCPI",
      points: 10
    },
    {
      id: 16,
      title: "Avaliação Final",
      task: "Grave um vídeo de até 1 min contando sua experiência 30 ou 90 dias após a cirurgia",
      hashtag: "#MinhaJornadaCPI",
      points: 10
    },
    {
      id: 17,
      title: "Feedback Consciente",
      task: "Responder ao formulário de feedback",
      hashtag: "#FeedbackCPI",
      points: 10
    },
    {
      id: 18,
      title: "Depoimento no Google",
      task: "Escreva sua opinião sincera sobre a experiência com a UNIQUE no Google",
      hashtag: "#MinhaOpiniaoUnique",
      points: 10
    },
    {
      id: 19,
      title: "180 Dias da Transformação",
      task: "Após 6 meses, mostre sua evolução e o que continua fazendo para manter os resultados",
      hashtag: "#CompromissoComigo #ResultadoCPI",
      points: 20
    }
  ],
  experiencias: [
    {
      id: 20,
      title: "Participação no Podcast UNIQUE",
      task: "Grave um episódio contando sua história e os aprendizados com o Método CPI",
      hashtag: "#PodcastUnique",
      points: 20
    },
    {
      id: 21,
      title: "Por Trás da Transformação",
      task: "Compartilhe sua trajetória no formato de texto ou vídeo para o quadro especial",
      hashtag: "#PorTrasDaTransformacao",
      points: 20
    },
    {
      id: 22,
      title: "Projeto Espelho",
      task: "Autorize o uso do seu antes e depois + compartilhe um depoimento",
      hashtag: "#ProjetoEspelho",
      points: 20
    }
  ]
};

// ============ UNILOVERS REWARDS ============
const UNILOVERS_REWARDS = [
  { name: "Viagem para Fernando de Noronha", points: 1500, stock: 1 },
  { name: "iPhone 15 - 128GB", points: 1200, stock: 2 },
  { name: "Cirurgia íntima estética", points: 1000, stock: 3 },
  { name: "Shooting fotográfico", points: 800, stock: 4 },
  { name: "Implante Hormonal", points: 700, stock: 5 },
  { name: "Botox Terço Superior", points: 650, stock: 5 },
  { name: "Preenchimento labial (1 ml)", points: 600, stock: 5 },
  { name: "Laser CO2 facial", points: 550, stock: 5 },
  { name: "LuxSkin Kit Facial (3 produtos)", points: 500, stock: 5 },
  { name: "Sessão de Soroterapia", points: 350, stock: 5 },
  { name: "Roupão bordado UNIQUE", points: 200, stock: 5 },
  { name: "LuxSkin (Booster, Detox, etc.)", points: 150, stock: 5 },
  { name: "Sessão de SPA", points: 120, stock: 5 },
  { name: "Biquini Personalizado", points: 100, stock: 5 },
  { name: "Bolsa personalizada UNIQUE Lux", points: 80, stock: 5 },
  { name: "Garrafinha UNIQUE personalizada", points: 50, stock: 5 },
  { name: "Pantufa UNIQUE", points: 40, stock: 5 },
  { name: "Necessaire Personalizada", points: 30, stock: 5 },
  { name: "Boné Personalizado", points: 20, stock: 5 }
];

// ============ UNISTAR MEDALS ============
const UNISTAR_MEDALS = [
  { medal: "🥉", name: "UniStar Prata", range: "200 UniCoins", meaning: "Início da jornada" },
  { medal: "🥈", name: "UniStar Ouro", range: "201 a 500 UniCoins", meaning: "Engajamento crescente" },
  { medal: "🥇", name: "UniStar Diamante", range: "501 a 999 UniCoins", meaning: "Constância e comprometimento" },
  { medal: "👑", name: "UniStar Embaixadora", range: "1.000+ UniCoins", meaning: "Elite do programa" }
];

// ============ INVITE SCRIPTS ============
const INVITE_SCRIPTS = [
  {
    id: "whatsapp_inicial",
    title: "WhatsApp - Convite Inicial",
    scenario: "Paciente que acabou de fechar procedimento",
    script: `Oi [NOME]! 💖

Bem-vinda à família UNIQUE! 🎉

Você sabia que agora você faz parte do UniLovers, nosso programa exclusivo de reconhecimento e recompensas?

✨ O que você ganha:
• Cupom exclusivo: [CUPOM_PACIENTE]
• Link de indicação personalizado
• Acesso ao painel de missões

🎁 Como funciona:
Cada ação, cuidado ou engajamento gera UniCoins que podem ser trocados por prêmios INCRÍVEIS!

Posso te explicar mais sobre as missões disponíveis?`
  },
  {
    id: "whatsapp_missoes",
    title: "WhatsApp - Explicando Missões",
    scenario: "Paciente interessada em saber mais",
    script: `[NOME], que bom que você quer saber mais! 🌟

📋 Suas primeiras missões disponíveis:

1️⃣ "Primeira Impressão Única" - 10 UniCoins
Conte como foi sua primeira visita à UNIQUE

2️⃣ "Meus 3 Motivos" - 10 UniCoins
Liste por que escolheu a UNIQUE e o Método CPI

3️⃣ "Diário de Preparação" - 10 UniCoins
Compartilhe sua jornada de preparação

💡 Dica: Use as hashtags de cada missão para validarmos!

🏆 Com 200 UniCoins você já ganha a medalha UniStar Prata!

Quer que eu te envie seu link de indicação também?`
  },
  {
    id: "whatsapp_indicacao",
    title: "WhatsApp - Incentivo à Indicação",
    scenario: "Paciente satisfeita pós-procedimento",
    script: `[NOME]! 💛

Amamos ver sua transformação! 🦋

Você sabia que pode ganhar UniCoins indicando amigas?

🎯 Por cada indicação:
• Consulta agendada = +50 UniCoins
• Cirurgia fechada = +100 UniCoins

✨ Não há limite de indicações!

Seu link exclusivo: [LINK_INDICACAO]
Seu cupom: [CUPOM_PACIENTE]

Quando sua amiga usar, os pontos vão direto pra você! 

Conhece alguém que também sonha com a transformação?`
  },
  {
    id: "presencial",
    title: "Abordagem Presencial",
    scenario: "Durante atendimento na clínica",
    script: `"[NOME], você já conhece o programa UniLovers?

É o nosso programa de reconhecimento onde você ganha pontos por cada passo da sua jornada de transformação!

Você recebe:
• Um cupom exclusivo com seu nome
• Um link de indicação rastreável
• Acesso ao painel de missões

Os pontos podem ser trocados por prêmios incríveis - desde uma sessão de SPA até uma viagem para Fernando de Noronha!

Quer que eu te cadastre agora e já te passe seu cupom?"`
  }
];

export default function LoyaltyStrategies() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast.success("Script copiado!");
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Heart className="h-6 w-6" />
            RFV + UniLovers | Fidelização & Recorrência
          </CardTitle>
          <p className="text-white/90 text-sm">
            Matriz de segmentação de clientes integrada ao programa de gamificação UniLovers
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1" />
              <p className="text-xs opacity-90">6 Segmentos RFV</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Target className="h-5 w-5 mx-auto mb-1" />
              <p className="text-xs opacity-90">29+ Missões</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Gift className="h-5 w-5 mx-auto mb-1" />
              <p className="text-xs opacity-90">19 Recompensas</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Award className="h-5 w-5 mx-auto mb-1" />
              <p className="text-xs opacity-90">4 Medalhas UniStar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rfv" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="rfv" className="text-xs md:text-sm">
            <TrendingUp className="h-4 w-4 mr-1 hidden md:inline" />
            Matriz RFV
          </TabsTrigger>
          <TabsTrigger value="unilovers" className="text-xs md:text-sm">
            <Heart className="h-4 w-4 mr-1 hidden md:inline" />
            UniLovers
          </TabsTrigger>
          <TabsTrigger value="convites" className="text-xs md:text-sm">
            <Megaphone className="h-4 w-4 mr-1 hidden md:inline" />
            Convites
          </TabsTrigger>
          <TabsTrigger value="recompensas" className="text-xs md:text-sm">
            <Gift className="h-4 w-4 mr-1 hidden md:inline" />
            Prêmios
          </TabsTrigger>
        </TabsList>

        {/* RFV TAB */}
        <TabsContent value="rfv" className="mt-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {/* Intro Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    O que é a Matriz RFV?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    A matriz RFV (Recência, Frequência e Valor) é uma ferramenta de segmentação que identifica 
                    os clientes mais valiosos e direciona estratégias personalizadas. Cada cliente recebe uma 
                    pontuação de 1-5 em cada dimensão.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-background rounded p-2">
                      <p className="font-semibold text-primary">R - Recência</p>
                      <p className="text-muted-foreground">Dias desde última compra</p>
                    </div>
                    <div className="bg-background rounded p-2">
                      <p className="font-semibold text-primary">F - Frequência</p>
                      <p className="text-muted-foreground">Total de compras no período</p>
                    </div>
                    <div className="bg-background rounded p-2">
                      <p className="font-semibold text-primary">V - Valor</p>
                      <p className="text-muted-foreground">Valor total gasto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Segments */}
              {RFV_SEGMENTS.map((segment) => {
                const IconComponent = segment.icon;
                return (
                  <Card key={segment.id} className={`${segment.bgColor} ${segment.borderColor} border`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${segment.color}`}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {segment.emoji} {segment.name}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs mt-1">
                              {segment.formula}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>R: {segment.criteria.recencia}</p>
                          <p>F: {segment.criteria.frequencia}</p>
                          <p>V: {segment.criteria.valor}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm font-medium">{segment.profile}</p>
                      
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Características:</p>
                        <ul className="text-xs space-y-0.5">
                          {segment.characteristics.map((char, i) => (
                            <li key={i}>• {char}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Estratégia:</p>
                        <p className="text-sm font-medium text-primary">{segment.strategy}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Ações Prioritárias:</p>
                        <ul className="text-xs space-y-0.5">
                          {segment.actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <Zap className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">KPIs:</p>
                        <div className="flex flex-wrap gap-1">
                          {segment.kpis.map((kpi, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {kpi}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Scripts */}
                      <div className="pt-2 border-t space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Scripts de Abordagem:</p>
                        <div className="space-y-2">
                          <div className="bg-background rounded p-2">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-semibold">Abordagem Geral</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => copyToClipboard(segment.scripts.approach, `approach-${segment.id}`)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-pre-line">{segment.scripts.approach}</p>
                          </div>
                          <div className="bg-background rounded p-2">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-semibold">Convite UniLovers</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => copyToClipboard(segment.scripts.unilovers, `unilovers-${segment.id}`)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">{segment.scripts.unilovers}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* UNILOVERS TAB */}
        <TabsContent value="unilovers" className="mt-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {/* Intro */}
              <Card className="bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-950/30 dark:to-rose-950/30 border-pink-200 dark:border-pink-800">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-500" />
                    Programa UniLovers
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Slogan:</strong> Você vive a jornada. Nós transformamos isso em conquista.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Programa oficial de reconhecimento e recompensas da UNIQUE, criado para valorizar a jornada 
                    real da paciente. Cada ação gera UniCoins que podem ser trocados por prêmios.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-background rounded p-2 text-center">
                      <p className="font-semibold">Cupom Exclusivo</p>
                      <p className="text-muted-foreground">Ex: BRUNAGUIMARAES10</p>
                    </div>
                    <div className="bg-background rounded p-2 text-center">
                      <p className="font-semibold">Link de Indicação</p>
                      <p className="text-muted-foreground">Rastreável</p>
                    </div>
                    <div className="bg-background rounded p-2 text-center">
                      <p className="font-semibold">Painel de Missões</p>
                      <p className="text-muted-foreground">People Fy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* UniStar Medals */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Medal className="h-5 w-5 text-amber-500" />
                    Medalhas UniStar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {UNISTAR_MEDALS.map((medal, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3 text-center">
                        <p className="text-2xl mb-1">{medal.medal}</p>
                        <p className="text-xs font-semibold">{medal.name}</p>
                        <p className="text-xs text-primary">{medal.range}</p>
                        <p className="text-xs text-muted-foreground mt-1">{medal.meaning}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Missions by Phase */}
              {Object.entries(UNILOVERS_MISSIONS).map(([phase, missions]) => {
                const phaseLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                  pre_operatorio: { label: "Pré-Operatório", icon: <Calendar className="h-4 w-4" />, color: "from-blue-500 to-cyan-500" },
                  indicacoes: { label: "Indicações", icon: <Share2 className="h-4 w-4" />, color: "from-green-500 to-emerald-500" },
                  intra_operatorio: { label: "Dia da Cirurgia", icon: <Sparkles className="h-4 w-4" />, color: "from-purple-500 to-pink-500" },
                  pos_operatorio: { label: "Pós-Operatório", icon: <Heart className="h-4 w-4" />, color: "from-rose-500 to-red-500" },
                  experiencias: { label: "Experiências Especiais", icon: <Crown className="h-4 w-4" />, color: "from-amber-500 to-orange-500" }
                };
                const phaseInfo = phaseLabels[phase];

                return (
                  <Card key={phase}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${phaseInfo.color} text-white`}>
                          {phaseInfo.icon}
                        </div>
                        <CardTitle className="text-base">{phaseInfo.label}</CardTitle>
                        <Badge variant="secondary" className="ml-auto">
                          {missions.length} missões
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {missions.map((mission) => (
                          <div key={mission.id} className="bg-muted/50 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm font-semibold">{mission.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{mission.task}</p>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {mission.hashtag}
                                </Badge>
                              </div>
                              <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white ml-2">
                                {mission.points} pts
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* CONVITES TAB */}
        <TabsContent value="convites" className="mt-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Scripts para Convidar ao UniLovers
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use estes scripts para apresentar o programa UniLovers às pacientes e incentivá-las a participar.
                  </p>
                </CardContent>
              </Card>

              {INVITE_SCRIPTS.map((script) => (
                <Card key={script.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{script.title}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {script.scenario}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(script.script, script.id)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <pre className="text-xs whitespace-pre-wrap font-sans">{script.script}</pre>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Quick Reference */}
              <Card className="bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950/30 dark:to-purple-950/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">📋 Referência Rápida - UniLovers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold mb-1">Pontuação de Indicações:</p>
                    <ul className="text-xs space-y-0.5">
                      <li>• Consulta agendada = +50 UniCoins</li>
                      <li>• Cirurgia fechada = +100 UniCoins</li>
                      <li>• Sem limite de indicações!</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Medalhas:</p>
                    <ul className="text-xs space-y-0.5">
                      <li>🥉 Prata: 200 UniCoins</li>
                      <li>🥈 Ouro: 201-500 UniCoins</li>
                      <li>🥇 Diamante: 501-999 UniCoins</li>
                      <li>👑 Embaixadora: 1.000+ UniCoins</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Regras:</p>
                    <ul className="text-xs space-y-0.5">
                      <li>• Validade: 01/01/2025 a 31/12/2025</li>
                      <li>• Pontos não acumulam para ano seguinte</li>
                      <li>• Resgate até 10/01/2026</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* RECOMPENSAS TAB */}
        <TabsContent value="recompensas" className="mt-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-950/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-amber-500" />
                    Painel de Recompensas UniLovers
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Pacientes podem resgatar recompensas ao atingir pontuações necessárias. 
                    Cada item possui estoque limitado e a tabela é atualizada semestralmente.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🎁 Catálogo de Prêmios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {UNILOVERS_REWARDS.map((reward, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          i < 3 
                            ? "bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800" 
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {i === 0 ? "🏆" : i === 1 ? "📱" : i === 2 ? "💎" : "🎁"}
                          </span>
                          <div>
                            <p className={`text-sm ${i < 3 ? "font-semibold" : ""}`}>{reward.name}</p>
                            <p className="text-xs text-muted-foreground">Estoque: {reward.stock}</p>
                          </div>
                        </div>
                        <Badge 
                          className={
                            i < 3 
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-white" 
                              : ""
                          }
                          variant={i < 3 ? "default" : "secondary"}
                        >
                          {reward.points} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* UNIQUE Show */}
              <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    🎉 UNIQUE Show - Evento Final do Ano
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-white/90">
                    As pacientes com maior pontuação até 15/12 concorrem ao Troféu Musa UNIQUE. 
                    A primeira a atingir 1.500 pontos recebe viagem de prêmio + faixa + ensaio exclusivo!
                  </p>
                  <div>
                    <p className="text-sm font-semibold mb-2">Categorias de Premiação:</p>
                    <ul className="text-sm space-y-1">
                      <li>🥇 <strong>UniStar Diamante Master</strong> - Maior pontuação do ano</li>
                      <li>✨ <strong>História mais inspiradora</strong> - Votação interna</li>
                      <li>💖 <strong>Embaixadora UniLovers Revelação</strong> - Mais indicações</li>
                      <li>🦋 <strong>Transformação da Nova Era</strong> - Melhor jornada geral</li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/20">
                    <p className="text-sm font-semibold mb-2">🏆 Ranking Final:</p>
                    <ul className="text-sm space-y-1">
                      <li>🥇 <strong>UniStar do Ano</strong> - Viagem com acompanhante</li>
                      <li>🥈 <strong>UniStar de Ouro</strong> - Ensaio fotográfico + LuxSkin Kit</li>
                      <li>🥉 <strong>UniStar de Prata</strong> - SPA Day + Roupão personalizado</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
