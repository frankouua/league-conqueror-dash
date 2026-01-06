-- Remove check constraint that blocks zero/negative amounts (can be refunds/cancellations)
ALTER TABLE public.revenue_records DROP CONSTRAINT IF EXISTS revenue_records_amount_check;
ALTER TABLE public.executed_records DROP CONSTRAINT IF EXISTS executed_records_amount_check;