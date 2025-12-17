-- Fix RLS policies for sensitive data tables
-- Restrict access to team members only instead of public

-- 1. Revenue Records - restrict to team members
DROP POLICY IF EXISTS "Revenue is viewable by everyone" ON public.revenue_records;
CREATE POLICY "Team members can view team revenue" 
ON public.revenue_records 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. NPS Records - restrict to team members
DROP POLICY IF EXISTS "NPS is viewable by everyone" ON public.nps_records;
CREATE POLICY "Team members can view team NPS" 
ON public.nps_records 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Referral Records - restrict to team members
DROP POLICY IF EXISTS "Referrals are viewable by everyone" ON public.referral_records;
CREATE POLICY "Team members can view team referrals" 
ON public.referral_records 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Testimonial Records - restrict to team members
DROP POLICY IF EXISTS "Testimonials are viewable by everyone" ON public.testimonial_records;
CREATE POLICY "Team members can view team testimonials" 
ON public.testimonial_records 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Other Indicators - restrict to team members
DROP POLICY IF EXISTS "Indicators are viewable by everyone" ON public.other_indicators;
CREATE POLICY "Team members can view team indicators" 
ON public.other_indicators 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Cards - restrict to team members (contains performance info)
DROP POLICY IF EXISTS "Cards are viewable by everyone" ON public.cards;
CREATE POLICY "Team members can view team cards" 
ON public.cards 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 7. Profiles - restrict to own profile or team members
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  team_id IN (SELECT p.team_id FROM profiles p WHERE p.user_id = auth.uid())
);

-- 8. Individual Goals - restrict to team members
DROP POLICY IF EXISTS "Goals are viewable by team members" ON public.individual_goals;
CREATE POLICY "Team members can view team goals" 
ON public.individual_goals 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 9. Special Events - restrict to team members
DROP POLICY IF EXISTS "Special events are viewable by everyone" ON public.special_events;
CREATE POLICY "Team members can view team special events" 
ON public.special_events 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);