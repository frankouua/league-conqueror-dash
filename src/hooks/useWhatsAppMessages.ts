import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppMessage {
  id: string;
  chat_id: string;
  message_id: string;
  sender_name: string | null;
  content: string | null;
  message_type: string | null;
  media_url: string | null;
  media_preview?: string | null;
  raw_data?: unknown | null;
  from_me: boolean;
  message_timestamp: string;
  created_at: string;
  status: string | null;
}

export function useWhatsAppMessages(chatId: string | null) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    // Fetch messages for chat
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('message_timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching WhatsApp messages:', error);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to realtime for this specific chat
    const channel = supabase
      .channel(`whatsapp_messages_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[Realtime] New message:', payload.new);
          setMessages((prev) => [...prev, payload.new as WhatsAppMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[Realtime] Message updated:', payload.new);
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === (payload.new as WhatsAppMessage).id 
                ? (payload.new as WhatsAppMessage) 
                : msg
            )
          );
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Messages subscription (${chatId}):`, status);
      });

    // Cleanup on chatId change or unmount
    return () => {
      console.log(`[Realtime] Unsubscribing from messages (${chatId})`);
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  return { messages, loading };
}
