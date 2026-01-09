import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface KnowledgeBaseRead {
  id: string;
  user_id: string;
  article_id: string;
  read_at: string;
  time_spent_seconds: number;
  completed: boolean;
}

export function useKnowledgeBaseReads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all reads for current user
  const { data: reads = [], isLoading } = useQuery({
    queryKey: ['knowledge-base-reads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('knowledge_base_reads')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as KnowledgeBaseRead[];
    },
    enabled: !!user?.id
  });

  // Mark article as read
  const markAsRead = useMutation({
    mutationFn: async ({ 
      articleId, 
      timeSpent = 0, 
      completed = true 
    }: { 
      articleId: string; 
      timeSpent?: number; 
      completed?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('knowledge_base_reads')
        .upsert({
          user_id: user.id,
          article_id: articleId,
          time_spent_seconds: timeSpent,
          completed,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,article_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-reads'] });
    },
    onError: (error) => {
      console.error('Error marking article as read:', error);
    }
  });

  // Update time spent on article
  const updateTimeSpent = useMutation({
    mutationFn: async ({ 
      articleId, 
      additionalSeconds 
    }: { 
      articleId: string; 
      additionalSeconds: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get current record
      const { data: existing } = await supabase
        .from('knowledge_base_reads')
        .select('time_spent_seconds')
        .eq('user_id', user.id)
        .eq('article_id', articleId)
        .maybeSingle();

      const currentTime = existing?.time_spent_seconds || 0;

      const { data, error } = await supabase
        .from('knowledge_base_reads')
        .upsert({
          user_id: user.id,
          article_id: articleId,
          time_spent_seconds: currentTime + additionalSeconds,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,article_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-reads'] });
    }
  });

  // Helper functions
  const isArticleRead = (articleId: string): boolean => {
    return reads.some(r => r.article_id === articleId);
  };

  const isArticleCompleted = (articleId: string): boolean => {
    return reads.some(r => r.article_id === articleId && r.completed);
  };

  const getReadProgress = (articleId: string): KnowledgeBaseRead | null => {
    return reads.find(r => r.article_id === articleId) || null;
  };

  const getReadArticleIds = (): string[] => {
    return reads.map(r => r.article_id);
  };

  const getCompletedCount = (): number => {
    return reads.filter(r => r.completed).length;
  };

  const getTotalTimeSpent = (): number => {
    return reads.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0);
  };

  return {
    reads,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAsReadAsync: markAsRead.mutateAsync,
    updateTimeSpent: updateTimeSpent.mutate,
    isArticleRead,
    isArticleCompleted,
    getReadProgress,
    getReadArticleIds,
    getCompletedCount,
    getTotalTimeSpent,
    isMarkingRead: markAsRead.isPending
  };
}
