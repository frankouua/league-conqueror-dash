-- Add country and city columns to proposal_control
ALTER TABLE public.proposal_control
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Create indexes for geographical filters
CREATE INDEX IF NOT EXISTS idx_proposal_control_country ON public.proposal_control(country);
CREATE INDEX IF NOT EXISTS idx_proposal_control_city ON public.proposal_control(city);