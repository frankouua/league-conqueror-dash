-- Add is_admin column to profiles to safely check admin status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Update existing admin users based on their email
UPDATE public.profiles SET is_admin = true WHERE email IN (
  'bruna@uniqueplasticaavancada.com.br',
  'admin@uniqueplasticaavancada.com.br'
);

-- Create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Create function to get user's team_id safely
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Now update all policies to use these safe functions

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view teammates" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Team members can view teammates" ON public.profiles FOR SELECT USING (team_id = public.get_my_team_id());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- Fix revenue_records policies
DROP POLICY IF EXISTS "Admins can view all revenue" ON public.revenue_records;
DROP POLICY IF EXISTS "Admins can manage all revenue" ON public.revenue_records;

CREATE POLICY "Admins can view all revenue" ON public.revenue_records FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all revenue" ON public.revenue_records FOR ALL USING (public.is_admin());

-- Fix executed_records policies  
DROP POLICY IF EXISTS "Admins can view all executed" ON public.executed_records;
DROP POLICY IF EXISTS "Admins can manage all executed" ON public.executed_records;

CREATE POLICY "Admins can view all executed" ON public.executed_records FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all executed" ON public.executed_records FOR ALL USING (public.is_admin());

-- Fix cancellations policies
DROP POLICY IF EXISTS "Admins can view all cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Admins can manage all cancellations" ON public.cancellations;

CREATE POLICY "Admins can view all cancellations" ON public.cancellations FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all cancellations" ON public.cancellations FOR ALL USING (public.is_admin());

-- Fix contestations policies
DROP POLICY IF EXISTS "Admins can view all contestations" ON public.contestations;
DROP POLICY IF EXISTS "Admins can manage all contestations" ON public.contestations;

CREATE POLICY "Admins can view all contestations" ON public.contestations FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all contestations" ON public.contestations FOR ALL USING (public.is_admin());

-- Fix individual_goals policies
DROP POLICY IF EXISTS "Admins can view all goals" ON public.individual_goals;
DROP POLICY IF EXISTS "Admins can manage all goals" ON public.individual_goals;

CREATE POLICY "Admins can view all goals" ON public.individual_goals FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all goals" ON public.individual_goals FOR ALL USING (public.is_admin());

-- Fix crm_leads policies
DROP POLICY IF EXISTS "Admins can view all leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.crm_leads;

CREATE POLICY "Admins can view all leads" ON public.crm_leads FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all leads" ON public.crm_leads FOR ALL USING (public.is_admin());

-- Fix referral_leads policies
DROP POLICY IF EXISTS "Admins can view all referral leads" ON public.referral_leads;
DROP POLICY IF EXISTS "Admins can manage all referral leads" ON public.referral_leads;

CREATE POLICY "Admins can view all referral leads" ON public.referral_leads FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all referral leads" ON public.referral_leads FOR ALL USING (public.is_admin());

-- Fix patient_data policies
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patient_data;
DROP POLICY IF EXISTS "Admins can manage all patients" ON public.patient_data;

CREATE POLICY "Admins can view all patients" ON public.patient_data FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all patients" ON public.patient_data FOR ALL USING (public.is_admin());

-- Fix rfv_customers policies
DROP POLICY IF EXISTS "Admins can view all rfv" ON public.rfv_customers;
DROP POLICY IF EXISTS "Admins can manage all rfv" ON public.rfv_customers;

CREATE POLICY "Admins can view all rfv" ON public.rfv_customers FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage all rfv" ON public.rfv_customers FOR ALL USING (public.is_admin());