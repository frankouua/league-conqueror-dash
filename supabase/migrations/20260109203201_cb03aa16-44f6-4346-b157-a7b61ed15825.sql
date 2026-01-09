-- Create table for CRM lead interactions with sentiment and intention tracking
CREATE TABLE IF NOT EXISTS public.crm_lead_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- whatsapp, call, email, video_call, meeting
  description TEXT,
  sentiment TEXT, -- positive, neutral, negative
  intention TEXT, -- Interesse, Dúvidas, Agendamento, Negociação, Objeção, Desistência, Retorno
  duration_seconds INTEGER,
  outcome TEXT,
  next_action TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_lead_interactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all interactions
CREATE POLICY "Authenticated users can view interactions"
ON public.crm_lead_interactions
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create interactions
CREATE POLICY "Authenticated users can create interactions"
ON public.crm_lead_interactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own interactions
CREATE POLICY "Users can update own interactions"
ON public.crm_lead_interactions
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Add indexes
CREATE INDEX idx_crm_interactions_lead_id ON public.crm_lead_interactions(lead_id);
CREATE INDEX idx_crm_interactions_sentiment ON public.crm_lead_interactions(sentiment);
CREATE INDEX idx_crm_interactions_intention ON public.crm_lead_interactions(intention);
CREATE INDEX idx_crm_interactions_created_at ON public.crm_lead_interactions(created_at DESC);