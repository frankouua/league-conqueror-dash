-- Remove duplicate records from revenue_records for 2024
-- Keep only the first record of each unique combination (date, patient_name, amount, procedure_name, department)

WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY date, patient_name, amount, procedure_name, department
      ORDER BY created_at ASC
    ) as rn
  FROM public.revenue_records
  WHERE EXTRACT(YEAR FROM date) = 2024
)
DELETE FROM public.revenue_records
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add an index to improve fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_revenue_records_fingerprint 
ON public.revenue_records(source_fingerprint) 
WHERE source_fingerprint IS NOT NULL;

-- Add an index for deduplication queries
CREATE INDEX IF NOT EXISTS idx_revenue_records_dedup 
ON public.revenue_records(date, patient_name, amount, procedure_name, department);