-- Add surgery_date field to crm_leads table
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS surgery_date DATE;

-- Add surgery-related fields
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS surgery_location TEXT,
ADD COLUMN IF NOT EXISTS surgery_notes TEXT,
ADD COLUMN IF NOT EXISTS pre_surgery_checklist_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS post_surgery_checklist_completed BOOLEAN DEFAULT FALSE;

-- Create a checklist progress table for leads
CREATE TABLE IF NOT EXISTS public.crm_lead_checklist_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  action_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, stage_key, action_index)
);

-- Enable RLS
ALTER TABLE public.crm_lead_checklist_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for checklist progress
CREATE POLICY "Users can view checklist progress"
ON public.crm_lead_checklist_progress
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert checklist progress"
ON public.crm_lead_checklist_progress
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update checklist progress"
ON public.crm_lead_checklist_progress
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete checklist progress"
ON public.crm_lead_checklist_progress
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_crm_lead_checklist_lead_id ON public.crm_lead_checklist_progress(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_surgery_date ON public.crm_leads(surgery_date);

-- Enable realtime for checklist table
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_lead_checklist_progress;