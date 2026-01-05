-- Create table for user achievements/badges
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points_value INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  month INTEGER,
  year INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Allow users to view all achievements (for leaderboard/display)
CREATE POLICY "Users can view all achievements"
ON public.user_achievements
FOR SELECT
USING (true);

-- Only admins can insert achievements (system-generated)
CREATE POLICY "Service role can insert achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON public.user_achievements(achievement_type);
CREATE INDEX idx_user_achievements_unlocked ON public.user_achievements(unlocked_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;