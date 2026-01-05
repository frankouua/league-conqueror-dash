-- Add CPF and email columns to rfv_customers table for better customer identification
ALTER TABLE public.rfv_customers 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on CPF for faster lookups
CREATE INDEX IF NOT EXISTS idx_rfv_customers_cpf ON public.rfv_customers(cpf);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_rfv_customers_email ON public.rfv_customers(email);

-- Add comment explaining the columns
COMMENT ON COLUMN public.rfv_customers.cpf IS 'CPF do cliente para identificação única';
COMMENT ON COLUMN public.rfv_customers.email IS 'E-mail do cliente para contato e marketing';