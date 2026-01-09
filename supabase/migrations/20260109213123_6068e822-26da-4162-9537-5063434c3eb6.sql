
-- Add upload_id column to revenue_records to properly track which upload each record belongs to
ALTER TABLE public.revenue_records
ADD COLUMN IF NOT EXISTS upload_id uuid REFERENCES public.sales_upload_logs(id) ON DELETE CASCADE;

-- Add upload_id column to executed_records as well
ALTER TABLE public.executed_records
ADD COLUMN IF NOT EXISTS upload_id uuid REFERENCES public.sales_upload_logs(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_revenue_records_upload_id ON public.revenue_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_executed_records_upload_id ON public.executed_records(upload_id);

-- Comment for documentation
COMMENT ON COLUMN public.revenue_records.upload_id IS 'References the upload log that created this record - enables proper cascade delete';
COMMENT ON COLUMN public.executed_records.upload_id IS 'References the upload log that created this record - enables proper cascade delete';
