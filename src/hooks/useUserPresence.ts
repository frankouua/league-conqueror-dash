import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PresenceState {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  team_id: string | null;
  online_at: string;
}

interface UseUserPresenceReturn {
  onlineUsers: PresenceState[];
  isUserOnline: (userId: string) => boolean;
  onlineCount: number;
}

export const useUserPresence = (): UseUserPresenceReturn => {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);

  const isUserOnline = useCallback(
    (userId: string) => onlineUsers.some((u) => u.user_id === userId),
    [onlineUsers]
  );

  useEffect(() => {
    if (!user?.id || !profile) return;

    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Handle presence sync
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PresenceState[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as unknown as PresenceState[];
          if (presences && presences.length > 0) {
            users.push(presences[0]);
          }
        });
        
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("User joined:", newPresences);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("User left:", leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this user's presence
          await channel.track({
            user_id: user.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            team_id: profile.team_id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.full_name, profile?.avatar_url, profile?.team_id]);

  return {
    onlineUsers,
    isUserOnline,
    onlineCount: onlineUsers.length,
  };
};
