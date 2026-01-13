import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type DepartmentType = 'comercial' | 'atendimento' | 'marketing' | 'administrativo' | 'clinico';
type PositionType = 'comercial_1_captacao' | 'comercial_2_closer' | 'comercial_3_experiencia' | 'comercial_4_farmer' | 'sdr' | 'coordenador' | 'gerente' | 'assistente' | 'outro';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  team_id: string | null;
  avatar_url: string | null;
  department: DepartmentType | null;
  position: PositionType | null;
  phone: string | null;
  whatsapp: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: "member" | "admin" | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, teamId: string, role?: "member" | "admin", department?: DepartmentType | null, position?: PositionType | null) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'phone' | 'whatsapp'>>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<"member" | "admin" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (profileData) {
      setProfile(profileData as Profile);
    }

    // Fetch role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    if (roleData) {
      setRole(roleData.role as "member" | "admin");
    }

    // Update last access (fire and forget)
    supabase.rpc('update_last_access').then(() => {
      // Success - last access updated
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  }, [user?.id, fetchUserData]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer backend calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  // Keep session alive while testing (prevents frequent re-logins when the tab stays open)
  // IMPORTANT: avoid updating React state here to prevent refresh loops / rate limiting.
  useEffect(() => {
    if (!session?.user) return;

    let isMounted = true;

    const refresh = async () => {
      if (!isMounted) return;
      try {
        const { error } = await supabase.auth.refreshSession();

        // If there's no session yet (e.g. user just got logged out), don't spam requests.
        if (error) {
          const name = (error as any)?.name;
          if (name === "AuthSessionMissingError") return;
          console.warn("Session refresh failed:", error);
        }
      } catch (e) {
        console.warn("Session refresh exception:", e);
      }
    };

    // Refresh occasionally (not too often to avoid API rate limits)
    const intervalId = window.setInterval(refresh, 1000 * 60 * 20);

    // Also refresh when the user focuses the tab again
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.user?.id]);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    teamId: string,
    userRole: "member" | "admin" = "member",
    department: DepartmentType | null = null,
    position: PositionType | null = null
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          team_id: teamId || null,
          role: userRole,
          department: department,
          position: position,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'phone' | 'whatsapp'>>) => {
    if (!user?.id) {
      return { error: new Error("User not authenticated") };
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);

    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
