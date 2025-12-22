-- Create table for team prizes/awards
CREATE TABLE public.team_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  prize_type TEXT NOT NULL CHECK (prize_type IN ('monthly', 'semester', 'annual')),
  period_month INTEGER, -- For monthly prizes (1-12)
  period_semester INTEGER CHECK (period_semester IN (1, 2)), -- For semester prizes
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  items TEXT[], -- Array of items won (trophies, medals, etc.)
  extra_rewards TEXT, -- For extra rewards like plane tickets
  notes TEXT,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  awarded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_prizes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view team prizes"
ON public.team_prizes
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert team prizes"
ON public.team_prizes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update team prizes"
ON public.team_prizes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete team prizes"
ON public.team_prizes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_prizes;