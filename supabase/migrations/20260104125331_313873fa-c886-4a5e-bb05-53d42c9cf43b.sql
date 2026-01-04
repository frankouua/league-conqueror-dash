-- Add is_favorite column to ai_messages table
ALTER TABLE public.ai_messages ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Create index for quick favorite lookups
CREATE INDEX idx_ai_messages_favorite ON public.ai_messages(is_favorite) WHERE is_favorite = true;