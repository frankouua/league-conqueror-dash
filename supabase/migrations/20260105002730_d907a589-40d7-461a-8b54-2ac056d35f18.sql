-- ============================================
-- FINAL SECURITY FIX: Remove remaining permissive policies
-- ============================================

-- 1. FIX RFV_CUSTOMERS - Remove old permissive policies that allow any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view RFV customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can insert RFV customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can update RFV customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Admins can delete RFV customers" ON public.rfv_customers;

-- 2. FIX RFV_UPLOAD_LOGS - Remove old policy with USING(true)
DROP POLICY IF EXISTS "Authenticated users can view RFV upload logs" ON public.rfv_upload_logs;
DROP POLICY IF EXISTS "Authenticated users can insert RFV upload logs" ON public.rfv_upload_logs;

-- 3. FIX RFV_ACTION_HISTORY - Ensure only own actions are visible and admins
DROP POLICY IF EXISTS "Authenticated users can view all rfv action history" ON public.rfv_action_history;