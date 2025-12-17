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
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Stethoscope,
  Loader2,
  MessageSquare,
} from "lucide-react";
import Header from "@/components/Header";
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
} from "@/components/ui/dialog";
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
  assigned_profile?: { full_name: string } | null;
  registered_profile?: { full_name: string } | null;
}

interface TeamMember {
  user_id: string;
  full_name: string;
}

const STATUS_CONFIG: Record<ReferralLeadStatus, { label: string; color: string; icon: React.ReactNode }> = {
  nova: { label: "Nova", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Plus className="w-3 h-3" /> },
  em_contato: { label: "Em Contato", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Phone className="w-3 h-3" /> },
  sem_interesse: { label: "Sem Interesse", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="w-3 h-3" /> },
  agendou: { label: "Agendou", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Calendar className="w-3 h-3" /> },
  consultou: { label: "Consultou", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", icon: <Stethoscope className="w-3 h-3" /> },
  operou: { label: "Operou", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const STATUS_ORDER: ReferralLeadStatus[] = ["nova", "em_contato", "sem_interesse", "agendou", "consultou", "operou"];

const ReferralLeads = () => {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [leads, setLeads] = useState<ReferralLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New lead dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newLead, setNewLead] = useState({
    referrer_name: "",
    referrer_phone: "",
    referred_name: "",
    referred_phone: "",
    referred_email: "",
    assigned_to: "",
    notes: "",
  });

  // Edit lead dialog
  const [editingLead, setEditingLead] = useState<ReferralLead | null>(null);
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchLeads = async () => {
    if (!profile?.team_id) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("referral_leads")
      .select("*")
      .eq("team_id", profile.team_id)
      .order("created_at", { ascending: false });

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
    if (!profile?.team_id) return;

    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("team_id", profile.team_id)
      .order("full_name");

    if (data) setTeamMembers(data);
  };

  useEffect(() => {
    if (profile?.team_id) {
      fetchLeads();
      fetchTeamMembers();
    }
  }, [profile?.team_id]);

  const handleCreateLead = async () => {
    if (!user || !profile?.team_id) return;
    if (!newLead.referrer_name || !newLead.referred_name) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("referral_leads").insert({
        team_id: profile.team_id,
        referrer_name: newLead.referrer_name,
        referrer_phone: newLead.referrer_phone || null,
        referred_name: newLead.referred_name,
        referred_phone: newLead.referred_phone || null,
        referred_email: newLead.referred_email || null,
        assigned_to: newLead.assigned_to || null,
        registered_by: user.id,
        notes: newLead.notes || null,
        status: "nova",
      });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Indicação registrada!" });
      setShowNewDialog(false);
      setNewLead({
        referrer_name: "",
        referrer_phone: "",
        referred_name: "",
        referred_phone: "",
        referred_email: "",
        assigned_to: "",
        notes: "",
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
      const { error } = await supabase
        .from("referral_leads")
        .update({ assigned_to: assignedTo || null })
        .eq("id", leadId);

      if (error) throw error;

      toast({ title: "Responsável atualizado" });
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.referred_phone?.includes(searchTerm) ||
      lead.referred_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group by status for pipeline view
  const leadsByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filteredLeads.filter((l) => l.status === status);
    return acc;
  }, {} as Record<ReferralLeadStatus, ReferralLead[]>);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

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
        </div>

        {/* Conversion Report */}
        <ReferralConversionReport leads={leads} />

        {/* Pipeline View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STATUS_ORDER.map((status) => (
            <Card key={status} className="bg-gradient-card border-border">
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
                {leadsByStatus[status].map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setEditingLead(lead)}
                    className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors border border-transparent hover:border-primary/30"
                  >
                    <p className="font-medium text-foreground text-sm truncate">
                      {lead.referred_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Indicado por: {lead.referrer_name}
                    </p>
                    {lead.referred_phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {lead.referred_phone}
                      </p>
                    )}
                    {lead.assigned_profile && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {lead.assigned_profile.full_name.split(" ")[0]}
                      </Badge>
                    )}
                  </div>
                ))}
                {leadsByStatus[status].length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-4">
                    Nenhuma indicação
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalhes da Indicação</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-4">
              {/* Lead Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pessoa indicada</span>
                  <span className="font-medium text-foreground">{editingLead.referred_name}</span>
                </div>
                {editingLead.referred_phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Telefone</span>
                    <a href={`tel:${editingLead.referred_phone}`} className="text-primary flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {editingLead.referred_phone}
                    </a>
                  </div>
                )}
                {editingLead.referred_email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <a href={`mailto:${editingLead.referred_email}`} className="text-primary flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {editingLead.referred_email}
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Indicado por</span>
                  <span className="text-foreground">{editingLead.referrer_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Registrado em</span>
                  <span className="text-foreground">
                    {format(new Date(editingLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="border-t border-border pt-4">
                <Label className="text-foreground mb-2 block">Status atual</Label>
                <Badge className={STATUS_CONFIG[editingLead.status].color}>
                  {STATUS_CONFIG[editingLead.status].icon}
                  <span className="ml-1">{STATUS_CONFIG[editingLead.status].label}</span>
                </Badge>
              </div>

              {/* Change Status */}
              <div>
                <Label className="text-foreground mb-2 block">Atualizar status</Label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_ORDER.filter(s => s !== editingLead.status).map((status) => (
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
                <Label className="text-foreground">Responsável</Label>
                <Select
                  value={editingLead.assigned_to || ""}
                  onValueChange={(value) => handleUpdateAssignment(editingLead.id, value)}
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="">Nenhum</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              {editingLead.notes && (
                <div>
                  <Label className="text-foreground">Observações</Label>
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                    {editingLead.notes}
                  </p>
                </div>
              )}

              {/* WhatsApp */}
              {editingLead.referred_phone && (
                <Button
                  variant="outline"
                  className="w-full border-green-500/30 text-green-500 hover:bg-green-500/10"
                  onClick={() => {
                    const phone = editingLead.referred_phone?.replace(/\D/g, "");
                    window.open(`https://wa.me/55${phone}`, "_blank");
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Abrir WhatsApp
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralLeads;
