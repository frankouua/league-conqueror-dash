-- =============================================================================
-- Tabela centralizada de mídias para todos os canais de comunicação
-- Permite visualização em galeria, gestão de armazenamento e limpeza de mídias antigas
-- =============================================================================

-- Criar tabela de biblioteca de mídias
CREATE TABLE public.channel_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('whatsapp', 'instagram', 'facebook', 'telegram', 'email')),
  
  -- Referência à mensagem original (para WhatsApp)
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES public.whatsapp_chats(id) ON DELETE SET NULL,
  
  -- Dados da mídia
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document', 'sticker')),
  media_url TEXT,
  media_preview TEXT, -- Base64 para visualização rápida
  file_name TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- Metadados
  caption TEXT,
  from_me BOOLEAN DEFAULT false,
  contact_name TEXT,
  contact_number TEXT,
  
  -- Timestamps
  media_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Controle de limpeza
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID
);

-- Índices para performance
CREATE INDEX idx_channel_media_library_org ON public.channel_media_library(organization_id);
CREATE INDEX idx_channel_media_library_channel ON public.channel_media_library(channel_type);
CREATE INDEX idx_channel_media_library_type ON public.channel_media_library(media_type);
CREATE INDEX idx_channel_media_library_timestamp ON public.channel_media_library(media_timestamp DESC);
CREATE INDEX idx_channel_media_library_chat ON public.channel_media_library(chat_id);
CREATE INDEX idx_channel_media_library_archived ON public.channel_media_library(is_archived);

-- RLS
ALTER TABLE public.channel_media_library ENABLE ROW LEVEL SECURITY;

-- Política de leitura: usuários só veem mídias da sua organização
CREATE POLICY "Users can view media from their organization"
  ON public.channel_media_library
  FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR public.is_admin());

-- Política de inserção: usuários podem adicionar mídias à sua organização
CREATE POLICY "Users can add media to their organization"
  ON public.channel_media_library
  FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() OR public.is_admin());

-- Política de atualização: arquivar mídias
CREATE POLICY "Users can archive media from their organization"
  ON public.channel_media_library
  FOR UPDATE
  USING (organization_id = public.get_user_organization_id() OR public.is_admin());

-- Política de delete: apenas admins podem deletar permanentemente
CREATE POLICY "Only admins can delete media"
  ON public.channel_media_library
  FOR DELETE
  USING (public.is_admin());

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_media_library;

-- =============================================================================
-- Função para sincronizar mídias do whatsapp_messages para a biblioteca
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_whatsapp_media_to_library()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_contact_name TEXT;
  v_contact_number TEXT;
  v_media_type TEXT;
BEGIN
  -- Só processa se tiver mídia
  IF NEW.media_url IS NULL AND NEW.media_preview IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Normalizar tipo de mídia
  v_media_type := CASE 
    WHEN LOWER(NEW.message_type) LIKE '%image%' THEN 'image'
    WHEN LOWER(NEW.message_type) LIKE '%video%' THEN 'video'
    WHEN LOWER(NEW.message_type) LIKE '%audio%' OR LOWER(NEW.message_type) LIKE '%ptt%' THEN 'audio'
    WHEN LOWER(NEW.message_type) LIKE '%document%' THEN 'document'
    WHEN LOWER(NEW.message_type) LIKE '%sticker%' THEN 'sticker'
    ELSE NULL
  END;
  
  -- Só adiciona tipos de mídia conhecidos
  IF v_media_type IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar organização e dados do chat
  SELECT 
    c.organization_id, 
    c.contact_name,
    c.contact_number
  INTO v_org_id, v_contact_name, v_contact_number
  FROM public.whatsapp_chats c
  WHERE c.id = NEW.chat_id;
  
  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Inserir na biblioteca (upsert para evitar duplicatas)
  INSERT INTO public.channel_media_library (
    organization_id,
    channel_type,
    message_id,
    chat_id,
    media_type,
    media_url,
    media_preview,
    caption,
    from_me,
    contact_name,
    contact_number,
    media_timestamp
  ) VALUES (
    v_org_id,
    'whatsapp',
    NEW.id,
    NEW.chat_id,
    v_media_type,
    NEW.media_url,
    NEW.media_preview,
    NEW.content,
    NEW.from_me,
    v_contact_name,
    v_contact_number,
    NEW.message_timestamp
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger para sincronizar automaticamente
CREATE TRIGGER trg_sync_whatsapp_media
  AFTER INSERT OR UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_whatsapp_media_to_library();

-- =============================================================================
-- Função para obter estatísticas de uso de mídia
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_media_library_stats(p_org_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_count BIGINT,
  image_count BIGINT,
  video_count BIGINT,
  audio_count BIGINT,
  document_count BIGINT,
  archived_count BIGINT,
  estimated_size_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  v_org_id := COALESCE(p_org_id, public.get_user_organization_id());
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_count,
    COUNT(*) FILTER (WHERE media_type = 'image')::BIGINT AS image_count,
    COUNT(*) FILTER (WHERE media_type = 'video')::BIGINT AS video_count,
    COUNT(*) FILTER (WHERE media_type = 'audio')::BIGINT AS audio_count,
    COUNT(*) FILTER (WHERE media_type = 'document')::BIGINT AS document_count,
    COUNT(*) FILTER (WHERE is_archived = true)::BIGINT AS archived_count,
    ROUND(COALESCE(SUM(file_size_bytes), 0) / 1048576.0, 2) AS estimated_size_mb
  FROM public.channel_media_library
  WHERE organization_id = v_org_id;
END;
$$;