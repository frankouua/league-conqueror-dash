-- Create cancellation status enum
CREATE TYPE public.cancellation_status AS ENUM (
  'pending_retention',
  'retention_attempt',
  'retained',
  'cancelled_with_fine',
  'cancelled_no_fine',
  'credit_used'
);

-- Create cancellation reason enum
CREATE TYPE public.cancellation_reason AS ENUM (
  'financial',
  'health',
  'dissatisfaction',
  'changed_mind',
  'competitor',
  'scheduling',
  'personal',
  'other'
);

-- Create cancellations table
CREATE TABLE public.cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  user_id UUID NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_email TEXT,
  procedure_name TEXT NOT NULL,
  contract_value NUMERIC NOT NULL,
  fine_percentage NUMERIC NOT NULL DEFAULT 30,
  fine_amount NUMERIC GENERATED ALWAYS AS (contract_value * fine_percentage / 100) STORED,
  refund_amount NUMERIC GENERATED ALWAYS AS (contract_value * (100 - fine_percentage) / 100) STORED,
  reason cancellation_reason NOT NULL,
  reason_details TEXT,
  status cancellation_status NOT NULL DEFAULT 'pending_retention',
  retention_attempts INTEGER NOT NULL DEFAULT 0,
  retention_notes TEXT,
  retained_by UUID,
  retained_at TIMESTAMP WITH TIME ZONE,
  apply_fine BOOLEAN NOT NULL DEFAULT true,
  refund_deadline DATE,
  refund_completed BOOLEAN DEFAULT false,
  refund_completed_at TIMESTAMP WITH TIME ZONE,
  credit_valid_until DATE,
  credit_used_at TIMESTAMP WITH TIME ZONE,
  credit_used_for TEXT,
  original_sale_date DATE,
  cancellation_request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_signed BOOLEAN DEFAULT false,
  contract_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view team cancellations"
  ON public.cancellations FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  ));

CREATE POLICY "Team members can insert cancellations"
  ON public.cancellations FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Team members can update their team cancellations"
  ON public.cancellations FOR UPDATE
  USING (
    team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete cancellations"
  ON public.cancellations FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create cancellation history table
CREATE TABLE public.cancellation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cancellation_id UUID NOT NULL REFERENCES public.cancellations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status cancellation_status,
  new_status cancellation_status,
  notes TEXT,
  performed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for history
ALTER TABLE public.cancellation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view cancellation history"
  ON public.cancellation_history FOR SELECT
  USING (auth.uid() IS NOT NULL AND (
    cancellation_id IN (
      SELECT id FROM cancellations WHERE team_id IN (
        SELECT team_id FROM profiles WHERE user_id = auth.uid()
      )
    )
    OR has_role(auth.uid(), 'admin')
  ));

CREATE POLICY "Team members can insert cancellation history"
  ON public.cancellation_history FOR INSERT
  WITH CHECK (
    cancellation_id IN (
      SELECT id FROM cancellations WHERE team_id IN (
        SELECT team_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_cancellations_updated_at
  BEFORE UPDATE ON public.cancellations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();