import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bell, Check, Target, Trophy, Award, Sparkles, AlertTriangle, ExternalLink, Megaphone, X, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  user_id: string | null;
  team_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const NotificationsDropdown = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [popupNotification, setPopupNotification] = useState<Notification | null>(null);
  const shownNotifications = useRef<Set<string>>(new Set());
  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id, profile?.team_id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Build the OR condition - only include team_id if it's a valid UUID
      const orConditions = [`user_id.eq.${user.id}`];
      if (profile?.team_id) {
        orConditions.push(`team_id.eq.${profile.team_id}`);
      }
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(orConditions.join(","))
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime notifications and show popup for admin announcements
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          
          // Show popup for admin announcements
          const newNotification = payload.new as Notification;
          if (
            newNotification.type === "admin_announcement" &&
            newNotification.user_id === user.id &&
            !shownNotifications.current.has(newNotification.id)
          ) {
            shownNotifications.current.add(newNotification.id);
            setPopupNotification(newNotification);
            
            // Also show toast for immediate attention
            toast({
              title: `📢 ${newNotification.title}`,
              description: newNotification.message.substring(0, 100) + (newNotification.message.length > 100 ? "..." : ""),
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || !notifications) return;
      
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "goal_individual":
        return <Target className="w-4 h-4 text-green-500" />;
      case "goal_team":
        return <Trophy className="w-4 h-4 text-primary" />;
      case "goal_near":
        return <Flame className="w-4 h-4 text-orange-500" />;
      case "goal_reminder":
        return <Target className="w-4 h-4 text-blue-500" />;
      case "milestone":
        return <Award className="w-4 h-4 text-amber-500" />;
      case "achievement":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "stale_lead":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "seller_critical":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "seller_warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "admin_announcement":
        return <Megaphone className="w-4 h-4 text-primary" />;
      // New referral lead notification types
      case "new_referral":
        return <Sparkles className="w-4 h-4 text-green-500" />;
      case "lead_assigned":
        return <Bell className="w-4 h-4 text-blue-500" />;
      case "lead_milestone":
        return <Trophy className="w-4 h-4 text-emerald-500" />;
      case "lead_alert":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "lead_status_update":
        return <Target className="w-4 h-4 text-cyan-500" />;
      case "lead_reminder":
        return <Bell className="w-4 h-4 text-amber-500" />;
      // Timed reminders
      case "lead_reminder_2h":
        return <Flame className="w-4 h-4 text-red-500" />;
      case "lead_reminder_24h":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // Extract progress percentage from goal_near notification message
  const extractProgress = (message: string): number => {
    const match = message.match(/\[PROGRESS:(\d+)\]/);
    if (match) return parseInt(match[1]);
    // Fallback: try to extract from title
    const titleMatch = message.match(/(\d+)%/);
    if (titleMatch) return parseInt(titleMatch[1]);
    return 90;
  };

  const handleClosePopup = () => {
    if (popupNotification) {
      markAsRead.mutate(popupNotification.id);
      setPopupNotification(null);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === "stale_lead" || 
        notification.type === "new_referral" || 
        notification.type === "lead_assigned" ||
        notification.type === "lead_milestone" ||
        notification.type === "lead_alert" ||
        notification.type === "lead_status_update" ||
        notification.type === "lead_reminder" ||
        notification.type === "lead_reminder_2h" ||
        notification.type === "lead_reminder_24h") {
      navigate("/referral-leads");
    } else if (notification.type === "goal_reminder" || notification.type === "goal_near") {
      navigate("/onboarding-goals");
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Popup Dialog for Admin Announcements */}
      <Dialog open={!!popupNotification} onOpenChange={(open) => !open && handleClosePopup()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-lg">{popupNotification?.title}</DialogTitle>
            </div>
            <DialogDescription className="pt-4 text-base text-foreground whitespace-pre-wrap">
              {popupNotification?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-muted-foreground">
              {popupNotification && formatDistanceToNow(new Date(popupNotification.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            <Button onClick={handleClosePopup}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto bg-card border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllAsRead.mutate()}
            >
              <Check className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
            className={`flex items-start gap-3 p-3 cursor-pointer ${
                !notification.read ? "bg-primary/5" : ""
              } ${notification.type === "stale_lead" ? "hover:bg-orange-500/10" : ""} ${notification.type === "goal_reminder" ? "hover:bg-blue-500/10" : ""} ${notification.type === "goal_near" ? "hover:bg-orange-500/10 border-l-2 border-orange-500" : ""} ${notification.type === "seller_critical" ? "hover:bg-red-500/10 border-l-2 border-red-500" : ""} ${notification.type === "seller_warning" ? "hover:bg-amber-500/10" : ""} ${notification.type === "admin_announcement" ? "hover:bg-primary/10 border-l-2 border-primary" : ""} ${notification.type === "new_referral" ? "hover:bg-green-500/10 border-l-2 border-green-500" : ""} ${notification.type === "lead_milestone" ? "hover:bg-emerald-500/10 border-l-2 border-emerald-500" : ""} ${notification.type === "lead_assigned" ? "hover:bg-blue-500/10 border-l-2 border-blue-500" : ""} ${notification.type === "lead_alert" ? "hover:bg-red-500/10 border-l-2 border-red-500" : ""} ${notification.type === "lead_reminder_2h" ? "hover:bg-red-500/10 border-l-2 border-red-500 animate-pulse" : ""} ${notification.type === "lead_reminder_24h" ? "hover:bg-orange-500/10 border-l-2 border-orange-500" : ""}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className={`text-sm ${!notification.read ? "font-semibold" : ""}`}>
                  {notification.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.message.replace(/\s*\[ID:.*?\]/, "").replace(/\s*\[PROGRESS:\d+\]/, "")}
                </p>
                
                {/* Progress bar for goal_near notifications */}
                {notification.type === "goal_near" && (() => {
                  const progress = extractProgress(notification.message);
                  return (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-orange-500 font-medium">Progresso</span>
                        <span className="text-orange-500 font-bold">{progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500 animate-pulse"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
                
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                  {notification.type === "stale_lead" && (
                    <span className="text-xs text-orange-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Ver pipeline
                    </span>
                  )}
                  {notification.type === "goal_reminder" && (
                    <span className="text-xs text-blue-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Definir metas
                    </span>
                  )}
                  {notification.type === "goal_near" && (
                    <span className="text-xs text-orange-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Ver metas
                    </span>
                  )}
                  {(notification.type === "new_referral" || notification.type === "lead_assigned") && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Ver indicação
                    </span>
                  )}
                  {notification.type === "lead_milestone" && (
                    <span className="text-xs text-emerald-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Ver pipeline
                    </span>
                  )}
                  {notification.type === "lead_alert" && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Analisar lead
                    </span>
                  )}
                  {notification.type === "lead_reminder" && (
                    <span className="text-xs text-amber-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Entrar em contato
                    </span>
                  )}
                </div>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-primary mt-1" />
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default NotificationsDropdown;
