import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCRMGamification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userPoints = useQuery({
    queryKey: ['crm-gamification-points', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('crm_gamification_points')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const totalPoints = data?.reduce((sum, p) => sum + p.points, 0) || 0;
      const thisMonth = data?.filter(p => {
        const date = new Date(p.created_at);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).reduce((sum, p) => sum + p.points, 0) || 0;
      
      return { points: data, totalPoints, thisMonth };
    },
    enabled: !!user?.id,
  });

  const userAchievements = useQuery({
    queryKey: ['crm-user-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('crm_user_achievements')
        .select(`
          *,
          achievement:crm_gamification_achievements(*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const allAchievements = useQuery({
    queryKey: ['crm-gamification-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_gamification_achievements')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const gamificationRules = useQuery({
    queryKey: ['crm-gamification-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_gamification_rules')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
  });

  const leaderboard = useQuery({
    queryKey: ['crm-gamification-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_gamification_points')
        .select(`
          user_id,
          points
        `)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      
      if (error) throw error;
      
      // Aggregate points by user
      const userPoints: Record<string, number> = {};
      data?.forEach(p => {
        userPoints[p.user_id] = (userPoints[p.user_id] || 0) + p.points;
      });
      
      // Get user profiles
      const userIds = Object.keys(userPoints);
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, team_id')
        .in('user_id', userIds);
      
      return userIds
        .map(userId => ({
          userId,
          points: userPoints[userId],
          profile: profiles?.find(p => p.user_id === userId),
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);
    },
  });

  const awardPoints = useMutation({
    mutationFn: async ({ action, leadId, metadata }: { action: string; leadId?: string; metadata?: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke('award-gamification-points', {
        body: { action, leadId, metadata },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-gamification-points'] });
      queryClient.invalidateQueries({ queryKey: ['crm-user-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['crm-gamification-leaderboard'] });
    },
  });

  return {
    userPoints,
    userAchievements,
    allAchievements,
    gamificationRules,
    leaderboard,
    awardPoints,
  };
}
