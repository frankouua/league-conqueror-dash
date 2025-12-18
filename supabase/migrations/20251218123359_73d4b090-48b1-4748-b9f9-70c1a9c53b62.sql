-- =============================================
-- FIX SECURITY ISSUES: Explicit Authentication Checks
-- =============================================

-- Fix profiles table: Add explicit authentication requirement
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate with explicit auth.uid() IS NOT NULL checks
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Team members can view team profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND team_id = get_my_team_id());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Fix referral_leads table: Add explicit authentication requirement
DROP POLICY IF EXISTS "Team members can view team referral leads" ON public.referral_leads;

CREATE POLICY "Team members can view team referral leads" 
ON public.referral_leads 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Also fix UPDATE policies with explicit auth checks
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Fix referral_leads UPDATE policy
DROP POLICY IF EXISTS "Assigned user or admin can update referral leads" ON public.referral_leads;

CREATE POLICY "Assigned user or admin can update referral leads" 
ON public.referral_leads 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    assigned_to = auth.uid() 
    OR registered_by = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);