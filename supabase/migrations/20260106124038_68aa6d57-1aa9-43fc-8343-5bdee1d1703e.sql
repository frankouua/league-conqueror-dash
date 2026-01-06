-- Add a deterministic fingerprint to prevent duplicate imports of the same row
ALTER TABLE public.revenue_records ADD COLUMN IF NOT EXISTS source_fingerprint text;
ALTER TABLE public.executed_records ADD COLUMN IF NOT EXISTS source_fingerprint text;

-- Backfill fingerprints for existing rows
UPDATE public.revenue_records
SET source_fingerprint = md5(concat_ws('|',
  coalesce(patient_cpf, ''),
  coalesce(patient_prontuario, ''),
  coalesce(date::text, ''),
  coalesce(amount::text, ''),
  coalesce(procedure_name, ''),
  coalesce(user_id::text, ''),
  coalesce(team_id::text, '')
))
WHERE source_fingerprint IS NULL;

UPDATE public.executed_records
SET source_fingerprint = md5(concat_ws('|',
  coalesce(patient_cpf, ''),
  coalesce(patient_prontuario, ''),
  coalesce(date::text, ''),
  coalesce(amount::text, ''),
  coalesce(procedure_name, ''),
  coalesce(user_id::text, ''),
  coalesce(team_id::text, '')
))
WHERE source_fingerprint IS NULL;

-- Remove duplicates keeping the earliest row per fingerprint
DELETE FROM public.revenue_records r
USING public.revenue_records r2
WHERE r.source_fingerprint = r2.source_fingerprint
  AND r.id > r2.id;

DELETE FROM public.executed_records e
USING public.executed_records e2
WHERE e.source_fingerprint = e2.source_fingerprint
  AND e.id > e2.id;

-- Enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS revenue_records_source_fingerprint_uq
  ON public.revenue_records (source_fingerprint)
  WHERE source_fingerprint IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS executed_records_source_fingerprint_uq
  ON public.executed_records (source_fingerprint)
  WHERE source_fingerprint IS NOT NULL;

-- (Optional) speed up common lookups for recalculation
CREATE INDEX IF NOT EXISTS revenue_records_patient_cpf_idx ON public.revenue_records (patient_cpf);
CREATE INDEX IF NOT EXISTS revenue_records_patient_prontuario_idx ON public.revenue_records (patient_prontuario);
CREATE INDEX IF NOT EXISTS executed_records_patient_cpf_idx ON public.executed_records (patient_cpf);
CREATE INDEX IF NOT EXISTS executed_records_patient_prontuario_idx ON public.executed_records (patient_prontuario);
