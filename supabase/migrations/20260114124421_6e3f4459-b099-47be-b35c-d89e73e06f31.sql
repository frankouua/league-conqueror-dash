-- Add new fields to crm_leads for enhanced card display
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_installments integer,
ADD COLUMN IF NOT EXISTS ai_score integer,
ADD COLUMN IF NOT EXISTS ai_conversion_probability numeric,
ADD COLUMN IF NOT EXISTS next_action text,
ADD COLUMN IF NOT EXISTS next_action_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS original_value numeric;

-- Create index for next_action_date to support daily routine widget
CREATE INDEX IF NOT EXISTS idx_crm_leads_next_action_date ON public.crm_leads(next_action_date);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to_next_action ON public.crm_leads(assigned_to, next_action_date);