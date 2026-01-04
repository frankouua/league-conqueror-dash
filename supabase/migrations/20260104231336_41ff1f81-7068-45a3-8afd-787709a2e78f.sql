-- Create table to track RFV upload history
CREATE TABLE public.rfv_upload_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_name TEXT,
  total_customers INTEGER NOT NULL DEFAULT 0,
  data_reference_date DATE,
  notes TEXT,
  segment_breakdown JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rfv_upload_logs ENABLE ROW LEVEL SECURITY;

-- Create policies - all authenticated users can view
CREATE POLICY "Authenticated users can view RFV upload logs"
ON public.rfv_upload_logs
FOR SELECT
TO authenticated
USING (true);

-- Only admins or the uploader can insert
CREATE POLICY "Authenticated users can insert RFV upload logs"
ON public.rfv_upload_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- Add column to rfv_customers to track whatsapp
ALTER TABLE public.rfv_customers 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;