import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { 
  Calendar, Target, ChevronRight, ChevronLeft, 
  Gift, Heart, Sun, Snowflake, Flower2, Users, ShoppingBag, 
  PartyPopper, Star, Clock, MessageSquare, Zap, Syringe, 
  Leaf, Smile, Baby, Ribbon, Gem, RefreshCw, TrendingUp, 
  Activity, Eye, Candy, Copy, Check, Send, Phone, User,
  FileText, Image, ExternalLink, Sparkles, Settings, UserCheck,
  Download, List, CheckCheck
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CampaignsManager from "@/components/admin/CampaignsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ==================== CAMPANHAS 2026 ====================
const CAMPAIGNS_2026 = [
  {
    month: 1,
    monthName: "Janeiro",
    campaigns: [
      {
        id: "unique-reset",
        name: "UNIQUE RESET",
        date: "01-31 Jan",
        type: "mensal",
        icon: RefreshCw,
        color: "bg-cyan-500",
        concept: "Saúde, recuperação e reequilíbrio pós-festas",
        focus: "Soroterapia (Imunidade, Detox, Energia)",
        offer: "Soroterapia com 20% OFF + Avaliação Nutricional Grátis",
        scripts: [
          {
            title: "Abordagem Inicial",
            text: "Olá {nome}! 🌟 Começou 2026 e é hora de cuidar de você! Temos uma condição especial de Soroterapia para renovar suas energias. Posso te contar mais?"
          },
          {
            title: "Oferta Especial",
            text: "Ei {nome}! 💚 Campanha UNIQUE RESET: Soroterapia com 20% OFF + Avaliação Nutricional GRÁTIS! Válido até 31/01. Quer agendar sua sessão?"
          },
          {
            title: "Follow-up",
            text: "{nome}, vi que você demonstrou interesse na nossa campanha de janeiro! 🔋 A Soroterapia é perfeita para repor vitaminas e ter mais energia. Que tal agendarmos?"
          }
        ],
        materials: [
          { type: "image", title: "Banner Stories", url: "#" },
          { type: "image", title: "Post Feed", url: "#" },
          { type: "doc", title: "Protocolo Detox", url: "#" }
        ]
      },
      {
        id: "ano-novo",
        name: "Ano Novo",
        date: "01 Jan",
        type: "visibilidade",
        icon: PartyPopper,
        color: "bg-violet-500",
        concept: "Celebração do novo ano",
        focus: "Conteúdo motivacional e metas de autocuidado",
        offer: null,
        scripts: [
          {
            title: "Mensagem de Ano Novo",
            text: "Feliz Ano Novo, {nome}! 🎉✨ Que 2026 seja repleto de conquistas e muito autocuidado. A Unique está aqui para te acompanhar nessa jornada!"
          }
        ],
        materials: []
      },
      {
        id: "botox-day-jan",
        name: "BOTOX DAY",
        date: "Jan/Fev",
        type: "day_especial",
        icon: Syringe,
        color: "bg-purple-500",
        concept: "DAY Especial de alto volume",
        focus: "Aplicação de Toxina Botulínica",
        offer: "Botox a partir de R$ 890 | Pacote 3 áreas: R$ 2.190",
        scripts: [
          {
            title: "Convite BOTOX DAY",
            text: "Oi {nome}! 💜 Dia especial na Unique: BOTOX DAY com condições imperdíveis! Botox a partir de R$ 890. Vagas limitadas. Reservo a sua?"
          },
          {
            title: "Urgência",
            text: "{nome}, restam poucas vagas para o BOTOX DAY! 🔥 Preços especiais só neste dia. Você não vai querer perder, né? Me confirma que reservo!"
          }
        ],
        materials: [
          { type: "image", title: "Arte BOTOX DAY", url: "#" }
        ]
      }
    ]
  },
  {
    month: 2,
    monthName: "Fevereiro",
    campaigns: [
      {
        id: "unique-balance",
        name: "UNIQUE BALANCE",
        date: "01-28 Fev",
        type: "mensal",
        icon: Activity,
        color: "bg-green-500",
        concept: "Disciplina, constância e autocuidado",
        focus: "Protocolos nutricionais e emagrecimento estratégico",
        offer: "Protocolo Emagrecimento: 6 sessões por R$ 2.400 (de R$ 3.000)",
        scripts: [
          {
            title: "Abordagem Emagrecimento",
            text: "Olá {nome}! 💪 Fevereiro é o mês do EQUILÍBRIO na Unique! Nosso protocolo de emagrecimento está com condição especial. Posso te explicar como funciona?"
          },
          {
            title: "Resultado",
            text: "{nome}, já pensou em perder medidas de forma saudável e duradoura? 🎯 Nosso protocolo combina nutrição + procedimentos. Condição especial este mês!"
          }
        ],
        materials: []
      },
      {
        id: "carnaval",
        name: "Carnaval",
        date: "14-17 Fev",
        type: "visibilidade",
        icon: PartyPopper,
        color: "bg-yellow-500",
        concept: "Preparação e recuperação pós-carnaval",
        focus: "Cuidados pré e pós-folia",
        offer: "Glow Up Pré-Carnaval: Hidratação + Vitamina C por R$ 350",
        scripts: [
          {
            title: "Pré-Carnaval",
            text: "Ei {nome}! 🎭 O Carnaval tá chegando! Que tal um Glow Up para arrasar na folia? Hidratação facial + Vitamina C por apenas R$ 350!"
          },
          {
            title: "Pós-Carnaval",
            text: "{nome}, sobreviveu ao Carnaval? 😅 Agora é hora de recuperar! Temos protocolos de revitalização para você voltar 100%. Vamos agendar?"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 3,
    monthName: "Março",
    campaigns: [
      {
        id: "unique-woman",
        name: "UNIQUE WOMAN",
        date: "01-31 Mar",
        type: "comemorativo",
        icon: Heart,
        color: "bg-pink-500",
        concept: "Autonomia e autoestima feminina (Dia da Mulher)",
        focus: "Planejamento e cirurgia plástica corporal",
        offer: "Mês da Mulher: Consulta + Exames pré-op com 50% OFF",
        scripts: [
          {
            title: "Homenagem",
            text: "Olá {nome}! 💕 Março é o mês de celebrar VOCÊ! Na Unique, acreditamos que toda mulher merece se sentir incrível. Temos condições especiais esperando por você!"
          },
          {
            title: "Oferta Cirurgia",
            text: "{nome}, março é o momento perfeito para realizar aquele sonho! ✨ Consulta + Exames pré-operatórios com 50% OFF. Que tal agendar uma avaliação?"
          }
        ],
        materials: []
      },
      {
        id: "dia-mulher",
        name: "Dia da Mulher",
        date: "08 Mar",
        type: "visibilidade",
        icon: Heart,
        color: "bg-pink-600",
        concept: "Dia Internacional da Mulher",
        focus: "Empoderamento e autoestima",
        offer: null,
        scripts: [
          {
            title: "Felicitação",
            text: "Feliz Dia da Mulher, {nome}! 🌸 Você é única, forte e inspiradora. A Unique celebra você hoje e sempre! 💕"
          }
        ],
        materials: []
      },
      {
        id: "bioplastia-day",
        name: "BIOPLASTIA DAY",
        date: "Mar/Abr",
        type: "day_especial",
        icon: Sparkles,
        color: "bg-rose-500",
        concept: "DAY Especial de alto volume",
        focus: "Preenchimento Facial Leve",
        offer: "Ácido Hialurônico 1ml: R$ 1.290 | 2ml: R$ 2.290",
        scripts: [
          {
            title: "Convite",
            text: "Oi {nome}! ✨ BIOPLASTIA DAY chegando! Preenchimento com ácido hialurônico em condições especiais. 1ml por R$ 1.290! Vagas limitadas. Reservo a sua?"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 4,
    monthName: "Abril",
    campaigns: [
      {
        id: "unique-harmony",
        name: "UNIQUE HARMONY",
        date: "01-30 Abr",
        type: "mensal",
        icon: Smile,
        color: "bg-amber-500",
        concept: "Naturalidade, equilíbrio e elegância",
        focus: "Harmonização facial e procedimentos não cirúrgicos",
        offer: "Harmonização Facial Completa: 12x de R$ 416",
        scripts: [
          {
            title: "Harmonização",
            text: "Olá {nome}! 😊 Abril é o mês da HARMONIA! Que tal realçar sua beleza natural com uma harmonização facial? Parcelamos em até 12x. Vamos conversar?"
          }
        ],
        materials: []
      },
      {
        id: "pascoa",
        name: "Páscoa",
        date: "05 Abr",
        type: "visibilidade",
        icon: Gift,
        color: "bg-amber-400",
        concept: "Celebração da Páscoa",
        focus: "Renovação e cuidados",
        offer: null,
        scripts: [
          {
            title: "Páscoa",
            text: "Feliz Páscoa, {nome}! 🐣 Que esta data traga renovação e muita paz para você e sua família. Um abraço da equipe Unique! 💛"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 5,
    monthName: "Maio",
    campaigns: [
      {
        id: "unique-essence",
        name: "UNIQUE ESSENCE",
        date: "01-31 Mai",
        type: "comemorativo",
        icon: Baby,
        color: "bg-rose-500",
        concept: "A mulher além da maternidade (Dia das Mães)",
        focus: "Cirurgias corporais e combinadas (Mommy Makeover)",
        offer: "Mommy Makeover: Lipo + Abdominoplastia em até 24x",
        scripts: [
          {
            title: "Para Mães",
            text: "Olá {nome}! 💝 Maio é especial para todas as mães! Você que se dedicou tanto, merece se cuidar. Temos condições exclusivas para Mommy Makeover!"
          },
          {
            title: "Presente Mães",
            text: "{nome}, que tal presentear sua mãe com autocuidado? 🌹 Temos vouchers especiais para procedimentos. Ela vai amar! Quer saber mais?"
          }
        ],
        materials: []
      },
      {
        id: "dia-maes",
        name: "Dia das Mães",
        date: "10 Mai",
        type: "visibilidade",
        icon: Heart,
        color: "bg-rose-600",
        concept: "Celebração do Dia das Mães",
        focus: "Homenagem e presentes",
        offer: "Vouchers presente a partir de R$ 200",
        scripts: [
          {
            title: "Felicitação",
            text: "Feliz Dia das Mães, {nome}! 💐 Que seu dia seja repleto de amor e carinho. Você merece todo o cuidado do mundo! Com carinho, Unique. 💕"
          }
        ],
        materials: []
      },
      {
        id: "soroterapia-day",
        name: "SOROTERAPIA DAY",
        date: "Mai/Jun",
        type: "day_especial",
        icon: Zap,
        color: "bg-yellow-500",
        concept: "DAY Especial de alto volume",
        focus: "Protocolos de Energia e Imunidade",
        offer: "Soro Energia + Imunidade: R$ 290 (de R$ 450)",
        scripts: [
          {
            title: "Convite",
            text: "Oi {nome}! ⚡ SOROTERAPIA DAY: Protocolo Energia + Imunidade por apenas R$ 290! Perfeito para quem precisa de um up. Agenda vai lotar! Reservo sua vaga?"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 6,
    monthName: "Junho",
    campaigns: [
      {
        id: "unique-desire",
        name: "UNIQUE DESIRE",
        date: "01-30 Jun",
        type: "comemorativo",
        icon: Heart,
        color: "bg-red-500",
        concept: "Confiança, sensualidade e conexão (Dia dos Namorados)",
        focus: "Procedimentos e cirurgias para casais",
        offer: "Pacote Casal: 2 procedimentos com 30% OFF",
        scripts: [
          {
            title: "Casais",
            text: "Olá {nome}! 💕 Junho é o mês do amor! Que tal um presente especial para vocês dois? Pacote Casal com 30% OFF em procedimentos. Bora cuidar juntos?"
          }
        ],
        materials: []
      },
      {
        id: "dia-namorados",
        name: "Dia dos Namorados",
        date: "12 Jun",
        type: "visibilidade",
        icon: Heart,
        color: "bg-red-600",
        concept: "Celebração do amor",
        focus: "Casais e presentes",
        offer: "Vouchers presente para o amor da sua vida",
        scripts: [
          {
            title: "Felicitação",
            text: "Feliz Dia dos Namorados, {nome}! ❤️ Que o amor esteja sempre presente na sua vida! A Unique deseja um dia especial para você! 💕"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 7,
    monthName: "Julho",
    campaigns: [
      {
        id: "unique-care",
        name: "UNIQUE CARE",
        date: "01-31 Jul",
        type: "mensal",
        icon: Snowflake,
        color: "bg-blue-400",
        concept: "Cuidado silencioso e sofisticado",
        focus: "Pós-operatório, recuperação e soroterapia de cicatrização",
        offer: "Protocolo Pós-Op: 3 sessões por R$ 890",
        scripts: [
          {
            title: "Pós-Operatório",
            text: "Olá {nome}! ❄️ Julho é perfeito para procedimentos com mais tranquilidade. Nosso protocolo de recuperação está com condição especial!"
          }
        ],
        materials: []
      },
      {
        id: "laser-day",
        name: "LASER DAY",
        date: "Jul/Ago",
        type: "day_especial",
        icon: Sun,
        color: "bg-orange-500",
        concept: "DAY Especial de alto volume",
        focus: "Rejuvenescimento a Laser",
        offer: "Laser Rejuvenescedor: R$ 590 por sessão",
        scripts: [
          {
            title: "Convite",
            text: "Oi {nome}! ☀️ LASER DAY chegando! Rejuvenescimento a laser com preço especial. R$ 590 por sessão! Inverno é a época perfeita. Agenda disponível?"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 8,
    monthName: "Agosto",
    campaigns: [
      {
        id: "unique-prep",
        name: "UNIQUE PREP",
        date: "01-31 Ago",
        type: "mensal",
        icon: TrendingUp,
        color: "bg-indigo-500",
        concept: "Organização e antecipação para o verão",
        focus: "Protocolos nutricionais e planejamento corporal",
        offer: "Planejamento Verão: Consulta + Protocolo personalizado",
        scripts: [
          {
            title: "Planejamento",
            text: "Olá {nome}! 📈 Agosto é hora de PLANEJAR o verão! Que tal começar agora para chegar linda em dezembro? Temos protocolos sob medida para você!"
          }
        ],
        materials: []
      },
      {
        id: "dia-pais",
        name: "Dia dos Pais",
        date: "09 Ago",
        type: "visibilidade",
        icon: Users,
        color: "bg-blue-600",
        concept: "Celebração do Dia dos Pais",
        focus: "Procedimentos masculinos",
        offer: "Harmonização Masculina: condições especiais",
        scripts: [
          {
            title: "Felicitação",
            text: "Feliz Dia dos Pais, {nome}! 💙 Homens também merecem se cuidar! Temos procedimentos especiais para eles. Que tal presentear seu pai?"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 9,
    monthName: "Setembro",
    campaigns: [
      {
        id: "unique-bloom",
        name: "UNIQUE BLOOM",
        date: "01-30 Set",
        type: "sazonal",
        icon: Flower2,
        color: "bg-green-500",
        concept: "Florescer com naturalidade (Primavera)",
        focus: "Harmonização facial e procedimentos refinados",
        offer: "Skincare Premium + Harmonização: 15% OFF",
        scripts: [
          {
            title: "Primavera",
            text: "Olá {nome}! 🌸 Primavera chegando! É tempo de florescer e renovar. Nossos tratamentos faciais estão com condições especiais. Vamos agendar?"
          }
        ],
        materials: []
      },
      {
        id: "harmonizacao-day",
        name: "HARMONIZAÇÃO DAY",
        date: "Set/Out",
        type: "day_especial",
        icon: Gem,
        color: "bg-violet-500",
        concept: "DAY Especial de alto volume",
        focus: "Harmonização Facial Completa",
        offer: "Harmonização Completa: R$ 4.990 (de R$ 6.500)",
        scripts: [
          {
            title: "Convite",
            text: "Oi {nome}! 💎 HARMONIZAÇÃO DAY! Pacote completo por R$ 4.990 (economia de R$ 1.510!). Data única! Vagas super limitadas. Reservo a sua?"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 10,
    monthName: "Outubro",
    campaigns: [
      {
        id: "unique-rosa",
        name: "UNIQUE ROSA",
        date: "01-31 Out",
        type: "comemorativo",
        icon: Ribbon,
        color: "bg-pink-500",
        concept: "Saúde da mulher e prevenção (Outubro Rosa)",
        focus: "Conteúdo educativo, avaliações e suporte nutricional",
        offer: "Check-up Saúde da Mulher: avaliação completa",
        scripts: [
          {
            title: "Outubro Rosa",
            text: "Olá {nome}! 🎀 Outubro Rosa: mês de conscientização! A Unique apoia essa causa. Cuide-se! Estamos aqui para você. 💕"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 11,
    monthName: "Novembro",
    campaigns: [
      {
        id: "unique-confidence",
        name: "UNIQUE CONFIDENCE",
        date: "01-30 Nov",
        type: "mensal",
        icon: Star,
        color: "bg-amber-600",
        concept: "Autoestima e confiança feminina pré-verão",
        focus: "Procedimentos corporais e faciais não cirúrgicos",
        offer: "Pacote Verão: Lipo HD + Abdominoplastia em condições especiais",
        scripts: [
          {
            title: "Pré-Verão",
            text: "Olá {nome}! ⭐ Novembro é o último mês para garantir o corpo dos sonhos para o verão! Temos condições exclusivas. Vamos conversar?"
          }
        ],
        materials: []
      },
      {
        id: "black-friday",
        name: "Black Friday",
        date: "27 Nov",
        type: "visibilidade",
        icon: ShoppingBag,
        color: "bg-gray-900",
        concept: "Principal data promocional do ano",
        focus: "Descontos e promoções agressivas",
        offer: "Descontos de até 40% em procedimentos selecionados",
        scripts: [
          {
            title: "Black Friday",
            text: "🖤 BLACK FRIDAY UNIQUE! {nome}, os maiores descontos do ano! Até 40% OFF em procedimentos. SÓ HOJE! Corre que vai acabar! 🏃‍♀️"
          },
          {
            title: "Urgência",
            text: "{nome}, últimas horas de BLACK FRIDAY! 🖤 Já garantiu seu procedimento com desconto? Não deixa passar! Me chama agora!"
          }
        ],
        materials: []
      },
      {
        id: "skincare-day",
        name: "SKINCARE DAY",
        date: "Nov/Dez",
        type: "day_especial",
        icon: Leaf,
        color: "bg-emerald-500",
        concept: "DAY Especial de alto volume",
        focus: "Protocolo de Skincare Premium",
        offer: "Protocolo Glow: 3 sessões por R$ 890",
        scripts: [
          {
            title: "Convite",
            text: "Oi {nome}! 🌿 SKINCARE DAY! Protocolo Glow com 3 sessões por R$ 890! Pele renovada para as festas de fim de ano. Reservo sua vaga?"
          }
        ],
        materials: []
      }
    ]
  },
  {
    month: 12,
    monthName: "Dezembro",
    campaigns: [
      {
        id: "unique-closure",
        name: "UNIQUE CLOSURE",
        date: "01-31 Dez",
        type: "comemorativo",
        icon: Gift,
        color: "bg-red-600",
        concept: "Gratidão, vínculo e encerramento de ciclos",
        focus: "Planejamento cirúrgico 2027 e soroterapia de energia",
        offer: "Planejamento 2027: Consulta + Plano personalizado",
        scripts: [
          {
            title: "Fim de Ano",
            text: "Olá {nome}! 🎄 Dezembro chegou! Que tal planejar 2027 com a Unique? Agende sua avaliação e comece o ano novo realizando seus sonhos!"
          }
        ],
        materials: []
      },
      {
        id: "natal",
        name: "Natal",
        date: "25 Dez",
        type: "visibilidade",
        icon: Gift,
        color: "bg-red-500",
        concept: "Celebração do Natal",
        focus: "Presentes e família",
        offer: null,
        scripts: [
          {
            title: "Natal",
            text: "Feliz Natal, {nome}! 🎄✨ Que esta data traga paz, amor e muita saúde para você e sua família! Com carinho, Unique. 🎁"
          }
        ],
        materials: []
      }
    ]
  }
];

const CAMPAIGN_TYPE_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  mensal: { label: "Campanha Mensal", color: "bg-blue-500/20", textColor: "text-blue-400" },
  comemorativo: { label: "Data Comemorativa", color: "bg-pink-500/20", textColor: "text-pink-400" },
  sazonal: { label: "Sazonal", color: "bg-green-500/20", textColor: "text-green-400" },
  day_especial: { label: "DAY Especial", color: "bg-purple-500/20", textColor: "text-purple-400" },
  visibilidade: { label: "Visibilidade", color: "bg-orange-500/20", textColor: "text-orange-400" },
};

const RFV_SEGMENTS = [
  { value: "champions", label: "Champions", count: 19 },
  { value: "loyal", label: "Leais", count: 35 },
  { value: "potential", label: "Potenciais", count: 21 },
  { value: "at_risk", label: "Em Risco", count: 14 },
  { value: "hibernating", label: "Hibernando", count: 23 },
  { value: "lost", label: "Perdidos", count: 60 },
];

interface RFVCustomer {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  segment: string;
  average_ticket: number;
  days_since_last_purchase: number;
}

const Campaigns = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [personalizedMessage, setPersonalizedMessage] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  
  // Bulk messaging state
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [bulkScript, setBulkScript] = useState<any>(null);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [bulkSending, setBulkSending] = useState(false);
  
  // Filtros adicionais
  const [minTicket, setMinTicket] = useState<string>("");
  const [maxTicket, setMaxTicket] = useState<string>("");
  const [minDays, setMinDays] = useState<string>("");
  const [maxDays, setMaxDays] = useState<string>("");

  // Get RFV segments count from DB
  const { data: rfvSegments } = useQuery({
    queryKey: ["rfv-segments-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfv_customers")
        .select("segment");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(customer => {
        counts[customer.segment] = (counts[customer.segment] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch customers by segment
  const { data: segmentCustomers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["rfv-customers-segment", selectedSegment],
    queryFn: async () => {
      if (!selectedSegment) return [];
      const { data, error } = await supabase
        .from("rfv_customers")
        .select("id, name, phone, whatsapp, segment, average_ticket, days_since_last_purchase")
        .eq("segment", selectedSegment)
        .order("average_ticket", { ascending: false });
      
      if (error) throw error;
      return data as RFVCustomer[];
    },
    enabled: !!selectedSegment,
  });

  const currentMonthData = CAMPAIGNS_2026.find(m => m.month === selectedMonth);

  const handleCopyScript = (text: string, index: number) => {
    const message = text.replace("{nome}", patientName || "[Nome]");
    navigator.clipboard.writeText(message);
    setCopiedIndex(index);
    toast.success("Script copiado!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePrepareMessage = (script: any) => {
    setSelectedScript(script);
    setPersonalizedMessage(script.text);
    setShowSendDialog(true);
  };

  const handleSendWhatsApp = () => {
    if (!patientPhone) {
      toast.error("Informe o telefone do paciente");
      return;
    }

    const message = personalizedMessage.replace("{nome}", patientName || "");
    const phone = patientPhone.replace(/\D/g, "");
    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Abrindo WhatsApp...");
    setShowSendDialog(false);
  };

  // Bulk messaging functions
  const handleOpenBulkDialog = (script: any) => {
    setBulkScript(script);
    setSelectedCustomers(new Set());
    setCurrentBulkIndex(0);
    setBulkSending(false);
    setShowBulkDialog(true);
  };

  const handleToggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  // Filtrar clientes por ticket e dias
  const filteredCustomers = useMemo(() => {
    return segmentCustomers.filter(customer => {
      const minTicketValue = minTicket ? parseFloat(minTicket) : 0;
      const maxTicketValue = maxTicket ? parseFloat(maxTicket) : Infinity;
      const minDaysValue = minDays ? parseInt(minDays) : 0;
      const maxDaysValue = maxDays ? parseInt(maxDays) : Infinity;
      
      return (
        customer.average_ticket >= minTicketValue &&
        customer.average_ticket <= maxTicketValue &&
        customer.days_since_last_purchase >= minDaysValue &&
        customer.days_since_last_purchase <= maxDaysValue
      );
    });
  }, [segmentCustomers, minTicket, maxTicket, minDays, maxDays]);

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const getCustomerPhone = (customer: RFVCustomer): string | null => {
    return customer.whatsapp || customer.phone;
  };

  const selectedCustomersList = useMemo(() => {
    return segmentCustomers.filter(c => selectedCustomers.has(c.id));
  }, [segmentCustomers, selectedCustomers]);

  const customersWithPhone = useMemo(() => {
    return selectedCustomersList.filter(c => getCustomerPhone(c));
  }, [selectedCustomersList]);

  const handleSendBulkNext = () => {
    if (currentBulkIndex >= customersWithPhone.length) {
      toast.success(`Disparo concluído! ${customersWithPhone.length} mensagens enviadas.`);
      setShowBulkDialog(false);
      return;
    }

    const customer = customersWithPhone[currentBulkIndex];
    const phone = getCustomerPhone(customer);
    if (!phone) {
      setCurrentBulkIndex(prev => prev + 1);
      return;
    }

    const message = bulkScript.text.replace("{nome}", customer.name.split(" ")[0]);
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
    setCurrentBulkIndex(prev => prev + 1);
  };

  const handleCopyAllMessages = () => {
    const messages = customersWithPhone.map(customer => {
      const phone = getCustomerPhone(customer);
      const cleanPhone = phone?.replace(/\D/g, "") || "";
      const firstName = customer.name.split(" ")[0];
      const message = bulkScript.text.replace("{nome}", firstName);
      return `📱 ${customer.name} (${phone})\n${message}`;
    }).join("\n\n---\n\n");
    
    navigator.clipboard.writeText(messages);
    toast.success(`${customersWithPhone.length} mensagens copiadas!`);
  };

  const handleExportCSV = () => {
    const headers = ["Nome", "Telefone", "Segmento", "Ticket Médio", "Dias sem Compra", "Mensagem"];
    const rows = selectedCustomersList.map(customer => {
      const phone = getCustomerPhone(customer) || "";
      const firstName = customer.name.split(" ")[0];
      const message = bulkScript.text.replace("{nome}", firstName);
      return [
        customer.name,
        phone,
        customer.segment,
        customer.average_ticket.toString(),
        customer.days_since_last_purchase.toString(),
        `"${message.replace(/"/g, '""')}"`
      ];
    });
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disparo_${selectedSegment}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Lista exportada com sucesso!");
  };

  if (showAdminPanel && role === "admin") {
    return (
      <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Gerenciar Campanhas</h1>
            <Button variant="outline" onClick={() => setShowAdminPanel(false)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar ao Calendário
            </Button>
          </div>
          <CampaignsManager />
        </main>
    );
  }

  return (
    <>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              Campanhas 2026
            </h1>
            <p className="text-muted-foreground mt-1">
              Calendário e estratégias de vendas
            </p>
          </div>
          
          {role === "admin" && (
            <Button onClick={() => setShowAdminPanel(true)} variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Gerenciar
            </Button>
          )}
        </div>

        {/* Calendar Content */}
        <Tabs defaultValue="annual" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="annual">📅 Visão Anual</TabsTrigger>
            <TabsTrigger value="monthly">📆 Visão Mensal</TabsTrigger>
          </TabsList>

              {/* Visão Anual */}
              <TabsContent value="annual" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {CAMPAIGNS_2026.map((month) => {
                    const isSelected = month.month === selectedMonth;
                    const isCurrent = month.month === new Date().getMonth() + 1;
                    
                    return (
                      <Card
                        key={month.month}
                        onClick={() => setSelectedMonth(month.month)}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          isSelected 
                            ? "ring-2 ring-primary bg-primary/10" 
                            : isCurrent 
                              ? "border-primary/50 bg-primary/5" 
                              : "hover:border-primary/30"
                        }`}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center justify-between">
                            <span className={isSelected ? "text-primary" : ""}>{month.monthName}</span>
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
                    );
                  })}
                </div>
              </TabsContent>

              {/* Visão Mensal - Compacta */}
              <TabsContent value="monthly" className="mt-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                  {CAMPAIGNS_2026.map((month) => {
                    const isSelected = month.month === selectedMonth;
                    const isCurrent = month.month === new Date().getMonth() + 1;
                    const mainCampaign = month.campaigns.find(c => c.type === "mensal" || c.type === "comemorativo");
                    
                    return (
                      <Card
                        key={month.month}
                        onClick={() => setSelectedMonth(month.month)}
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          isSelected 
                            ? "ring-2 ring-primary bg-primary/10" 
                            : isCurrent 
                              ? "border-primary/50" 
                              : "hover:border-primary/30"
                        }`}
                      >
                        <CardContent className="p-3 text-center">
                          <p className={`text-xs font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                            {month.monthName.slice(0, 3)}
                          </p>
                          <p className={`text-lg font-bold ${isSelected ? "text-primary" : ""}`}>
                            {month.month.toString().padStart(2, "0")}
                          </p>
                          {mainCampaign && (
                            <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${mainCampaign.color}`} />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

        {/* Campanhas do Mês Selecionado */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedMonth(prev => prev > 1 ? prev - 1 : 12)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-bold">{currentMonthData?.monthName}</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedMonth(prev => prev < 12 ? prev + 1 : 1)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Badge variant="outline" className="text-sm">
              {currentMonthData?.campaigns.length || 0} campanhas
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentMonthData?.campaigns.map((campaign) => {
              const Icon = campaign.icon;
              const typeConfig = CAMPAIGN_TYPE_CONFIG[campaign.type];
              
              return (
                <Card 
                  key={campaign.id}
                  className={`cursor-pointer transition-all hover:shadow-lg border-l-4 ${
                    selectedCampaign?.id === campaign.id ? "ring-2 ring-primary" : ""
                  }`}
                  style={{ borderLeftColor: campaign.color.replace("bg-", "").replace("-500", "") }}
                  onClick={() => setSelectedCampaign(selectedCampaign?.id === campaign.id ? null : campaign)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${campaign.color} text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{campaign.name}</CardTitle>
                          <Badge variant="outline" className="text-xs mt-1">
                            {campaign.date}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={`${typeConfig?.color} ${typeConfig?.textColor} text-xs`}>
                        {typeConfig?.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{campaign.concept}</p>
                    
                    {campaign.offer && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <p className="text-xs text-green-400 font-medium mb-1">🎁 Oferta</p>
                        <p className="text-sm font-medium text-green-300">{campaign.offer}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="w-3 h-3" />
                      <span>{campaign.scripts.length} scripts</span>
                      {campaign.materials.length > 0 && (
                        <>
                          <span>•</span>
                          <Image className="w-3 h-3" />
                          <span>{campaign.materials.length} materiais</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Detalhes da Campanha Selecionada */}
        {selectedCampaign && (
          <Card className="border-primary/30">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${selectedCampaign.color} text-white`}>
                    <selectedCampaign.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{selectedCampaign.name}</CardTitle>
                    <CardDescription>{selectedCampaign.focus}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCampaign(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Conceito e Estratégia */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">💡 Conceito</p>
                  <p className="text-sm">{selectedCampaign.concept}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">🎯 Foco</p>
                  <p className="text-sm">{selectedCampaign.focus}</p>
                </div>
              </div>

              {/* Oferta destacada */}
              {selectedCampaign.offer && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                  <p className="text-xs text-green-400 font-medium mb-2 flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Oferta da Campanha
                  </p>
                  <p className="text-lg font-semibold text-green-300">{selectedCampaign.offer}</p>
                </div>
              )}

              {/* Área de Personalização */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Personalizar Mensagem
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Paciente</Label>
                    <Input
                      placeholder="Ex: Maria"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone (WhatsApp)</Label>
                    <Input
                      placeholder="(34) 99999-9999"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Scripts */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Scripts Prontos
                </h4>
                <div className="space-y-3">
                  {selectedCampaign.scripts.map((script: any, index: number) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {script.title}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyScript(script.text, index)}
                          >
                            {copiedIndex === index ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-2"
                            onClick={() => handlePrepareMessage(script)}
                          >
                            <Send className="w-4 h-4" />
                            Enviar
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {script.text.replace("{nome}", patientName || "{nome}")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materiais */}
              {selectedCampaign.materials.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Materiais de Apoio
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedCampaign.materials.map((material: any, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start gap-2 h-auto py-3"
                        onClick={() => material.url !== "#" && window.open(material.url, "_blank")}
                      >
                        {material.type === "image" ? (
                          <Image className="w-4 h-4 text-blue-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-orange-400" />
                        )}
                        <span className="text-sm truncate">{material.title}</span>
                        <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* RFV Integration - Disparo em Massa */}
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2 text-purple-400">
                    <Users className="w-4 h-4" />
                    Disparo em Massa - Base RFV
                  </h4>
                  {selectedCampaign.scripts.length > 0 && (
                    <Select
                      value={bulkScript?.title || ""}
                      onValueChange={(value) => {
                        const script = selectedCampaign.scripts.find((s: any) => s.title === value);
                        if (script) setBulkScript(script);
                      }}
                    >
                      <SelectTrigger className="w-48 h-8 text-xs">
                        <SelectValue placeholder="Selecione o script" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCampaign.scripts.map((script: any) => (
                          <SelectItem key={script.title} value={script.title}>
                            {script.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Selecione um segmento para disparar mensagens personalizadas para múltiplos pacientes
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {RFV_SEGMENTS.map(segment => (
                    <Button
                      key={segment.value}
                      variant={selectedSegment === segment.value ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedSegment(segment.value);
                        setSelectedCustomers(new Set());
                        if (bulkScript) setShowBulkDialog(true);
                        else toast.info("Selecione um script primeiro");
                      }}
                    >
                      {segment.label}
                      <Badge variant="secondary" className="text-xs">
                        {rfvSegments?.[segment.value] || segment.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
                {/* Botão para ir à Matriz RFV */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button 
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => navigate("/alavancas")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ir para Clientes RFV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </Tabs>
      </main>

      {/* Dialog de Envio */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Enviar Mensagem via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Revise a mensagem antes de enviar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Paciente</Label>
                <Input
                  placeholder="Nome"
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    setPersonalizedMessage(selectedScript?.text?.replace("{nome}", e.target.value) || "");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  placeholder="(34) 99999-9999"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                rows={5}
                value={personalizedMessage.replace("{nome}", patientName || "")}
                onChange={(e) => setPersonalizedMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700">
              <Phone className="w-4 h-4" />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Disparo em Massa */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Disparo em Massa - {RFV_SEGMENTS.find(s => s.value === selectedSegment)?.label || selectedSegment}
            </DialogTitle>
            <DialogDescription>
              Selecione os pacientes para enviar mensagens personalizadas via WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 flex-1 overflow-hidden">
            {/* Script selecionado */}
            {bulkScript && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{bulkScript.title}</Badge>
                  <Select
                    value={bulkScript.title}
                    onValueChange={(value) => {
                      const script = selectedCampaign?.scripts?.find((s: any) => s.title === value);
                      if (script) setBulkScript(script);
                    }}
                  >
                    <SelectTrigger className="w-40 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCampaign?.scripts?.map((script: any) => (
                        <SelectItem key={script.title} value={script.title}>
                          {script.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {bulkScript.text}
                </p>
              </div>
            )}

            {/* Filtros Avançados */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Filtros Avançados
                </h5>
                {(minTicket || maxTicket || minDays || maxDays) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setMinTicket("");
                      setMaxTicket("");
                      setMinDays("");
                      setMaxDays("");
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ticket Mínimo (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minTicket}
                    onChange={(e) => setMinTicket(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ticket Máximo (R$)</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={maxTicket}
                    onChange={(e) => setMaxTicket(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dias Mín. sem Compra</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minDays}
                    onChange={(e) => setMinDays(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dias Máx. sem Compra</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={maxDays}
                    onChange={(e) => setMaxDays(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                <span>
                  {filteredCustomers.length} de {segmentCustomers.length} pacientes no filtro
                </span>
                {filteredCustomers.length < segmentCustomers.length && (
                  <Badge variant="outline" className="text-xs">
                    {segmentCustomers.length - filteredCustomers.length} ocultos
                  </Badge>
                )}
              </div>
            </div>

            {/* Controles de seleção */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleSelectAll}
                >
                  <CheckCheck className="w-4 h-4" />
                  {selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 ? "Desmarcar Todos" : "Selecionar Todos"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedCustomers.size} selecionados
                  {customersWithPhone.length < selectedCustomers.size && (
                    <span className="text-yellow-500 ml-2">
                      ({customersWithPhone.length} com telefone)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Lista de Pacientes */}
            <ScrollArea className="h-[250px] pr-4">
              {loadingCustomers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{segmentCustomers.length === 0 ? "Nenhum paciente neste segmento" : "Nenhum paciente com os filtros atuais"}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => {
                    const phone = getCustomerPhone(customer);
                    const isSelected = selectedCustomers.has(customer.id);
                    
                    return (
                      <div
                        key={customer.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-purple-500/10 border-purple-500/30" 
                            : "bg-secondary/30 border-border hover:bg-secondary/50"
                        }`}
                        onClick={() => handleToggleCustomer(customer.id)}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{customer.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {phone ? (
                              <span className="flex items-center gap-1 text-green-500">
                                <Phone className="w-3 h-3" />
                                {phone}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-500">
                                <Phone className="w-3 h-3" />
                                Sem telefone
                              </span>
                            )}
                            <span className="font-medium text-primary">R$ {customer.average_ticket.toFixed(2)}</span>
                            <span>{customer.days_since_last_purchase}d sem compra</span>
                          </div>
                        </div>
                        {isSelected && phone && (
                          <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Pronto
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Preview da mensagem */}
            {customersWithPhone.length > 0 && bulkSending && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-400">
                    Enviando {currentBulkIndex + 1} de {customersWithPhone.length}
                  </span>
                  <Badge variant="outline" className="text-green-500">
                    {customersWithPhone[currentBulkIndex]?.name}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bulkScript?.text?.replace("{nome}", customersWithPhone[currentBulkIndex]?.name?.split(" ")[0] || "")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExportCSV}
              disabled={selectedCustomers.size === 0}
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCopyAllMessages}
              disabled={customersWithPhone.length === 0 || !bulkScript}
            >
              <Copy className="w-4 h-4" />
              Copiar Todas
            </Button>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (!bulkSending) {
                  setBulkSending(true);
                  setCurrentBulkIndex(0);
                }
                handleSendBulkNext();
              }}
              disabled={customersWithPhone.length === 0 || !bulkScript}
            >
              <Send className="w-4 h-4" />
              {bulkSending 
                ? currentBulkIndex >= customersWithPhone.length 
                  ? "Concluído!" 
                  : `Próximo (${currentBulkIndex + 1}/${customersWithPhone.length})`
                : `Iniciar Disparo (${customersWithPhone.length})`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Campaigns;
