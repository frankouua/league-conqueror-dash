import { useState, useEffect } from "react";
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
import { Bell, Check, Target, Trophy, Award, Sparkles, AlertTriangle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id, profile?.team_id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user.id},team_id.eq.${profile?.team_id}`)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime notifications
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
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
      case "milestone":
        return <Award className="w-4 h-4 text-amber-500" />;
      case "achievement":
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case "stale_lead":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navigate to referral leads page for stale_lead notifications
    if (notification.type === "stale_lead") {
      navigate("/referral-leads");
    }
  };

  if (!user) return null;

  return (
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
              } ${notification.type === "stale_lead" ? "hover:bg-orange-500/10" : ""}`}
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
                  {notification.message.replace(/\s*\[ID:.*?\]/, "")}
                </p>
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
  );
};

export default NotificationsDropdown;
