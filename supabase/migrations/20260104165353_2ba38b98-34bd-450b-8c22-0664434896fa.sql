-- Create table to track sales upload history
CREATE TABLE public.sales_upload_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_name TEXT NOT NULL,
  sheet_name TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  total_revenue_sold NUMERIC NOT NULL DEFAULT 0,
  total_revenue_paid NUMERIC NOT NULL DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.sales_upload_logs ENABLE ROW LEVEL SECURITY;

-- Policies - admins can do everything, members can view
CREATE POLICY "Admins can manage upload logs"
ON public.sales_upload_logs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view upload logs"
ON public.sales_upload_logs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create index for quick lookups
CREATE INDEX idx_sales_upload_logs_uploaded_at ON public.sales_upload_logs(uploaded_at DESC);