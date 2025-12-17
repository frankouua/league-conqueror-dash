-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON public.teams;

-- Create a new policy that allows anyone to view teams (needed for signup)
CREATE POLICY "Teams are viewable by everyone" 
ON public.teams 
FOR SELECT 
TO public
USING (true);