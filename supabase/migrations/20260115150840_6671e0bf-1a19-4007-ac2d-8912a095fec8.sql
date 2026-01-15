
-- =============================================
-- MIGRAÇÃO PARTE 1: ESTRUTURA BÁSICA
-- =============================================

-- Extensão para busca por similaridade
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Função para normalizar CPF
CREATE OR REPLACE FUNCTION public.normalize_cpf(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF p_cpf IS NULL OR TRIM(p_cpf) = '' THEN
    RETURN NULL;
  END IF;
  RETURN NULLIF(REGEXP_REPLACE(TRIM(p_cpf), '[^0-9]', '', 'g'), '');
END;
$$;

-- Função para normalizar telefone
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
    RETURN NULL;
  END IF;
  cleaned := REGEXP_REPLACE(TRIM(p_phone), '[^0-9]', '', 'g');
  IF LENGTH(cleaned) > 11 AND cleaned LIKE '55%' THEN
    cleaned := SUBSTRING(cleaned FROM 3);
  END IF;
  RETURN NULLIF(cleaned, '');
END;
$$;

-- Tabela de backup
CREATE TABLE public.migration_backup_2025_01 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT,
  prontuario TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  birth_date DATE,
  gender TEXT,
  nationality TEXT,
  country TEXT,
  state TEXT,
  city TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  lifecycle_stage TEXT,
  first_contact_at TIMESTAMPTZ DEFAULT now(),
  became_client_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  total_lifetime_value NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_procedures_executed INTEGER DEFAULT 0,
  source_table TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  CONSTRAINT contacts_cpf_unique UNIQUE (cpf),
  CONSTRAINT contacts_prontuario_unique UNIQUE (prontuario)
);

-- Índices
CREATE INDEX idx_contacts_cpf ON contacts(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_contacts_prontuario ON contacts(prontuario) WHERE prontuario IS NOT NULL;
CREATE INDEX idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_name_trgm ON contacts USING gin(name gin_trgm_ops);
CREATE INDEX idx_contacts_active ON contacts(id) WHERE deleted_at IS NULL;

-- Trigger updated_at
CREATE TRIGGER trg_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios aprovados podem ver contatos"
ON contacts FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true)
);

CREATE POLICY "Usuarios aprovados podem criar contatos"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true)
);

CREATE POLICY "Usuarios aprovados podem atualizar contatos"
ON contacts FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true)
);

CREATE POLICY "Apenas admins podem deletar contatos"
ON contacts FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS backup
ALTER TABLE migration_backup_2025_01 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem acessar backups"
ON migration_backup_2025_01 FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Adicionar contact_id nas tabelas existentes
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
ALTER TABLE revenue_records ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
ALTER TABLE executed_records ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);
ALTER TABLE referral_leads ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Índices para contact_id
CREATE INDEX IF NOT EXISTS idx_crm_leads_contact_id ON crm_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_revenue_records_contact_id ON revenue_records(contact_id);
CREATE INDEX IF NOT EXISTS idx_executed_records_contact_id ON executed_records(contact_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_contact_id ON cancellations(contact_id);
CREATE INDEX IF NOT EXISTS idx_referral_leads_contact_id ON referral_leads(contact_id);
