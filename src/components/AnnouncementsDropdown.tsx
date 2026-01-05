import { useState, useEffect } from "react";
import { Bell, AlertCircle, Info, AlertTriangle, Megaphone, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "urgent";
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

interface AnnouncementRead {
  announcement_id: string;
}

const AnnouncementsDropdown = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch active announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!user,
  });

  // Fetch which announcements the user has read
  const { data: readAnnouncements = [] } = useQuery({
    queryKey: ["announcement-reads", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as AnnouncementRead[];
    },
    enabled: !!user?.id,
  });

  const readIds = new Set(readAnnouncements.map((r) => r.announcement_id));
  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user?.id) return;
      const { error } = await supabase.from("announcement_reads").upsert({
        announcement_id: announcementId,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcement-reads"] });
    },
  });

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadAnnouncements = announcements.filter((a) => !readIds.has(a.id));
    for (const announcement of unreadAnnouncements) {
      await markAsReadMutation.mutateAsync(announcement.id);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "high":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "normal":
        return <Megaphone className="w-4 h-4 text-primary" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="text-[10px]">Urgente</Badge>;
      case "high":
        return <Badge className="bg-amber-500 text-white text-[10px]">Importante</Badge>;
      default:
        return null;
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Megaphone className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 bg-card border-border p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Avisos da Gestão
          </h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={markAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {announcements.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum aviso no momento</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {announcements.map((announcement) => {
                const isRead = readIds.has(announcement.id);
                return (
                  <div
                    key={announcement.id}
                    className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !isRead ? "bg-primary/5" : ""
                    }`}
                    onClick={() => !isRead && markAsReadMutation.mutate(announcement.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getPriorityIcon(announcement.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className={`text-sm font-medium truncate ${!isRead ? "text-foreground" : "text-muted-foreground"}`}>
                            {announcement.title}
                          </h5>
                          {getPriorityBadge(announcement.priority)}
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {announcement.content}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(announcement.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AnnouncementsDropdown;
