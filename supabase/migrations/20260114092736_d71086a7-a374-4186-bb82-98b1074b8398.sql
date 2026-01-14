-- =============================================
-- PRIORIDADE MÁXIMA: ESTRUTURAS COMPLETAS
-- =============================================

-- 1. CONFIGURAÇÃO API WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'evolution', -- evolution, z-api, wppconnect
  api_url TEXT NOT NULL,
  api_key TEXT,
  instance_id TEXT,
  is_active BOOLEAN DEFAULT true,
  connection_status TEXT DEFAULT 'disconnected', -- connected, disconnected, error
  last_connection_check TIMESTAMPTZ,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CONTRATOS CLICKSIGN
CREATE TABLE IF NOT EXISTS public.contract_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  api_url TEXT NOT NULL DEFAULT 'https://app.clicksign.com/api/v1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_key TEXT NOT NULL, -- Template no ClickSign
  description TEXT,
  contract_type TEXT NOT NULL, -- assinatura, prestacao_servico, consentimento_procedimento, consentimento_imagem, termo_acompanhante
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.contract_templates(id),
  clicksign_document_key TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, viewed, signed, cancelled
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  signer_email TEXT,
  signer_phone TEXT,
  document_url TEXT,
  signed_document_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. UTMs - Adicionar campos em crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS referrer_url TEXT;

-- 4. DUPLA CONFERÊNCIA COORDENADOR
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS coordinator_validated BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS coordinator_validated_at TIMESTAMPTZ;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS coordinator_validated_by UUID;

CREATE TABLE IF NOT EXISTS public.coordinator_validation_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  contracts_signed BOOLEAN DEFAULT false,
  entry_payment_received BOOLEAN DEFAULT false,
  payment_plan_confirmed BOOLEAN DEFAULT false,
  surgery_date_confirmed BOOLEAN DEFAULT false,
  patient_data_complete BOOLEAN DEFAULT false,
  notes TEXT,
  validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PRIORIDADE ALTA
-- =============================================

-- 5. SISTEMA DE PROJETOS (DESCONTO)
CREATE TABLE IF NOT EXISTS public.discount_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_percentage NUMERIC DEFAULT 5, -- 5% por projeto
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.discount_projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'committed', -- committed, in_progress, completed, cancelled
  committed_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, project_id)
);

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS total_discount_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS discount_projects_count INTEGER DEFAULT 0;

-- 6. UNIQUE TRAVEL (VIAGEM)
CREATE TABLE IF NOT EXISTS public.lead_travel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE UNIQUE,
  
  -- Dados básicos
  origin_city TEXT,
  origin_state TEXT,
  arrival_date DATE,
  arrival_time TIME,
  arrival_flight TEXT,
  departure_date DATE,
  departure_time TIME,
  departure_flight TEXT,
  
  -- Acompanhante
  has_companion BOOLEAN DEFAULT false,
  companion_name TEXT,
  companion_phone TEXT,
  companion_relationship TEXT,
  
  -- Hospedagem
  hotel_name TEXT,
  hotel_address TEXT,
  hotel_check_in DATE,
  hotel_check_out DATE,
  hotel_confirmed BOOLEAN DEFAULT false,
  
  -- Transporte
  driver_name TEXT,
  driver_phone TEXT,
  driver_confirmed BOOLEAN DEFAULT false,
  
  -- Home Care
  needs_home_care BOOLEAN DEFAULT false,
  home_care_nurse TEXT,
  home_care_phone TEXT,
  home_care_days INTEGER,
  
  -- Status geral
  all_confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS needs_travel BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS travel_organized BOOLEAN DEFAULT false;

-- 7. PROTOCOLO DE PERDA DE PESO
CREATE TABLE IF NOT EXISTS public.lead_weight_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  target_weight NUMERIC,
  weight_loss_goal NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS needs_weight_loss BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS initial_weight NUMERIC;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS target_weight NUMERIC;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS current_weight NUMERIC;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS weight_loss_deadline DATE;

-- 8. ESCALONAMENTO (já existe escalated e escalated_at)
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS escalated_to UUID;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS days_without_closing INTEGER DEFAULT 0;

-- =============================================
-- PRIORIDADE MÉDIA
-- =============================================

-- 9. EXPERIÊNCIA DE ALTA MÉDICA
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS discharge_date DATE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS future_letter_written BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS before_after_photo_delivered BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS unique_necklace_delivered BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS testimonial_collected BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS google_review_requested BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS discharge_completed BOOLEAN DEFAULT false;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS discharge_completed_at TIMESTAMPTZ;

-- 10. PREFERÊNCIAS SPA
CREATE TABLE IF NOT EXISTS public.lead_spa_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE UNIQUE,
  
  -- Alimentação
  dietary_restrictions TEXT,
  food_allergies TEXT,
  favorite_foods TEXT,
  drinks_preference TEXT,
  
  -- Ambiente
  music_preference TEXT,
  aromatherapy_preference TEXT,
  room_temperature TEXT,
  
  -- Experiência
  massage_type TEXT,
  spa_experience_notes TEXT,
  
  -- Informações adicionais
  special_requests TEXT,
  
  form_submitted BOOLEAN DEFAULT false,
  form_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PRIORIDADE NORMAL
-- =============================================

-- 12. AÇÕES EM MASSA
CREATE TABLE IF NOT EXISTS public.bulk_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- nps, campaign, referral, ambassador, form, move_stage, assign
  lead_ids UUID[] NOT NULL,
  total_leads INTEGER,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  parameters JSONB,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. CONFIGURAÇÃO EMAIL
CREATE TABLE IF NOT EXISTS public.email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'smtp', -- smtp, sendgrid, mailgun, ses
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_password TEXT,
  api_key TEXT,
  from_email TEXT,
  from_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_id UUID,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. CONFIGURAÇÃO SMS
CREATE TABLE IF NOT EXISTS public.sms_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'zenvia', -- zenvia, twilio, vonage
  api_key TEXT,
  api_secret TEXT,
  sender_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sms_dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  to_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  template_id UUID,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. BACKUP
CREATE TABLE IF NOT EXISTS public.system_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL DEFAULT 'daily',
  file_path TEXT,
  file_size BIGINT,
  tables_included TEXT[],
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_lead_contracts_lead_id ON public.lead_contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contracts_status ON public.lead_contracts(status);
CREATE INDEX IF NOT EXISTS idx_lead_projects_lead_id ON public.lead_projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_travel_lead_id ON public.lead_travel(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_weight_tracking_lead_id ON public.lead_weight_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_utm_campaign ON public.crm_leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_crm_leads_coordinator_validated ON public.crm_leads(coordinator_validated);
CREATE INDEX IF NOT EXISTS idx_crm_leads_needs_travel ON public.crm_leads(needs_travel);
CREATE INDEX IF NOT EXISTS idx_crm_leads_needs_weight_loss ON public.crm_leads(needs_weight_loss);
CREATE INDEX IF NOT EXISTS idx_crm_leads_escalated ON public.crm_leads(escalated);
CREATE INDEX IF NOT EXISTS idx_bulk_action_logs_status ON public.bulk_action_logs(status);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_validation_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_travel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_weight_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_spa_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_dispatch_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_dispatch_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- Policies para usuários autenticados
CREATE POLICY "Users can view whatsapp config" ON public.whatsapp_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage whatsapp config" ON public.whatsapp_config FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can view contract config" ON public.contract_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage contract config" ON public.contract_config FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can view contract templates" ON public.contract_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage contract templates" ON public.contract_templates FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can view lead contracts" ON public.lead_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage lead contracts" ON public.lead_contracts FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view coordinator checklist" ON public.coordinator_validation_checklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage coordinator checklist" ON public.coordinator_validation_checklist FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view discount projects" ON public.discount_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage discount projects" ON public.discount_projects FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can view lead projects" ON public.lead_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage lead projects" ON public.lead_projects FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view lead travel" ON public.lead_travel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage lead travel" ON public.lead_travel FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view lead weight tracking" ON public.lead_weight_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage lead weight tracking" ON public.lead_weight_tracking FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view spa preferences" ON public.lead_spa_preferences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage spa preferences" ON public.lead_spa_preferences FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view bulk actions" ON public.bulk_action_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create bulk actions" ON public.bulk_action_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view email config" ON public.email_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage email config" ON public.email_config FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can view email queue" ON public.email_dispatch_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage email queue" ON public.email_dispatch_queue FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view sms config" ON public.sms_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sms config" ON public.sms_config FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can view sms queue" ON public.sms_dispatch_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage sms queue" ON public.sms_dispatch_queue FOR ALL TO authenticated USING (true);

CREATE POLICY "Admins can view backups" ON public.system_backups FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage backups" ON public.system_backups FOR ALL TO authenticated USING (public.is_admin());

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para atualizar desconto total do lead
CREATE OR REPLACE FUNCTION public.update_lead_discount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.crm_leads
  SET 
    discount_projects_count = (
      SELECT COUNT(*) FROM public.lead_projects 
      WHERE lead_id = COALESCE(NEW.lead_id, OLD.lead_id) 
      AND status IN ('committed', 'in_progress', 'completed')
    ),
    total_discount_percentage = (
      SELECT COALESCE(SUM(dp.discount_percentage), 0)
      FROM public.lead_projects lp
      JOIN public.discount_projects dp ON dp.id = lp.project_id
      WHERE lp.lead_id = COALESCE(NEW.lead_id, OLD.lead_id)
      AND lp.status IN ('committed', 'in_progress', 'completed')
    )
  WHERE id = COALESCE(NEW.lead_id, OLD.lead_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_lead_discount_on_project_change
AFTER INSERT OR UPDATE OR DELETE ON public.lead_projects
FOR EACH ROW EXECUTE FUNCTION public.update_lead_discount();

-- Trigger para calcular dias sem fechamento
CREATE OR REPLACE FUNCTION public.calculate_days_without_closing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pipeline_id IS NOT NULL THEN
    -- Verifica se está em pipeline de closer
    IF EXISTS (
      SELECT 1 FROM public.crm_pipelines 
      WHERE id = NEW.pipeline_id 
      AND (LOWER(name) LIKE '%closer%' OR LOWER(name) LIKE '%vendas%')
    ) THEN
      NEW.days_without_closing = EXTRACT(DAY FROM NOW() - COALESCE(NEW.stage_changed_at, NEW.created_at))::INTEGER;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER calculate_days_without_closing_trigger
BEFORE INSERT OR UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.calculate_days_without_closing();

-- Inserir templates de contrato padrão
INSERT INTO public.contract_templates (name, template_key, description, contract_type, is_required) VALUES
('Contrato de Assinatura', 'contrato_assinatura', 'Contrato principal de assinatura dos serviços', 'assinatura', true),
('Contrato de Prestação de Serviço', 'contrato_prestacao', 'Contrato detalhado de prestação de serviço médico', 'prestacao_servico', true),
('Termo de Consentimento - Procedimentos', 'termo_procedimentos', 'Termo de consentimento para procedimentos médicos', 'consentimento_procedimento', true),
('Termo de Consentimento de Imagem', 'termo_imagem', 'Autorização para uso de imagem', 'consentimento_imagem', false),
('Termo de Acompanhante', 'termo_acompanhante', 'Termo para enfermeira home care', 'termo_acompanhante', false)
ON CONFLICT DO NOTHING;

-- Inserir projetos de desconto padrão
INSERT INTO public.discount_projects (name, description, discount_percentage, is_active) VALUES
('Depoimento em Vídeo', 'Gravar depoimento em vídeo para uso nas redes sociais', 5, true),
('Foto Antes/Depois', 'Autorizar uso de fotos antes e depois para divulgação', 5, true),
('Participação em Evento', 'Participar de evento ou live da clínica', 5, true),
('Case de Sucesso', 'Ser case de sucesso em material de marketing', 5, true),
('Indicação VIP', 'Indicar 3 ou mais pacientes qualificados', 5, true)
ON CONFLICT DO NOTHING;