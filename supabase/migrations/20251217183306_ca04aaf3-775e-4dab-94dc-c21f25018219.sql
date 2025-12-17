-- Restrict teams and winning_streaks to authenticated users only
-- Teams table
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by authenticated users" 
ON public.teams 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Winning streaks table  
DROP POLICY IF EXISTS "Streak records are viewable by everyone" ON public.winning_streaks;
CREATE POLICY "Streak records are viewable by authenticated users" 
ON public.winning_streaks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);