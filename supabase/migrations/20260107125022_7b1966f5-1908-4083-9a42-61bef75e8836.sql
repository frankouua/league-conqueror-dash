-- Create table for upload deletion audit log
CREATE TABLE IF NOT EXISTS public.upload_deletion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_upload_id UUID NOT NULL,
  deleted_by UUID NOT NULL,
  deleted_by_name TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Original upload info preserved for audit
  original_uploaded_by_name TEXT,
  original_uploaded_at TIMESTAMP WITH TIME ZONE,
  original_file_name TEXT,
  original_upload_type TEXT,
  original_imported_rows INTEGER,
  original_total_revenue_sold NUMERIC,
  original_total_revenue_paid NUMERIC,
  original_date_range_start DATE,
  original_date_range_end DATE,
  
  -- What was actually deleted
  records_deleted_revenue INTEGER DEFAULT 0,
  records_deleted_executed INTEGER DEFAULT 0,
  
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.upload_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view deletion logs
CREATE POLICY "Admins can view all deletion logs"
  ON public.upload_deletion_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Authenticated users can insert (we check admin in app logic)
CREATE POLICY "Authenticated users can log deletions"
  ON public.upload_deletion_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add index for querying by date
CREATE INDEX idx_upload_deletion_logs_deleted_at ON public.upload_deletion_logs(deleted_at DESC);