-- Enable realtime for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nps_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.testimonial_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.other_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;