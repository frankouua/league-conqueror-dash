-- Create executed_records table (same structure as revenue_records)
CREATE TABLE public.executed_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  counts_for_individual BOOLEAN NOT NULL DEFAULT true,
  attributed_to_user_id UUID,
  registered_by_admin BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  department TEXT
);

-- Enable RLS
ALTER TABLE public.executed_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same as revenue_records)
CREATE POLICY "Team members can view team executed records"
ON public.executed_records
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Team members can insert executed records"
ON public.executed_records
FOR INSERT
WITH CHECK (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can insert executed records"
ON public.executed_records
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update executed records"
ON public.executed_records
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete executed records"
ON public.executed_records
FOR DELETE
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Create upload log for executed (add column to existing table)
ALTER TABLE public.sales_upload_logs 
ADD COLUMN IF NOT EXISTS upload_type TEXT NOT NULL DEFAULT 'vendas';

-- Add comment for clarity
COMMENT ON COLUMN public.sales_upload_logs.upload_type IS 'Type of upload: vendas or executado';