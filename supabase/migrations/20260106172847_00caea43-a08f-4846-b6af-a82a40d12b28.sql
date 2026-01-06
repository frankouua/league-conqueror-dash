-- Add persona/enrichment fields to RFV customers (synced from patient_data)
ALTER TABLE public.rfv_customers
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS main_objective text,
  ADD COLUMN IF NOT EXISTS why_not_done_yet text,
  ADD COLUMN IF NOT EXISTS has_children boolean,
  ADD COLUMN IF NOT EXISTS children_count integer,
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS country text;
