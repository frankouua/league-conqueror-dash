-- Create table for RFV customer action history
CREATE TABLE public.rfv_action_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.rfv_customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'call', 'whatsapp', 'email', 'visit', 'proposal', 'other'
  result TEXT, -- 'success', 'no_answer', 'callback', 'not_interested', 'scheduled', 'converted'
  notes TEXT,
  scheduled_callback TIMESTAMP WITH TIME ZONE,
  performed_by UUID NOT NULL,
  performed_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rfv_action_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view all rfv action history"
  ON public.rfv_action_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rfv action history"
  ON public.rfv_action_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Users can update their own rfv action history"
  ON public.rfv_action_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = performed_by);

-- Create indexes for better query performance
CREATE INDEX idx_rfv_action_customer_id ON public.rfv_action_history(customer_id);
CREATE INDEX idx_rfv_action_customer_name ON public.rfv_action_history(customer_name);
CREATE INDEX idx_rfv_action_created_at ON public.rfv_action_history(created_at DESC);