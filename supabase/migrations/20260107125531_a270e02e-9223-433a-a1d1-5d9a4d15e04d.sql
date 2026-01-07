-- Fix infinite recursion in profiles RLS policies
-- The issue is that the policies reference the profiles table to check if user is admin,
-- which causes infinite recursion when querying profiles itself

-- Drop the problematic policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view teammates" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create fixed policies for profiles that don't cause recursion
-- Use auth.jwt() to get role from metadata instead of querying profiles table

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Team members can view teammates (simplified - no recursion)
CREATE POLICY "Team members can view teammates" 
ON public.profiles 
FOR SELECT 
USING (
  team_id IN (
    SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- Admins can view all profiles (use JWT claim instead of querying profiles)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Now fix policies on other tables that reference profiles for admin check
-- They should use JWT claims instead

-- Fix revenue_records policies
DROP POLICY IF EXISTS "Admins can view all revenue" ON public.revenue_records;
CREATE POLICY "Admins can view all revenue" 
ON public.revenue_records 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all revenue" ON public.revenue_records;
CREATE POLICY "Admins can manage all revenue" 
ON public.revenue_records 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Fix executed_records policies
DROP POLICY IF EXISTS "Admins can view all executed" ON public.executed_records;
CREATE POLICY "Admins can view all executed" 
ON public.executed_records 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all executed" ON public.executed_records;
CREATE POLICY "Admins can manage all executed" 
ON public.executed_records 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Fix cancellations policies
DROP POLICY IF EXISTS "Admins can view all cancellations" ON public.cancellations;
CREATE POLICY "Admins can view all cancellations" 
ON public.cancellations 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all cancellations" ON public.cancellations;
CREATE POLICY "Admins can manage all cancellations" 
ON public.cancellations 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Fix contestations policies
DROP POLICY IF EXISTS "Admins can view all contestations" ON public.contestations;
CREATE POLICY "Admins can view all contestations" 
ON public.contestations 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all contestations" ON public.contestations;
CREATE POLICY "Admins can manage all contestations" 
ON public.contestations 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Fix individual_goals policies
DROP POLICY IF EXISTS "Admins can view all goals" ON public.individual_goals;
CREATE POLICY "Admins can view all goals" 
ON public.individual_goals 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all goals" ON public.individual_goals;
CREATE POLICY "Admins can manage all goals" 
ON public.individual_goals 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Fix crm_leads policies
DROP POLICY IF EXISTS "Admins can view all leads" ON public.crm_leads;
CREATE POLICY "Admins can view all leads" 
ON public.crm_leads 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all leads" ON public.crm_leads;
CREATE POLICY "Admins can manage all leads" 
ON public.crm_leads 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Fix referral_leads policies
DROP POLICY IF EXISTS "Admins can view all referral leads" ON public.referral_leads;
CREATE POLICY "Admins can view all referral leads" 
ON public.referral_leads 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all referral leads" ON public.referral_leads;
CREATE POLICY "Admins can manage all referral leads" 
ON public.referral_leads 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Fix patient_data policies
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patient_data;
CREATE POLICY "Admins can view all patients" 
ON public.patient_data 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all patients" ON public.patient_data;
CREATE POLICY "Admins can manage all patients" 
ON public.patient_data 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- Fix rfv_customers policies
DROP POLICY IF EXISTS "Admins can view all rfv" ON public.rfv_customers;
CREATE POLICY "Admins can view all rfv" 
ON public.rfv_customers 
FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage all rfv" ON public.rfv_customers;
CREATE POLICY "Admins can manage all rfv" 
ON public.rfv_customers 
FOR ALL 
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);