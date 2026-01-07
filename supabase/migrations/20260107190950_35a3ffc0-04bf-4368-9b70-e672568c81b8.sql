-- Ensure helper exists to avoid recursive RLS checks
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    false
  );
$$;

-- Grant read access across the commercial dashboards to any approved authenticated user
-- (Admin pages remain protected at the application routing level)

-- Core identity tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_users_can_read_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_teams"
ON public.teams
FOR SELECT
TO authenticated
USING (public.is_approved_user());

-- Sales / revenue tables
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executed_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_users_can_read_revenue_records"
ON public.revenue_records
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_executed_records"
ON public.executed_records
FOR SELECT
TO authenticated
USING (public.is_approved_user());

-- Goals tables
ALTER TABLE public.predefined_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_quantity_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_users_can_read_predefined_goals"
ON public.predefined_goals
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_individual_goals"
ON public.individual_goals
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_department_goals"
ON public.department_goals
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_department_quantity_goals"
ON public.department_quantity_goals
FOR SELECT
TO authenticated
USING (public.is_approved_user());

-- Supporting KPI tables used across dashboards
ALTER TABLE public.nps_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_users_can_read_nps_records"
ON public.nps_records
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_testimonial_records"
ON public.testimonial_records
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_referral_records"
ON public.referral_records
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_other_indicators"
ON public.other_indicators
FOR SELECT
TO authenticated
USING (public.is_approved_user());

-- Cancellations (part of revenue / results dashboards)
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_users_can_read_cancellations"
ON public.cancellations
FOR SELECT
TO authenticated
USING (public.is_approved_user());

CREATE POLICY "approved_users_can_read_cancellation_history"
ON public.cancellation_history
FOR SELECT
TO authenticated
USING (public.is_approved_user());
