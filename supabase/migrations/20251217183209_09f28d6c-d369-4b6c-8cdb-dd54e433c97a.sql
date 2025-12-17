-- Fix winning_streaks policy to allow automatic streak recording
DROP POLICY IF EXISTS "Admins can insert streak records" ON public.winning_streaks;

-- Allow any authenticated user to insert (system automatically records streaks)
-- but only for teams they belong to
CREATE POLICY "Team members can record their team streaks" 
ON public.winning_streaks 
FOR INSERT 
WITH CHECK (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);