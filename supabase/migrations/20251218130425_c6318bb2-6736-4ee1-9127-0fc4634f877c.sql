-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;

-- Create a policy that allows anyone to view teams (team names are not sensitive)
CREATE POLICY "Anyone can view teams" 
ON public.teams 
FOR SELECT 
USING (true);