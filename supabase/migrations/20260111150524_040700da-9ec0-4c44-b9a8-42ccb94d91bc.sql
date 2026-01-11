
-- ===========================================
-- SISTEMA DE AÇÕES EM MASSA NO CRM
-- ===========================================

-- Tabela de Templates de Ações
CREATE TABLE public.action_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'nps', 'campaign', 'referral', 'ambassador', 'protocol', 
    'rfv_reactivation', 'rfv_bonus', 'rfv_upgrade', 'rfv_crosssell', 'rfv_upsell',
    'pre_consultation', 'project', 'post_procedure', 'feedback', 'custom'
  )),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('script', 'form', 'campaign', 'rfv', 'general')),
  description TEXT,
  template_text TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms', 'all')),
  points_value INT DEFAULT 0,
  bonus_condition TEXT,
  bonus_points INT DEFAULT 0,
  variables JSONB DEFAULT '[]'::jsonb, -- ['nome', 'data_final', 'valor', etc]
  form_fields JSONB, -- Para formulários
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Disparos de Ações
CREATE TABLE public.action_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.action_templates(id),
  action_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message_content TEXT,
  variables_used JSONB, -- Variáveis usadas na mensagem
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  response_received BOOLEAN DEFAULT false,
  response_content TEXT,
  response_at TIMESTAMP WITH TIME ZONE,
  points_earned INT DEFAULT 0,
  bonus_earned INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'responded', 'failed', 'expired')),
  batch_id UUID, -- Para agrupar disparos em massa
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Respostas de Ações
CREATE TABLE public.action_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID REFERENCES public.action_dispatches(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('click', 'form_submit', 'message', 'appointment', 'purchase', 'referral', 'rating')),
  response_data JSONB,
  nps_score INT CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10)),
  points_earned INT DEFAULT 0,
  bonus_earned INT DEFAULT 0,
  bonus_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Histórico de Ações por Lead
CREATE TABLE public.lead_action_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE UNIQUE,
  total_actions_received INT DEFAULT 0,
  total_responses INT DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,
  total_points INT DEFAULT 0,
  total_bonus INT DEFAULT 0,
  nps_average NUMERIC(3,1),
  last_nps_score INT,
  last_nps_date TIMESTAMP WITH TIME ZONE,
  total_referrals INT DEFAULT 0,
  total_purchases_from_actions INT DEFAULT 0,
  total_revenue_from_actions NUMERIC DEFAULT 0,
  last_action_at TIMESTAMP WITH TIME ZONE,
  last_response_at TIMESTAMP WITH TIME ZONE,
  engagement_score INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Lotes de Ações em Massa
CREATE TABLE public.action_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  template_id UUID REFERENCES public.action_templates(id),
  action_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  total_leads INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  response_count INT DEFAULT 0,
  total_points_generated INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  filter_criteria JSONB, -- Critérios usados para selecionar leads
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_action_templates_type ON public.action_templates(type);
CREATE INDEX idx_action_templates_category ON public.action_templates(category);
CREATE INDEX idx_action_dispatches_lead ON public.action_dispatches(lead_id);
CREATE INDEX idx_action_dispatches_template ON public.action_dispatches(template_id);
CREATE INDEX idx_action_dispatches_batch ON public.action_dispatches(batch_id);
CREATE INDEX idx_action_dispatches_status ON public.action_dispatches(status);
CREATE INDEX idx_action_dispatches_sent_at ON public.action_dispatches(sent_at DESC);
CREATE INDEX idx_action_responses_dispatch ON public.action_responses(dispatch_id);
CREATE INDEX idx_action_responses_lead ON public.action_responses(lead_id);
CREATE INDEX idx_lead_action_stats_lead ON public.lead_action_stats(lead_id);
CREATE INDEX idx_action_batches_status ON public.action_batches(status);

-- Triggers para updated_at
CREATE TRIGGER update_action_templates_updated_at
  BEFORE UPDATE ON public.action_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_action_dispatches_updated_at
  BEFORE UPDATE ON public.action_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_action_stats_updated_at
  BEFORE UPDATE ON public.lead_action_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_action_batches_updated_at
  BEFORE UPDATE ON public.action_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.action_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_action_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_batches ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (usuários aprovados podem ver e criar)
CREATE POLICY "Approved users can view action_templates" ON public.action_templates
  FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Approved users can manage action_templates" ON public.action_templates
  FOR ALL USING (public.is_approved_user());

CREATE POLICY "Approved users can view action_dispatches" ON public.action_dispatches
  FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Approved users can manage action_dispatches" ON public.action_dispatches
  FOR ALL USING (public.is_approved_user());

CREATE POLICY "Approved users can view action_responses" ON public.action_responses
  FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Approved users can manage action_responses" ON public.action_responses
  FOR ALL USING (public.is_approved_user());

CREATE POLICY "Approved users can view lead_action_stats" ON public.lead_action_stats
  FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Approved users can manage lead_action_stats" ON public.lead_action_stats
  FOR ALL USING (public.is_approved_user());

CREATE POLICY "Approved users can view action_batches" ON public.action_batches
  FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Approved users can manage action_batches" ON public.action_batches
  FOR ALL USING (public.is_approved_user());

-- Função para atualizar stats do lead quando há resposta
CREATE OR REPLACE FUNCTION public.update_lead_action_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.lead_action_stats (lead_id, total_responses, total_points, last_response_at)
  VALUES (NEW.lead_id, 1, NEW.points_earned + COALESCE(NEW.bonus_earned, 0), NOW())
  ON CONFLICT (lead_id) DO UPDATE SET
    total_responses = lead_action_stats.total_responses + 1,
    total_points = lead_action_stats.total_points + NEW.points_earned + COALESCE(NEW.bonus_earned, 0),
    last_response_at = NOW(),
    response_rate = CASE 
      WHEN lead_action_stats.total_actions_received > 0 
      THEN ((lead_action_stats.total_responses + 1)::NUMERIC / lead_action_stats.total_actions_received) * 100
      ELSE 0 
    END,
    updated_at = NOW();
  
  -- Atualizar NPS se for uma resposta de NPS
  IF NEW.nps_score IS NOT NULL THEN
    UPDATE public.lead_action_stats SET
      last_nps_score = NEW.nps_score,
      last_nps_date = NOW(),
      nps_average = (COALESCE(nps_average * total_responses, 0) + NEW.nps_score) / (total_responses + 1)
    WHERE lead_id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_lead_action_stats
  AFTER INSERT ON public.action_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_action_stats();

-- Função para atualizar stats quando disparo é enviado
CREATE OR REPLACE FUNCTION public.update_lead_action_stats_on_dispatch()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.lead_action_stats (lead_id, total_actions_received, last_action_at)
  VALUES (NEW.lead_id, 1, NOW())
  ON CONFLICT (lead_id) DO UPDATE SET
    total_actions_received = lead_action_stats.total_actions_received + 1,
    last_action_at = NOW(),
    response_rate = CASE 
      WHEN (lead_action_stats.total_actions_received + 1) > 0 
      THEN (lead_action_stats.total_responses::NUMERIC / (lead_action_stats.total_actions_received + 1)) * 100
      ELSE 0 
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_lead_action_stats_on_dispatch
  AFTER INSERT ON public.action_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_action_stats_on_dispatch();
