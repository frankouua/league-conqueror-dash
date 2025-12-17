import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Loader2, Plus, Filter, Search, Users } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import KanbanLeadDialog from "@/components/kanban/KanbanLeadDialog";
import NewKanbanLeadDialog from "@/components/kanban/NewKanbanLeadDialog";
import { KANBAN_COLUMNS, KanbanLead, TeamMember } from "@/components/kanban/kanbanTypes";

type ReferralLeadStatus = Database["public"]["Enums"]["referral_lead_status"];

const PatientKanban = () => {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [leads, setLeads] = useState<KanbanLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchLeads = useCallback(async () => {
    if (role !== "admin" && !profile?.team_id) return;
    setIsLoading(true);

    let query = supabase
      .from("referral_leads")
      .select("*")
      .order("updated_at", { ascending: false });

    if (role !== "admin" && profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const userIds = [...new Set([
        ...(data || []).map(l => l.assigned_to).filter(Boolean),
        ...(data || []).map(l => l.registered_by)
      ])];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
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
  }, [profile?.team_id, role, toast]);

  const fetchTeamMembers = useCallback(async () => {
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .order("full_name");

    if (role !== "admin" && profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    }

    const { data } = await query;
    if (data) setTeamMembers(data);
  }, [profile?.team_id, role]);

  useEffect(() => {
    if (role === "admin" || profile?.team_id) {
      fetchLeads();
      fetchTeamMembers();
    }
  }, [profile?.team_id, role, fetchLeads, fetchTeamMembers]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as ReferralLeadStatus;
    const lead = leads.find(l => l.id === draggableId);
    
    if (!lead || !user) return;

    // Optimistic update
    setLeads(prev => prev.map(l => 
      l.id === draggableId ? { ...l, status: newStatus } : l
    ));

    try {
      const { error: updateError } = await supabase
        .from("referral_leads")
        .update({ 
          status: newStatus, 
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", draggableId);

      if (updateError) throw updateError;

      // Add history entry
      await supabase.from("referral_lead_history").insert({
        lead_id: draggableId,
        old_status: lead.status,
        new_status: newStatus,
        changed_by: user.id,
        note: `Movido para ${KANBAN_COLUMNS.find(c => c.status === newStatus)?.title || newStatus}`,
      });

      // Create notification for assigned user if different from current user
      if (lead.assigned_to && lead.assigned_to !== user.id) {
        await supabase.from("notifications").insert({
          user_id: lead.assigned_to,
          type: "lead_moved",
          title: "Lead movido",
          message: `${lead.referred_name} foi movido para ${KANBAN_COLUMNS.find(c => c.status === newStatus)?.title || newStatus}`,
        });
      }

      toast({ title: "Lead atualizado!", description: `Status: ${KANBAN_COLUMNS.find(c => c.status === newStatus)?.title}` });
      
      // Open lead dialog to show checklist
      setSelectedLead({ ...lead, status: newStatus });
    } catch (error: any) {
      // Rollback
      setLeads(prev => prev.map(l => 
        l.id === draggableId ? lead : l
      ));
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.referrer_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssigned = 
      assignedFilter === "all" || 
      (assignedFilter === "unassigned" && !lead.assigned_to) ||
      lead.assigned_to === assignedFilter;

    return matchesSearch && matchesAssigned;
  });

  const leadsByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.status] = filteredLeads.filter(l => l.status === col.status);
    return acc;
  }, {} as Record<ReferralLeadStatus, KanbanLead[]>);

  if (authLoading || (user && (!profile || role === null))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-3">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Jornada do Paciente</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gradient-gold">Pipeline Kanban</h1>
            <p className="text-muted-foreground mt-1">
              {filteredLeads.length} pacientes no pipeline
            </p>
          </div>

          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-gradient-gold-shine text-primary-foreground font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-secondary border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unassigned">Não atribuídos</SelectItem>
              {teamMembers.map(member => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.status}
                column={column}
                leads={leadsByStatus[column.status] || []}
                onLeadClick={setSelectedLead}
              />
            ))}
          </div>
        </DragDropContext>
      </main>

      {/* Lead Details Dialog */}
      <KanbanLeadDialog
        lead={selectedLead}
        teamMembers={teamMembers}
        onClose={() => setSelectedLead(null)}
        onUpdate={fetchLeads}
      />

      {/* New Lead Dialog */}
      <NewKanbanLeadDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        teamMembers={teamMembers}
        onCreated={fetchLeads}
      />
    </div>
  );
};

export default PatientKanban;
