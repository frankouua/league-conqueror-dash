-- Create special_events table for Boosters and Turning Points
CREATE TABLE public.special_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  category TEXT NOT NULL CHECK (category IN ('booster', 'turning_point')),
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  multiplier NUMERIC DEFAULT 1.0,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  applied_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Special events are viewable by everyone" 
ON public.special_events 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert special events" 
ON public.special_events 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete special events" 
ON public.special_events 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));