-- Corrigir índice notifications (coluna é "read" não "is_read")
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Índices para executed_records (usado em recorrências)
CREATE INDEX IF NOT EXISTS idx_executed_records_patient ON public.executed_records(patient_cpf, patient_phone);
CREATE INDEX IF NOT EXISTS idx_executed_records_date ON public.executed_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_executed_records_procedure ON public.executed_records(procedure_name);

-- Índices para protocols
CREATE INDEX IF NOT EXISTS idx_protocols_journey_stage ON public.protocols(journey_stage) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_protocols_category ON public.protocols(category) WHERE is_active = true;

-- Índices para campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_active_dates ON public.campaigns(start_date, end_date) WHERE is_active = true;

-- Índices para cancellations
CREATE INDEX IF NOT EXISTS idx_cancellations_team_status ON public.cancellations(team_id, status);