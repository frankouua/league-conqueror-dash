-- Add procedure_name column to executed_records table
ALTER TABLE public.executed_records 
ADD COLUMN IF NOT EXISTS procedure_name TEXT;

-- Add procedure_name column to revenue_records table as well
ALTER TABLE public.revenue_records 
ADD COLUMN IF NOT EXISTS procedure_name TEXT;

-- Create index for better query performance on procedure_name
CREATE INDEX IF NOT EXISTS idx_executed_records_procedure_name ON public.executed_records(procedure_name);
CREATE INDEX IF NOT EXISTS idx_revenue_records_procedure_name ON public.revenue_records(procedure_name);