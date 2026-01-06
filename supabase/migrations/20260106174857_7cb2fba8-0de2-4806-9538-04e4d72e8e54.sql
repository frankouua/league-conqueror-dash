-- Performance indexes for faster queries

-- Revenue records - common query patterns
CREATE INDEX IF NOT EXISTS idx_revenue_records_date_user ON public.revenue_records(date, attributed_to_user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_team_date ON public.revenue_records(team_id, date);
CREATE INDEX IF NOT EXISTS idx_revenue_records_date ON public.revenue_records(date);

-- Executed records - same patterns
CREATE INDEX IF NOT EXISTS idx_executed_records_date_user ON public.executed_records(date, attributed_to_user_id);
CREATE INDEX IF NOT EXISTS idx_executed_records_team_date ON public.executed_records(team_id, date);
CREATE INDEX IF NOT EXISTS idx_executed_records_date ON public.executed_records(date);

-- RFV customers - segment and lookup
CREATE INDEX IF NOT EXISTS idx_rfv_customers_segment ON public.rfv_customers(segment);
CREATE INDEX IF NOT EXISTS idx_rfv_customers_name ON public.rfv_customers(name);
CREATE INDEX IF NOT EXISTS idx_rfv_customers_cpf ON public.rfv_customers(cpf);
CREATE INDEX IF NOT EXISTS idx_rfv_customers_prontuario ON public.rfv_customers(prontuario);

-- Patient data - lookup fields
CREATE INDEX IF NOT EXISTS idx_patient_data_cpf ON public.patient_data(cpf);
CREATE INDEX IF NOT EXISTS idx_patient_data_prontuario ON public.patient_data(prontuario);
CREATE INDEX IF NOT EXISTS idx_patient_data_name ON public.patient_data(name);

-- Referral leads - status and team
CREATE INDEX IF NOT EXISTS idx_referral_leads_status ON public.referral_leads(status);
CREATE INDEX IF NOT EXISTS idx_referral_leads_team_status ON public.referral_leads(team_id, status);

-- NPS records - date range queries
CREATE INDEX IF NOT EXISTS idx_nps_records_date ON public.nps_records(date);
CREATE INDEX IF NOT EXISTS idx_nps_records_team_date ON public.nps_records(team_id, date);

-- Testimonial records - date range queries
CREATE INDEX IF NOT EXISTS idx_testimonial_records_date ON public.testimonial_records(date);
CREATE INDEX IF NOT EXISTS idx_testimonial_records_team_date ON public.testimonial_records(team_id, date);

-- Referral records - date range queries
CREATE INDEX IF NOT EXISTS idx_referral_records_date ON public.referral_records(date);
CREATE INDEX IF NOT EXISTS idx_referral_records_team_date ON public.referral_records(team_id, date);

-- Cards - team and date
CREATE INDEX IF NOT EXISTS idx_cards_team_date ON public.cards(team_id, date);

-- Special events - team and date
CREATE INDEX IF NOT EXISTS idx_special_events_team_date ON public.special_events(team_id, date);

-- Profiles - team lookup
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);