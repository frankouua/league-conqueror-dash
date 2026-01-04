-- =====================================================
-- SECURITY FIX: Add missing INSERT/DELETE policies
-- =====================================================

-- Profiles - INSERT should be handled by auth trigger only
-- The handle_new_user trigger creates profiles, so we block direct inserts
DROP POLICY IF EXISTS "Profiles created by auth trigger only" ON public.profiles;
CREATE POLICY "Only admins can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Feegow Sync Logs - Proper INSERT/UPDATE/DELETE policies for service operations
DROP POLICY IF EXISTS "Service can insert sync logs" ON public.feegow_sync_logs;
DROP POLICY IF EXISTS "Service can update sync logs" ON public.feegow_sync_logs;

-- Insert only allowed via service role (edge functions) - using a restrictive policy
-- The edge function uses service role key, so these policies affect anon/authenticated roles
CREATE POLICY "Authenticated admins can insert sync logs" 
ON public.feegow_sync_logs 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated admins can update sync logs" 
ON public.feegow_sync_logs 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Prevent deletion of sync logs (audit trail protection)
CREATE POLICY "No one can delete sync logs" 
ON public.feegow_sync_logs 
FOR DELETE 
TO authenticated
USING (false);