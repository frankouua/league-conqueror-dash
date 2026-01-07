-- Fix RLS helper functions and profiles policies to use profiles.user_id (auth uid) instead of profiles.id

-- 1) Fix helper functions
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    false
  );
$$;

-- 2) Clean up profiles SELECT policies (remove duplicates and the recursive one)
-- IMPORTANT: avoid any policy that queries public.profiles inside public.profiles policy

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view team members" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view teammates" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;

-- Recreate minimal, non-recursive policies for SELECT
CREATE POLICY "Profiles: view own"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Profiles: view team"
ON public.profiles
FOR SELECT
TO authenticated
USING (team_id = public.get_my_team_id());

CREATE POLICY "Profiles: admin view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Keep existing UPDATE/DELETE policies that rely on has_role/auth.uid() = user_id
-- (we're only fixing broken/recursive SELECT policies here)

-- 3) Fix revenue_records SELECT policies to avoid depending on querying profiles directly
DROP POLICY IF EXISTS "Admins can view all revenue" ON public.revenue_records;
DROP POLICY IF EXISTS "Admins view all revenue records" ON public.revenue_records;
DROP POLICY IF EXISTS "Users view own revenue records" ON public.revenue_records;
DROP POLICY IF EXISTS "Users view team revenue records" ON public.revenue_records;

CREATE POLICY "Revenue: select own/team/admin"
ON public.revenue_records
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR user_id = auth.uid()
  OR attributed_to_user_id = auth.uid()
  OR team_id = public.get_my_team_id()
);

-- Keep existing insert/update/delete policies as-is (admin + team inserts)