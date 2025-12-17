-- Allow public read access to indicator tables for public dashboard
DROP POLICY IF EXISTS "Team members can view their team revenue" ON public.revenue_records;
CREATE POLICY "Revenue is viewable by everyone"
ON public.revenue_records FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Team members can view their team NPS" ON public.nps_records;
CREATE POLICY "NPS is viewable by everyone"
ON public.nps_records FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Team members can view their team testimonials" ON public.testimonial_records;
CREATE POLICY "Testimonials are viewable by everyone"
ON public.testimonial_records FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Team members can view their team referrals" ON public.referral_records;
CREATE POLICY "Referrals are viewable by everyone"
ON public.referral_records FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Team members can view their team indicators" ON public.other_indicators;
CREATE POLICY "Indicators are viewable by everyone"
ON public.other_indicators FOR SELECT
USING (true);