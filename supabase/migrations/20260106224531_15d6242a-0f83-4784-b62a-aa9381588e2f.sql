
-- Add new columns to rfv_customers for Feegow enriched data
ALTER TABLE public.rfv_customers 
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS origem_id INTEGER,
ADD COLUMN IF NOT EXISTS origem_nome TEXT,
ADD COLUMN IF NOT EXISTS responsavel_legal TEXT,
ADD COLUMN IF NOT EXISTS nome_mae TEXT,
ADD COLUMN IF NOT EXISTS nome_pai TEXT,
ADD COLUMN IF NOT EXISTS observacoes_feegow TEXT,
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS data_cadastro_feegow TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ultimo_atendimento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_agendamentos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS propostas_abertas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_propostas_pendentes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_financeiro TEXT,
ADD COLUMN IF NOT EXISTS valor_em_aberto NUMERIC DEFAULT 0;

-- Add new columns to patient_data for extended profile
ALTER TABLE public.patient_data 
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS origem_id INTEGER,
ADD COLUMN IF NOT EXISTS origem_nome TEXT,
ADD COLUMN IF NOT EXISTS responsavel_legal TEXT,
ADD COLUMN IF NOT EXISTS nome_mae TEXT,
ADD COLUMN IF NOT EXISTS nome_pai TEXT,
ADD COLUMN IF NOT EXISTS observacoes_feegow TEXT,
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS data_cadastro_feegow TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ultimo_atendimento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_agendamentos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.rfv_customers.origem_nome IS 'Nome da origem de captação do Feegow';
COMMENT ON COLUMN public.rfv_customers.no_show_count IS 'Quantidade de faltas em agendamentos';
COMMENT ON COLUMN public.rfv_customers.propostas_abertas IS 'Quantidade de propostas/orçamentos pendentes';
COMMENT ON COLUMN public.rfv_customers.status_financeiro IS 'Status: em_dia, atrasado, inadimplente';
