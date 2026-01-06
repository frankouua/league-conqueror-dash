-- Add strategic form fields to patient_data (safe if re-run)
ALTER TABLE public.patient_data
  ADD COLUMN IF NOT EXISTS dreams TEXT,
  ADD COLUMN IF NOT EXISTS desires TEXT,
  ADD COLUMN IF NOT EXISTS fears TEXT,
  ADD COLUMN IF NOT EXISTS expectations TEXT,
  ADD COLUMN IF NOT EXISTS preferred_procedures TEXT;

-- Helpful indexes for matching/lookup
CREATE INDEX IF NOT EXISTS idx_patient_data_cpf ON public.patient_data (cpf);
CREATE INDEX IF NOT EXISTS idx_patient_data_prontuario ON public.patient_data (prontuario);
