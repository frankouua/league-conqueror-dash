import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ChannelType = 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'email';
export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker';

export interface MediaItem {
  id: string;
  organization_id: string;
  channel_type: ChannelType;
  message_id: string | null;
  chat_id: string | null;
  media_type: MediaType;
  media_url: string | null;
  media_preview: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  caption: string | null;
  from_me: boolean;
  contact_name: string | null;
  contact_number: string | null;
  media_timestamp: string;
  created_at: string;
  is_archived: boolean;
}

export interface MediaStats {
  total_count: number;
  image_count: number;
  video_count: number;
  audio_count: number;
  document_count: number;
  archived_count: number;
  estimated_size_mb: number;
}

interface UseMediaLibraryOptions {
  channel?: ChannelType;
  mediaType?: MediaType;
  chatId?: string;
  includeArchived?: boolean;
  limit?: number;
}

export function useMediaLibrary(options: UseMediaLibraryOptions = {}) {
  const { channel, mediaType, chatId, includeArchived = false, limit = 100 } = options;
  
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('channel_media_library')
        .select('*')
        .order('media_timestamp', { ascending: false })
        .limit(limit);

      if (channel) {
        query = query.eq('channel_type', channel);
      }
      if (mediaType) {
        query = query.eq('media_type', mediaType);
      }
      if (chatId) {
        query = query.eq('chat_id', chatId);
      }
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MediaLibrary] Error fetching media:', error);
        toast.error('Erro ao carregar mídias');
      } else {
        setMedia((data as MediaItem[]) || []);
      }
    } catch (err) {
      console.error('[MediaLibrary] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [channel, mediaType, chatId, includeArchived, limit]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_media_library_stats');
      
      if (error) {
        console.error('[MediaLibrary] Error fetching stats:', error);
      } else if (data && data.length > 0) {
        setStats(data[0] as MediaStats);
      }
    } catch (err) {
      console.error('[MediaLibrary] Unexpected error:', err);
    }
  }, []);

  const archiveMedia = useCallback(async (mediaIds: string[]) => {
    try {
      const { error } = await supabase
        .from('channel_media_library')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .in('id', mediaIds);

      if (error) {
        toast.error('Erro ao arquivar mídias');
        return false;
      }

      toast.success(`${mediaIds.length} mídia(s) arquivada(s)`);
      await fetchMedia();
      await fetchStats();
      return true;
    } catch (err) {
      console.error('[MediaLibrary] Error archiving:', err);
      return false;
    }
  }, [fetchMedia, fetchStats]);

  const restoreMedia = useCallback(async (mediaIds: string[]) => {
    try {
      const { error } = await supabase
        .from('channel_media_library')
        .update({
          is_archived: false,
          archived_at: null
        })
        .in('id', mediaIds);

      if (error) {
        toast.error('Erro ao restaurar mídias');
        return false;
      }

      toast.success(`${mediaIds.length} mídia(s) restaurada(s)`);
      await fetchMedia();
      await fetchStats();
      return true;
    } catch (err) {
      console.error('[MediaLibrary] Error restoring:', err);
      return false;
    }
  }, [fetchMedia, fetchStats]);

  const deleteMedia = useCallback(async (mediaIds: string[]) => {
    try {
      const { error } = await supabase
        .from('channel_media_library')
        .delete()
        .in('id', mediaIds);

      if (error) {
        toast.error('Erro ao deletar mídias');
        return false;
      }

      toast.success(`${mediaIds.length} mídia(s) deletada(s) permanentemente`);
      await fetchMedia();
      await fetchStats();
      return true;
    } catch (err) {
      console.error('[MediaLibrary] Error deleting:', err);
      return false;
    }
  }, [fetchMedia, fetchStats]);

  useEffect(() => {
    fetchMedia();
    fetchStats();
  }, [fetchMedia, fetchStats]);

  return {
    media,
    stats,
    loading,
    refetch: fetchMedia,
    archiveMedia,
    restoreMedia,
    deleteMedia
  };
}
