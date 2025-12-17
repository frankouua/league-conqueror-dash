import { Phone, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { KanbanLead, TEMPERATURE_CONFIG } from "./kanbanTypes";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  lead: KanbanLead;
  onClick: () => void;
  isDragging?: boolean;
}

const KanbanCard = ({ lead, onClick, isDragging }: Props) => {
  const initials = lead.referred_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const tempConfig = lead.temperature ? TEMPERATURE_CONFIG[lead.temperature] : TEMPERATURE_CONFIG.warm;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg bg-card border border-border cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg ${
        isDragging ? "shadow-xl border-primary" : ""
      }`}
    >
      {/* Header with avatar and temperature */}
      <div className="flex items-start gap-2 mb-2">
        <Avatar className="w-10 h-10 border border-border">
          <AvatarImage src={lead.photo_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">
            {lead.referred_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Via: {lead.referrer_name}
          </p>
        </div>
        <Badge className={`text-xs ${tempConfig.color}`}>
          {tempConfig.icon}
        </Badge>
      </div>

      {/* Contact Info */}
      {lead.referred_phone && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Phone className="w-3 h-3" />
          <span className="truncate">{lead.referred_phone}</span>
        </div>
      )}

      {/* Assigned Person */}
      <div className="flex items-center justify-between">
        {lead.assigned_profile ? (
          <div className="flex items-center gap-1">
            <Avatar className="w-5 h-5">
              <AvatarImage src={lead.assigned_profile.avatar_url || undefined} />
              <AvatarFallback className="text-[8px] bg-secondary">
                {lead.assigned_profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {lead.assigned_profile.full_name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>Não atribuído</span>
          </div>
        )}
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    </div>
  );
};

export default KanbanCard;
