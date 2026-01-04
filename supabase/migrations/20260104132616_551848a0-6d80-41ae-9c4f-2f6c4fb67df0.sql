-- =====================================================
-- FINAL SECURITY FIXES - Remove overly permissive policies
-- =====================================================

-- FIX: Teams - Remove public policy and require authentication
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Authenticated users can view teams" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- FIX: Team Prizes - Remove public policy and require authentication
DROP POLICY IF EXISTS "Anyone can view team prizes" ON public.team_prizes;
CREATE POLICY "Authenticated users can view team prizes" 
ON public.team_prizes 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- FIX: Feegow Sync Logs - Remove overly permissive service role policy
DROP POLICY IF EXISTS "Service role can manage sync logs" ON public.feegow_sync_logs;

-- FIX: Referral Leads - Replace team-wide access with user-specific access
DROP POLICY IF EXISTS "Team members can view team referral leads" ON public.referral_leads;
CREATE POLICY "Users can view own or assigned leads" 
ON public.referral_leads 
FOR SELECT 
TO authenticated
USING (
  registered_by = auth.uid()
  OR assigned_to = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- FIX: Cancellations - Replace team-wide access with user-specific access
DROP POLICY IF EXISTS "Team members can view team cancellations" ON public.cancellations;
CREATE POLICY "Users can view own cancellations" 
ON public.cancellations 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
  OR retained_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);