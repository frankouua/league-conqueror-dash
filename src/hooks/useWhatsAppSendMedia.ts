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
  // For file media (File or Blob for audio recordings)
  file?: File;
  audioBlob?: Blob;
  audioDuration?: number;
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

  // Convert File to data URI (WUZAPI requer o data URI completo)
  const fileToDataUri = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
    });
  }, []);

  // Convert Blob to data URI (for audio recordings)
  const blobToDataUri = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
    });
  }, []);

  // Cria um preview menor (data URI) para renderização no chat (experiência tipo Direct/Messenger)
  // Evita depender do link do WhatsApp (que muitas vezes é criptografado/expira).
  const createImagePreviewDataUri = useCallback(async (file: File): Promise<string> => {
    const MAX_SIZE = 1024;
    const QUALITY = 0.85;

    // Fallback: se não for imagem, retorna data uri original
    if (!file.type?.startsWith('image/')) {
      return await fileToDataUri(file);
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Falha ao carregar imagem para preview'));
        el.src = objectUrl;
      });

      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;
      const scale = Math.min(1, MAX_SIZE / Math.max(srcW, srcH));
      const outW = Math.max(1, Math.round(srcW * scale));
      const outH = Math.max(1, Math.round(srcH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas não suportado');

      ctx.drawImage(img, 0, 0, outW, outH);

      // Padroniza em JPEG para reduzir peso (bom o suficiente pra preview)
      return canvas.toDataURL('image/jpeg', QUALITY);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }, [fileToDataUri]);

  const sendMedia = useCallback(async (params: SendMediaParams): Promise<SendMediaResult> => {
    const { 
      instanceId, 
      chatId, 
      remoteJid, 
      mediaType, 
      file,
      audioBlob,
      audioDuration,
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
      } else if (audioBlob && mediaType === 'audio') {
        // Audio recording (Blob from MediaRecorder)
        const dataUri = await blobToDataUri(audioBlob);
        payload.fileBase64 = dataUri;
        payload.fileName = `audio_${Date.now()}.webm`;
        payload.fileMimeType = audioBlob.type || 'audio/webm';
        payload.audioDuration = audioDuration;
      } else if (file) {
        // File-based media (image, video, document)
        const dataUri = await fileToDataUri(file);
        payload.fileBase64 = dataUri;
        payload.fileName = file.name;
        payload.fileMimeType = file.type;
        payload.caption = caption;

        // Para imagens, enviamos um preview reduzido para persistir no banco e mostrar no chat
        if (mediaType === 'image') {
          try {
            payload.mediaPreview = await createImagePreviewDataUri(file);
          } catch (e) {
            console.warn('[WhatsApp] Failed to generate image preview, falling back to original data URI', e);
            payload.mediaPreview = dataUri;
          }
        }
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
        hasAudioBlob: !!audioBlob,
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
  }, [canSendMedia, getInstanceName, fileToDataUri, blobToDataUri, createImagePreviewDataUri]);

  return {
    sendMedia,
    canSendMedia,
    sending
  };
}
