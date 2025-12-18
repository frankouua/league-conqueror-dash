-- =============================================
-- ADD DELETE POLICIES FOR ADMINS + FIX REMAINING WARNINGS
-- =============================================

-- 1. Teams table - require authentication
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Authenticated users can view teams" 
ON public.teams 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Allow admins to manage teams
CREATE POLICY "Admins can insert teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update teams" 
ON public.teams 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete teams" 
ON public.teams 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Revenue records - add DELETE for admins
CREATE POLICY "Admins can delete revenue records" 
ON public.revenue_records 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 4. Referral records - add DELETE for admins
CREATE POLICY "Admins can delete referral records" 
ON public.referral_records 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 5. NPS records - add DELETE for admins
CREATE POLICY "Admins can delete NPS records" 
ON public.nps_records 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 6. Testimonial records - add DELETE for admins
CREATE POLICY "Admins can delete testimonial records" 
ON public.testimonial_records 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 7. Other indicators - add DELETE for admins
CREATE POLICY "Admins can delete other indicators" 
ON public.other_indicators 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 8. Winning streaks - add UPDATE and DELETE for admins
CREATE POLICY "Admins can update winning streaks" 
ON public.winning_streaks 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete winning streaks" 
ON public.winning_streaks 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 9. Referral lead history - add UPDATE and DELETE for admins
CREATE POLICY "Admins can update lead history" 
ON public.referral_lead_history 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete lead history" 
ON public.referral_lead_history 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 10. Profiles - add DELETE for admins
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));