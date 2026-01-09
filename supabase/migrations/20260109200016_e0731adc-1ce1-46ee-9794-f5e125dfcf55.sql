-- Adicionar campos Feegow na tabela crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS feegow_id VARCHAR;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS feegow_data JSONB;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_feegow_sync TIMESTAMPTZ;

-- Criar índice para feegow_id
CREATE INDEX IF NOT EXISTS idx_crm_leads_feegow_id ON crm_leads(feegow_id);