-- Create table for winning streak records
CREATE TABLE public.winning_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  team_name TEXT NOT NULL,
  consecutive_wins INTEGER NOT NULL,
  start_month INTEGER NOT NULL,
  end_month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.winning_streaks ENABLE ROW LEVEL SECURITY;

-- Everyone can view streak records
CREATE POLICY "Streak records are viewable by everyone"
ON public.winning_streaks
FOR SELECT
USING (true);

-- Only authenticated users can insert streak records
CREATE POLICY "Authenticated users can insert streak records"
ON public.winning_streaks
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_winning_streaks_consecutive_wins ON public.winning_streaks(consecutive_wins DESC);
CREATE INDEX idx_winning_streaks_team_id ON public.winning_streaks(team_id);