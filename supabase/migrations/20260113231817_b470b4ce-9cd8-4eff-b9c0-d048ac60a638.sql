-- Tabela para rastrear quais funcionalidades o usuário já viu no onboarding
CREATE TABLE public.feature_onboarding_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.feature_onboarding_reads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own onboarding reads"
ON public.feature_onboarding_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding reads"
ON public.feature_onboarding_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_feature_onboarding_user ON public.feature_onboarding_reads(user_id);