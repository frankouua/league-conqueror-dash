-- Remove foreign key constraints on user_id columns to allow test data
-- These columns will still work for real users, but won't enforce FK constraint

ALTER TABLE public.revenue_records DROP CONSTRAINT IF EXISTS revenue_records_user_id_fkey;
ALTER TABLE public.nps_records DROP CONSTRAINT IF EXISTS nps_records_user_id_fkey;
ALTER TABLE public.testimonial_records DROP CONSTRAINT IF EXISTS testimonial_records_user_id_fkey;
ALTER TABLE public.referral_records DROP CONSTRAINT IF EXISTS referral_records_user_id_fkey;
ALTER TABLE public.other_indicators DROP CONSTRAINT IF EXISTS other_indicators_user_id_fkey;
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_applied_by_fkey;