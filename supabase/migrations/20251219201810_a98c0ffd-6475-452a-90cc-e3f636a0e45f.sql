-- Add department column to revenue_records table
ALTER TABLE public.revenue_records 
ADD COLUMN department public.department_type NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN public.revenue_records.department IS 'Department that generated this revenue/cancellation';