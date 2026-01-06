import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Upload, FileSpreadsheet, AlertCircle, Loader2, Users, TrendingUp, 
  Target, Phone, Gift, Heart, RefreshCw, Crown, Zap, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Clock, DollarSign, Calendar, Star,
  MessageSquare, Mail, Sparkles, CheckCircle2, Database, Save, History,
  Send, Copy, Check, UserPlus, Megaphone, HandHeart, Award, Square, CheckSquare, Shield,
  Trash2, Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import RFVActionHistory from "@/components/rfv/RFVActionHistory";
import * as XLSX from "xlsx";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

const CHART_COLORS = [
  'hsl(142, 76%, 36%)', // Champions - verde
  'hsl(221, 83%, 53%)', // Loyal - azul
  'hsl(45, 93%, 47%)',  // Potential - amarelo
  'hsl(25, 95%, 53%)',  // At Risk - laranja
  'hsl(280, 60%, 55%)', // Hibernating - roxo
  'hsl(0, 84%, 60%)',   // Lost - vermelho
];

// RFV Segment definitions
const RFV_SEGMENTS = {
  champions: {
    name: 'Campeões',
    icon: Crown,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    description: 'Compraram recentemente, frequência alta, alto valor',
    criteria: 'R: 4-5 | F: 4-5 | V: 4-5',
    priority: 1,
    actions: [
      { title: 'Programa VIP Exclusivo', description: 'Oferecer benefícios exclusivos e acesso antecipado', type: 'retention' },
      { title: 'Solicitar Indicações', description: 'Pedir indicações de amigos e familiares', type: 'referral' },
      { title: 'Depoimento Premium', description: 'Solicitar vídeo-depoimento para redes sociais', type: 'testimonial' },
      { title: 'Embaixador da Marca', description: 'Convidar para programa de embaixadores', type: 'ambassador' },
    ]
  },
  loyal: {
    name: 'Fiéis',
    icon: Heart,
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    description: 'Compram com frequência, bom valor',
    criteria: 'R: 3-4 | F: 3-5 | V: 3-5',
    priority: 2,
    actions: [
      { title: 'Upsell de Procedimentos', description: 'Apresentar procedimentos complementares', type: 'upsell' },
      { title: 'Programa UniLovers', description: 'Engajar com missões e recompensas', type: 'loyalty' },
      { title: 'Cross-sell Personalizado', description: 'Oferecer tratamentos relacionados', type: 'crosssell' },
      { title: 'Avaliação de Satisfação', description: 'Coletar NPS e feedback detalhado', type: 'nps' },
    ]
  },
  potential: {
    name: 'Potenciais',
    icon: Zap,
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgLight: 'bg-amber-50',
    description: 'Compraram recentemente com bom potencial',
    criteria: 'R: 4-5 | F: 1-3 | V: 1-3',
    priority: 3,
    actions: [
      { title: 'Nutrição de Relacionamento', description: 'Sequência de conteúdo educativo', type: 'nurture' },
      { title: 'Segunda Compra Incentivada', description: 'Oferta especial para retorno', type: 'incentive' },
      { title: 'Agendamento Proativo', description: 'Ligar para agendar retorno', type: 'schedule' },
      { title: 'Convite UniLovers', description: 'Apresentar programa de fidelidade', type: 'loyalty' },
    ]
  },
  at_risk: {
    name: 'Em Risco',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    description: 'Eram bons clientes mas não compram há tempo',
    criteria: 'R: 1-2 | F: 3-5 | V: 3-5',
    priority: 4,
    actions: [
      { title: 'Ligação de Reativação', description: 'Contato pessoal para entender ausência', type: 'call' },
      { title: 'Oferta de Retorno', description: 'Condição especial para voltar', type: 'winback' },
      { title: 'Pesquisa de Satisfação', description: 'Entender motivo do afastamento', type: 'survey' },
      { title: 'Mensagem Personalizada', description: 'WhatsApp com saudade e novidades', type: 'message' },
    ]
  },
  hibernating: {
    name: 'Hibernando',
    icon: Clock,
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    description: 'Não compram há muito tempo, valor baixo-médio',
    criteria: 'R: 1-2 | F: 1-2 | V: 2-4',
    priority: 5,
    actions: [
      { title: 'Campanha de Reengajamento', description: 'Série de e-mails com novidades', type: 'campaign' },
      { title: 'Promoção Exclusiva', description: 'Desconto especial para retorno', type: 'promo' },
      { title: 'Convite para Evento', description: 'Convidar para live ou evento presencial', type: 'event' },
      { title: 'Atualização de Contato', description: 'Verificar se dados estão corretos', type: 'update' },
    ]
  },
  lost: {
    name: 'Perdidos',
    icon: RefreshCw,
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgLight: 'bg-red-50',
    description: 'Sem compras há muito tempo, baixo valor',
    criteria: 'R: 1-2 | F: 1-2 | V: 1-2',
    priority: 6,
    actions: [
      { title: 'Última Tentativa', description: 'Campanha final de reconquista', type: 'lastchance' },
      { title: 'Pesquisa de Churn', description: 'Entender por que saíram', type: 'churnsuvey' },
      { title: 'Oferta Irrecusável', description: 'Condição muito especial para retorno', type: 'offer' },
      { title: 'Arquivar ou Reativar', description: 'Decisão sobre manter na base', type: 'archive' },
    ]
  }
};

// Map Portuguese segment names from DB to English keys
const SEGMENT_NAME_TO_KEY: Record<string, RFVSegment> = {
  'Campeões': 'champions',
  'Leais': 'loyal',
  'Fiéis': 'loyal',
  'Potenciais Leais': 'potential',
  'Potenciais': 'potential',
  'Novos': 'potential',
  'Promissores': 'potential',
  'Precisam Atenção': 'at_risk',
  'Em Risco': 'at_risk',
  'Não Podem Perder': 'at_risk',
  'Hibernando': 'hibernating',
  'Quase Dormindo': 'hibernating',
  'Perdidos': 'lost',
  'Outros': 'hibernating',
};

const mapSegmentToKey = (segment: string): RFVSegment => {
  return SEGMENT_NAME_TO_KEY[segment] || 'hibernating';
};

// Strategic scripts by segment with action types
const STRATEGIC_SCRIPTS = {
  champions: {
    relationship: {
      title: "💎 Relacionamento VIP",
      text: "Olá {nome}! 👑 Você é um cliente especial da Unique e queremos agradecer por confiar em nós! Como nosso VIP, você tem acesso antecipado às novidades. Que tal conversarmos sobre seus próximos cuidados?",
    },
    referral: {
      title: "🎁 Indicação Premium",
      text: "Oi {nome}! ✨ Sabemos que você ama os resultados da Unique! Temos um programa especial: indique uma amiga e vocês duas ganham benefícios exclusivos. Posso te contar mais?",
    },
    ambassador: {
      title: "🌟 Programa Embaixador",
      text: "Olá {nome}! 💫 Você é uma das nossas clientes mais especiais e gostaríamos de convidá-la para ser Embaixadora Unique! São benefícios exclusivos e experiências únicas. Topa conhecer?",
    },
    upsell: {
      title: "💄 Procedimento Complementar",
      text: "Oi {nome}! 🌸 Temos um procedimento que combina perfeitamente com o que você já fez e pode potencializar ainda mais os resultados. Quer saber mais?",
    },
  },
  loyal: {
    relationship: {
      title: "💙 Cuidando de Você",
      text: "Olá {nome}! 💕 A Unique sente sua falta! Passou um tempinho desde sua última visita. Como você está? Queremos saber como estão os resultados do seu tratamento!",
    },
    upsell: {
      title: "✨ Upgrade de Tratamento",
      text: "Oi {nome}! 🎀 Tenho uma novidade perfeita para você! Um tratamento que complementa o que você já fez e vai te deixar ainda mais radiante. Posso te contar?",
    },
    referral: {
      title: "💝 Indique e Ganhe",
      text: "Olá {nome}! 🌟 Você sabia que indicando uma amiga para a Unique, vocês duas ganham um mimo especial? É nossa forma de agradecer sua confiança!",
    },
    loyalty: {
      title: "🏆 Programa UniLovers",
      text: "Oi {nome}! 💜 Você já conhece nosso programa UniLovers? Acumule pontos a cada visita e troque por benefícios incríveis! Quer saber como participar?",
    },
  },
  potential: {
    relationship: {
      title: "🌱 Nutrição de Relacionamento",
      text: "Olá {nome}! 😊 Tudo bem? Adoramos ter você conosco na última visita! Queria saber como você está se sentindo e se tem alguma dúvida sobre os cuidados pós-procedimento.",
    },
    schedule: {
      title: "📅 Agendamento de Retorno",
      text: "Oi {nome}! 🗓️ Está na hora do seu retorno para potencializar os resultados do seu tratamento! Que tal agendarmos um horário especial para você?",
    },
    incentive: {
      title: "🎁 Oferta de Segunda Compra",
      text: "Olá {nome}! 🎉 Temos uma condição especial para você que está começando sua jornada conosco! Uma surpresa no seu próximo procedimento. Quer saber mais?",
    },
    campaign: {
      title: "📣 Campanha do Mês",
      text: "Oi {nome}! 🔥 Temos uma campanha especial este mês que é perfeita para você! Condições imperdíveis. Posso te contar os detalhes?",
    },
  },
  at_risk: {
    reactivation: {
      title: "💔 Sentimos Sua Falta",
      text: "Olá {nome}! 🥺 Sentimos muito sua falta aqui na Unique! Faz um tempinho que não nos vemos. Está tudo bem? Adoraríamos te receber novamente!",
    },
    winback: {
      title: "🎁 Oferta de Retorno",
      text: "Oi {nome}! 💝 Preparamos algo especial para você voltar: uma condição exclusiva só para clientes queridos como você! Que tal retornar com um carinho especial?",
    },
    survey: {
      title: "📋 Queremos Ouvir Você",
      text: "Olá {nome}! 💬 Sua opinião é muito importante para nós! Notamos que faz um tempo que não nos visitou e gostaríamos de entender como podemos melhorar. Pode me contar?",
    },
    campaign: {
      title: "📣 Novidades para Você",
      text: "Oi {nome}! ✨ Temos muitas novidades desde sua última visita! Novos tratamentos, novas tecnologias e uma condição especial esperando por você. Vamos conversar?",
    },
  },
  hibernating: {
    reactivation: {
      title: "💫 Hora de Voltar",
      text: "Olá {nome}! 🌸 A Unique evoluiu muito e temos novidades incríveis! Faz tempo que não nos vemos e adoraríamos te mostrar tudo de novo. Que tal uma visita?",
    },
    promo: {
      title: "🏷️ Promoção Exclusiva",
      text: "Oi {nome}! 🎁 Temos uma promoção exclusiva para você que está há um tempinho sem nos visitar! Condições especiais só para clientes como você. Posso contar?",
    },
    campaign: {
      title: "📣 Campanha de Reengajamento",
      text: "Olá {nome}! 🔔 Muita coisa mudou por aqui! Novos procedimentos, resultados ainda melhores. Temos uma condição especial de boas-vindas para seu retorno!",
    },
    update: {
      title: "📱 Atualização de Contato",
      text: "Oi {nome}! 📞 Estamos atualizando nosso cadastro e queremos garantir que você continue recebendo nossas novidades e ofertas exclusivas. Seus dados estão corretos?",
    },
  },
  lost: {
    lastchance: {
      title: "🔔 Última Chance",
      text: "Olá {nome}! 💌 Faz muito tempo que não conversamos e sentimos sua falta! Preparamos uma condição muito especial para te reencontrar. Esta é uma oferta única!",
    },
    offer: {
      title: "💰 Oferta Irrecusável",
      text: "Oi {nome}! 🎯 Temos uma proposta especial só para você: um desconto exclusivo para voltar a cuidar de você na Unique. É nossa forma de dizer que sentimos sua falta!",
    },
    survey: {
      title: "📝 Pesquisa de Satisfação",
      text: "Olá {nome}! 📊 Gostaríamos muito de saber como foi sua experiência conosco. Seu feedback é essencial para melhorarmos. Pode nos ajudar respondendo algumas perguntas?",
    },
    campaign: {
      title: "📣 Reconquista",
      text: "Oi {nome}! 🌟 A Unique mudou muito desde nossa última conversa! Novos tratamentos, nova experiência. Que tal nos dar uma nova chance? Temos uma surpresa para você!",
    },
  },
};

// Current month campaign (will be connected to campaigns system)
const getCurrentMonthCampaign = () => {
  const month = new Date().getMonth() + 1;
  const campaigns: Record<number, { name: string; offer: string; script: string }> = {
    1: { name: "UNIQUE RESET", offer: "Soroterapia 20% OFF", script: "Começou 2026 e temos condição especial de Soroterapia para renovar suas energias!" },
    2: { name: "UNIQUE BALANCE", offer: "Protocolo Emagrecimento", script: "Fevereiro é mês de equilíbrio! Nosso protocolo de emagrecimento está com condição especial." },
    3: { name: "UNIQUE WOMAN", offer: "Mês da Mulher", script: "Março é o mês de celebrar VOCÊ! Consulta + Exames pré-op com 50% OFF." },
    4: { name: "UNIQUE HARMONY", offer: "Harmonização 12x", script: "Abril é mês da harmonia! Harmonização Facial parcelada em até 12x." },
    5: { name: "UNIQUE ESSENCE", offer: "Mommy Makeover", script: "Maio é especial para mães! Condições exclusivas para Mommy Makeover." },
    6: { name: "UNIQUE DESIRE", offer: "Pacote Casal 30% OFF", script: "Junho é mês do amor! Pacote Casal com 30% OFF em procedimentos." },
    7: { name: "UNIQUE CARE", offer: "Protocolo Pós-Op", script: "Julho é perfeito para procedimentos com tranquilidade! Protocolo de recuperação especial." },
    8: { name: "UNIQUE PREP", offer: "Planejamento Verão", script: "Agosto é hora de PLANEJAR o verão! Protocolos sob medida para você." },
    9: { name: "UNIQUE BLOOM", offer: "Skincare + Harmonização", script: "Primavera chegando! Tratamentos faciais com condições especiais." },
    10: { name: "UNIQUE GLOW", offer: "Pele Radiante", script: "Outubro é mês de brilhar! Protocolos de pele com preços especiais." },
    11: { name: "UNIQUE PREP BLACK", offer: "Black Friday", script: "Novembro é mês de ofertas imperdíveis! As melhores condições do ano." },
    12: { name: "UNIQUE SHINE", offer: "Fim de Ano", script: "Dezembro é hora de brilhar! Prepare-se para as festas com a gente." },
  };
  return campaigns[month] || campaigns[1];
};

type RFVSegment = keyof typeof RFV_SEGMENTS;

interface RFVCustomer {
  id?: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cpf?: string;
  prontuario?: string;
  firstPurchaseDate?: string;
  lastPurchaseDate: string;
  totalPurchases: number;
  totalValue: number;
  averageTicket: number;
  recencyScore: number;
  frequencyScore: number;
  valueScore: number;
  segment: RFVSegment;
  daysSinceLastPurchase: number;
}

interface ColumnMapping {
  clientName: string;
  phone: string;
  whatsapp: string;
  email: string;
  cpf: string;
  prontuario: string;
  purchaseDate: string;
  amount: string;
  // Campos adicionais opcionais
  firstPurchaseDate: string;
  totalPurchases: string;
  totalValue: string;
  averageTicket: string;
  daysSinceLastPurchase: string;
  recencyScore: string;
  frequencyScore: string;
  valueScore: string;
  segment: string;
}

const RFVDashboard = () => {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [customers, setCustomers] = useState<RFVCustomer[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    clientName: '',
    phone: '',
    whatsapp: '',
    email: '',
    cpf: '',
    prontuario: '',
    purchaseDate: '',
    amount: '',
    firstPurchaseDate: '',
    totalPurchases: '',
    totalValue: '',
    averageTicket: '',
    daysSinceLastPurchase: '',
    recencyScore: '',
    frequencyScore: '',
    valueScore: '',
    segment: '',
  });
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<RFVSegment | 'all'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<RFVCustomer | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<any[]>([]);
  const [dataReferenceDate, setDataReferenceDate] = useState<string>('');
  const { profile } = useAuth();
  
  // Quick WhatsApp Action states
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [quickActionCustomer, setQuickActionCustomer] = useState<RFVCustomer | null>(null);
  const [selectedScriptType, setSelectedScriptType] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);
  
  // Bulk WhatsApp Action states
  const [showBulkAction, setShowBulkAction] = useState(false);
  const [bulkScriptType, setBulkScriptType] = useState<string>('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkProgress, setBulkProgress] = useState(0);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkSentCount, setBulkSentCount] = useState(0);
  
  // Checkbox selection states
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [bulkQuantityLimit, setBulkQuantityLimit] = useState<number | 'all'>('all');
  
  // Expand table state
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  
  // Edit contact states
  const [showEditContact, setShowEditContact] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<RFVCustomer | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSearchingFeegow, setIsSearchingFeegow] = useState(false);
  const [feegowResults, setFeegowResults] = useState<any[]>([]);
  
  // Delete customer state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<RFVCustomer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  
  const getScriptsForCustomer = (customer: RFVCustomer) => {
    const segmentScripts = STRATEGIC_SCRIPTS[customer.segment];
    const currentCampaign = getCurrentMonthCampaign();
    
    const scripts = Object.entries(segmentScripts).map(([key, script]) => ({
      key,
      ...script,
      text: script.text.replace('{nome}', customer.name.split(' ')[0]),
    }));
    
    // Add current campaign script
    scripts.push({
      key: 'campaign_month',
      title: `📣 ${currentCampaign.name}`,
      text: `Oi ${customer.name.split(' ')[0]}! ${currentCampaign.script} ${currentCampaign.offer}. Quer saber mais?`,
    });
    
    return scripts;
  };

  const handleOpenQuickAction = (customer: RFVCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickActionCustomer(customer);
    setSelectedScriptType('');
    setCustomMessage('');
    setCopiedScript(false);
    setShowQuickAction(true);
  };

  // Edit Contact Functions
  const handleOpenEditContact = (customer: RFVCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomer(customer);
    setEditPhone(customer.phone || '');
    setEditWhatsapp(customer.whatsapp || '');
    setEditEmail(customer.email || '');
    setFeegowResults([]);
    setShowEditContact(true);
  };

  const handleSearchFeegow = async () => {
    if (!editingCustomer) return;
    
    setIsSearchingFeegow(true);
    setFeegowResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('feegow-patient-search', {
        body: { patientName: editingCustomer.name }
      });
      
      if (error) throw error;
      
      if (data.success && data.patients?.length > 0) {
        setFeegowResults(data.patients);
        toast({ 
          title: "Pacientes encontrados!", 
          description: `${data.patients.length} resultado(s) no Feegow.` 
        });
      } else {
        toast({ 
          title: "Não encontrado", 
          description: "Nenhum paciente encontrado no Feegow com esse nome.",
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error searching Feegow:', error);
      toast({ 
        title: "Erro na busca", 
        description: "Não foi possível conectar ao Feegow. Verifique a configuração.",
        variant: "destructive" 
      });
    }
    
    setIsSearchingFeegow(false);
  };

  const handleSelectFeegowPatient = (patient: any) => {
    setEditPhone(patient.phone || patient.cellphone || '');
    setEditWhatsapp(patient.cellphone || patient.phone || '');
    setEditEmail(patient.email || editEmail);
    setFeegowResults([]);
    toast({ title: "Dados importados!", description: "Agora clique em Salvar para confirmar." });
  };

  const handleSaveContact = async () => {
    if (!editingCustomer?.id) {
      toast({ title: "Erro", description: "Cliente sem ID não pode ser editado.", variant: "destructive" });
      return;
    }
    
    setIsSavingContact(true);
    
    try {
      const { error } = await supabase
        .from('rfv_customers')
        .update({
          phone: editPhone || null,
          whatsapp: editWhatsapp || null,
          email: editEmail || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCustomer.id);
      
      if (error) throw error;
      
      // Update local state
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, phone: editPhone, whatsapp: editWhatsapp, email: editEmail }
          : c
      ));
      
      if (selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer(prev => prev ? { ...prev, phone: editPhone, whatsapp: editWhatsapp, email: editEmail } : null);
      }
      
      toast({ title: "Contato atualizado!", description: "Os dados foram salvos com sucesso." });
      setShowEditContact(false);
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({ title: "Erro ao salvar", description: "Não foi possível salvar os dados.", variant: "destructive" });
    }
    
    setIsSavingContact(false);
  };

  // Delete customer function (only for admins)
  const handleDeleteCustomer = async () => {
    if (!customerToDelete?.id) {
      toast({ title: "Erro", description: "Cliente sem ID não pode ser excluído.", variant: "destructive" });
      return;
    }
    
    setIsDeletingCustomer(true);
    
    try {
      const { error } = await supabase
        .from('rfv_customers')
        .delete()
        .eq('id', customerToDelete.id);
      
      if (error) throw error;
      
      // Update local state
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
      
      if (selectedCustomer?.id === customerToDelete.id) {
        setSelectedCustomer(null);
      }
      
      toast({ title: "Cliente excluído!", description: "O registro foi removido da base RFV." });
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir o cliente.", variant: "destructive" });
    }
    
    setIsDeletingCustomer(false);
  };

  const handleSelectScript = (scriptKey: string, scriptText: string) => {
    setSelectedScriptType(scriptKey);
    setCustomMessage(scriptText);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
    toast({ title: "Mensagem copiada!" });
  };

  const handleSendWhatsApp = async () => {
    if (!quickActionCustomer) return;
    
    const phone = quickActionCustomer.whatsapp || quickActionCustomer.phone;
    if (!phone) {
      toast({ title: "Sem telefone", description: "Este cliente não possui telefone cadastrado.", variant: "destructive" });
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(customMessage)}`;
    
    // Save action to history
    try {
      await supabase.from('rfv_action_history').insert({
        customer_id: quickActionCustomer.id,
        customer_name: quickActionCustomer.name,
        action_type: selectedScriptType || 'custom_message',
        notes: customMessage.substring(0, 500),
        performed_by: user?.id || '',
        performed_by_name: profile?.full_name || 'Usuário',
      });
    } catch (error) {
      console.error('Error saving action:', error);
    }
    
    window.open(whatsappUrl, '_blank');
    toast({ title: "Abrindo WhatsApp..." });
    setShowQuickAction(false);
  };

  // Get a generic script for bulk messaging
  const getBulkScripts = (segment: RFVSegment | 'all') => {
    const currentCampaign = getCurrentMonthCampaign();
    
    const scripts = [
      {
        key: 'relationship',
        title: "💙 Relacionamento",
        text: "Olá {nome}! 💕 A Unique sente sua falta! Queremos saber como você está. Temos novidades incríveis esperando por você!",
      },
      {
        key: 'referral',
        title: "🎁 Indicação",
        text: "Oi {nome}! ✨ Você sabia que indicando uma amiga para a Unique, vocês duas ganham benefícios especiais? É nossa forma de agradecer sua confiança!",
      },
      {
        key: 'campaign',
        title: `📣 Campanha: ${currentCampaign.name}`,
        text: `Oi {nome}! 🔥 ${currentCampaign.script} ${currentCampaign.offer}. Quer saber mais?`,
      },
      {
        key: 'reactivation',
        title: "💫 Reativação",
        text: "Olá {nome}! 🌸 Faz tempo que não nos vemos e sentimos sua falta! Preparamos condições especiais para seu retorno. Vamos conversar?",
      },
      {
        key: 'promo',
        title: "🏷️ Promoção",
        text: "Oi {nome}! 🎁 Temos uma promoção exclusiva para você! Condições especiais só para clientes especiais como você. Posso contar mais?",
      },
      {
        key: 'upsell',
        title: "✨ Novos Procedimentos",
        text: "Olá {nome}! 🌟 Temos novidades incríveis que combinam perfeitamente com você! Novos tratamentos e resultados ainda melhores. Quer conhecer?",
      },
    ];
    
    return scripts;
  };

  const handleSelectBulkScript = (scriptKey: string, scriptText: string) => {
    setBulkScriptType(scriptKey);
    setBulkMessage(scriptText);
  };

  const getCustomersWithPhone = () => {
    return filteredCustomers.filter(c => c.whatsapp || c.phone);
  };

  // Get selected customers for bulk action
  const getSelectedCustomersForBulk = () => {
    const customersWithPhone = getCustomersWithPhone();
    
    // If there are manually selected customers, use those
    if (selectedCustomerIds.size > 0) {
      return customersWithPhone.filter(c => c.id && selectedCustomerIds.has(c.id));
    }
    
    // Otherwise, apply quantity limit
    if (bulkQuantityLimit === 'all') {
      return customersWithPhone;
    }
    
    return customersWithPhone.slice(0, bulkQuantityLimit);
  };

  // Toggle customer selection
  const toggleCustomerSelection = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Select/deselect all visible customers
  const toggleSelectAll = () => {
    const customersWithPhone = getCustomersWithPhone();
    const allVisibleIds = pagedCustomers
      .filter(c => c.id && (c.whatsapp || c.phone))
      .map(c => c.id!);
    
    const allSelected = allVisibleIds.every(id => selectedCustomerIds.has(id));
    
    if (allSelected) {
      // Deselect all visible
      setSelectedCustomerIds(prev => {
        const newSet = new Set(prev);
        allVisibleIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all visible
      setSelectedCustomerIds(prev => {
        const newSet = new Set(prev);
        allVisibleIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedCustomerIds(new Set());
  };

  const handleBulkWhatsAppOpen = async () => {
    const customersToSend = getSelectedCustomersForBulk();
    
    if (customersToSend.length === 0) {
      toast({ title: "Nenhum cliente selecionado", description: "Selecione clientes ou ajuste o limite de quantidade.", variant: "destructive" });
      return;
    }

    if (!bulkMessage) {
      toast({ title: "Mensagem vazia", description: "Selecione ou escreva uma mensagem para enviar.", variant: "destructive" });
      return;
    }

    setIsSendingBulk(true);
    setBulkProgress(0);
    setBulkSentCount(0);

    // Log bulk action start
    try {
      await supabase.from('rfv_action_history').insert({
        customer_name: `Disparo em massa para ${customersToSend.length} clientes`,
        action_type: `bulk_${bulkScriptType || 'custom'}`,
        notes: `Mensagem: ${bulkMessage.substring(0, 200)}...`,
        performed_by: user?.id || '',
        performed_by_name: profile?.full_name || 'Usuário',
      });
    } catch (error) {
      console.error('Error logging bulk action:', error);
    }

    // Open WhatsApp links one by one with delay
    for (let i = 0; i < customersToSend.length; i++) {
      const customer = customersToSend[i];
      const phone = customer.whatsapp || customer.phone;
      if (!phone) continue;

      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const personalizedMessage = bulkMessage.replace(/{nome}/g, customer.name.split(' ')[0]);
      const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(personalizedMessage)}`;

      // Save individual action
      try {
        await supabase.from('rfv_action_history').insert({
          customer_id: customer.id,
          customer_name: customer.name,
          action_type: `bulk_${bulkScriptType || 'custom'}`,
          notes: personalizedMessage.substring(0, 500),
          performed_by: user?.id || '',
          performed_by_name: profile?.full_name || 'Usuário',
        });
      } catch (error) {
        console.error('Error saving action:', error);
      }

      window.open(whatsappUrl, '_blank');
      
      setBulkSentCount(i + 1);
      setBulkProgress(Math.round(((i + 1) / customersToSend.length) * 100));

      // Wait 3-5 seconds between each to avoid blocking (randomized)
      if (i < customersToSend.length - 1) {
        const delay = 3000 + Math.random() * 2000; // 3-5 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsSendingBulk(false);
    clearSelections();
    toast({ 
      title: "Disparo concluído!", 
      description: `${customersToSend.length} clientes foram adicionados para contato.` 
    });
  };

  const handleCopyBulkLinks = () => {
    const customersWithPhone = getCustomersWithPhone();
    const links = customersWithPhone.map(customer => {
      const phone = customer.whatsapp || customer.phone;
      if (!phone) return null;
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const personalizedMessage = bulkMessage.replace(/{nome}/g, customer.name.split(' ')[0]);
      return `${customer.name}: https://wa.me/${fullPhone}?text=${encodeURIComponent(personalizedMessage)}`;
    }).filter(Boolean).join('\n\n');

    navigator.clipboard.writeText(links);
    toast({ title: "Links copiados!", description: `${customersWithPhone.length} links de WhatsApp copiados.` });
  };

  // Load existing RFV data and upload logs on mount
  useEffect(() => {
    loadExistingData();
    loadUploadLogs();
  }, []);

  const loadUploadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('rfv_upload_logs')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setUploadLogs(data || []);
    } catch (error) {
      console.error('Error loading upload logs:', error);
    }
  };

  const loadExistingData = async () => {
    setIsLoadingData(true);
    try {
      // First, get the count of all records
      const { count } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true });
      
      // Fetch all records with pagination if needed (Supabase default limit is 1000)
      let allData: any[] = [];
      const pageSize = 1000;
      let offset = 0;
      
      while (true) {
        const { data, error } = await supabase
          .from('rfv_customers')
          .select('*')
          .order('total_value', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        
        if (data.length < pageSize) break;
        offset += pageSize;
      }

      if (allData.length > 0) {
        const loadedCustomers: RFVCustomer[] = allData.map(row => ({
          id: row.id,
          name: row.name,
          phone: row.phone || undefined,
          whatsapp: row.whatsapp || undefined,
          email: row.email || undefined,
          cpf: row.cpf || undefined,
          prontuario: row.prontuario || undefined,
          firstPurchaseDate: row.first_purchase_date,
          lastPurchaseDate: row.last_purchase_date,
          totalPurchases: row.total_purchases,
          totalValue: Number(row.total_value),
          averageTicket: Number(row.average_ticket),
          recencyScore: row.recency_score,
          frequencyScore: row.frequency_score,
          valueScore: row.value_score,
          segment: mapSegmentToKey(row.segment),
          daysSinceLastPurchase: row.days_since_last_purchase,
        }));

        // Recalculate days since last purchase
        const now = new Date();
        loadedCustomers.forEach(c => {
          c.daysSinceLastPurchase = Math.floor(
            (now.getTime() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        setCustomers(loadedCustomers);
        toast({
          title: "Dados carregados",
          description: `${loadedCustomers.length} clientes encontrados no banco`,
        });
      }
    } catch (error) {
      console.error('Error loading RFV data:', error);
    }
    setIsLoadingData(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCustomers([]);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // First, get all data as array of arrays to find the header row
      const allRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
      
      console.log('Total rows found:', allRows.length);
      console.log('First 5 rows:', allRows.slice(0, 5));
      
      // Find the first row that looks like a header (has text content)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(allRows.length, 15); i++) {
        const row = allRows[i];
        if (row && row.length > 0) {
          // Count non-empty text cells in this row
          const textCells = row.filter((cell: any) => {
            if (cell === null || cell === undefined || cell === '') return false;
            if (typeof cell === 'string' && cell.trim().length > 0) return true;
            return false;
          });
          
          // Check if this row contains text that looks like column names
          const hasTextHeaders = row.some((cell: any) => {
            if (typeof cell !== 'string') return false;
            const lower = cell.toLowerCase().trim();
            return lower.includes('nome') || lower.includes('cliente') || lower.includes('paciente') ||
                   lower.includes('data') || lower.includes('valor') || lower.includes('email') ||
                   lower.includes('telefone') || lower.includes('phone') || lower.includes('total') ||
                   lower.includes('compra') || lower.includes('faturamento') || lower.includes('procedimento');
          });
          
          if (hasTextHeaders && textCells.length >= 2) {
            headerRowIndex = i;
            console.log('Header row found at index:', headerRowIndex, 'Row content:', row);
            break;
          }
        }
      }
      
      // Parse again with the correct header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { 
        range: headerRowIndex,
        defval: ''
      });

      console.log('Parsed data rows:', jsonData.length);
      
      if (jsonData.length === 0) {
        toast({
          title: "Planilha vazia",
          description: "A planilha não contém dados.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Get ALL columns from the first row - don't filter anything yet
      const allColumns = Object.keys(jsonData[0]);
      console.log('All columns found:', allColumns);
      
      // Filter out only truly invalid columns (empty names or just underscores)
      const validColumns = allColumns.filter(col => {
        // Keep columns that have actual meaningful names
        const trimmed = col.trim();
        if (!trimmed) return false;
        // Filter out __EMPTY_X pattern from xlsx
        if (/^__EMPTY(_\d+)?$/.test(trimmed)) return false;
        // Filter out columns that are just numbers (likely row indices)
        if (/^\d+$/.test(trimmed)) return false;
        return true;
      });
      
      console.log('Valid columns after filtering:', validColumns);
      
      setAvailableColumns(validColumns);
      setRawData(jsonData);

      // Auto-detect columns
      const autoMapping: ColumnMapping = {
        clientName: '',
        phone: '',
        whatsapp: '',
        email: '',
        cpf: '',
        prontuario: '',
        purchaseDate: '',
        amount: '',
        firstPurchaseDate: '',
        totalPurchases: '',
        totalValue: '',
        averageTicket: '',
        daysSinceLastPurchase: '',
        recencyScore: '',
        frequencyScore: '',
        valueScore: '',
        segment: '',
      };

      for (const col of validColumns) {
        const colLower = col.toLowerCase();
        if (!autoMapping.clientName && (colLower.includes('cliente') || colLower.includes('paciente') || colLower.includes('nome'))) {
          autoMapping.clientName = col;
        } else if (!autoMapping.whatsapp && (colLower.includes('whatsapp') || colLower.includes('whats') || colLower.includes('zap'))) {
          autoMapping.whatsapp = col;
        } else if (!autoMapping.phone && (colLower.includes('telefone') || colLower.includes('phone') || colLower.includes('celular'))) {
          autoMapping.phone = col;
        } else if (!autoMapping.email && (colLower.includes('email') || colLower.includes('e-mail'))) {
          autoMapping.email = col;
        } else if (!autoMapping.cpf && colLower.includes('cpf')) {
          autoMapping.cpf = col;
        } else if (!autoMapping.prontuario && (colLower.includes('prontuario') || colLower.includes('prontuário') || colLower.includes('registro') || colLower.includes('código'))) {
          autoMapping.prontuario = col;
        } else if (!autoMapping.purchaseDate && (colLower.includes('data_limite') || colLower.includes('última') || colLower.includes('ultima') || colLower === 'data')) {
          autoMapping.purchaseDate = col;
        } else if (!autoMapping.firstPurchaseDate && (colLower.includes('primeira') || colLower.includes('first'))) {
          autoMapping.firstPurchaseDate = col;
        } else if (!autoMapping.totalPurchases && (colLower.includes('qtd') || colLower.includes('quantidade') || colLower.includes('compras') || colLower.includes('frequencia') || colLower.includes('frequência'))) {
          autoMapping.totalPurchases = col;
        } else if (!autoMapping.totalValue && (colLower.includes('total') || colLower.includes('ltv') || colLower.includes('faturamento'))) {
          autoMapping.totalValue = col;
        } else if (!autoMapping.averageTicket && (colLower.includes('ticket') || colLower.includes('médio') || colLower.includes('medio'))) {
          autoMapping.averageTicket = col;
        } else if (!autoMapping.amount && (colLower.includes('valor') || colLower.includes('value') || colLower.includes('score_valor'))) {
          autoMapping.amount = col;
        } else if (!autoMapping.daysSinceLastPurchase && (colLower.includes('dias') || colLower.includes('days'))) {
          autoMapping.daysSinceLastPurchase = col;
        } else if (!autoMapping.recencyScore && colLower.includes('recencia') || colLower.includes('recência') || colLower === 'r') {
          autoMapping.recencyScore = col;
        } else if (!autoMapping.frequencyScore && (colLower.includes('frequencia') || colLower.includes('frequência') || colLower === 'f')) {
          autoMapping.frequencyScore = col;
        } else if (!autoMapping.valueScore && (colLower.includes('score_valor') || colLower === 'v')) {
          autoMapping.valueScore = col;
        } else if (!autoMapping.segment && (colLower.includes('segmento') || colLower.includes('segment') || colLower.includes('rfv'))) {
          autoMapping.segment = col;
        }
      }
      
      console.log('Auto-detected mapping:', autoMapping);

      setColumnMapping(autoMapping);
      setShowColumnMapping(true);
      
      toast({
        title: "Arquivo carregado",
        description: `${jsonData.length} linhas e ${validColumns.length} colunas encontradas. Configure o mapeamento.`,
      });
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Não foi possível ler o arquivo.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const calculateRFVSegment = (recency: number, frequency: number, value: number): RFVSegment => {
    // Champions: R: 4-5, F: 4-5, V: 4-5
    if (recency >= 4 && frequency >= 4 && value >= 4) return 'champions';
    
    // Loyal: R: 3-4, F: 3-5, V: 3-5
    if (recency >= 3 && frequency >= 3 && value >= 3) return 'loyal';
    
    // Potential: R: 4-5, F: 1-3, V: 1-3
    if (recency >= 4 && frequency <= 3 && value <= 3) return 'potential';
    
    // At Risk: R: 1-2, F: 3-5, V: 3-5
    if (recency <= 2 && frequency >= 3 && value >= 3) return 'at_risk';
    
    // Hibernating: R: 1-2, F: 1-2, V: 2-4
    if (recency <= 2 && frequency <= 2 && value >= 2 && value <= 4) return 'hibernating';
    
    // Lost: R: 1-2, F: 1-2, V: 1-2
    return 'lost';
  };

  const processWithMapping = async () => {
    if (!columnMapping.clientName || (!columnMapping.purchaseDate && !columnMapping.daysSinceLastPurchase) || (!columnMapping.amount && !columnMapping.totalValue)) {
      toast({
        title: "Mapeamento incompleto",
        description: "Configure pelo menos Nome, Data (ou Dias Sem Compra) e Valor Total.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Track stats for debugging
      let totalRows = 0;
      let skippedNoName = 0;
      let skippedNoDate = 0;
      let skippedNoAmount = 0;
      let processedRows = 0;

      // Check if we have pre-calculated data from spreadsheet
      const hasPreCalculatedData = columnMapping.recencyScore || columnMapping.frequencyScore || columnMapping.valueScore;
      
      // Process each row as a unique customer (for pre-calculated data)
      // or group by customer name (for raw transaction data)
      const customerTransactions: Record<string, { 
        dates: Date[]; 
        amounts: number[]; 
        phone?: string; 
        whatsapp?: string; 
        email?: string;
        cpf?: string;
        prontuario?: string;
        firstPurchaseDate?: string;
        totalPurchases?: number;
        totalValue?: number;
        averageTicket?: number;
        daysSinceLastPurchase?: number;
        recencyScore?: number;
        frequencyScore?: number;
        valueScore?: number;
        segment?: string;
      }> = {};

      for (const row of rawData) {
        totalRows++;
        const clientName = String(row[columnMapping.clientName] || '').trim();
        if (!clientName) {
          skippedNoName++;
          continue;
        }

        // Parse date
        let parsedDate: Date | null = null;
        const dateValue = row[columnMapping.purchaseDate];

        if (dateValue) {
          if (typeof dateValue === 'number') {
            try {
              const excelDate = XLSX.SSF.parse_date_code(dateValue);
              if (excelDate && excelDate.y > 1900) {
                parsedDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
              }
            } catch (e) {
              // Invalid date number
            }
          } else if (typeof dateValue === 'string') {
            const dateStr = dateValue.trim();
            const parts = dateStr.split(/[-\/\.]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                parsedDate = new Date(parts.join('-'));
              } else if (parts[2].length === 4) {
                parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              } else if (parts[2].length === 2) {
                const year = parseInt(parts[2]) > 50 ? `19${parts[2]}` : `20${parts[2]}`;
                parsedDate = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              }
            }
          } else if (dateValue instanceof Date) {
            parsedDate = dateValue;
          }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) {
          parsedDate = new Date('2020-01-01');
          skippedNoDate++;
        }

        // Parse amount
        let amount = 0;
        const amountRaw = row[columnMapping.amount] || row[columnMapping.totalValue];
        if (typeof amountRaw === 'number') {
          amount = amountRaw;
        } else if (typeof amountRaw === 'string') {
          let cleaned = amountRaw.replace(/[R$\s]/g, '');
          if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else if (cleaned.includes(',') && !cleaned.includes('.')) {
            const parts = cleaned.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
              cleaned = cleaned.replace(',', '.');
            } else {
              cleaned = cleaned.replace(/,/g, '');
            }
          }
          amount = parseFloat(cleaned) || 0;
        }

        if (amount < 0) amount = 0;
        if (amount === 0) skippedNoAmount++;

        processedRows++;
        const key = clientName.toLowerCase();
        
        if (!customerTransactions[key]) {
          customerTransactions[key] = { dates: [], amounts: [] };
        }
        
        customerTransactions[key].dates.push(parsedDate);
        customerTransactions[key].amounts.push(amount);
        
        // Contact info
        if (columnMapping.phone && row[columnMapping.phone]) {
          customerTransactions[key].phone = String(row[columnMapping.phone]);
        }
        if (columnMapping.whatsapp && row[columnMapping.whatsapp]) {
          customerTransactions[key].whatsapp = String(row[columnMapping.whatsapp]);
        }
        if (columnMapping.email && row[columnMapping.email]) {
          customerTransactions[key].email = String(row[columnMapping.email]);
        }
        if (columnMapping.cpf && row[columnMapping.cpf]) {
          customerTransactions[key].cpf = String(row[columnMapping.cpf]);
        }
        if (columnMapping.prontuario && row[columnMapping.prontuario]) {
          customerTransactions[key].prontuario = String(row[columnMapping.prontuario]);
        }

        // Pre-calculated values from spreadsheet
        if (columnMapping.firstPurchaseDate && row[columnMapping.firstPurchaseDate]) {
          customerTransactions[key].firstPurchaseDate = String(row[columnMapping.firstPurchaseDate]);
        }
        if (columnMapping.totalPurchases && row[columnMapping.totalPurchases]) {
          customerTransactions[key].totalPurchases = Number(row[columnMapping.totalPurchases]) || 0;
        }
        if (columnMapping.totalValue && row[columnMapping.totalValue]) {
          const tv = row[columnMapping.totalValue];
          if (typeof tv === 'number') {
            customerTransactions[key].totalValue = tv;
          } else if (typeof tv === 'string') {
            let cleaned = tv.replace(/[R$\s]/g, '');
            if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            customerTransactions[key].totalValue = parseFloat(cleaned) || 0;
          }
        }
        if (columnMapping.averageTicket && row[columnMapping.averageTicket]) {
          const at = row[columnMapping.averageTicket];
          if (typeof at === 'number') {
            customerTransactions[key].averageTicket = at;
          } else if (typeof at === 'string') {
            let cleaned = at.replace(/[R$\s]/g, '');
            if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            customerTransactions[key].averageTicket = parseFloat(cleaned) || 0;
          }
        }
        if (columnMapping.daysSinceLastPurchase && row[columnMapping.daysSinceLastPurchase]) {
          customerTransactions[key].daysSinceLastPurchase = Number(row[columnMapping.daysSinceLastPurchase]) || 0;
        }
        if (columnMapping.recencyScore && row[columnMapping.recencyScore]) {
          customerTransactions[key].recencyScore = Number(row[columnMapping.recencyScore]) || 0;
        }
        if (columnMapping.frequencyScore && row[columnMapping.frequencyScore]) {
          customerTransactions[key].frequencyScore = Number(row[columnMapping.frequencyScore]) || 0;
        }
        if (columnMapping.valueScore && row[columnMapping.valueScore]) {
          customerTransactions[key].valueScore = Number(row[columnMapping.valueScore]) || 0;
        }
        if (columnMapping.segment && row[columnMapping.segment]) {
          customerTransactions[key].segment = String(row[columnMapping.segment]);
        }
      }

      console.log('Processing stats:', {
        totalRows,
        skippedNoName,
        skippedNoDate,
        skippedNoAmount,
        processedRows,
        uniqueCustomers: Object.keys(customerTransactions).length
      });

      const now = new Date();
      const allCustomerData = Object.entries(customerTransactions).map(([name, data]) => {
        const sortedDates = data.dates.sort((a, b) => b.getTime() - a.getTime());
        const lastPurchaseDate = sortedDates[0];
        
        // Use pre-calculated values if available, otherwise calculate
        const daysSinceLastPurchase = data.daysSinceLastPurchase ?? Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalPurchases = data.totalPurchases ?? data.dates.length;
        const totalValue = data.totalValue ?? data.amounts.reduce((sum, a) => sum + a, 0);
        const averageTicket = data.averageTicket ?? (totalValue / Math.max(totalPurchases, 1));

        // Use whatsapp if available, otherwise use phone
        const whatsappNumber = data.whatsapp || data.phone;

        return {
          name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          phone: data.phone,
          whatsapp: whatsappNumber,
          email: data.email,
          cpf: data.cpf,
          prontuario: data.prontuario,
          daysSinceLastPurchase,
          totalPurchases,
          totalValue,
          averageTicket,
          lastPurchaseDate: lastPurchaseDate.toISOString().split('T')[0],
          firstPurchaseDate: data.firstPurchaseDate,
          // Pre-calculated scores (if available)
          preRecencyScore: data.recencyScore,
          preFrequencyScore: data.frequencyScore,
          preValueScore: data.valueScore,
          preSegment: data.segment,
        };
      });

      // Calculate quintiles for RFV scoring (only if not pre-calculated)
      const recencyValues = allCustomerData.map(c => c.daysSinceLastPurchase).sort((a, b) => a - b);
      const frequencyValues = allCustomerData.map(c => c.totalPurchases).sort((a, b) => a - b);
      const valueValues = allCustomerData.map(c => c.totalValue).sort((a, b) => a - b);

      const getQuintile = (value: number, sortedValues: number[], inverse = false): number => {
        const index = sortedValues.findIndex(v => v >= value);
        const percentile = index === -1 ? 1 : (index / sortedValues.length);
        const score = Math.ceil((inverse ? (1 - percentile) : percentile) * 5);
        return Math.max(1, Math.min(5, score || 1));
      };

      // Map segment names from spreadsheet to our segment keys
      const mapSegmentName = (segmentName?: string): RFVSegment | null => {
        if (!segmentName) return null;
        const lower = segmentName.toLowerCase();
        if (lower.includes('campe') || lower.includes('champion')) return 'champions';
        if (lower.includes('fiel') || lower.includes('loyal')) return 'loyal';
        if (lower.includes('potencial') || lower.includes('potential')) return 'potential';
        if (lower.includes('risco') || lower.includes('risk')) return 'at_risk';
        if (lower.includes('hibern') || lower.includes('dormindo')) return 'hibernating';
        if (lower.includes('perdido') || lower.includes('lost')) return 'lost';
        return null;
      };

      const rfvCustomers: RFVCustomer[] = allCustomerData.map(customer => {
        // Use pre-calculated scores if available and valid (1-5)
        const recencyScore = (customer.preRecencyScore && customer.preRecencyScore >= 1 && customer.preRecencyScore <= 5) 
          ? customer.preRecencyScore 
          : getQuintile(customer.daysSinceLastPurchase, recencyValues, true);
        const frequencyScore = (customer.preFrequencyScore && customer.preFrequencyScore >= 1 && customer.preFrequencyScore <= 5)
          ? customer.preFrequencyScore
          : getQuintile(customer.totalPurchases, frequencyValues);
        const valueScore = (customer.preValueScore && customer.preValueScore >= 1 && customer.preValueScore <= 5)
          ? customer.preValueScore
          : getQuintile(customer.totalValue, valueValues);
        
        // Use pre-calculated segment if available, otherwise calculate
        const mappedSegment = mapSegmentName(customer.preSegment);
        const segment = mappedSegment ?? calculateRFVSegment(recencyScore, frequencyScore, valueScore);

        return {
          name: customer.name,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          email: customer.email,
          cpf: customer.cpf,
          prontuario: customer.prontuario,
          firstPurchaseDate: customer.firstPurchaseDate,
          lastPurchaseDate: customer.lastPurchaseDate,
          daysSinceLastPurchase: customer.daysSinceLastPurchase,
          totalPurchases: customer.totalPurchases,
          totalValue: customer.totalValue,
          averageTicket: customer.averageTicket,
          recencyScore,
          frequencyScore,
          valueScore,
          segment,
        };
      });

      // Sort by segment priority and value
      rfvCustomers.sort((a, b) => {
        const priorityDiff = RFV_SEGMENTS[a.segment].priority - RFV_SEGMENTS[b.segment].priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b.totalValue - a.totalValue;
      });

      setCustomers(rfvCustomers);
      setShowColumnMapping(false);
      setHasUnsavedChanges(true);

      const segmentCounts = rfvCustomers.reduce((acc, c) => {
        acc[c.segment] = (acc[c.segment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Show detailed stats in toast
      const statsMessage = skippedNoName > 0 
        ? `${totalRows} linhas lidas, ${skippedNoName} sem nome. ${rfvCustomers.length} clientes únicos classificados.`
        : `${totalRows} linhas → ${rfvCustomers.length} clientes únicos classificados.`;

      toast({
        title: "Análise RFV concluída",
        description: statsMessage,
      });
    } catch (error) {
      console.error('Error processing data:', error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar os dados.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  const saveToDatabase = async () => {
    if (customers.length === 0) return;

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process in batches of 100 for better performance
      const BATCH_SIZE = 100;
      const batches = [];
      
      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        batches.push(customers.slice(i, i + BATCH_SIZE));
      }

      console.log(`Saving ${customers.length} customers in ${batches.length} batches...`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        const batchData = batch.map(customer => ({
          name: customer.name.toLowerCase().trim(),
          phone: customer.phone || null,
          whatsapp: customer.whatsapp || customer.phone || null,
          email: customer.email || null,
          cpf: customer.cpf || null,
          prontuario: customer.prontuario || null,
          first_purchase_date: customer.firstPurchaseDate || customer.lastPurchaseDate,
          last_purchase_date: customer.lastPurchaseDate,
          total_purchases: customer.totalPurchases,
          total_value: customer.totalValue,
          average_ticket: customer.averageTicket,
          recency_score: customer.recencyScore,
          frequency_score: customer.frequencyScore,
          value_score: customer.valueScore,
          segment: customer.segment,
          days_since_last_purchase: customer.daysSinceLastPurchase,
          created_by: user?.id,
        }));

        const { data, error } = await supabase
          .from('rfv_customers')
          .upsert(batchData, { 
            onConflict: 'name',
            ignoreDuplicates: false 
          })
          .select('id');

        if (error) {
          console.error(`Batch ${batchIndex + 1} error:`, error);
          errorCount += batch.length;
        } else {
          successCount += data?.length || batch.length;
          console.log(`Batch ${batchIndex + 1}/${batches.length}: ${data?.length || batch.length} saved`);
        }
      }

      console.log(`Save complete: ${successCount} success, ${errorCount} errors`);
      setHasUnsavedChanges(false);
      
      // Save upload log
      const segmentBreakdown: Record<string, number> = {};
      customers.forEach(c => {
        segmentBreakdown[c.segment] = (segmentBreakdown[c.segment] || 0) + 1;
      });

      const { error: logError } = await supabase.from('rfv_upload_logs').insert({
        uploaded_by: user?.id,
        uploaded_by_name: profile?.full_name || 'Usuário',
        file_name: file?.name || 'Upload direto',
        total_customers: customers.length,
        data_reference_date: dataReferenceDate || null,
        segment_breakdown: segmentBreakdown,
      });

      if (logError) {
        console.error('Error saving upload log:', logError);
      }

      await loadUploadLogs();
      
      toast({
        title: "Dados salvos com sucesso!",
        description: `${successCount} clientes salvos${errorCount > 0 ? `, ${errorCount} erros` : ''}`,
      });

      // Reload data to get IDs
      await loadExistingData();
    } catch (error) {
      console.error('Error saving to database:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar os dados.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  // Generate AI Strategy for selected customer
  const generateAIStrategy = async () => {
    if (!selectedCustomer) return;
    
    setIsLoadingAI(true);
    setAiStrategy(null);

    try {
      const { data, error } = await supabase.functions.invoke('rfv-ai-strategy', {
        body: {
          customer: {
            name: selectedCustomer.name,
            segment: selectedCustomer.segment,
            segmentName: RFV_SEGMENTS[selectedCustomer.segment].name,
            totalPurchases: selectedCustomer.totalPurchases,
            totalValue: selectedCustomer.totalValue,
            averageTicket: selectedCustomer.averageTicket,
            daysSinceLastPurchase: selectedCustomer.daysSinceLastPurchase,
            recencyScore: selectedCustomer.recencyScore,
            frequencyScore: selectedCustomer.frequencyScore,
            valueScore: selectedCustomer.valueScore,
          }
        }
      });

      if (error) throw error;
      
      setAiStrategy(data.strategy);
      toast({
        title: "Estratégia gerada!",
        description: "A IA analisou o cliente e criou uma estratégia personalizada.",
      });
    } catch (error) {
      console.error('Error generating AI strategy:', error);
      toast({
        title: "Erro ao gerar estratégia",
        description: "Não foi possível gerar a estratégia com IA.",
        variant: "destructive",
      });
    }

    setIsLoadingAI(false);
  };

  const getSegmentStats = () => {
    const stats: Record<RFVSegment, { count: number; revenue: number; avgTicket: number }> = {
      champions: { count: 0, revenue: 0, avgTicket: 0 },
      loyal: { count: 0, revenue: 0, avgTicket: 0 },
      potential: { count: 0, revenue: 0, avgTicket: 0 },
      at_risk: { count: 0, revenue: 0, avgTicket: 0 },
      hibernating: { count: 0, revenue: 0, avgTicket: 0 },
      lost: { count: 0, revenue: 0, avgTicket: 0 },
    };

    for (const customer of customers) {
      stats[customer.segment].count++;
      stats[customer.segment].revenue += customer.totalValue;
    }

    for (const segment of Object.keys(stats) as RFVSegment[]) {
      if (stats[segment].count > 0) {
        stats[segment].avgTicket = stats[segment].revenue / stats[segment].count;
      }
    }

    return stats;
  };

  // Advanced filters state
  const [filterMinValue, setFilterMinValue] = useState<string>('');
  const [filterMaxValue, setFilterMaxValue] = useState<string>('');
  const [filterMinDays, setFilterMinDays] = useState<string>('');
  const [filterMaxDays, setFilterMaxDays] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');

  // Table pagination and sorting
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(100);
  const [sortBy, setSortBy] = useState<'totalValue' | 'averageTicket' | 'totalPurchases' | 'daysSinceLastPurchase' | 'name'>('totalValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedCustomers = customers
    .filter(c => {
      // Segment filter
      if (selectedSegment !== 'all' && c.segment !== selectedSegment) return false;
      
      // Name search
      if (searchName && !c.name.toLowerCase().includes(searchName.toLowerCase())) return false;
      
      // Value range filter
      if (filterMinValue && c.totalValue < parseFloat(filterMinValue)) return false;
      if (filterMaxValue && c.totalValue > parseFloat(filterMaxValue)) return false;
      
      // Days since purchase filter
      if (filterMinDays && c.daysSinceLastPurchase < parseInt(filterMinDays)) return false;
      if (filterMaxDays && c.daysSinceLastPurchase > parseInt(filterMaxDays)) return false;
      
      // Date range filter (last purchase date)
      if (filterDateFrom && c.lastPurchaseDate < filterDateFrom) return false;
      if (filterDateTo && c.lastPurchaseDate > filterDateTo) return false;
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'totalValue':
          comparison = a.totalValue - b.totalValue;
          break;
        case 'averageTicket':
          comparison = a.averageTicket - b.averageTicket;
          break;
        case 'totalPurchases':
          comparison = a.totalPurchases - b.totalPurchases;
          break;
        case 'daysSinceLastPurchase':
          comparison = a.daysSinceLastPurchase - b.daysSinceLastPurchase;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Keep backward compatibility with filteredCustomers name
  const filteredCustomers = filteredAndSortedCustomers;

  // Reset pagination when filters change
  useEffect(() => {
    setTablePage(1);
  }, [
    selectedSegment,
    searchName,
    filterMinValue,
    filterMaxValue,
    filterMinDays,
    filterMaxDays,
    filterDateFrom,
    filterDateTo,
    customers.length,
    sortBy,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / tablePageSize));
  const safePage = Math.min(tablePage, totalPages);
  const pagedCustomers = filteredCustomers.slice(
    (safePage - 1) * tablePageSize,
    safePage * tablePageSize
  );

  const clearFilters = () => {
    setFilterMinValue('');
    setFilterMaxValue('');
    setFilterMinDays('');
    setFilterMaxDays('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchName('');
    setSelectedSegment('all');
  };

  const hasActiveFilters = filterMinValue || filterMaxValue || filterMinDays || filterMaxDays || 
    filterDateFrom || filterDateTo || searchName || selectedSegment !== 'all';

  const exportToExcel = () => {
    if (filteredCustomers.length === 0) {
      toast({
        title: "Nenhum cliente para exportar",
        description: "Não há clientes correspondentes aos filtros atuais.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredCustomers.map(customer => ({
      "Nome": customer.name,
      "Email": customer.email || "",
      "Telefone": customer.phone || "",
      "Total de Compras": customer.totalPurchases,
      "Valor Total (R$)": customer.totalValue.toFixed(2),
      "Ticket Médio (R$)": customer.averageTicket.toFixed(2),
      "Primeira Compra": customer.firstPurchaseDate || "",
      "Última Compra": customer.lastPurchaseDate,
      "Dias Sem Compra": customer.daysSinceLastPurchase,
      "Score Recência (R)": customer.recencyScore,
      "Score Frequência (F)": customer.frequencyScore,
      "Score Valor (V)": customer.valueScore,
      "Score Total": customer.recencyScore + customer.frequencyScore + customer.valueScore,
      "Segmento": RFV_SEGMENTS[customer.segment].name,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes RFV");

    // Auto-size columns
    const colWidths = [
      { wch: 30 }, // Nome
      { wch: 25 }, // Email
      { wch: 15 }, // Telefone
      { wch: 16 }, // Total de Compras
      { wch: 16 }, // Valor Total
      { wch: 16 }, // Ticket Médio
      { wch: 14 }, // Primeira Compra
      { wch: 14 }, // Última Compra
      { wch: 16 }, // Dias Sem Compra
      { wch: 18 }, // Score Recência
      { wch: 20 }, // Score Frequência
      { wch: 16 }, // Score Valor
      { wch: 12 }, // Score Total
      { wch: 15 }, // Segmento
    ];
    worksheet["!cols"] = colWidths;

    const fileName = `clientes_rfv_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({
      title: "Exportação concluída",
      description: `${filteredCustomers.length} clientes exportados para ${fileName}`,
    });
  };

  const segmentStats = getSegmentStats();

  const pieChartData = Object.entries(segmentStats)
    .filter(([, data]) => data.count > 0)
    .map(([segment, data], index) => ({
      name: RFV_SEGMENTS[segment as RFVSegment].name,
      value: data.count,
      revenue: data.revenue,
      fill: CHART_COLORS[index],
    }));

  const radarData = selectedCustomer ? [
    { subject: 'Recência', value: selectedCustomer.recencyScore, fullMark: 5 },
    { subject: 'Frequência', value: selectedCustomer.frequencyScore, fullMark: 5 },
    { subject: 'Valor', value: selectedCustomer.valueScore, fullMark: 5 },
  ] : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Generate personalized WhatsApp message based on segment
  const getWhatsAppMessage = (customer: RFVCustomer): string => {
    const firstName = customer.name.split(' ')[0];
    const messages: Record<RFVSegment, string> = {
      champions: `Olá ${firstName}! 👑 Tudo bem? Aqui é da Unique. Você é uma cliente especial para nós! Temos novidades exclusivas e gostaríamos de te contar. Podemos conversar?`,
      loyal: `Oi ${firstName}! 💙 Tudo bem? Passando para saber como você está. Temos algumas novidades que combinam com seu perfil. Posso te contar mais?`,
      potential: `Olá ${firstName}! ✨ Tudo bem com você? Esperamos que esteja gostando dos nossos serviços. Gostaríamos de saber sua opinião e mostrar o que temos de novo!`,
      at_risk: `Oi ${firstName}! 💛 Sentimos sua falta por aqui! Como você está? Estamos com condições especiais e gostaríamos muito de te receber novamente. Posso te apresentar?`,
      hibernating: `Olá ${firstName}! Há quanto tempo! Como você está? Temos muitas novidades na Unique e gostaríamos de te mostrar. Você está disponível para uma conversa?`,
      lost: `Oi ${firstName}! Tudo bem? Estamos com saudade de você! Preparamos algo especial para nossos clientes. Posso te contar mais?`,
    };
    return encodeURIComponent(messages[customer.segment]);
  };

  const getWhatsAppNumber = (customer: RFVCustomer): string => {
    const number = customer.whatsapp || customer.phone || '';
    // Remove all non-numeric characters
    const cleaned = number.replace(/\D/g, '');
    // Add Brazil country code if not present
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Matriz RFV - Segmentação de Clientes
          </h1>
          <p className="text-muted-foreground mt-2">
            Recência, Frequência e Valor para ações estratégicas de CS e Farmer
          </p>
        </div>

        {/* Info Banner - Data comes from admin import */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Dados carregados automaticamente</p>
                  <p className="text-sm text-muted-foreground">
                    Os dados são importados via painel Admin → Importação de Dados → Calcular RFV
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {customers.length.toLocaleString('pt-BR')} clientes
                </Badge>
                <Button variant="outline" size="sm" onClick={loadExistingData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>


        {isLoadingData && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Carregando dados existentes...</span>
          </div>
        )}

        {customers.length > 0 && (
          <>
            {/* Segment Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {(Object.entries(RFV_SEGMENTS) as [RFVSegment, typeof RFV_SEGMENTS.champions][]).map(([key, segment]) => {
                const stats = segmentStats[key];
                const Icon = segment.icon;
                return (
                  <Card 
                    key={key} 
                    className={`cursor-pointer transition-all ${selectedSegment === key ? 'ring-2 ring-primary' : 'hover:shadow-lg'}`}
                    onClick={() => setSelectedSegment(selectedSegment === key ? 'all' : key)}
                  >
                    <CardContent className="p-4">
                      <div className={`${segment.bgLight} p-2 rounded-lg w-fit mb-2`}>
                        <Icon className={`h-5 w-5 ${segment.textColor}`} />
                      </div>
                      <p className="text-sm text-muted-foreground">{segment.name}</p>
                      <p className="text-2xl font-bold">{stats.count}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(stats.revenue)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            `${value} clientes | ${formatCurrency(props.payload.revenue)}`,
                            name
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Faturamento por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={pieChartData}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))">
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Filter Presets */}
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Filtros Rápidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedSegment === 'champions' ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      clearFilters();
                      setSelectedSegment('champions');
                    }}
                  >
                    <Crown className="h-4 w-4 text-yellow-500" />
                    Campeões
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-emerald-500/50 hover:bg-emerald-500/10"
                    onClick={() => {
                      clearFilters();
                      setFilterMinValue('5000');
                      setSelectedSegment('all');
                    }}
                  >
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Premium (+R$5.000)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-blue-500/50 hover:bg-blue-500/10"
                    onClick={() => {
                      clearFilters();
                      setFilterMinValue('10000');
                      setSelectedSegment('all');
                    }}
                  >
                    <Star className="h-4 w-4 text-blue-500" />
                    VIP (+R$10.000)
                  </Button>
                  <Button
                    variant={selectedSegment === 'at_risk' ? "default" : "outline"}
                    size="sm"
                    className="gap-2 border-orange-500/50 hover:bg-orange-500/10"
                    onClick={() => {
                      clearFilters();
                      setSelectedSegment('at_risk');
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Em Risco
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-red-500/50 hover:bg-red-500/10"
                    onClick={() => {
                      clearFilters();
                      setFilterMinDays('90');
                      setSelectedSegment('all');
                    }}
                  >
                    <Clock className="h-4 w-4 text-red-500" />
                    Inativos (+90 dias)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-purple-500/50 hover:bg-purple-500/10"
                    onClick={() => {
                      clearFilters();
                      setFilterMinDays('180');
                      setSelectedSegment('all');
                    }}
                  >
                    <RefreshCw className="h-4 w-4 text-purple-500" />
                    Hibernando (+180 dias)
                  </Button>
                  <Button
                    variant={selectedSegment === 'lost' ? "default" : "outline"}
                    size="sm"
                    className="gap-2 border-gray-500/50 hover:bg-gray-500/10"
                    onClick={() => {
                      clearFilters();
                      setSelectedSegment('lost');
                    }}
                  >
                    <Users className="h-4 w-4 text-gray-500" />
                    Perdidos
                  </Button>
                  <Button
                    variant={selectedSegment === 'loyal' ? "default" : "outline"}
                    size="sm"
                    className="gap-2 border-blue-500/50 hover:bg-blue-500/10"
                    onClick={() => {
                      clearFilters();
                      setSelectedSegment('loyal');
                    }}
                  >
                    <Heart className="h-4 w-4 text-blue-500" />
                    Fiéis
                  </Button>
                  <Button
                    variant={selectedSegment === 'potential' ? "default" : "outline"}
                    size="sm"
                    className="gap-2 border-amber-500/50 hover:bg-amber-500/10"
                    onClick={() => {
                      clearFilters();
                      setSelectedSegment('potential');
                    }}
                  >
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    Potenciais
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-green-500/50 hover:bg-green-500/10"
                    onClick={() => {
                      clearFilters();
                      setFilterMaxDays('30');
                      setSelectedSegment('all');
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Recentes (-30 dias)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Filters */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Filtros Avançados
                  </span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Limpar Filtros
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Name Search */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Buscar por Nome</Label>
                    <Input
                      placeholder="Digite o nome..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Value Range */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Total (R$)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={filterMinValue}
                        onChange={(e) => setFilterMinValue(e.target.value)}
                        className="w-1/2"
                      />
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={filterMaxValue}
                        onChange={(e) => setFilterMaxValue(e.target.value)}
                        className="w-1/2"
                      />
                    </div>
                  </div>

                  {/* Days Since Purchase */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Dias sem Compra</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={filterMinDays}
                        onChange={(e) => setFilterMinDays(e.target.value)}
                        className="w-1/2"
                      />
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={filterMaxDays}
                        onChange={(e) => setFilterMaxDays(e.target.value)}
                        className="w-1/2"
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Última Compra (Data)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="w-1/2"
                      />
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="w-1/2"
                      />
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Ordenar por</Label>
                    <div className="flex gap-2 mt-1">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="totalValue">💰 Valor Total</option>
                        <option value="averageTicket">📊 Ticket Médio</option>
                        <option value="totalPurchases">🛒 Qtd Compras</option>
                        <option value="daysSinceLastPurchase">📅 Dias sem Compra</option>
                        <option value="name">🔤 Nome</option>
                      </select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className="shrink-0"
                        title={sortOrder === 'desc' ? 'Maior → Menor' : 'Menor → Maior'}
                      >
                        {sortOrder === 'desc' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{filteredCustomers.length} de {customers.length} clientes</Badge>
                    <span>correspondentes aos filtros</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Detail and Actions */}
            <div className={`grid gap-6 ${isTableExpanded ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
              {/* Customer List */}
              <Card className={isTableExpanded ? '' : 'lg:col-span-2'}>
              <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span>
                      {selectedSegment === 'all' ? 'Todos os Clientes' : RFV_SEGMENTS[selectedSegment].name}
                    </span>

                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          className="gap-2 bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setBulkScriptType('');
                            setBulkMessage('');
                            setBulkProgress(0);
                            setBulkSentCount(0);
                            setIsSendingBulk(false);
                            setShowBulkAction(true);
                          }}
                          disabled={getCustomersWithPhone().length === 0}
                        >
                          <Send className="h-4 w-4" />
                          Disparo em Massa
                          <Badge variant="secondary" className="bg-white/20 text-white">
                            {getCustomersWithPhone().length}
                          </Badge>
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToExcel}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Exportar Excel
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsTableExpanded(!isTableExpanded)}
                          className="gap-1"
                        >
                          {isTableExpanded ? (
                            <>
                              <ArrowDownRight className="h-4 w-4" />
                              Minimizar
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-4 w-4" />
                              Expandir
                            </>
                          )}
                        </Button>
                        <Badge variant="outline">{filteredCustomers.length} clientes</Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          className="h-8 px-2 border rounded-md bg-background text-sm"
                          value={tablePageSize}
                          onChange={(e) => setTablePageSize(parseInt(e.target.value, 10))}
                          aria-label="Itens por página"
                        >
                          <option value={50}>50/pág</option>
                          <option value={100}>100/pág</option>
                          <option value={250}>250/pág</option>
                          <option value={500}>500/pág</option>
                        </select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          Página {safePage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Scroll indicator bar */}
                  <div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        ⬅️ Arraste para ver todas as colunas ➡️
                      </span>
                      {selectedCustomerIds.size > 0 && (
                        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                          <CheckSquare className="h-3 w-3" />
                          {selectedCustomerIds.size} selecionados
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-4 w-4 p-0 ml-1 hover:bg-green-200"
                            onClick={clearSelections}
                          >
                            ✕
                          </Button>
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Selecione clientes para disparo em massa</span>
                    </div>
                  </div>
                  {/* Scrollbar always visible container */}
                  <div className="border rounded-lg rfv-table-scroll max-h-[600px] overflow-x-auto overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                    <Table className="min-w-[1500px]">
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="w-[40px] text-center bg-background">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={toggleSelectAll}
                              title="Selecionar/Deselecionar todos da página"
                            >
                              {pagedCustomers.filter(c => c.id && (c.whatsapp || c.phone)).every(c => selectedCustomerIds.has(c.id!)) && pagedCustomers.filter(c => c.id && (c.whatsapp || c.phone)).length > 0 ? (
                                <CheckSquare className="h-4 w-4 text-green-600" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead className="w-[45px] text-center bg-background">#</TableHead>
                          <TableHead className="min-w-[200px] bg-background">Cliente</TableHead>
                          <TableHead className="text-right min-w-[130px] bg-background font-bold">💰 Total</TableHead>
                          <TableHead className="min-w-[130px] bg-background">Contato</TableHead>
                          <TableHead className="min-w-[90px] bg-background">Prontuário</TableHead>
                          <TableHead className="min-w-[100px] bg-background">Segmento</TableHead>
                          <TableHead className="text-center min-w-[90px] bg-background">RFV</TableHead>
                          <TableHead className="text-right min-w-[70px] bg-background">Compras</TableHead>
                          <TableHead className="text-right min-w-[110px] bg-background">Ticket</TableHead>
                          <TableHead className="min-w-[100px] bg-background">Última</TableHead>
                          <TableHead className="text-center min-w-[60px] bg-background">Dias</TableHead>
                          <TableHead className="text-center min-w-[60px] bg-background">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedCustomers.map((customer, index) => {
                          const segment = RFV_SEGMENTS[customer.segment];
                          const Icon = segment.icon;
                          const contactPhone = customer.whatsapp || customer.phone;
                          return (
                            <TableRow 
                              key={customer.id || index} 
                              className={`cursor-pointer hover:bg-muted/50 ${selectedCustomer?.name === customer.name ? 'bg-muted' : ''}`}
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setAiStrategy(null);
                              }}
                            >
                              {/* Checkbox */}
                              <TableCell className="text-center w-[40px]">
                                {customer.id && contactPhone ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => toggleCustomerSelection(customer.id!, e)}
                                  >
                                    {selectedCustomerIds.has(customer.id) ? (
                                      <CheckSquare className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Square className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              {/* Ranking */}
                              <TableCell className="text-center font-bold text-muted-foreground w-[45px]">
                                {(safePage - 1) * tablePageSize + index + 1}º
                              </TableCell>
                              {/* Cliente */}
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{customer.name}</p>
                                  {customer.cpf && (
                                    <p className="text-xs text-muted-foreground">CPF: {customer.cpf}</p>
                                  )}
                                </div>
                              </TableCell>
                              {/* Total Vendido - MOVED UP */}
                              <TableCell className="text-right font-bold text-green-600 text-base">
                                {formatCurrency(customer.totalValue)}
                              </TableCell>
                              {/* Contato */}
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="space-y-0.5 flex-1 min-w-0">
                                    {contactPhone ? (
                                      <a 
                                        href={`https://wa.me/55${contactPhone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Phone className="h-3 w-3" />
                                        {contactPhone}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-amber-500 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Sem telefone
                                      </span>
                                    )}
                                    {customer.email && (
                                      <p className="text-xs text-muted-foreground truncate max-w-[100px]">{customer.email}</p>
                                    )}
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                    onClick={(e) => handleOpenEditContact(customer, e)}
                                    title="Editar contato"
                                  >
                                    <UserPlus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              {/* Prontuário */}
                              <TableCell>
                                {customer.prontuario ? (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {customer.prontuario}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              {/* Segmento */}
                              <TableCell>
                                <Badge className={`${segment.color} text-white text-xs`}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {segment.name}
                                </Badge>
                              </TableCell>
                              {/* RFV Scores */}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <Badge variant={customer.recencyScore >= 4 ? "default" : "outline"} className="text-xs px-1 py-0">
                                    {customer.recencyScore}
                                  </Badge>
                                  <Badge variant={customer.frequencyScore >= 4 ? "default" : "outline"} className="text-xs px-1 py-0">
                                    {customer.frequencyScore}
                                  </Badge>
                                  <Badge variant={customer.valueScore >= 4 ? "default" : "outline"} className="text-xs px-1 py-0">
                                    {customer.valueScore}
                                  </Badge>
                                </div>
                              </TableCell>
                              {/* Compras */}
                              <TableCell className="text-right text-sm">
                                {customer.totalPurchases}
                              </TableCell>
                              {/* Ticket Médio */}
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {formatCurrency(customer.averageTicket)}
                              </TableCell>
                              {/* Última Compra */}
                              <TableCell className="text-sm">
                                {new Date(customer.lastPurchaseDate).toLocaleDateString('pt-BR')}
                              </TableCell>
                              {/* Dias */}
                              <TableCell className="text-center">
                                <Badge variant={customer.daysSinceLastPurchase <= 30 ? "default" : customer.daysSinceLastPurchase <= 90 ? "secondary" : "destructive"} className="text-xs">
                                  {customer.daysSinceLastPurchase}
                                </Badge>
                              </TableCell>
                              {/* Ação */}
                              <TableCell className="text-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={(e) => handleOpenQuickAction(customer, e)}
                                  disabled={!contactPhone}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Actions Panel - Show always when customer selected, can be closed in expanded view */}
              {selectedCustomer && (
              <Card className={isTableExpanded ? 'fixed right-4 top-24 w-96 max-h-[calc(100vh-120px)] overflow-y-auto z-50 shadow-2xl' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Ações Recomendadas
                    </span>
                    {isTableExpanded && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCustomer(null)}
                      >
                        ✕
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Summary */}
                  <div className={`p-4 rounded-lg ${RFV_SEGMENTS[selectedCustomer.segment].bgLight}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {(() => {
                        const Icon = RFV_SEGMENTS[selectedCustomer.segment].icon;
                        return <Icon className={`h-5 w-5 ${RFV_SEGMENTS[selectedCustomer.segment].textColor}`} />;
                      })()}
                      <span className="font-semibold">{selectedCustomer.name}</span>
                    </div>
                    
                    {/* Action Buttons: Edit & Delete */}
                    <div className="flex gap-2 mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handleOpenEditContact(selectedCustomer)}
                      >
                        <Edit className="h-3 w-3" />
                        Editar
                      </Button>
                      {role === 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setCustomerToDelete(selectedCustomer);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      )}
                    </div>
                    
                    {/* Contact Info */}
                    <div className="space-y-2 mb-3 pb-3 border-b border-border/50">
                      {(selectedCustomer.whatsapp || selectedCustomer.phone) ? (
                        <a 
                          href={`https://wa.me/55${(selectedCustomer.whatsapp || selectedCustomer.phone)?.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-green-600 hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {selectedCustomer.whatsapp || selectedCustomer.phone}
                        </a>
                      ) : (
                        <p className="text-xs text-amber-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Sem telefone cadastrado
                        </p>
                      )}
                      {selectedCustomer.email && (
                        <a 
                          href={`mailto:${selectedCustomer.email}`}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <Mail className="h-4 w-4" />
                          {selectedCustomer.email}
                        </a>
                      )}
                      {selectedCustomer.prontuario && (
                        <div className="flex items-center gap-2 text-sm">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span>Prontuário: <strong>{selectedCustomer.prontuario}</strong></span>
                        </div>
                      )}
                      {selectedCustomer.cpf && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>CPF: {selectedCustomer.cpf}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Compras</p>
                        <p className="font-bold">{selectedCustomer.totalPurchases}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total Vendido</p>
                        <p className="font-bold text-green-600">{formatCurrency(selectedCustomer.totalValue)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Ticket Médio</p>
                        <p className="font-bold">{formatCurrency(selectedCustomer.averageTicket)}</p>
                      </div>
                    </div>
                    
                    {/* Days and Dates */}
                    <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Última Compra</p>
                        <p className="font-medium">{new Date(selectedCustomer.lastPurchaseDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dias sem Compra</p>
                        <p className="font-medium">{selectedCustomer.daysSinceLastPurchase}d</p>
                      </div>
                    </div>
                  </div>

                  {/* Radar Chart */}
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis domain={[0, 5]} />
                        <Radar
                          name="RFV"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AI Strategy Button */}
                  <div className="pt-2">
                    <Button 
                      onClick={generateAIStrategy} 
                      disabled={isLoadingAI}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      {isLoadingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gerando estratégia...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar Estratégia com IA
                        </>
                      )}
                    </Button>
                  </div>

                  {/* AI Generated Strategy */}
                  {aiStrategy && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <h4 className="font-semibold text-sm text-purple-700 dark:text-purple-300">
                          Estratégia Personalizada (IA)
                        </h4>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                        {aiStrategy}
                      </div>
                    </div>
                  )}

                  {/* Action Cards */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Próximas Ações Sugeridas:</h4>
                    {RFV_SEGMENTS[selectedCustomer.segment].actions.slice(0, 3).map((action, index) => (
                      <div 
                        key={index}
                        className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    {/* WhatsApp Button - Main CTA */}
                    {(selectedCustomer.whatsapp || selectedCustomer.phone) && (
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white" 
                        asChild
                      >
                        <a 
                          href={`https://wa.me/${getWhatsAppNumber(selectedCustomer)}?text=${getWhatsAppMessage(selectedCustomer)}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Enviar WhatsApp
                        </a>
                      </Button>
                    )}
                    
                    {/* Quick Action Button */}
                    {(selectedCustomer.whatsapp || selectedCustomer.phone) && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full border-green-500/50 text-green-600 hover:bg-green-50"
                        onClick={(e) => handleOpenQuickAction(selectedCustomer, e)}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Ação Rápida com Script
                      </Button>
                    )}
                    
                    {/* Secondary Actions */}
                    <div className="flex gap-2">
                      {selectedCustomer.phone && (
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a href={`tel:${selectedCustomer.phone}`}>
                            <Phone className="h-4 w-4 mr-1" />
                            Ligar
                          </a>
                        </Button>
                      )}
                      {selectedCustomer.email && (
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a href={`mailto:${selectedCustomer.email}`}>
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Action History Component */}
                  <div className="pt-4 border-t">
                    <RFVActionHistory 
                      customerId={selectedCustomer.id}
                      customerName={selectedCustomer.name}
                    />
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Empty state when no customer selected and not expanded */}
              {!selectedCustomer && !isTableExpanded && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-5 w-5" />
                      Ações Recomendadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Selecione um cliente na lista para ver as ações recomendadas</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Segment Strategy Cards */}
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Estratégias por Segmento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.entries(RFV_SEGMENTS) as [RFVSegment, typeof RFV_SEGMENTS.champions][]).map(([key, segment]) => {
                  const stats = segmentStats[key];
                  if (stats.count === 0) return null;
                  const Icon = segment.icon;
                  return (
                    <Card key={key}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`${segment.color} p-2 rounded-lg`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{segment.name}</CardTitle>
                            <CardDescription>{segment.criteria}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{segment.description}</p>
                        <div className="space-y-2">
                          {segment.actions.slice(0, 2).map((action, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                              <span>{action.title}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                          <span className="text-muted-foreground">{stats.count} clientes</span>
                          <span className="font-semibold">{formatCurrency(stats.revenue)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Quick WhatsApp Action Dialog */}
      <Dialog open={showQuickAction} onOpenChange={setShowQuickAction}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              Ação Rápida - WhatsApp
            </DialogTitle>
            {quickActionCustomer && (
              <DialogDescription className="flex items-center gap-2">
                <span className="font-medium">{quickActionCustomer.name}</span>
                <Badge className={`${RFV_SEGMENTS[quickActionCustomer.segment].color} text-white text-xs`}>
                  {RFV_SEGMENTS[quickActionCustomer.segment].name}
                </Badge>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4 flex-1 overflow-hidden">
            {/* Script Categories */}
            {quickActionCustomer && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Escolha o tipo de abordagem:</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Button
                      variant={selectedScriptType === 'relationship' ? "default" : "outline"}
                      size="sm"
                      className="gap-2 justify-start"
                      onClick={() => {
                        const scripts = getScriptsForCustomer(quickActionCustomer);
                        const script = scripts.find(s => s.key === 'relationship');
                        if (script) handleSelectScript('relationship', script.text);
                      }}
                    >
                      <HandHeart className="h-4 w-4 text-pink-500" />
                      Relacionamento
                    </Button>
                    <Button
                      variant={selectedScriptType === 'referral' ? "default" : "outline"}
                      size="sm"
                      className="gap-2 justify-start"
                      onClick={() => {
                        const scripts = getScriptsForCustomer(quickActionCustomer);
                        const script = scripts.find(s => s.key === 'referral');
                        if (script) handleSelectScript('referral', script.text);
                      }}
                    >
                      <UserPlus className="h-4 w-4 text-blue-500" />
                      Indicação
                    </Button>
                    <Button
                      variant={selectedScriptType === 'ambassador' ? "default" : "outline"}
                      size="sm"
                      className="gap-2 justify-start"
                      onClick={() => {
                        const scripts = getScriptsForCustomer(quickActionCustomer);
                        const script = scripts.find(s => s.key === 'ambassador');
                        if (script) handleSelectScript('ambassador', script.text);
                      }}
                    >
                      <Award className="h-4 w-4 text-yellow-500" />
                      Embaixador
                    </Button>
                    <Button
                      variant={selectedScriptType === 'upsell' ? "default" : "outline"}
                      size="sm"
                      className="gap-2 justify-start"
                      onClick={() => {
                        const scripts = getScriptsForCustomer(quickActionCustomer);
                        const script = scripts.find(s => s.key === 'upsell');
                        if (script) handleSelectScript('upsell', script.text);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Upsell
                    </Button>
                    <Button
                      variant={selectedScriptType === 'reactivation' || selectedScriptType === 'winback' ? "default" : "outline"}
                      size="sm"
                      className="gap-2 justify-start"
                      onClick={() => {
                        const scripts = getScriptsForCustomer(quickActionCustomer);
                        const script = scripts.find(s => s.key === 'reactivation' || s.key === 'winback');
                        if (script) handleSelectScript(script.key, script.text);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 text-orange-500" />
                      Reativação
                    </Button>
                    <Button
                      variant={selectedScriptType === 'campaign_month' ? "default" : "outline"}
                      size="sm"
                      className="gap-2 justify-start"
                      onClick={() => {
                        const scripts = getScriptsForCustomer(quickActionCustomer);
                        const script = scripts.find(s => s.key === 'campaign_month');
                        if (script) handleSelectScript('campaign_month', script.text);
                      }}
                    >
                      <Megaphone className="h-4 w-4 text-purple-500" />
                      Campanha do Mês
                    </Button>
                  </div>
                </div>

                {/* All Available Scripts */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Ou selecione um script específico:</Label>
                  <ScrollArea className="h-[150px] border rounded-lg p-2">
                    <div className="space-y-2">
                      {getScriptsForCustomer(quickActionCustomer).map((script) => (
                        <div
                          key={script.key}
                          className={`p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedScriptType === script.key
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                          onClick={() => handleSelectScript(script.key, script.text)}
                        >
                          <p className="text-sm font-medium">{script.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{script.text}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Message Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Mensagem personalizada:</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7"
                      onClick={handleCopyMessage}
                      disabled={!customMessage}
                    >
                      {copiedScript ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      Copiar
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Selecione um script acima ou escreva sua mensagem..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Customer Info Summary */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Total Gasto</p>
                      <p className="font-bold">{formatCurrency(quickActionCustomer.totalValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Última Compra</p>
                      <p className="font-bold">{quickActionCustomer.daysSinceLastPurchase}d atrás</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Ticket Médio</p>
                      <p className="font-bold">{formatCurrency(quickActionCustomer.averageTicket)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowQuickAction(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCopyMessage}
              disabled={!customMessage}
            >
              <Copy className="h-4 w-4" />
              Copiar Mensagem
            </Button>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={handleSendWhatsApp}
              disabled={!customMessage || !quickActionCustomer}
            >
              <Send className="h-4 w-4" />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk WhatsApp Action Dialog */}
      <Dialog open={showBulkAction} onOpenChange={setShowBulkAction}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-500" />
              Disparo em Massa - WhatsApp
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {getCustomersWithPhone().length} clientes com telefone
              </Badge>
              {selectedSegment !== 'all' && (
                <Badge className={`${RFV_SEGMENTS[selectedSegment].color} text-white`}>
                  {RFV_SEGMENTS[selectedSegment].name}
                </Badge>
              )}
              {hasActiveFilters && (
                <Badge variant="outline">Filtros ativos</Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 flex-1 overflow-hidden">
            {/* Script Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Escolha o tipo de mensagem:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {getBulkScripts(selectedSegment).map(script => (
                  <Button
                    key={script.key}
                    variant={bulkScriptType === script.key ? "default" : "outline"}
                    size="sm"
                    className="gap-2 justify-start text-left h-auto py-2"
                    onClick={() => handleSelectBulkScript(script.key, script.text)}
                  >
                    <span className="text-sm">{script.title}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">
                  Mensagem (use {'{nome}'} para personalizar):
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7"
                  onClick={() => {
                    navigator.clipboard.writeText(bulkMessage);
                    toast({ title: "Mensagem copiada!" });
                  }}
                  disabled={!bulkMessage}
                >
                  <Copy className="h-3 w-3" />
                  Copiar
                </Button>
              </div>
              <Textarea
                placeholder="Selecione um script acima ou escreva sua mensagem... Use {nome} para personalizar com o nome do cliente."
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Preview */}
            {bulkMessage && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <Label className="text-xs text-muted-foreground">Preview (primeiro cliente):</Label>
                <p className="text-sm mt-1">
                  {bulkMessage.replace(/{nome}/g, getSelectedCustomersForBulk()[0]?.name.split(' ')[0] || 'Cliente')}
                </p>
              </div>
            )}

            {/* Quantity Limit Selector */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <Label className="text-sm font-medium mb-3 block">Quantos clientes disparar?</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCustomerIds.size > 0 ? (
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckSquare className="h-3 w-3" />
                    {selectedCustomerIds.size} selecionados manualmente
                  </Badge>
                ) : (
                  <>
                    {[5, 10, 20, 30, 50].map(num => (
                      <Button
                        key={num}
                        variant={bulkQuantityLimit === num ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBulkQuantityLimit(num)}
                        disabled={getCustomersWithPhone().length < num}
                      >
                        {num}
                      </Button>
                    ))}
                    <Button
                      variant={bulkQuantityLimit === 'all' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBulkQuantityLimit('all')}
                    >
                      Todos ({getCustomersWithPhone().length})
                    </Button>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Total com Telefone</p>
                  <p className="font-bold text-lg">{getCustomersWithPhone().length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Serão Enviados</p>
                  <p className="font-bold text-lg text-green-600">{getSelectedCustomersForBulk().length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tempo Estimado</p>
                  <p className="font-bold text-lg">{Math.ceil(getSelectedCustomersForBulk().length * 4 / 60)}min</p>
                </div>
              </div>
            </div>

            {/* Progress */}
            {isSendingBulk && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Enviando mensagens...</span>
                  <span className="font-medium">{bulkSentCount} de {getSelectedCustomersForBulk().length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${bulkProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Anti-Block Tips */}
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/20">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs space-y-1">
                <p className="font-semibold text-amber-700">⚡ Dicas Anti-Bloqueio WhatsApp:</p>
                <ul className="list-disc list-inside text-amber-600 space-y-0.5">
                  <li>Envie em lotes pequenos (5-20 por vez)</li>
                  <li>Intervalo de 3-5s entre mensagens (automático)</li>
                  <li>Personalize com {'{nome}'} - evita ser detectado como spam</li>
                  <li>Aguarde 30min+ entre lotes grandes</li>
                  <li>Use número com histórico de conversas</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowBulkAction(false)} disabled={isSendingBulk}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleCopyBulkLinks}
              disabled={!bulkMessage || getCustomersWithPhone().length === 0}
            >
              <Copy className="h-4 w-4" />
              Copiar Links
            </Button>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={handleBulkWhatsAppOpen}
              disabled={!bulkMessage || getSelectedCustomersForBulk().length === 0 || isSendingBulk}
            >
              {isSendingBulk ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Iniciar Disparo ({getSelectedCustomersForBulk().length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Contact Dialog */}
      <Dialog open={showEditContact} onOpenChange={setShowEditContact}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Editar Contato
            </DialogTitle>
            <DialogDescription>
              {editingCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Buscar no Feegow */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-400">Buscar no Feegow</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSearchFeegow}
                  disabled={isSearchingFeegow}
                  className="gap-2"
                >
                  {isSearchingFeegow ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
              
              {feegowResults.length > 0 && (
                <div className="space-y-2 mt-3">
                  {feegowResults.map((patient, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-background border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectFeegowPatient(patient)}
                    >
                      <p className="text-sm font-medium">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.phone || patient.cellphone || 'Sem telefone'} • {patient.email || 'Sem e-mail'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Campos de edição manual */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(34) 99999-9999"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  placeholder="(34) 99999-9999"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditContact(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveContact} disabled={isSavingContact} className="gap-2">
              {isSavingContact ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este cliente da base RFV?
            </DialogDescription>
          </DialogHeader>
          
          {customerToDelete && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="font-semibold">{customerToDelete.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customerToDelete.cpf && `CPF: ${customerToDelete.cpf}`}
                  {customerToDelete.prontuario && ` • Prontuário: ${customerToDelete.prontuario}`}
                </p>
                <p className="text-sm mt-2">
                  Total: <span className="font-bold text-green-600">{formatCurrency(customerToDelete.totalValue)}</span>
                  {' • '}{customerToDelete.totalPurchases} compras
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                ⚠️ Esta ação não pode ser desfeita. O cliente será removido permanentemente da análise RFV.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCustomer} 
              disabled={isDeletingCustomer}
              className="gap-2"
            >
              {isDeletingCustomer ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Excluir Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RFVDashboard;
