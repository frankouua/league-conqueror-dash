import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMyWhatsAppInstances } from './useMyWhatsAppInstances';

interface MarkAsReadParams {
  instanceId: string;
  chatId: string;
}

interface MarkAsReadResult {
  success: boolean;
  error?: string;
}

export function useMarkChatAsRead() {
  const { hasAccess, getRole } = useMyWhatsAppInstances();

  const markAsRead = useCallback(async (params: MarkAsReadParams): Promise<MarkAsReadResult> => {
    const { instanceId, chatId } = params;

    // Validate required parameters
    if (!instanceId || !chatId) {
      console.warn('[WhatsApp] Missing instanceId or chatId for markAsRead');
      return { success: false, error: 'Missing required parameters' };
    }

    // Security check: verify user has access to the instance
    if (!hasAccess(instanceId)) {
      console.error('[WhatsApp Security] Blocked mark as read attempt - no instance access', {
        instanceId,
        chatId
      });
      return { success: false, error: 'Unauthorized access to instance' };
    }

    // Validate user role
    const role = getRole(instanceId);
    if (!role || !['owner', 'coordinator', 'member'].includes(role)) {
      console.error('[WhatsApp Security] Blocked mark as read attempt - invalid role', {
        instanceId,
        chatId,
        role
      });
      return { success: false, error: 'Invalid role for this operation' };
    }

    try {
      // Check current unread_count to avoid unnecessary updates
      const { data: chat, error: fetchError } = await supabase
        .from('whatsapp_chats')
        .select('unread_count')
        .eq('id', chatId)
        .eq('instance_id', instanceId)
        .maybeSingle();

      if (fetchError) {
        console.error('[WhatsApp] Error fetching chat:', fetchError);
        return { success: false, error: fetchError.message };
      }

      // Skip update if already read (reduces writes & realtime traffic)
      if (!chat || chat.unread_count === 0) {
        return { success: true };
      }

      // Update unread_count to 0 - RLS will enforce access
      const { error } = await supabase
        .from('whatsapp_chats')
        .update({ unread_count: 0 })
        .eq('id', chatId)
        .eq('instance_id', instanceId);

      if (error) {
        console.error('[WhatsApp] Error marking chat as read:', error);
        return { success: false, error: error.message };
      }

      console.log('[WhatsApp] Chat marked as read', {
        instanceId,
        chatId
      });

      return { success: true };
    } catch (err) {
      console.error('[WhatsApp] Unexpected error marking chat as read:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }, [hasAccess, getRole]);

  return { markAsRead };
}
