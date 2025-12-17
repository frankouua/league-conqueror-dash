import { useState } from "react";
import { User, Phone, Mail, Thermometer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TeamMember, TEMPERATURE_CONFIG } from "./kanbanTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  onCreated: () => void;
}

const NewKanbanLeadDialog = ({ open, onOpenChange, teamMembers, onCreated }: Props) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    referrer_name: "",
    referrer_phone: "",
    referred_name: "",
    referred_phone: "",
    referred_email: "",
    assigned_to: "",
    temperature: "warm" as "hot" | "warm" | "cold",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.team_id) return;

    if (!formData.referrer_name.trim() || !formData.referred_name.trim()) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("referral_leads").insert({
        team_id: profile.team_id,
        referrer_name: formData.referrer_name.trim(),
        referrer_phone: formData.referrer_phone.trim() || null,
        referred_name: formData.referred_name.trim(),
        referred_phone: formData.referred_phone.trim() || null,
        referred_email: formData.referred_email.trim() || null,
        assigned_to: formData.assigned_to || null,
        registered_by: user.id,
        notes: formData.notes.trim() || null,
        status: "nova",
        temperature: formData.temperature,
      });

      if (error) throw error;

      toast({ title: "Sucesso!", description: "Lead criado com sucesso" });
      onOpenChange(false);
      setFormData({
        referrer_name: "",
        referrer_phone: "",
        referred_name: "",
        referred_phone: "",
        referred_email: "",
        assigned_to: "",
        temperature: "warm",
        notes: "",
      });
      onCreated();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Novo Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Referrer Info */}
          <div className="p-3 rounded-lg bg-secondary/50 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Paciente que indicou</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs">Nome *</Label>
                <Input
                  value={formData.referrer_name}
                  onChange={(e) => setFormData({ ...formData, referrer_name: e.target.value })}
                  placeholder="Nome do indicador"
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-foreground text-xs">Telefone</Label>
                <Input
                  value={formData.referrer_phone}
                  onChange={(e) => setFormData({ ...formData, referrer_phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="bg-background border-border"
                />
              </div>
            </div>
          </div>

          {/* Referred Info */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
            <p className="text-xs font-medium text-primary">Lead indicado</p>
            <div>
              <Label className="text-foreground text-xs">Nome *</Label>
              <Input
                value={formData.referred_name}
                onChange={(e) => setFormData({ ...formData, referred_name: e.target.value })}
                placeholder="Nome do lead"
                className="bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Telefone
                </Label>
                <Input
                  value={formData.referred_phone}
                  onChange={(e) => setFormData({ ...formData, referred_phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-foreground text-xs flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </Label>
                <Input
                  type="email"
                  value={formData.referred_email}
                  onChange={(e) => setFormData({ ...formData, referred_email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="bg-background border-border"
                />
              </div>
            </div>
          </div>

          {/* Assignment & Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground text-xs flex items-center gap-1">
                <User className="w-3 h-3" /> Responsável
              </Label>
              <Select 
                value={formData.assigned_to} 
                onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
              >
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
            <div>
              <Label className="text-foreground text-xs flex items-center gap-1">
                <Thermometer className="w-3 h-3" /> Temperatura
              </Label>
              <Select 
                value={formData.temperature} 
                onValueChange={(v: "hot" | "warm" | "cold") => setFormData({ ...formData, temperature: v })}
              >
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
          </div>

          {/* Notes */}
          <div>
            <Label className="text-foreground text-xs">Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais..."
              className="bg-secondary border-border min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gradient-gold-shine text-primary-foreground"
            >
              {isLoading ? "Criando..." : "Criar Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewKanbanLeadDialog;
