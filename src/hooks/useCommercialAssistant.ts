import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

interface SellerContext {
  sellerName?: string;
  teamName?: string;
  monthlyGoal?: number;
  currentRevenue?: number;
  progress?: number;
  daysRemaining?: number;
}

export function useCommercialAssistant() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Fetch conversations list
  const { data: conversations, refetch: refetchConversations } = useQuery({
    queryKey: ['ai-conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch seller context
  const { data: sellerContext } = useQuery({
    queryKey: ['seller-context', profile?.user_id, currentMonth, currentYear],
    queryFn: async (): Promise<SellerContext> => {
      if (!profile?.user_id) return {};

      let teamName = '';
      if (profile.team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select('name')
          .eq('id', profile.team_id)
          .single();
        teamName = team?.name || '';
      }

      const { data: goals } = await supabase
        .from('predefined_goals')
        .select('*')
        .eq('matched_user_id', profile.user_id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();

      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

      const { data: revenue } = await supabase
        .from('revenue_records')
        .select('amount')
        .eq('user_id', profile.user_id)
        .gte('date', startDate)
        .lte('date', endDate);

      const currentRevenue = revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const monthlyGoal = goals?.meta1_goal || 0;
      const progress = monthlyGoal > 0 ? (currentRevenue / monthlyGoal) * 100 : 0;

      const today = new Date();
      const lastDay = new Date(currentYear, currentMonth, 0);
      const daysRemaining = Math.max(0, lastDay.getDate() - today.getDate() + 1);

      return {
        sellerName: profile.full_name,
        teamName,
        monthlyGoal,
        currentRevenue,
        progress,
        daysRemaining,
      };
    },
    enabled: !!profile?.user_id,
  });

  // Load messages for a conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    
    const { data, error } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading conversation:', error);
      return;
    }

    setMessages(data?.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })) || []);
  }, []);

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async (firstMessage: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchConversations();
    },
  });

  // Save message to database
  const saveMessage = useCallback(async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    const { error } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
      });

    if (error) {
      console.error('Error saving message:', error);
    }
  }, []);

  // Update conversation title
  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    await supabase
      .from('ai_conversations')
      .update({ title: title.slice(0, 50) + (title.length > 50 ? '...' : '') })
      .eq('id', conversationId);
    
    refetchConversations();
  }, [refetchConversations]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId);
    
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }
    
    refetchConversations();
  }, [currentConversationId, refetchConversations]);

  // Send message
  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || !user?.id) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    let conversationId = currentConversationId;

    // Create new conversation if needed
    if (!conversationId) {
      try {
        const newConversation = await createConversation.mutateAsync(input);
        conversationId = newConversation.id;
        setCurrentConversationId(conversationId);
      } catch (err) {
        console.error('Error creating conversation:', err);
        setError('Erro ao criar conversa');
        setIsLoading(false);
        return;
      }
    }

    // Save user message
    await saveMessage(conversationId, 'user', input);

    let assistantContent = '';

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commercial-ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            context: sellerContext,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar mensagem');
      }

      if (!response.body) {
        throw new Error('Resposta vazia do servidor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch { /* ignore */ }
        }
      }

      // Save assistant response
      if (assistantContent && conversationId) {
        await saveMessage(conversationId, 'assistant', assistantContent);
        refetchConversations();
      }
    } catch (err) {
      console.error('Commercial AI error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, sellerContext, currentConversationId, user?.id, createConversation, saveMessage, refetchConversations]);

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    startNewConversation();
  }, [startNewConversation]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    sellerContext,
    conversations,
    currentConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation,
    updateConversationTitle,
  };
}
