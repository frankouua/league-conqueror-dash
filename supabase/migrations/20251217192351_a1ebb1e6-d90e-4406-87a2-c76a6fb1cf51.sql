-- Fix infinite recursion in RLS policies for public.profiles
-- Root cause: profiles SELECT policy referenced profiles again via subquery.

-- 1) Helper function to get current user's team_id without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 2) Replace recursive policy with non-recursive version
DROP POLICY IF EXISTS "Team members can view team profiles" ON public.profiles;

CREATE POLICY "Team members can view team profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  team_id = public.get_my_team_id()
);

-- 3) Ensure existing 'own profile' policies are scoped to authenticated (avoid public/anon access)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);