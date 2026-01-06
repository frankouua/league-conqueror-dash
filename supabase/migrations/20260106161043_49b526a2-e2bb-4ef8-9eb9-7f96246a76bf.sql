-- Add executor_name column to executed_records
ALTER TABLE public.executed_records 
ADD COLUMN executor_name text;

-- Add executor_name column to revenue_records for consistency
ALTER TABLE public.revenue_records 
ADD COLUMN executor_name text;

-- Add comment for clarity
COMMENT ON COLUMN public.executed_records.executor_name IS 'Nome do profissional que executou o procedimento';
COMMENT ON COLUMN public.revenue_records.executor_name IS 'Nome do profissional que executou o procedimento';