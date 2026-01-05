-- Add prontuario (Feegow patient ID) column to rfv_customers table
ALTER TABLE public.rfv_customers 
ADD COLUMN IF NOT EXISTS prontuario TEXT;

-- Create index on prontuario for faster lookups
CREATE INDEX IF NOT EXISTS idx_rfv_customers_prontuario ON public.rfv_customers(prontuario);

-- Add comment explaining the column
COMMENT ON COLUMN public.rfv_customers.prontuario IS 'ID do prontuário do paciente no Feegow para integração';