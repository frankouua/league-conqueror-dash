import { useState, useEffect } from "react";
import { 
  Phone, Mail, Calendar, User, Clock, CheckCircle2, 
  Circle, Lightbulb, MessageSquare, Thermometer, X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  KanbanLead, 
  TeamMember, 
  KANBAN_COLUMNS, 
  STAGE_CHECKLISTS,
  TEMPERATURE_CONFIG,
  ReferralLeadStatus
} from "./kanbanTypes";

interface Props {
  lead: KanbanLead | null;
  teamMembers: TeamMember[];
  onClose: () => void;
  onUpdate: () => void;
}

const KanbanLeadDialog = ({ lead, teamMembers, onClose, onUpdate }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [note, setNote] = useState("");
  const [selectedTemp, setSelectedTemp] = useState<"hot" | "warm" | "cold">("warm");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

  useEffect(() => {
    if (lead) {
      setSelectedTemp((lead.temperature as "hot" | "warm" | "cold") || "warm");
      setSelectedAssignee(lead.assigned_to || "");
      loadChecklistProgress();
    }
  }, [lead]);

  const loadChecklistProgress = async () => {
    if (!lead) return;
    
    const { data } = await supabase
      .from("kanban_checklist_progress")
      .select("action_index")
      .eq("lead_id", lead.id)
      .eq("stage_key", lead.status);

    if (data) {
      setCompletedTasks(new Set(data.map(d => d.action_index)));
    } else {
      setCompletedTasks(new Set());
    }
  };

  const toggleTask = async (index: number) => {
    if (!lead || !user) return;

    const isCompleted = completedTasks.has(index);
    
    // Optimistic update
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (isCompleted) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });

    try {
      if (isCompleted) {
        await supabase
          .from("kanban_checklist_progress")
          .delete()
          .eq("lead_id", lead.id)
          .eq("stage_key", lead.status)
          .eq("action_index", index);
      } else {
        await supabase
          .from("kanban_checklist_progress")
          .upsert({
            lead_id: lead.id,
            stage_key: lead.status,
            action_index: index,
            completed_by: user.id,
          });
      }
    } catch (error: any) {
      // Rollback
      setCompletedTasks(prev => {
        const next = new Set(prev);
        if (isCompleted) {
          next.add(index);
        } else {
          next.delete(index);
        }
        return next;
      });
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateLead = async () => {
    if (!lead || !user) return;
    setIsLoading(true);

    try {
      const updates: any = {
        temperature: selectedTemp,
        assigned_to: selectedAssignee || null,
        updated_at: new Date().toISOString(),
      };

      if (note.trim()) {
        updates.notes = lead.notes 
          ? `${lead.notes}\n\n[${format(new Date(), "dd/MM/yyyy HH:mm")}] ${note}`
          : `[${format(new Date(), "dd/MM/yyyy HH:mm")}] ${note}`;
      }

      const { error } = await supabase
        .from("referral_leads")
        .update(updates)
        .eq("id", lead.id);

      if (error) throw error;

      toast({ title: "Lead atualizado!" });
      setNote("");
      onUpdate();
      onClose();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!lead) return null;

  const currentStageChecklist = STAGE_CHECKLISTS.find(s => s.stageKey === lead.status);
  const currentColumn = KANBAN_COLUMNS.find(c => c.status === lead.status);
  const initials = lead.referred_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className={`p-4 ${currentColumn?.bgColor || "bg-muted"} border-b border-border`}>
          <div className="flex items-start gap-3">
            <Avatar className="w-14 h-14 border-2 border-background">
              <AvatarImage src={lead.photo_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-foreground text-xl">{lead.referred_name}</DialogTitle>
              <p className="text-sm text-muted-foreground">Indicado por: {lead.referrer_name}</p>
              <Badge className={`mt-1 ${currentColumn?.color || ""}`}>
                {currentColumn?.title} - {currentColumn?.subtitle}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-4 space-y-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3">
              {lead.referred_phone && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{lead.referred_phone}</span>
                </div>
              )}
              {lead.referred_email && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm truncate">{lead.referred_email}</span>
                </div>
              )}
              {lead.consultation_date && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Consulta: {format(new Date(lead.consultation_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Criado: {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Temperature & Assignment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs mb-1 flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  Temperatura
                </Label>
                <Select value={selectedTemp} onValueChange={(v: "hot" | "warm" | "cold") => setSelectedTemp(v)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {(Object.entries(TEMPERATURE_CONFIG) as [string, typeof TEMPERATURE_CONFIG["hot"]][]).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {config.icon} {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground text-xs mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Responsável
                </Label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="">Não atribuído</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Checklist & Opportunities */}
            {currentStageChecklist && (
              <Tabs defaultValue="checklist" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary">
                  <TabsTrigger value="checklist" className="data-[state=active]:bg-primary/20">
                    ✅ Checklist
                  </TabsTrigger>
                  <TabsTrigger value="opportunities" className="data-[state=active]:bg-primary/20">
                    💡 Oportunidades
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="checklist" className="mt-3">
                  <div className="space-y-2">
                    {currentStageChecklist.tasks.map((task, index) => (
                      <button
                        key={index}
                        onClick={() => toggleTask(index)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                          completedTasks.has(index)
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-secondary/50 hover:bg-secondary border border-transparent"
                        }`}
                      >
                        {completedTasks.has(index) ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${completedTasks.has(index) ? "text-emerald-400 line-through" : "text-foreground"}`}>
                          {task}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    {completedTasks.size}/{currentStageChecklist.tasks.length} tarefas concluídas
                  </p>
                </TabsContent>

                <TabsContent value="opportunities" className="mt-3">
                  <div className="space-y-3">
                    {currentStageChecklist.opportunities.map((opp, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-primary/5 border border-primary/20"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{opp.icon}</span>
                          <span className="font-semibold text-primary text-sm">{opp.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-7">{opp.description}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Notes */}
            <div>
              <Label className="text-foreground text-xs mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Adicionar observação
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Digite uma observação..."
                className="bg-secondary border-border min-h-[80px]"
              />
            </div>

            {/* Previous Notes */}
            {lead.notes && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Observações anteriores:</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-secondary/30 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdateLead}
            disabled={isLoading}
            className="bg-gradient-gold-shine text-primary-foreground"
          >
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KanbanLeadDialog;
