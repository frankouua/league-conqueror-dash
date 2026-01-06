-- Create period_locks table for locking months
CREATE TABLE public.period_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  record_type TEXT NOT NULL CHECK (record_type IN ('vendas', 'executado', 'all')),
  locked BOOLEAN NOT NULL DEFAULT true,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_by UUID NOT NULL,
  unlock_reason TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  unlocked_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year, record_type)
);

-- Enable RLS
ALTER TABLE public.period_locks ENABLE ROW LEVEL SECURITY;

-- Admins can manage period locks
CREATE POLICY "Admins can manage period locks"
ON public.period_locks
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can view locks
CREATE POLICY "Authenticated users can view period locks"
ON public.period_locks
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE TRIGGER update_period_locks_updated_at
BEFORE UPDATE ON public.period_locks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for quick lookups
CREATE INDEX idx_period_locks_month_year ON public.period_locks(month, year, record_type);