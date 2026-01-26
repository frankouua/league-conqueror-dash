import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppChat {
  id: string;
  instance_id: string;
  remote_jid: string;
  contact_name: string | null;
  contact_number: string | null;
  contact_photo_url: string | null;
  is_group: boolean | null;
  unread_count: number | null;
  last_message_timestamp: string | null;
  created_at: string | null;
  updated_at: string | null;
  organization_id: string | null;
}

export function useWhatsAppChats(instanceId?: string | null) {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset when instance changes
    setChats([]);
    
    // Don't fetch if no instance selected
    if (!instanceId) {
      setLoading(false);
      return;
    }

    // Fetch initial chats filtered by instance
    const fetchChats = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_chats')
        .select('*')
        .eq('instance_id', instanceId)
        .order('last_message_timestamp', { ascending: false });

      if (error) {
        console.error('[WhatsApp] Error fetching chats:', error);
      } else {
        console.log('[WhatsApp] Chats loaded for instance:', {
          instance_id: instanceId,
          chat_count: data?.length || 0
        });
        setChats(data || []);
      }
      setLoading(false);
    };

    fetchChats();

    // Subscribe to realtime changes for this specific instance
    const channel = supabase
      .channel(`whatsapp_chats_${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_chats',
          filter: `instance_id=eq.${instanceId}`,
        },
        (payload) => {
          console.log('[Realtime] New chat:', payload.new);
          setChats((prev) => {
            const newChat = payload.new as WhatsAppChat;
            return [newChat, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_chats',
          filter: `instance_id=eq.${instanceId}`,
        },
        (payload) => {
          console.log('[Realtime] Chat updated:', payload.new);
          setChats((prev) => {
            const updatedChat = payload.new as WhatsAppChat;
            const filtered = prev.filter((c) => c.id !== updatedChat.id);
            const updated = [updatedChat, ...filtered];
            return updated.sort((a, b) => {
              const timeA = a.last_message_timestamp ? new Date(a.last_message_timestamp).getTime() : 0;
              const timeB = b.last_message_timestamp ? new Date(b.last_message_timestamp).getTime() : 0;
              return timeB - timeA;
            });
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    // Cleanup on unmount or instance change
    return () => {
      console.log('[Realtime] Unsubscribing from whatsapp_chats');
      supabase.removeChannel(channel);
    };
  }, [instanceId]);

  return { chats, loading };
}
