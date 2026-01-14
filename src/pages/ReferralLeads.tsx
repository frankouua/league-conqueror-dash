import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Phone,
  Mail,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Stethoscope,
  Loader2,
  MessageSquare,
  Copy,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import { ReferralConversionReport } from "@/components/ReferralConversionReport";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type ReferralLeadStatus = Database["public"]["Enums"]["referral_lead_status"];

interface ReferralLead {
  id: string;
  team_id: string;
  referrer_name: string;
  referrer_phone: string | null;
  referred_name: string;
  referred_phone: string | null;
  referred_email: string | null;
  status: ReferralLeadStatus;
  assigned_to: string | null;
  registered_by: string;
  notes: string | null;
  last_contact_at: string | null;
  consultation_date: string | null;
  surgery_date: string | null;
  created_at: string;
  updated_at: string;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  assigned_profile?: { full_name: string } | null;
  registered_profile?: { full_name: string } | null;
}

interface LeadHistoryEntry {
  id: string;
  old_status: ReferralLeadStatus | null;
  new_status: ReferralLeadStatus;
  note: string | null;
  created_at: string;
  changed_by_profile?: { full_name: string } | null;
}

interface TeamMember {
  user_id: string;
  full_name: string;
}

// Scripts rápidos para contato de indicações
const REFERRAL_SCRIPTS = [
  {
    id: "first_contact",
    label: "1º Contato",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `Oi ${leadName.split(" ")[0]}! Tudo bem? 😊\n\nQuem está falando é ${sellerName} da Unique Plástica Avançada.\n\nA ${referrerName.split(" ")[0]} falou de você pra gente e disse que você pode estar pensando em fazer uma transformação especial! 💜\n\nPosso te contar mais sobre como funciona?`,
  },
  {
    id: "follow_up",
    label: "Follow-up",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `Oi ${leadName.split(" ")[0]}! 😊\n\nAqui é ${sellerName} da Unique Plástica Avançada.\n\nPassando pra saber se você viu minha mensagem anterior?\n\nA ${referrerName.split(" ")[0]} me disse que você tinha interesse em conhecer a Unique.\n\nQuando podemos conversar?`,
  },
  {
    id: "schedule",
    label: "Agendar Consulta",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${leadName.split(" ")[0]}, que maravilha! 🌟\n\nComo você veio através da ${referrerName.split(" ")[0]}, você tem um benefício especial!\n\nTenho horários essa semana para o seu Unique Day. Prefere presencial ou online?\n\n🗓 Terça às 10h\n🗓 Quinta às 14h\n\nQual fica melhor pra você?\n\n${sellerName} - Unique Plástica Avançada 💜`,
  },
  {
    id: "price_objection",
    label: "Objeção Preço",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${leadName.split(" ")[0]}, entendo perfeitamente sua preocupação! 💜\n\nA ${referrerName.split(" ")[0]} também tinha essa dúvida no início. O legal é que trabalhamos com várias formas de pagamento:\n\n💳 Parcelamos em até 12x\n💰 Desconto especial à vista\n📋 Planos personalizados\n\nO mais importante: na consulta você recebe um orçamento detalhado sem compromisso. A ${referrerName.split(" ")[0]} pode te contar como foi a experiência dela!\n\nQue tal agendarmos?\n\n${sellerName} - Unique Plástica Avançada`,
  },
  {
    id: "indecisive",
    label: "Paciente Indeciso",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${leadName.split(" ")[0]}, é totalmente normal ter dúvidas! 😊\n\nA ${referrerName.split(" ")[0]} passou pelo mesmo antes de decidir. O Unique Day serve exatamente pra isso: você conhece tudo, tira suas dúvidas com os especialistas e só depois decide.\n\nSem pressão, sem compromisso. 💜\n\nA consulta é o primeiro passo pra você ter clareza. Posso te encaixar essa semana?\n\n${sellerName} - Unique Plástica Avançada`,
  },
  {
    id: "thank_referrer",
    label: "Agradecer Indicação",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${referrerName.split(" ")[0]}! 💜\n\nAqui é ${sellerName} da Unique Plástica Avançada.\n\nPassando pra te agradecer por indicar a ${leadName.split(" ")[0]}!\n\nJá entrei em contato com ela e estamos conversando. Você é incrível! 🌟\n\nLembrando que quando ela fechar, você ganha um mimo especial da Unique! Te mantenho informada, tá?\n\nMuito obrigada pela confiança! 😘`,
  },
  {
    id: "clinic_invite",
    label: "Convite Clínica",
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${leadName.split(" ")[0]}! 🌟\n\nAqui é ${sellerName} da Unique Plástica Avançada.\n\nQue tal conhecer pessoalmente a Unique? A ${referrerName.split(" ")[0]} ama nosso espaço!\n\nTemos um ambiente acolhedor, equipe especializada e você pode ver de perto como funciona tudo.\n\n☕ Te ofereço um café especial!\n📍 Av. Getúlio Vargas, 955 - Uberlândia\n\nPosso marcar um horário pra você vir nos conhecer?`,
  },
  {
    id: "no_response",
    label: "Sem Resposta",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${leadName.split(" ")[0]}, essa é minha última tentativa! 😊\n\nRespeito seu tempo, mas não quero que você perca a chance de realizar seu sonho.\n\nA ${referrerName.split(" ")[0]} ficou tão feliz com o resultado dela e me disse que você merece viver isso também!\n\nSe mudar de ideia, é só me chamar. Vou arquivar nossa conversa por enquanto, ok?\n\nUm abraço! 💜\n${sellerName} - Unique Plástica Avançada`,
  },
  {
    id: "reminder",
    label: "Lembrete Consulta",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `Oi ${leadName.split(" ")[0]}! 💜\n\nAqui é ${sellerName} da Unique Plástica Avançada.\n\nTudo certo pra sua consulta amanhã?\n\nLembrando: [HORÁRIO] - [LOCAL/LINK]\n\nQualquer dúvida, estou por aqui! Vai ser incrível! ✨`,
  },
  {
    id: "post_consultation",
    label: "Pós-Consulta",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${leadName.split(" ")[0]}! Como foi sua experiência no Unique Day? 🌟\n\nAqui é ${sellerName}. Espero que tenha gostado! O que achou do plano personalizado?\n\nEstou aqui pra te ajudar no próximo passo! 💜\n\nUnique Plástica Avançada`,
  },
  {
    id: "surgery_scheduled",
    label: "Cirurgia Agendada",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${leadName.split(" ")[0]}! 🎉\n\nAqui é ${sellerName} da Unique Plástica Avançada.\n\nQue alegria ter você na nossa família Unique!\n\nA ${referrerName.split(" ")[0]} vai ficar tão feliz em saber! Sua jornada de transformação começou! 💜\n\nVou te passar todas as orientações pré-operatórias. Qualquer dúvida, estou aqui! ✨`,
  },
  {
    id: "referral_program",
    label: "Programa Indicação",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    template: (referrerName: string, leadName: string, sellerName: string) => 
      `${leadName.split(" ")[0]}! 💜\n\nAqui é ${sellerName} da Unique Plástica Avançada.\n\nAgora que você faz parte da família Unique, quero te contar sobre nosso Programa de Indicação! 🌟\n\nPra cada pessoa que você indicar e fechar conosco, você ganha benefícios exclusivos:\n\n🎁 Procedimentos estéticos\n💆 Day Spa Unique\n💰 Descontos especiais\n\nÉ só me mandar o contato de amigas interessadas! A ${referrerName.split(" ")[0]} que te indicou também participa! 😊`,
  },
];

const STATUS_CONFIG: Record<ReferralLeadStatus, { label: string; color: string; icon: React.ReactNode }> = {
  nova: { label: "Nova", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Plus className="w-3 h-3" /> },
  em_contato: { label: "Em Contato", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Phone className="w-3 h-3" /> },
  sem_interesse: { label: "Sem Interesse", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="w-3 h-3" /> },
  agendou: { label: "Agendou", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Calendar className="w-3 h-3" /> },
  consultou: { label: "Consultou", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", icon: <Stethoscope className="w-3 h-3" /> },
  operou: { label: "Operou", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  pos_venda: { label: "Pós-Venda", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", icon: <Users className="w-3 h-3" /> },
  relacionamento: { label: "Relacionamento", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", icon: <Users className="w-3 h-3" /> },
  ganho: { label: "Ganho", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
  perdido: { label: "Perdido", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: <XCircle className="w-3 h-3" /> },
};

const STATUS_ORDER: ReferralLeadStatus[] = ["nova", "em_contato", "sem_interesse", "agendou", "consultou", "operou", "pos_venda", "relacionamento", "ganho", "perdido"];

const ReferralLeads = () => {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [leads, setLeads] = useState<ReferralLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New lead dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [newLead, setNewLead] = useState({
    referrer_name: "",
    referrer_phone: "",
    referred_name: "",
    referred_phone: "",
    referred_email: "",
    assigned_to: "",
    notes: "",
    team_id: "", // For admins without team_id
  });

  // Edit lead dialog
  const [editingLead, setEditingLead] = useState<ReferralLead | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [leadHistory, setLeadHistory] = useState<LeadHistoryEntry[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showReport, setShowReport] = useState(false);
  
  // Approval system
  const [approvalFilter, setApprovalFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<ReferralLead | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [leadToReject, setLeadToReject] = useState<ReferralLead | null>(null);
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchLeads = async () => {
    // Admins can see all, members need team_id
    if (role !== "admin" && !profile?.team_id) return;
    setIsLoading(true);

    let query = supabase
      .from("referral_leads")
      .select("*")
      .order("created_at", { ascending: false });

    // If not admin, filter by team
    if (role !== "admin" && profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      // Fetch assigned profiles separately
      const userIds = [...new Set([
        ...(data || []).map(l => l.assigned_to).filter(Boolean),
        ...(data || []).map(l => l.registered_by)
      ])];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        setLeads((data || []).map(lead => ({
          ...lead,
          assigned_profile: lead.assigned_to ? profileMap.get(lead.assigned_to) || null : null,
          registered_profile: profileMap.get(lead.registered_by) || null,
        })));
      } else {
        setLeads(data || []);
      }
    }

    setIsLoading(false);
  };

  const fetchTeamMembers = async () => {
    // Admins get all members, regular users get team members
    let query = supabase
      .from("profiles")
      .select("user_id, full_name")
      .order("full_name");

    if (role !== "admin" && profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    }

    const { data } = await query;
    if (data) setTeamMembers(data);
  };

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("id, name")
      .order("name");
    if (data) setTeams(data);
  };

  useEffect(() => {
    if (role === "admin" || profile?.team_id) {
      fetchLeads();
      fetchTeamMembers();
      if (role === "admin") fetchTeams();
    }
  }, [profile?.team_id, role]);

  // Realtime subscription for referral leads
  useEffect(() => {
    if (!profile?.team_id && role !== "admin") return;

    const channel = supabase
      .channel("referral-leads-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referral_leads",
        },
        (payload) => {
          console.log("Referral lead change:", payload);
          fetchLeads(); // Refresh leads on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.team_id, role]);

  // Function to send notification via edge function
  const sendLeadNotification = async (
    eventType: "new_lead" | "status_change" | "assignment_change",
    leadData: {
      lead_id: string;
      lead_name: string;
      referrer_name: string;
      team_id: string;
      old_status?: string;
      new_status?: string;
      assigned_to?: string;
      registered_by?: string;
    }
  ) => {
    try {
      await supabase.functions.invoke("referral-lead-notifications", {
        body: { event_type: eventType, ...leadData },
      });
    } catch (error) {
      console.error("Error sending lead notification:", error);
    }
  };

  const handleCreateLead = async () => {
    if (!user) return;
    
    // Determine team_id: use profile.team_id or newLead.team_id for admins
    const teamId = profile?.team_id || newLead.team_id;
    
    if (!teamId) {
      toast({ title: "Erro", description: "Selecione um time para a indicação", variant: "destructive" });
      return;
    }
    
    if (!newLead.referrer_name || !newLead.referred_name) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase.from("referral_leads").insert({
        team_id: teamId,
        referrer_name: newLead.referrer_name,
        referrer_phone: newLead.referrer_phone || null,
        referred_name: newLead.referred_name,
        referred_phone: newLead.referred_phone || null,
        referred_email: newLead.referred_email || null,
        assigned_to: newLead.assigned_to || null,
        registered_by: user.id,
        notes: newLead.notes || null,
        status: "nova",
        approved: false, // Indicação começa não aprovada
      }).select().single();

      if (error) throw error;

      // 🏆 COPA: Pontos só são dados APÓS aprovação do admin
      // Não dar pontos na criação - será dado quando admin aprovar

      // Send notification for new lead
      if (data) {
        sendLeadNotification("new_lead", {
          lead_id: data.id,
          lead_name: newLead.referred_name,
          referrer_name: newLead.referrer_name,
          team_id: teamId,
          assigned_to: newLead.assigned_to || undefined,
          registered_by: user.id,
        });
      }

      toast({ title: "Sucesso", description: "Indicação registrada! Equipe notificada." });
      setShowNewDialog(false);
      setNewLead({
        referrer_name: "",
        referrer_phone: "",
        referred_name: "",
        referred_phone: "",
        referred_email: "",
        assigned_to: "",
        notes: "",
        team_id: "",
      });
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: ReferralLeadStatus) => {
    if (!editingLead || !user) return;
    setIsSaving(true);

    try {
      // Update lead status
      const updateData: any = {
        status: newStatus,
        last_contact_at: new Date().toISOString(),
      };

      // Set dates based on status
      if (newStatus === "agendou" && !editingLead.consultation_date) {
        // Could prompt for date, for now just mark last contact
      }

      const { error: updateError } = await supabase
        .from("referral_leads")
        .update(updateData)
        .eq("id", editingLead.id);

      if (updateError) throw updateError;

      // Add history entry
      const { error: historyError } = await supabase
        .from("referral_lead_history")
        .insert({
          lead_id: editingLead.id,
          old_status: editingLead.status,
          new_status: newStatus,
          changed_by: user.id,
          note: statusNote || null,
        });

      if (historyError) console.error("History error:", historyError);

      // 🏆 COPA: Pontos por evolução da indicação (só se aprovada)
      // Lógica de SUBSTITUIÇÃO: pontos são atualizados, não acumulados
      // nova = 5 pts → consultou = 15 pts → operou = 30 pts
      const COPA_POINTS: Record<string, number> = {
        nova: 5,
        em_contato: 5,
        agendou: 15,
        consultou: 15,
        operou: 30,
        ganho: 30,
      };
      
      // Só atualiza pontos se a indicação estiver aprovada
      if (editingLead.team_id && editingLead.approved && COPA_POINTS[newStatus]) {
        const newPoints = COPA_POINTS[newStatus];
        const reason = newPoints === 30 
          ? `Indicação operou: ${editingLead.referred_name}`
          : newPoints === 15 
            ? `Indicação consultou: ${editingLead.referred_name}`
            : `Indicação captada: ${editingLead.referred_name}`;
        
        try {
          // Verificar se já existe card para esta indicação
          const { data: existingCard } = await supabase
            .from('cards')
            .select('id, points')
            .eq('referral_lead_id', editingLead.id)
            .single();
          
          if (existingCard) {
            // ATUALIZAR card existente (substituir pontos)
            if (existingCard.points !== newPoints) {
              await supabase.from('cards')
                .update({
                  points: newPoints,
                  reason: reason,
                  date: new Date().toISOString().split('T')[0],
                })
                .eq('id', existingCard.id);
              
              console.log(`🏆 Copa: Pontos atualizados de ${existingCard.points} para ${newPoints}`);
              toast({ 
                title: `🏆 Pontos atualizados para ${newPoints}!`, 
                description: reason,
              });
            }
          }
          // Se não existe card, não criar (será criado na aprovação)
        } catch (e) {
          console.error('Erro ao atualizar pontos Copa:', e);
        }
      }

      // Send notification for status change
      sendLeadNotification("status_change", {
        lead_id: editingLead.id,
        lead_name: editingLead.referred_name,
        referrer_name: editingLead.referrer_name,
        team_id: editingLead.team_id,
        old_status: editingLead.status,
        new_status: newStatus,
        assigned_to: editingLead.assigned_to || undefined,
      });

      toast({ title: "Status atualizado", description: `Agora: ${STATUS_CONFIG[newStatus].label}` });
      setEditingLead(null);
      setStatusNote("");
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAssignment = async (leadId: string, assignedTo: string) => {
    try {
      // Find the lead to get its data for notification
      const lead = leads.find(l => l.id === leadId);
      
      const { error } = await supabase
        .from("referral_leads")
        .update({ assigned_to: assignedTo || null })
        .eq("id", leadId);

      if (error) throw error;

      // Send notification when assigning someone
      if (assignedTo && lead) {
        sendLeadNotification("assignment_change", {
          lead_id: leadId,
          lead_name: lead.referred_name,
          referrer_name: lead.referrer_name,
          team_id: lead.team_id,
          assigned_to: assignedTo,
        });
      }

      toast({ title: "Responsável atualizado" });
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // Fetch lead history when editing a lead
  const fetchLeadHistory = async (leadId: string) => {
    const { data, error } = await supabase
      .from("referral_lead_history")
      .select("id, old_status, new_status, note, created_at, changed_by")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching lead history:", error);
      return;
    }

    // Fetch profiles for changedBy
    const userIds = [...new Set((data || []).map(h => h.changed_by).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      setLeadHistory((data || []).map(h => ({
        ...h,
        changed_by_profile: h.changed_by ? profileMap.get(h.changed_by) || null : null,
      })));
    } else {
      setLeadHistory(data || []);
    }
  };

  // Add a note without changing status
  const handleAddNote = async () => {
    if (!editingLead || !user || !newNote.trim()) return;
    setIsSaving(true);

    try {
      // Add history entry with note only (same status)
      await supabase.from("referral_lead_history").insert({
        lead_id: editingLead.id,
        old_status: editingLead.status,
        new_status: editingLead.status,
        changed_by: user.id,
        note: newNote.trim(),
      });

      // Update last_contact_at
      await supabase
        .from("referral_leads")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", editingLead.id);

      toast({ title: "Observação adicionada" });
      setNewNote("");
      setShowAddNote(false);
      fetchLeadHistory(editingLead.id);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // When opening edit dialog, fetch history
  const handleOpenEditDialog = (lead: ReferralLead) => {
    setEditingLead(lead);
    setStatusNote("");
    setNewNote("");
    setShowAddNote(false);
    fetchLeadHistory(lead.id);
  };

  // 🔐 APROVAÇÃO: Aprovar indicação e dar pontos iniciais
  const handleApproveLead = async (lead: ReferralLead) => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      // Atualizar lead como aprovada
      const { error: updateError } = await supabase
        .from("referral_leads")
        .update({
          approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", lead.id);
      
      if (updateError) throw updateError;
      
      // 🏆 COPA: Dar pontos baseado no status atual
      const COPA_POINTS: Record<string, number> = {
        nova: 5,
        em_contato: 5,
        agendou: 15,
        consultou: 15,
        operou: 30,
        ganho: 30,
      };
      
      const points = COPA_POINTS[lead.status] || 5;
      const reason = points === 30 
        ? `Indicação operou: ${lead.referred_name}`
        : points === 15 
          ? `Indicação consultou: ${lead.referred_name}`
          : `Indicação captada: ${lead.referred_name}`;
      
      // Criar card com referral_lead_id para rastreamento
      await supabase.from('cards').insert({
        team_id: lead.team_id,
        type: 'bonus' as any,
        points: points,
        reason: reason,
        applied_by: user.id,
        date: new Date().toISOString().split('T')[0],
        referral_lead_id: lead.id,
      });
      
      toast({ 
        title: "✅ Indicação aprovada!", 
        description: `+${points} pontos para o time`,
      });
      
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // 🔐 REJEIÇÃO: Rejeitar indicação
  const handleRejectLead = async () => {
    if (!user || !leadToReject) return;
    setIsSaving(true);
    
    try {
      const { error: updateError } = await supabase
        .from("referral_leads")
        .update({
          approved: false,
          rejection_reason: rejectionReason || "Indicação não validada",
        })
        .eq("id", leadToReject.id);
      
      if (updateError) throw updateError;
      
      toast({ 
        title: "❌ Indicação rejeitada", 
        description: rejectionReason || "Indicação não validada",
        variant: "destructive",
      });
      
      setShowRejectDialog(false);
      setLeadToReject(null);
      setRejectionReason("");
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // 🗑️ EXCLUSÃO: Excluir indicação (apenas admin)
  const handleDeleteLead = async () => {
    if (!user || !leadToDelete || role !== "admin") return;
    setIsSaving(true);
    
    try {
      // 1. Remover card de pontos associado (se existir)
      await supabase.from('cards').delete().eq('referral_lead_id', leadToDelete.id);
      
      // 2. Remover histórico
      await supabase.from('referral_lead_history').delete().eq('lead_id', leadToDelete.id);
      
      // 3. Remover a indicação
      const { error } = await supabase.from('referral_leads').delete().eq('id', leadToDelete.id);
      
      if (error) throw error;
      
      toast({ 
        title: "🗑️ Indicação excluída", 
        description: `${leadToDelete.referred_name} foi removida`,
      });
      
      setShowDeleteConfirm(false);
      setLeadToDelete(null);
      setEditingLead(null);
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.referred_phone?.includes(searchTerm) ||
      lead.referred_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    // Filtro de aprovação
    let matchesApproval = true;
    if (approvalFilter === "pending") {
      matchesApproval = !lead.approved && !lead.rejection_reason;
    } else if (approvalFilter === "approved") {
      matchesApproval = lead.approved === true;
    } else if (approvalFilter === "rejected") {
      matchesApproval = !lead.approved && !!lead.rejection_reason;
    }

    return matchesSearch && matchesStatus && matchesApproval;
  });

  // Contadores para filtros
  const pendingCount = leads.filter(l => !l.approved && !l.rejection_reason).length;
  const approvedCount = leads.filter(l => l.approved === true).length;
  const rejectedCount = leads.filter(l => !l.approved && !!l.rejection_reason).length;

  // Group by status for pipeline view
  const leadsByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filteredLeads.filter((l) => l.status === status);
    return acc;
  }, {} as Record<ReferralLeadStatus, ReferralLead[]>);

  if (authLoading || (user && (!profile || role === null))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && profile && !profile.team_id && role !== "admin") {
    return (
        <main className="container mx-auto px-4 py-10">
          <section className="max-w-2xl mx-auto">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Acesso às indicações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Seu usuário ainda não está vinculado a um time. Para usar o Pipeline de Indicações, um administrador
                  precisa atribuir seu time.
                </p>
                <p className="text-sm text-muted-foreground">
                  Se você for admin, crie/atribua um time e faça login novamente.
                </p>
              </CardContent>
            </Card>
          </section>
        </main>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Gestão de Indicações</span>
            </div>
            <h1 className="text-3xl font-black text-gradient-gold">Pipeline de Indicações</h1>
            <p className="text-muted-foreground mt-1">
              {filteredLeads.length} indicações • {leads.filter(l => l.status === "operou").length} convertidas
            </p>
          </div>

          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-gradient-gold-shine text-primary-foreground font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Indicação
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-secondary border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Filtro de Aprovação - Apenas Admin */}
          {role === "admin" && (
            <Select value={approvalFilter} onValueChange={(v: any) => setApprovalFilter(v)}>
              <SelectTrigger className="w-full sm:w-[200px] bg-secondary border-border">
                <Shield className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar aprovação" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todas ({leads.length})</SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-2">
                    🟡 Pendentes ({pendingCount})
                  </span>
                </SelectItem>
                <SelectItem value="approved">
                  <span className="flex items-center gap-2">
                    ✅ Aprovadas ({approvedCount})
                  </span>
                </SelectItem>
                <SelectItem value="rejected">
                  <span className="flex items-center gap-2">
                    ❌ Rejeitadas ({rejectedCount})
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Pipeline View - Horizontal scroll on mobile - NOW FIRST AND MORE PROMINENT */}
        <div className="overflow-x-auto -mx-4 px-4 pb-6">
          <div className="inline-grid grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-3 min-w-max">
          {STATUS_ORDER.map((status) => (
            <Card key={status} className="bg-gradient-card border-border w-[200px] md:w-auto flex-shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {STATUS_CONFIG[status].icon}
                    {STATUS_CONFIG[status].label}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {leadsByStatus[status].length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {leadsByStatus[status].map((lead) => {
                  // Calculate urgency based on last contact
                  const lastContact = lead.last_contact_at ? new Date(lead.last_contact_at) : new Date(lead.created_at);
                  const hoursSinceContact = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60);
                  const isNewLead = lead.status === "nova";
                  const isActiveStatus = ["nova", "em_contato", "agendou"].includes(lead.status);
                  
                  let urgencyLevel: "critical" | "warning" | "attention" | null = null;
                  let urgencyLabel = "";
                  
                  if (isActiveStatus) {
                    if (hoursSinceContact >= 48) {
                      urgencyLevel = "critical";
                      urgencyLabel = "48h+";
                    } else if (hoursSinceContact >= 24) {
                      urgencyLevel = "warning";
                      urgencyLabel = "24h+";
                    } else if (isNewLead && hoursSinceContact >= 2) {
                      urgencyLevel = "attention";
                      urgencyLabel = "2h+";
                    }
                  }
                  
                  const urgencyStyles = {
                    critical: "border-red-500 bg-red-500/10 ring-1 ring-red-500/30",
                    warning: "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30",
                    attention: "border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500/30",
                  };
                  
                  return (
                    <div
                      key={lead.id}
                      className={`p-3 rounded-lg transition-colors ${
                        urgencyLevel 
                          ? urgencyStyles[urgencyLevel] 
                          : "bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/30"
                      }`}
                    >
                      <div 
                        onClick={() => handleOpenEditDialog(lead)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-medium text-foreground text-sm truncate flex-1">
                            {lead.referred_name}
                          </p>
                          {urgencyLevel && (
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 shrink-0 ${
                                urgencyLevel === "critical" ? "border-red-500 text-red-500 bg-red-500/20" :
                                urgencyLevel === "warning" ? "border-orange-500 text-orange-500 bg-orange-500/20" :
                                "border-yellow-500 text-yellow-500 bg-yellow-500/20"
                              }`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                              {urgencyLabel}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Indicado por: {lead.referrer_name}
                        </p>
                        {lead.referred_phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {lead.referred_phone}
                          </p>
                        )}
                        {/* Badge de aprovação */}
                        {role === "admin" && (
                          <div className="mt-1">
                            {lead.approved ? (
                              <Badge variant="outline" className="text-[10px] bg-green-500/20 border-green-500/30 text-green-400">
                                <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                                Aprovada
                              </Badge>
                            ) : lead.rejection_reason ? (
                              <Badge variant="outline" className="text-[10px] bg-red-500/20 border-red-500/30 text-red-400">
                                <ShieldX className="w-2.5 h-2.5 mr-0.5" />
                                Rejeitada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-yellow-500/20 border-yellow-500/30 text-yellow-400">
                                <Shield className="w-2.5 h-2.5 mr-0.5" />
                                Pendente
                              </Badge>
                            )}
                          </div>
                        )}
                        {lead.registered_profile && (
                          <p className="text-xs text-primary/80 mt-1 truncate">
                            Coletado por: {lead.registered_profile.full_name.split(" ")[0]}
                          </p>
                        )}
                        {lead.assigned_profile && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {lead.assigned_profile.full_name.split(" ")[0]}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Quick status change */}
                      <div className="mt-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={lead.status}
                          onValueChange={async (newStatus: ReferralLeadStatus) => {
                            if (newStatus === lead.status) return;
                            try {
                              const { error } = await supabase
                                .from("referral_leads")
                                .update({ 
                                  status: newStatus, 
                                  last_contact_at: new Date().toISOString() 
                                })
                                .eq("id", lead.id);
                              
                              if (error) throw error;
                              
                              // Add history entry
                              await supabase.from("referral_lead_history").insert({
                                lead_id: lead.id,
                                old_status: lead.status,
                                new_status: newStatus,
                                changed_by: user?.id,
                                note: `Status alterado para ${STATUS_CONFIG[newStatus].label}`,
                              });
                              
                              // Send notification
                              sendLeadNotification("status_change", {
                                lead_id: lead.id,
                                lead_name: lead.referred_name,
                                referrer_name: lead.referrer_name,
                                team_id: lead.team_id,
                                old_status: lead.status,
                                new_status: newStatus,
                                assigned_to: lead.assigned_to || undefined,
                              });
                              
                              toast({ title: "Status atualizado!" });
                              fetchLeads();
                            } catch (error: any) {
                              toast({ 
                                title: "Erro", 
                                description: error.message, 
                                variant: "destructive" 
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs bg-background/50 border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {STATUS_ORDER.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                <span className="flex items-center gap-1.5">
                                  {STATUS_CONFIG[s].icon}
                                  {STATUS_CONFIG[s].label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
                {leadsByStatus[status].length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-4">
                    Nenhuma indicação
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        </div>

        {/* Conversion Report - Collapsible */}
        <Collapsible open={showReport} onOpenChange={setShowReport} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-between gap-2 border-border bg-secondary/50 hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Relatório de Conversão</span>
                <Badge variant="secondary" className="text-xs">
                  {leads.filter(l => l.status === "operou").length} cirurgias
                </Badge>
              </span>
              {showReport ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <ReferralConversionReport leads={leads} />
          </CollapsibleContent>
        </Collapsible>
      </main>

      {/* New Lead Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Indicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Paciente que indicou *</Label>
                <Input
                  value={newLead.referrer_name}
                  onChange={(e) => setNewLead({ ...newLead, referrer_name: e.target.value })}
                  placeholder="Nome do paciente"
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label className="text-foreground">Telefone do paciente</Label>
                <Input
                  value={newLead.referrer_phone}
                  onChange={(e) => setNewLead({ ...newLead, referrer_phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-primary mb-3">Pessoa Indicada</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-foreground">Nome *</Label>
                  <Input
                    value={newLead.referred_name}
                    onChange={(e) => setNewLead({ ...newLead, referred_name: e.target.value })}
                    placeholder="Nome da pessoa indicada"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">Telefone</Label>
                    <Input
                      value={newLead.referred_phone}
                      onChange={(e) => setNewLead({ ...newLead, referred_phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Email</Label>
                    <Input
                      type="email"
                      value={newLead.referred_email}
                      onChange={(e) => setNewLead({ ...newLead, referred_email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Team selector for admins without team_id */}
            {role === "admin" && !profile?.team_id && (
              <div>
                <Label className="text-foreground">Time *</Label>
                <Select
                  value={newLead.team_id}
                  onValueChange={(value) => setNewLead({ ...newLead, team_id: value })}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione o time" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-foreground">Responsável pelo contato</Label>
              <Select
                value={newLead.assigned_to}
                onValueChange={(value) => setNewLead({ ...newLead, assigned_to: value })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground">Observações</Label>
              <Textarea
                value={newLead.notes}
                onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                placeholder="Informações adicionais..."
                className="bg-secondary border-border resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)} className="border-border">
              Cancelar
            </Button>
            <Button
              onClick={handleCreateLead}
              disabled={isSaving}
              className="bg-gradient-gold-shine text-primary-foreground"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalhes da Indicação</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-4">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Pessoa indicada</span>
                    <p className="font-medium text-foreground">{editingLead.referred_name}</p>
                  </div>
                  {editingLead.referred_phone && (
                    <div>
                      <span className="text-xs text-muted-foreground">Telefone</span>
                      <a href={`tel:${editingLead.referred_phone}`} className="text-primary flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {editingLead.referred_phone}
                      </a>
                    </div>
                  )}
                  {editingLead.referred_email && (
                    <div>
                      <span className="text-xs text-muted-foreground">Email</span>
                      <a href={`mailto:${editingLead.referred_email}`} className="text-primary flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {editingLead.referred_email}
                      </a>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Indicado por</span>
                    <p className="text-foreground">{editingLead.referrer_name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Registrado em</span>
                    <p className="text-foreground text-sm">
                      {format(new Date(editingLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {editingLead.last_contact_at && (
                    <div>
                      <span className="text-xs text-muted-foreground">Último contato</span>
                      <p className="text-foreground text-sm">
                        {format(new Date(editingLead.last_contact_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção de Aprovação - Apenas Admin */}
              {role === "admin" && (
                <div className="border rounded-lg p-4 bg-secondary/30 border-border">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Status de Aprovação
                    </Label>
                    {editingLead.approved ? (
                      <Badge className="bg-green-500/20 border-green-500/30 text-green-400">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Aprovada
                      </Badge>
                    ) : editingLead.rejection_reason ? (
                      <Badge className="bg-red-500/20 border-red-500/30 text-red-400">
                        <ShieldX className="w-3 h-3 mr-1" />
                        Rejeitada
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 border-yellow-500/30 text-yellow-400">
                        <Shield className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                  
                  {editingLead.rejection_reason && (
                    <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded mb-3">
                      Motivo: {editingLead.rejection_reason}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    {!editingLead.approved && (
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApproveLead(editingLead)}
                        disabled={isSaving}
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Aprovar Indicação
                      </Button>
                    )}
                    {!editingLead.rejection_reason && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          setLeadToReject(editingLead);
                          setShowRejectDialog(true);
                        }}
                        disabled={isSaving}
                      >
                        <ShieldX className="w-4 h-4 mr-2" />
                        Rejeitar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-500 hover:bg-red-500/20"
                      onClick={() => {
                        setLeadToDelete(editingLead);
                        setShowDeleteConfirm(true);
                      }}
                      disabled={isSaving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick Contact Buttons */}
              <div className="flex gap-2">
                {editingLead.referred_phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-green-500/30 text-green-500 hover:bg-green-500/10"
                    onClick={() => {
                      const phone = editingLead.referred_phone?.replace(/\D/g, "");
                      window.open(`https://wa.me/55${phone}`, "_blank");
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
                {editingLead.referred_email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                    onClick={() => {
                      window.open(`mailto:${editingLead.referred_email}`, "_blank");
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                )}
              </div>

              {/* Quick Scripts / Estratégias */}
              <div className="border-t border-border pt-4">
                <Label className="text-foreground flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Scripts Rápidos
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {REFERRAL_SCRIPTS.map((script) => {
                    // Get seller's first name from profile
                    const sellerFirstName = profile?.full_name?.split(" ")[0] || "Vendedor";
                    const message = script.template(
                      editingLead.referrer_name,
                      editingLead.referred_name,
                      sellerFirstName
                    );
                    const phone = editingLead.referred_phone?.replace(/\D/g, "");
                    const whatsappUrl = phone 
                      ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
                      : null;

                    return (
                      <div
                        key={script.id}
                        className={`p-2 rounded-lg border ${script.color} flex flex-col gap-1`}
                      >
                        <span className="text-xs font-medium">{script.label}</span>
                        <div className="flex gap-1">
                          {whatsappUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 flex-1 text-green-500 hover:bg-green-500/10"
                              onClick={() => window.open(whatsappUrl, "_blank")}
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Enviar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={async () => {
                              await navigator.clipboard.writeText(message);
                              toast({
                                title: "Copiado!",
                                description: `"${script.label}" pronto`,
                              });
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status and Change */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-foreground">Status atual</Label>
                  <Badge className={STATUS_CONFIG[editingLead.status].color}>
                    {STATUS_CONFIG[editingLead.status].icon}
                    <span className="ml-1">{STATUS_CONFIG[editingLead.status].label}</span>
                  </Badge>
                </div>
                <Label className="text-foreground mb-2 block text-sm">Atualizar para:</Label>
                <div className="grid grid-cols-4 gap-2">
                  {STATUS_ORDER.filter(s => s !== editingLead.status).slice(0, 8).map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(status)}
                      disabled={isSaving}
                      className={`text-xs ${STATUS_CONFIG[status].color} border hover:opacity-80`}
                    >
                      {STATUS_CONFIG[status].icon}
                      <span className="ml-1">{STATUS_CONFIG[status].label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Assign */}
              <div>
                <Label className="text-foreground">Responsável pelo contato</Label>
                <Select
                  value={editingLead.assigned_to || "_none"}
                  onValueChange={(value) => handleUpdateAssignment(editingLead.id, value === "_none" ? "" : value)}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Note Section */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Histórico de Acompanhamento
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddNote(!showAddNote)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Nota
                  </Button>
                </div>

                {showAddNote && (
                  <div className="space-y-2 mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Escreva uma observação sobre o contato, interesse do lead, próximos passos..."
                      className="bg-background border-border resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowAddNote(false); setNewNote(""); }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={isSaving || !newNote.trim()}
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Nota"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* History List */}
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {leadHistory.length > 0 ? (
                    leadHistory.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">
                            {entry.changed_by_profile?.full_name || "Usuário"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {entry.old_status !== entry.new_status ? (
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <Badge variant="outline" className={`${STATUS_CONFIG[entry.old_status || 'nova'].color} text-xs`}>
                              {STATUS_CONFIG[entry.old_status || 'nova'].label}
                            </Badge>
                            <ChevronRight className="w-3 h-3" />
                            <Badge variant="outline" className={`${STATUS_CONFIG[entry.new_status].color} text-xs`}>
                              {STATUS_CONFIG[entry.new_status].label}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs mb-1">Observação</Badge>
                        )}
                        {entry.note && (
                          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{entry.note}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      Nenhum histórico registrado ainda
                    </p>
                  )}
                </div>
              </div>

              {/* Initial Notes */}
              {editingLead.notes && (
                <div className="border-t border-border pt-4">
                  <Label className="text-foreground">Observações Iniciais</Label>
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg mt-1">
                    {editingLead.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Indicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A indicação "{leadToDelete?.referred_name}" será 
              permanentemente removida, incluindo todos os pontos associados na Copa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteLead}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rejeitar Indicação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição de "{leadToReject?.referred_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">Motivo da Rejeição</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Indicação não comprovada, dados inválidos..."
                className="bg-secondary border-border resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="border-border">
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRejectLead}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReferralLeads;
