-- ============================================
-- SECURITY CLEANUP: Remove duplicate/conflicting policies
-- ============================================

-- 1. CLEANUP PROFILES TABLE - Remove ALL policies and recreate clean ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles from their team" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;

-- Clean policies for profiles (users see own + admins see all)
CREATE POLICY "profiles_select_own" 
ON public.profiles FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_admin" 
ON public.profiles FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles_update_admin" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_delete_admin" 
ON public.profiles FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. CLEANUP CANCELLATIONS TABLE
DROP POLICY IF EXISTS "Users can view their own cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Users can view own cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Admins can view all cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Team members can view team cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Team members can insert cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Team members can update their team cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Admins can delete cancellations" ON public.cancellations;

-- Clean policies for cancellations (users see own + admins see all)
CREATE POLICY "cancellations_select_own" 
ON public.cancellations FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = retained_by);

CREATE POLICY "cancellations_select_admin" 
ON public.cancellations FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cancellations_insert" 
ON public.cancellations FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cancellations_update_own" 
ON public.cancellations FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = retained_by);

CREATE POLICY "cancellations_update_admin" 
ON public.cancellations FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cancellations_delete_admin" 
ON public.cancellations FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. CLEANUP REFERRAL_LEADS TABLE
DROP POLICY IF EXISTS "Users can view their own leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Admins can view all referral leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Users can insert their leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Admins can update any referral lead" ON public.referral_leads;
DROP POLICY IF EXISTS "Admin can delete referral leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Assigned user or admin can update referral leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Team members can insert referral leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Team members can view referral leads" ON public.referral_leads;

-- Clean policies for referral_leads (users see own + assigned + admins see all)
CREATE POLICY "referral_leads_select_own" 
ON public.referral_leads FOR SELECT 
TO authenticated
USING (auth.uid() = registered_by OR auth.uid() = assigned_to);

CREATE POLICY "referral_leads_select_admin" 
ON public.referral_leads FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "referral_leads_insert" 
ON public.referral_leads FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = registered_by);

CREATE POLICY "referral_leads_update_own" 
ON public.referral_leads FOR UPDATE 
TO authenticated
USING (auth.uid() = registered_by OR auth.uid() = assigned_to);

CREATE POLICY "referral_leads_update_admin" 
ON public.referral_leads FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "referral_leads_delete_admin" 
ON public.referral_leads FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. CLEANUP RFV_CUSTOMERS TABLE
DROP POLICY IF EXISTS "Admins can view rfv customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Admins can insert rfv customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Admins can update rfv customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can view rfv customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can insert rfv customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "Authenticated users can update rfv customers" ON public.rfv_customers;

-- RFV customers restricted to admins only
CREATE POLICY "rfv_customers_select_admin" 
ON public.rfv_customers FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rfv_customers_insert_admin" 
ON public.rfv_customers FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rfv_customers_update_admin" 
ON public.rfv_customers FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rfv_customers_delete_admin" 
ON public.rfv_customers FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. CLEANUP RFV_UPLOAD_LOGS TABLE  
DROP POLICY IF EXISTS "Admins can view rfv upload logs" ON public.rfv_upload_logs;
DROP POLICY IF EXISTS "Admins can insert rfv upload logs" ON public.rfv_upload_logs;
DROP POLICY IF EXISTS "Authenticated users can view all rfv upload logs" ON public.rfv_upload_logs;
DROP POLICY IF EXISTS "Authenticated users can insert rfv upload logs" ON public.rfv_upload_logs;

-- RFV upload logs restricted to admins
CREATE POLICY "rfv_upload_logs_select_admin" 
ON public.rfv_upload_logs FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rfv_upload_logs_insert_admin" 
ON public.rfv_upload_logs FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));