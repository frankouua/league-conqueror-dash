-- Adicionar colunas faltantes em crm_leads
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now();