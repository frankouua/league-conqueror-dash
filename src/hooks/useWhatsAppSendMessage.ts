import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMyWhatsAppInstances, InstanceRole } from './useMyWhatsAppInstances';
import { toast } from 'sonner';

interface SendMessageParams {
  instanceId: string;
  chatId: string;
  remoteJid: string;
  message: string;
}

interface SendMessageResult {
  success: boolean;
  error?: string;
}

const ALLOWED_ROLES: InstanceRole[] = ['owner', 'coordinator', 'member'];

export function useWhatsAppSendMessage() {
  const [sending, setSending] = useState(false);
  const { instances, hasAccess, getRole } = useMyWhatsAppInstances();

  /**
   * Validates if the user can send messages to the given instance
   */
  const canSendMessage = useCallback((instanceId: string): boolean => {
    if (!instanceId) {
      console.warn('[WhatsApp Security] No instance ID provided for message send validation');
      return false;
    }

    if (!hasAccess(instanceId)) {
      console.error('[WhatsApp Security] Blocked message send attempt - No access to instance', {
        instanceId,
        timestamp: new Date().toISOString()
      });
      return false;
    }

    const role = getRole(instanceId);
    if (!role || !ALLOWED_ROLES.includes(role)) {
      console.error('[WhatsApp Security] Blocked message send attempt - Insufficient permissions', {
        instanceId,
        role,
        timestamp: new Date().toISOString()
      });
      return false;
    }

    return true;
  }, [hasAccess, getRole]);

  /**
   * Gets the instance name for the given instance ID
   */
  const getInstanceName = useCallback((instanceId: string): string | null => {
    const instance = instances.find(i => i.instance_id === instanceId);
    return instance?.instance_name || null;
  }, [instances]);

  /**
   * Sends a WhatsApp message through the selected instance
   */
  const sendMessage = useCallback(async ({
    instanceId,
    chatId,
    remoteJid,
    message
  }: SendMessageParams): Promise<SendMessageResult> => {
    // Validate required fields
    if (!instanceId) {
      console.error('[WhatsApp Security] Blocked message send attempt - No instance selected');
      toast.error('Selecione uma instância para enviar mensagens');
      return { success: false, error: 'No instance selected' };
    }

    if (!chatId) {
      console.error('[WhatsApp Security] Blocked message send attempt - No chat selected');
      toast.error('Selecione uma conversa para enviar mensagens');
      return { success: false, error: 'No chat selected' };
    }

    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return { success: false, error: 'Empty message' };
    }

    // Validate permissions
    if (!canSendMessage(instanceId)) {
      toast.error('Você não tem permissão para enviar mensagens nesta instância');
      return { success: false, error: 'Permission denied' };
    }

    const instanceName = getInstanceName(instanceId);
    if (!instanceName) {
      console.error('[WhatsApp Security] Blocked message send attempt - Instance not found', {
        instanceId
      });
      toast.error('Instância não encontrada');
      return { success: false, error: 'Instance not found' };
    }

    setSending(true);

    try {
      // Build the payload with instance context
      const payload = {
        action: 'send_chat_message',
        instanceId,
        instanceName,
        chatId,
        remoteJid,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };

      console.log('[WhatsApp] Sending message with payload:', {
        instanceId,
        instanceName,
        chatId,
        messageLength: message.length
      });

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('send-whatsapp-real', {
        body: payload
      });

      if (error) {
        console.error('[WhatsApp] Send error:', error);
        toast.error('Erro ao enviar mensagem');
        return { success: false, error: error.message };
      }

      // Edge function can return { success: false, error: string } with 200 status
      const typedData = data as any;
      if (typedData && typedData.success === false) {
        const msg = typeof typedData.error === 'string' && typedData.error.trim()
          ? typedData.error
          : 'Erro ao enviar mensagem';
        console.error('[WhatsApp] Provider rejected send:', {
          instanceId,
          instanceName,
          chatId,
          response: typedData
        });
        toast.error(msg);
        return { success: false, error: msg };
      }

      // Log success
      console.log('[WhatsApp] Message sent successfully:', {
        instanceId,
        instanceName,
        chatId,
        response: data
      });

      toast.success('Mensagem enviada');
      return { success: true };

    } catch (error: any) {
      console.error('[WhatsApp] Unexpected send error:', error);
      toast.error('Erro inesperado ao enviar mensagem');
      return { success: false, error: error.message };
    } finally {
      setSending(false);
    }
  }, [canSendMessage, getInstanceName]);

  return {
    sendMessage,
    canSendMessage,
    sending
  };
}
