-- ============================================
-- SECURITY FIX: Restrict access to sensitive data
-- ============================================

-- 1. FIX PROFILES TABLE - Only user can see their own full data, team members see limited info
-- Drop existing policies and recreate with better restrictions
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles from their team" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Users can fully view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all profiles (for management)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- 2. FIX RFV_CUSTOMERS TABLE - Restrict to admins only (sensitive customer data)
DROP POLICY IF EXISTS "Authenticated users can view rfv customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can insert rfv customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can update rfv customers" ON public.rfv_customers;

-- Only admins can view customer data
CREATE POLICY "Admins can view rfv customers" 
ON public.rfv_customers FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert customer data
CREATE POLICY "Admins can insert rfv customers" 
ON public.rfv_customers FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update customer data
CREATE POLICY "Admins can update rfv customers" 
ON public.rfv_customers FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- 3. FIX REFERRAL_LEADS TABLE - Restrict to assigned user, registrar, and admins
DROP POLICY IF EXISTS "Users can view their team leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Users can view leads they registered or are assigned to" ON public.referral_leads;
DROP POLICY IF EXISTS "Users can insert leads for their team" ON public.referral_leads;
DROP POLICY IF EXISTS "Users can update leads they manage" ON public.referral_leads;
DROP POLICY IF EXISTS "Admins can view all referral leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Admins can update any referral lead" ON public.referral_leads;

-- Users can only view leads they registered or are assigned to
CREATE POLICY "Users can view their own leads" 
ON public.referral_leads FOR SELECT 
USING (
  auth.uid() = registered_by 
  OR auth.uid() = assigned_to
);

-- Admins can view all leads
CREATE POLICY "Admins can view all referral leads" 
ON public.referral_leads FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert leads (their own)
CREATE POLICY "Users can insert their leads" 
ON public.referral_leads FOR INSERT 
WITH CHECK (auth.uid() = registered_by);

-- Users can update leads they registered or are assigned to
CREATE POLICY "Users can update their own leads" 
ON public.referral_leads FOR UPDATE 
USING (
  auth.uid() = registered_by 
  OR auth.uid() = assigned_to
);

-- Admins can update any lead
CREATE POLICY "Admins can update any referral lead" 
ON public.referral_leads FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- 4. FIX CANCELLATIONS TABLE - Restrict to user who created, retained, and admins
DROP POLICY IF EXISTS "Users can view cancellations they created or retained" ON public.cancellations;
DROP POLICY IF EXISTS "Users can view their own cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Admins can view all cancellations" ON public.cancellations;

-- Users can only view cancellations they created or retained
CREATE POLICY "Users can view their own cancellations" 
ON public.cancellations FOR SELECT 
USING (
  auth.uid() = user_id 
  OR auth.uid() = retained_by
);

-- Admins can view all cancellations
CREATE POLICY "Admins can view all cancellations" 
ON public.cancellations FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 5. FIX RFV_ACTION_HISTORY TABLE - Restrict to performer and admins
DROP POLICY IF EXISTS "Authenticated users can view all rfv action history" ON public.rfv_action_history;
DROP POLICY IF EXISTS "Authenticated users can insert rfv action history" ON public.rfv_action_history;

-- Users can only view actions they performed
CREATE POLICY "Users can view their own rfv actions" 
ON public.rfv_action_history FOR SELECT 
USING (auth.uid() = performed_by);

-- Admins can view all action history
CREATE POLICY "Admins can view all rfv action history" 
ON public.rfv_action_history FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own actions
CREATE POLICY "Users can insert their own rfv actions" 
ON public.rfv_action_history FOR INSERT 
WITH CHECK (auth.uid() = performed_by);

-- 6. FIX RFV_UPLOAD_LOGS TABLE - Restrict to admins only
DROP POLICY IF EXISTS "Authenticated users can view all rfv upload logs" ON public.rfv_upload_logs;
DROP POLICY IF EXISTS "Authenticated users can insert rfv upload logs" ON public.rfv_upload_logs;

-- Only admins can view upload logs
CREATE POLICY "Admins can view rfv upload logs" 
ON public.rfv_upload_logs FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert upload logs
CREATE POLICY "Admins can insert rfv upload logs" 
ON public.rfv_upload_logs FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. FIX SALES_UPLOAD_LOGS TABLE - Restrict to admins only
DROP POLICY IF EXISTS "Members can view upload logs" ON public.sales_upload_logs;
DROP POLICY IF EXISTS "Members can insert upload logs" ON public.sales_upload_logs;

-- Only admins can view sales upload logs
CREATE POLICY "Admins can view sales upload logs" 
ON public.sales_upload_logs FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert sales upload logs
CREATE POLICY "Admins can insert sales upload logs" 
ON public.sales_upload_logs FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. FIX USER_ACHIEVEMENTS TABLE - Restrict to own achievements and team (for gamification visibility)
DROP POLICY IF EXISTS "Users can view all achievements" ON public.user_achievements;

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements FOR SELECT 
USING (auth.uid() = user_id);

-- Users can view achievements from their team (for gamification/competition)
CREATE POLICY "Users can view team achievements" 
ON public.user_achievements FOR SELECT 
USING (team_id = public.get_my_team_id());

-- Admins can view all achievements
CREATE POLICY "Admins can view all achievements" 
ON public.user_achievements FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));