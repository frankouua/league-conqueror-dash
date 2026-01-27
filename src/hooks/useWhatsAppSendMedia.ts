import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMyWhatsAppInstances, InstanceRole } from './useMyWhatsAppInstances';
import { toast } from 'sonner';

export type MediaType = 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact';

interface SendMediaParams {
  instanceId: string;
  chatId: string;
  remoteJid: string;
  mediaType: MediaType;
  // For file media
  file?: File;
  caption?: string;
  // For location
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  // For contact
  contactName?: string;
  contactPhone?: string;
}

interface SendMediaResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

const ALLOWED_ROLES: InstanceRole[] = ['owner', 'coordinator', 'member'];

export function useWhatsAppSendMedia() {
  const [sending, setSending] = useState(false);
  const { instances, hasAccess, getRole } = useMyWhatsAppInstances();

  const canSendMedia = useCallback((instanceId: string): boolean => {
    if (!instanceId) return false;
    if (!hasAccess(instanceId)) return false;
    
    const role = getRole(instanceId);
    return !!role && ALLOWED_ROLES.includes(role);
  }, [hasAccess, getRole]);

  const getInstanceName = useCallback((instanceId: string): string | null => {
    const instance = instances.find(i => i.instance_id === instanceId);
    return instance?.instance_name || null;
  }, [instances]);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  }, []);

  const sendMedia = useCallback(async (params: SendMediaParams): Promise<SendMediaResult> => {
    const { 
      instanceId, 
      chatId, 
      remoteJid, 
      mediaType, 
      file, 
      caption,
      latitude,
      longitude,
      locationName,
      locationAddress,
      contactName,
      contactPhone
    } = params;

    // Validate required fields
    if (!instanceId) {
      toast.error('Selecione uma instância');
      return { success: false, error: 'No instance selected' };
    }

    if (!chatId) {
      toast.error('Selecione uma conversa');
      return { success: false, error: 'No chat selected' };
    }

    // Validate permissions
    if (!canSendMedia(instanceId)) {
      toast.error('Sem permissão para enviar mídia');
      return { success: false, error: 'Permission denied' };
    }

    const instanceName = getInstanceName(instanceId);
    if (!instanceName) {
      toast.error('Instância não encontrada');
      return { success: false, error: 'Instance not found' };
    }

    setSending(true);

    try {
      let payload: any = {
        action: 'send_media',
        instanceId,
        instanceName,
        chatId,
        remoteJid,
        mediaType,
        timestamp: new Date().toISOString()
      };

      // Add media-specific data
      if (mediaType === 'location') {
        if (!latitude || !longitude) {
          toast.error('Coordenadas são obrigatórias');
          return { success: false, error: 'Missing coordinates' };
        }
        payload.latitude = latitude;
        payload.longitude = longitude;
        payload.locationName = locationName;
        payload.locationAddress = locationAddress;
      } else if (mediaType === 'contact') {
        if (!contactName || !contactPhone) {
          toast.error('Nome e telefone são obrigatórios');
          return { success: false, error: 'Missing contact info' };
        }
        payload.contactName = contactName;
        payload.contactPhone = contactPhone;
      } else if (file) {
        // File-based media (image, video, document)
        const base64 = await fileToBase64(file);
        payload.fileBase64 = base64;
        payload.fileName = file.name;
        payload.fileMimeType = file.type;
        payload.caption = caption;
      } else {
        toast.error('Arquivo não fornecido');
        return { success: false, error: 'No file provided' };
      }

      console.log('[WhatsApp] Sending media:', {
        instanceId,
        instanceName,
        chatId,
        mediaType,
        hasFile: !!file,
        fileName: file?.name
      });

      const { data, error } = await supabase.functions.invoke('send-whatsapp-real', {
        body: payload
      });

      if (error) {
        console.error('[WhatsApp] Media send error:', error);
        toast.error('Erro ao enviar mídia');
        return { success: false, error: error.message };
      }

      const typedData = data as any;
      if (typedData && typedData.success === false) {
        const msg = typedData.error || 'Erro ao enviar mídia';
        toast.error(msg);
        return { success: false, error: msg };
      }

      console.log('[WhatsApp] Media sent successfully:', data);
      toast.success('Mídia enviada');
      return { 
        success: true, 
        messageId: typedData?.message_id 
      };

    } catch (error: any) {
      console.error('[WhatsApp] Unexpected media send error:', error);
      toast.error('Erro inesperado ao enviar mídia');
      return { success: false, error: error.message };
    } finally {
      setSending(false);
    }
  }, [canSendMedia, getInstanceName, fileToBase64]);

  return {
    sendMedia,
    canSendMedia,
    sending
  };
}
