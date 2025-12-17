-- Add new status values for Kanban columns
ALTER TYPE public.referral_lead_status ADD VALUE IF NOT EXISTS 'pos_venda';
ALTER TYPE public.referral_lead_status ADD VALUE IF NOT EXISTS 'relacionamento';
ALTER TYPE public.referral_lead_status ADD VALUE IF NOT EXISTS 'ganho';
ALTER TYPE public.referral_lead_status ADD VALUE IF NOT EXISTS 'perdido';

-- Create temperature enum for leads
CREATE TYPE public.lead_temperature AS ENUM ('hot', 'warm', 'cold');

-- Add new columns to referral_leads for Kanban
ALTER TABLE public.referral_leads 
ADD COLUMN IF NOT EXISTS temperature public.lead_temperature DEFAULT 'warm',
ADD COLUMN IF NOT EXISTS photo_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS loss_reason text DEFAULT NULL;

-- Create table for tracking Kanban checklist progress per lead
CREATE TABLE IF NOT EXISTS public.kanban_checklist_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.referral_leads(id) ON DELETE CASCADE,
    stage_key text NOT NULL,
    action_index integer NOT NULL,
    completed boolean DEFAULT true,
    completed_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(lead_id, stage_key, action_index)
);

-- Enable RLS on the new table
ALTER TABLE public.kanban_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for kanban_checklist_progress
CREATE POLICY "Team members can view checklist progress for their leads"
ON public.kanban_checklist_progress FOR SELECT
USING (
    lead_id IN (
        SELECT rl.id FROM public.referral_leads rl
        WHERE rl.team_id IN (
            SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid()
        )
    ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Team members can insert checklist progress"
ON public.kanban_checklist_progress FOR INSERT
WITH CHECK (
    lead_id IN (
        SELECT rl.id FROM public.referral_leads rl
        WHERE rl.team_id IN (
            SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Team members can update their checklist progress"
ON public.kanban_checklist_progress FOR UPDATE
USING (
    lead_id IN (
        SELECT rl.id FROM public.referral_leads rl
        WHERE rl.team_id IN (
            SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Team members can delete checklist progress"
ON public.kanban_checklist_progress FOR DELETE
USING (
    lead_id IN (
        SELECT rl.id FROM public.referral_leads rl
        WHERE rl.team_id IN (
            SELECT p.team_id FROM public.profiles p WHERE p.user_id = auth.uid()
        )
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_kanban_checklist_progress_updated_at
BEFORE UPDATE ON public.kanban_checklist_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();