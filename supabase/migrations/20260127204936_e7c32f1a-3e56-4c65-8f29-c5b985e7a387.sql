ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS media_preview text;

COMMENT ON COLUMN public.whatsapp_messages.media_preview IS 'Client-side preview (usually data URI) for rendering sent media when provider URL is not directly viewable.';