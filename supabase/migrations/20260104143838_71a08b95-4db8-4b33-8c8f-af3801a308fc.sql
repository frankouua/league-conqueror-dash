-- Create table to store RFV customer data
CREATE TABLE public.rfv_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  first_purchase_date DATE NOT NULL,
  last_purchase_date DATE NOT NULL,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  average_ticket NUMERIC NOT NULL DEFAULT 0,
  recency_score INTEGER NOT NULL DEFAULT 1,
  frequency_score INTEGER NOT NULL DEFAULT 1,
  value_score INTEGER NOT NULL DEFAULT 1,
  segment TEXT NOT NULL DEFAULT 'lost',
  days_since_last_purchase INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  -- Unique constraint on normalized name to avoid duplicates
  CONSTRAINT rfv_customers_name_unique UNIQUE (name)
);

-- Enable RLS
ALTER TABLE public.rfv_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view and manage RFV data
CREATE POLICY "Authenticated users can view RFV customers"
ON public.rfv_customers
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert RFV customers"
ON public.rfv_customers
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update RFV customers"
ON public.rfv_customers
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete RFV customers"
ON public.rfv_customers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_rfv_customers_segment ON public.rfv_customers(segment);
CREATE INDEX idx_rfv_customers_name ON public.rfv_customers(name);
CREATE INDEX idx_rfv_customers_last_purchase ON public.rfv_customers(last_purchase_date);

-- Create trigger for updated_at
CREATE TRIGGER update_rfv_customers_updated_at
BEFORE UPDATE ON public.rfv_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();