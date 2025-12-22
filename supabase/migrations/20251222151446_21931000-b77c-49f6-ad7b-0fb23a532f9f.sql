-- Create table for FEEGOW sync logs
CREATE TABLE public.feegow_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',
  date_start TEXT,
  date_end TEXT,
  total_accounts INTEGER DEFAULT 0,
  paid_accounts INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  sellers_not_found TEXT[],
  error_message TEXT,
  triggered_by TEXT
);

-- Enable RLS
ALTER TABLE public.feegow_sync_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view sync logs
CREATE POLICY "Admins can view sync logs"
ON public.feegow_sync_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert/update (for edge function)
CREATE POLICY "Service role can manage sync logs"
ON public.feegow_sync_logs
FOR ALL
USING (true)
WITH CHECK (true);