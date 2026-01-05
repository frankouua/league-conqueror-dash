-- Add phone column to rfv_customers table for WhatsApp contact
ALTER TABLE public.rfv_customers 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_rfv_customers_phone ON public.rfv_customers(phone);

-- Add comment explaining the column
COMMENT ON COLUMN public.rfv_customers.phone IS 'Telefone/WhatsApp do cliente para contato direto';