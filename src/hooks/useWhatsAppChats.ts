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

export function useWhatsAppChats() {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial chats
    const fetchChats = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_chats')
        .select('*')
        .order('last_message_timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching WhatsApp chats:', error);
      } else {
        setChats(data || []);
      }
      setLoading(false);
    };

    fetchChats();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('whatsapp_chats_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_chats',
        },
        (payload) => {
          console.log('[Realtime] New chat:', payload.new);
          setChats((prev) => {
            const newChat = payload.new as WhatsAppChat;
            // Add to beginning (most recent)
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
        },
        (payload) => {
          console.log('[Realtime] Chat updated:', payload.new);
          setChats((prev) => {
            const updatedChat = payload.new as WhatsAppChat;
            // Update existing chat and re-sort
            const filtered = prev.filter((c) => c.id !== updatedChat.id);
            const updated = [updatedChat, ...filtered];
            // Sort by last_message_timestamp DESC
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

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Unsubscribing from whatsapp_chats');
      supabase.removeChannel(channel);
    };
  }, []);

  return { chats, loading };
}
