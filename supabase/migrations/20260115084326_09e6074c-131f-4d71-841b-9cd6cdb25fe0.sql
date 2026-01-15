-- Tabela principal de controle de propostas
CREATE TABLE public.proposal_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do paciente
  prontuario TEXT,
  patient_name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  
  -- Datas do funil de vendas
  consultation_date DATE,
  contract_date DATE,
  execution_date DATE,
  
  -- Status e negociação
  negotiation_status TEXT,
  stage TEXT,
  
  -- Origem e marketing
  origin TEXT,
  origin_detail TEXT,
  origin_category TEXT,
  campaign_name TEXT,
  influencer_name TEXT,
  
  -- Valores
  contract_value NUMERIC(12,2),
  estimated_value NUMERIC(12,2),
  
  -- Responsáveis
  seller_id UUID REFERENCES public.profiles(id),
  seller_name TEXT,
  
  -- Relacionamentos
  crm_lead_id UUID REFERENCES public.crm_leads(id),
  feegow_id TEXT,
  
  -- Observações
  notes TEXT,
  
  -- Metadados de importação
  import_batch_id UUID,
  year INTEGER,
  month INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de logs de importação
CREATE TABLE public.proposal_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  file_name TEXT,
  total_rows INTEGER,
  imported_rows INTEGER,
  error_rows INTEGER,
  errors JSONB,
  column_mapping JSONB,
  imported_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_proposal_control_seller ON public.proposal_control(seller_id);
CREATE INDEX idx_proposal_control_dates ON public.proposal_control(consultation_date, contract_date, execution_date);
CREATE INDEX idx_proposal_control_origin ON public.proposal_control(origin_category);
CREATE INDEX idx_proposal_control_year ON public.proposal_control(year);
CREATE INDEX idx_proposal_control_prontuario ON public.proposal_control(prontuario);
CREATE INDEX idx_proposal_control_batch ON public.proposal_control(import_batch_id);

-- Enable RLS
ALTER TABLE public.proposal_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_import_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para proposal_control
CREATE POLICY "Admins can do everything on proposal_control"
ON public.proposal_control
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Members can view proposal_control"
ON public.proposal_control
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para proposal_import_logs
CREATE POLICY "Admins can do everything on proposal_import_logs"
ON public.proposal_import_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Members can view proposal_import_logs"
ON public.proposal_import_logs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_proposal_control_updated_at
BEFORE UPDATE ON public.proposal_control
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();