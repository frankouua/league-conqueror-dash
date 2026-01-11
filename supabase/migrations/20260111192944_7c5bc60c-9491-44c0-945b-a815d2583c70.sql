-- Prevent duplicate imports by fingerprinting rows

-- Revenue records: unique fingerprint (only when provided)
CREATE UNIQUE INDEX IF NOT EXISTS revenue_records_source_fingerprint_uidx
ON public.revenue_records (source_fingerprint)
WHERE source_fingerprint IS NOT NULL;

-- Executed records: unique fingerprint (only when provided)
CREATE UNIQUE INDEX IF NOT EXISTS executed_records_source_fingerprint_uidx
ON public.executed_records (source_fingerprint)
WHERE source_fingerprint IS NOT NULL;