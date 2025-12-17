-- Create table for individual goals
CREATE TABLE public.individual_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024 AND year <= 2030),
  revenue_goal NUMERIC DEFAULT 0,
  nps_goal INTEGER DEFAULT 0,
  testimonials_goal INTEGER DEFAULT 0,
  referrals_goal INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Enable RLS
ALTER TABLE public.individual_goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Goals are viewable by team members"
ON public.individual_goals
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own goals"
ON public.individual_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.individual_goals
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_individual_goals_updated_at
BEFORE UPDATE ON public.individual_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();