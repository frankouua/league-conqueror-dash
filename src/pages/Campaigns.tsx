import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Calendar, Target, Trophy, Clock, CheckCircle2, 
  Gift, TrendingUp, Megaphone, Star, Zap, Plus,
  ChevronRight, Award, Flame, Lightbulb, Send, X,
  ChevronLeft, Eye, Heart, Sun, Snowflake, Flower2,
  Users, ShoppingBag, PartyPopper, MessageSquare,
  Syringe, Leaf, Smile, Baby, Ribbon, Gem, RefreshCw,
  Activity, Candy, Settings, List
} from "lucide-react";
import { format, differenceInDays, isPast, isFuture, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CampaignsManager from "@/components/admin/CampaignsManager";

// ==================== MASTER CALENDAR DATA ====================
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
        icon: Zap,
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
        actions: ["Pacotes de casal", "Descontos progressivos", "Consultas conjuntas"],
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
        actions: ["Pacotes românticos", "Vouchers de presente", "Conteúdo de casal"],
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
        actions: ["Pacotes masculinos", "Vouchers para pais", "Harmonização masc."],
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
        actions: ["Outubro Rosa", "Conteúdo educativo", "Avaliações especiais"],
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
        actions: ["Descontos especiais", "Pacotes exclusivos", "Urgência e escassez"],
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
        actions: ["Encerramento do ano", "Planejamento 2027", "Gratidão aos pacientes"],
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
        actions: ["Mensagem de Natal", "Vouchers presente", "Agradecimento pacientes"],
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

const CAMPAIGN_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Trophy }> = {
  mensal: { label: "Campanha Mensal", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Calendar },
  comemorativo: { label: "Data Comemorativa", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", icon: Heart },
  sazonal: { label: "Sazonal", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Sun },
  day_especial: { label: "DAY Especial", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Zap },
  visibilidade: { label: "Visibilidade", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: Eye },
  relampago: { label: "Relâmpago", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Zap },
  trimestral: { label: "Trimestral", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Target },
  semestral: { label: "Semestral", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Trophy },
  especial: { label: "Especial", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", icon: Star },
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

// ==================== DB TYPES ====================
interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  goal_value: number | null;
  goal_metric: string | null;
  goal_description: string | null;
  prize_value: number | null;
  prize_description: string | null;
  is_active: boolean;
}

interface CampaignAction {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  order_index: number;
}

interface ChecklistProgress {
  action_id: string;
  completed: boolean;
}

interface CampaignSuggestion {
  id: string;
  title: string;
  description: string | null;
  suggested_prize: string | null;
  suggested_goal: string | null;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  approved: { label: "Aprovada", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected: { label: "Rejeitada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  implemented: { label: "Implementada", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const Campaigns = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState("campanhas");
  const [activeTab, setActiveTab] = useState("ativas");
  const [calendarTab, setCalendarTab] = useState("visao-geral");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    title: "",
    description: "",
    suggested_prize: "",
    suggested_goal: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch campaigns from DB
  const { data: dbCampaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("is_template", false)
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Fetch campaign actions
  const { data: allActions = [] } = useQuery({
    queryKey: ["campaign-actions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_actions")
        .select("*")
        .order("order_index");
      
      if (error) throw error;
      return data as CampaignAction[];
    },
  });

  // Fetch user's checklist progress
  const { data: checklistProgress = [], refetch: refetchProgress } = useQuery({
    queryKey: ["checklist-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("campaign_checklist_progress")
        .select("action_id, completed")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data as ChecklistProgress[];
    },
    enabled: !!user?.id,
  });

  // Fetch user's suggestions
  const { data: mySuggestions = [] } = useQuery({
    queryKey: ["my-campaign-suggestions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("campaign_suggestions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CampaignSuggestion[];
    },
    enabled: !!user?.id,
  });

  const handleSubmitSuggestion = async () => {
    if (!user?.id || !suggestionForm.title.trim()) {
      toast.error("Preencha o título da sugestão");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("campaign_suggestions")
        .insert({
          user_id: user.id,
          title: suggestionForm.title,
          description: suggestionForm.description || null,
          suggested_prize: suggestionForm.suggested_prize || null,
          suggested_goal: suggestionForm.suggested_goal || null,
        });

      if (error) throw error;

      toast.success("Sugestão enviada com sucesso! 🎉");
      setSuggestionDialogOpen(false);
      setSuggestionForm({ title: "", description: "", suggested_prize: "", suggested_goal: "" });
      queryClient.invalidateQueries({ queryKey: ["my-campaign-suggestions"] });
    } catch (error) {
      toast.error("Erro ao enviar sugestão");
    } finally {
      setSubmitting(false);
    }
  };

  const now = new Date();
  
  // DB Campaigns filtering
  const activeCampaigns = dbCampaigns.filter(c => {
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    return c.is_active && start <= now && end >= now;
  });

  const upcomingCampaigns = dbCampaigns.filter(c => {
    const start = new Date(c.start_date);
    return c.is_active && start > now;
  });

  const pastCampaigns = dbCampaigns.filter(c => {
    const end = new Date(c.end_date);
    return end < now;
  });

  const completedCampaigns = pastCampaigns.filter(c => {
    const actions = allActions.filter(a => a.campaign_id === c.id);
    if (actions.length === 0) return false;
    const completed = actions.filter(a => 
      checklistProgress.some(p => p.action_id === a.id && p.completed)
    ).length;
    return completed === actions.length;
  });

  // Master Calendar filtering
  const currentMonthData = CAMPAIGNS_2026.find(m => m.month === selectedMonth);
  
  const filteredCalendarCampaigns = selectedType 
    ? CAMPAIGNS_2026.map(m => ({
        ...m,
        campaigns: m.campaigns.filter(c => c.type === selectedType)
      })).filter(m => m.campaigns.length > 0)
    : CAMPAIGNS_2026;

  const allCalendarCampaigns = CAMPAIGNS_2026.flatMap(m => 
    m.campaigns.map(c => ({ ...c, month: m.month, monthName: m.monthName }))
  );

  const upcomingCalendarCampaigns = allCalendarCampaigns
    .filter(c => c.month >= new Date().getMonth() + 1)
    .slice(0, 10);

  const toggleAction = async (actionId: string, campaignId: string, currentlyCompleted: boolean) => {
    if (!user?.id) return;

    try {
      if (currentlyCompleted) {
        await supabase
          .from("campaign_checklist_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("action_id", actionId);
      } else {
        await supabase
          .from("campaign_checklist_progress")
          .upsert({
            user_id: user.id,
            campaign_id: campaignId,
            action_id: actionId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
      }
      
      refetchProgress();
      toast.success(currentlyCompleted ? "Ação desmarcada" : "Ação concluída! 🎉");
    } catch (error) {
      toast.error("Erro ao atualizar progresso");
    }
  };

  const getCampaignProgress = (campaignId: string) => {
    const actions = allActions.filter(a => a.campaign_id === campaignId);
    if (actions.length === 0) return 0;
    
    const completed = actions.filter(a => 
      checklistProgress.some(p => p.action_id === a.id && p.completed)
    ).length;
    
    return Math.round((completed / actions.length) * 100);
  };

  const CampaignCard = ({ campaign, showActions = true }: { campaign: Campaign; showActions?: boolean }) => {
    const config = CAMPAIGN_TYPE_CONFIG[campaign.campaign_type] || CAMPAIGN_TYPE_CONFIG.mensal;
    const Icon = config?.icon || Calendar;
    const actions = allActions.filter(a => a.campaign_id === campaign.id);
    const progress = getCampaignProgress(campaign.id);
    const daysLeft = differenceInDays(new Date(campaign.end_date), now);
    const isActive = new Date(campaign.start_date) <= now && new Date(campaign.end_date) >= now;
    const isUpcoming = new Date(campaign.start_date) > now;

    return (
      <Card className="bg-card/50 border-border hover:border-primary/30 transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${config?.color?.split(' ')[0] || 'bg-primary/20'}`}>
                <Icon className={`w-5 h-5 ${config?.color?.split(' ')[1] || 'text-primary'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                {campaign.description && (
                  <CardDescription className="mt-1">{campaign.description}</CardDescription>
                )}
              </div>
            </div>
            <Badge className={config?.color || ''}>{config?.label || campaign.campaign_type}</Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(campaign.start_date), "dd/MM", { locale: ptBR })} - {format(new Date(campaign.end_date), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            {isActive && daysLeft >= 0 && (
              <Badge variant="outline" className={daysLeft <= 3 ? "border-red-500/50 text-red-400" : "border-green-500/50 text-green-400"}>
                <Clock className="w-3 h-3 mr-1" />
                {daysLeft === 0 ? "Último dia!" : `${daysLeft} dias restantes`}
              </Badge>
            )}
            {isUpcoming && (
              <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                Começa em {differenceInDays(new Date(campaign.start_date), now)} dias
              </Badge>
            )}
          </div>

          {campaign.goal_description && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Target className="w-4 h-4" />
                <span className="font-medium text-sm">Meta da Campanha</span>
              </div>
              <p className="text-sm text-foreground">{campaign.goal_description}</p>
              {campaign.goal_value && (
                <p className="text-lg font-bold text-primary mt-1">
                  {campaign.goal_metric === "revenue" ? `R$ ${campaign.goal_value.toLocaleString("pt-BR")}` : campaign.goal_value}
                </p>
              )}
            </div>
          )}

          {campaign.prize_description && (
            <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-yellow-400 mb-1">
                <Gift className="w-4 h-4" />
                <span className="font-medium text-sm">Premiação</span>
              </div>
              <p className="text-sm text-foreground">{campaign.prize_description}</p>
              {campaign.prize_value && (
                <p className="text-lg font-bold text-yellow-400 mt-1">
                  R$ {campaign.prize_value.toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          )}

          {showActions && actions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Seu progresso</span>
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              <div className="space-y-2 mt-3">
                {actions.map((action) => {
                  const isCompleted = checklistProgress.some(p => p.action_id === action.id && p.completed);
                  return (
                    <div 
                      key={action.id}
                      className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                        isCompleted ? "bg-green-500/10" : "bg-muted/30 hover:bg-muted/50"
                      }`}
                      onClick={() => toggleAction(action.id, campaign.id, isCompleted)}
                    >
                      <Checkbox 
                        checked={isCompleted}
                        className={isCompleted ? "border-green-500 bg-green-500" : ""}
                      />
                      <div className="flex-1">
                        <p className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {action.title}
                        </p>
                        {action.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                        )}
                      </div>
                      {action.is_required && (
                        <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/20">
                <Megaphone className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Campanhas</h1>
            </div>
            <p className="text-muted-foreground">
              Participe das campanhas ativas, acompanhe seu progresso e conquiste premiações!
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            {role === "admin" && (
              <Button onClick={() => setMainTab("gerenciar")} variant={mainTab === "gerenciar" ? "default" : "outline"} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Campanha
              </Button>
            )}

            <Dialog open={suggestionDialogOpen} onOpenChange={setSuggestionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Sugerir Campanha
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    Sugerir uma Campanha
                  </DialogTitle>
                  <DialogDescription>
                    Tem uma ideia de campanha? Compartilhe com a coordenação!
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título da Campanha *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Campanha de Indicações de Verão"
                      value={suggestionForm.title}
                      onChange={(e) => setSuggestionForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição da Ideia</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva sua ideia de campanha..."
                      value={suggestionForm.description}
                      onChange={(e) => setSuggestionForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal">Meta Sugerida</Label>
                    <Input
                      id="goal"
                      placeholder="Ex: 50 indicações no mês"
                      value={suggestionForm.suggested_goal}
                      onChange={(e) => setSuggestionForm(prev => ({ ...prev, suggested_goal: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prize">Premiação Sugerida</Label>
                    <Input
                      id="prize"
                      placeholder="Ex: Folga extra ou voucher"
                      value={suggestionForm.suggested_prize}
                      onChange={(e) => setSuggestionForm(prev => ({ ...prev, suggested_prize: e.target.value }))}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSuggestionDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmitSuggestion} disabled={submitting} className="gap-2">
                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar Sugestão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-green-500/10 border-green-500/30 cursor-pointer hover:bg-green-500/20 transition-colors" onClick={() => { setMainTab("campanhas"); setActiveTab("ativas"); }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/20">
                  <Flame className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{activeCampaigns.length}</p>
                  <p className="text-sm text-muted-foreground">Campanhas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors" onClick={() => { setMainTab("campanhas"); setActiveTab("proximas"); }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{upcomingCampaigns.length}</p>
                  <p className="text-sm text-muted-foreground">Em Breve</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/30 cursor-pointer hover:bg-purple-500/20 transition-colors" onClick={() => { setMainTab("campanhas"); setActiveTab("encerradas"); }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/20">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{pastCampaigns.length}</p>
                  <p className="text-sm text-muted-foreground">Encerradas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/10 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20 transition-colors" onClick={() => { setMainTab("campanhas"); setActiveTab("completadas"); }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/20">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{completedCampaigns.length}</p>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mx-auto">
            <TabsTrigger value="campanhas" className="gap-2">
              <Flame className="w-4 h-4" />
              Minhas Campanhas
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2">
              <Calendar className="w-4 h-4" />
              Calendário 2026
            </TabsTrigger>
            {role === "admin" && (
              <TabsTrigger value="gerenciar" className="gap-2">
                <Settings className="w-4 h-4" />
                Gerenciar
              </TabsTrigger>
            )}
          </TabsList>

          {/* ==================== MINHAS CAMPANHAS TAB ==================== */}
          <TabsContent value="campanhas" className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-lg grid-cols-4">
                <TabsTrigger value="ativas" className="gap-1 text-xs sm:text-sm">
                  <Flame className="w-3 h-3" />
                  Ativas ({activeCampaigns.length})
                </TabsTrigger>
                <TabsTrigger value="proximas" className="gap-1 text-xs sm:text-sm">
                  <Clock className="w-3 h-3" />
                  Em Breve ({upcomingCampaigns.length})
                </TabsTrigger>
                <TabsTrigger value="encerradas" className="gap-1 text-xs sm:text-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  Encerradas ({pastCampaigns.length})
                </TabsTrigger>
                <TabsTrigger value="sugestoes" className="gap-1 text-xs sm:text-sm">
                  <Lightbulb className="w-3 h-3" />
                  Sugestões
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ativas" className="mt-4">
                {activeCampaigns.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma campanha ativa</h3>
                      <p className="text-muted-foreground text-center">
                        Fique de olho! Novas campanhas serão lançadas em breve.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeCampaigns.map((campaign) => (
                      <CampaignCard key={campaign.id} campaign={campaign} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="proximas" className="mt-4">
                {upcomingCampaigns.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma campanha programada</h3>
                      <p className="text-muted-foreground text-center">
                        Novas campanhas aparecerão aqui quando forem anunciadas.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {upcomingCampaigns.map((campaign) => (
                      <CampaignCard key={campaign.id} campaign={campaign} showActions={false} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="encerradas" className="mt-4">
                {pastCampaigns.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma campanha encerrada</h3>
                      <p className="text-muted-foreground text-center">
                        Campanhas finalizadas aparecerão aqui.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {pastCampaigns.map((campaign) => (
                      <CampaignCard key={campaign.id} campaign={campaign} showActions={false} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sugestoes" className="mt-4">
                {mySuggestions.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma sugestão enviada</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Tem uma ideia de campanha? Clique no botão acima para sugerir!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {mySuggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="border-border/50">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{suggestion.title}</CardTitle>
                            <Badge className={STATUS_CONFIG[suggestion.status]?.color || ''}>
                              {STATUS_CONFIG[suggestion.status]?.label || suggestion.status}
                            </Badge>
                          </div>
                          <CardDescription>
                            Enviada em {format(new Date(suggestion.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </CardDescription>
                        </CardHeader>
                        {suggestion.description && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ==================== MASTER CALENDAR TAB ==================== */}
          <TabsContent value="calendario" className="space-y-6">
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
              {Object.entries(CAMPAIGN_TYPE_CONFIG).slice(0, 5).map(([key, value]) => (
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

            <Tabs value={calendarTab} onValueChange={setCalendarTab} className="w-full">
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
                  {filteredCalendarCampaigns.map((month) => (
                    <Card 
                      key={month.month} 
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        month.month === selectedMonth ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => {
                        setSelectedMonth(month.month);
                        setCalendarTab("por-mes");
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
                          const typeInfo = CAMPAIGN_TYPE_CONFIG[campaign.type];
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
              <TabsContent value="days" className="mt-4 space-y-4">
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
              </TabsContent>

              {/* Próximas Campanhas */}
              <TabsContent value="proximas" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      Próximas Campanhas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingCalendarCampaigns.map((campaign, idx) => {
                        const Icon = campaign.icon;
                        const typeInfo = CAMPAIGN_TYPE_CONFIG[campaign.type];
                        return (
                          <div 
                            key={idx}
                            className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className={`p-2 rounded-full ${campaign.color} text-white`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-xs text-muted-foreground">{campaign.monthName} • {campaign.date}</p>
                            </div>
                            <Badge className={typeInfo?.color}>{typeInfo?.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ==================== GERENCIAR TAB (ADMIN) ==================== */}
          {role === "admin" && (
            <TabsContent value="gerenciar" className="space-y-6">
              <CampaignsManager />
            </TabsContent>
          )}
        </Tabs>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026 Unique CPI • Copa Unique League
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Campaigns;
