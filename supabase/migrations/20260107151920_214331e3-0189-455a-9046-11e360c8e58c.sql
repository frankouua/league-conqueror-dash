-- Tabela para armazenar respostas de formulários externos
CREATE TABLE public.crm_form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  form_source TEXT, -- 'google_forms', 'typeform', 'landing_page', 'facebook_lead_ads', etc
  campaign_name TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  responses JSONB NOT NULL DEFAULT '{}',
  raw_payload JSONB,
  ip_address TEXT,
  user_agent TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de notificações do CRM
CREATE TABLE public.crm_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'new_lead', 'form_response', 'lead_assigned', 'task_due', 'stale_lead'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de webhooks configurados
CREATE TABLE public.crm_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  webhook_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  form_source TEXT,
  default_pipeline_id UUID REFERENCES public.crm_pipelines(id),
  default_stage_id UUID REFERENCES public.crm_stages(id),
  default_assigned_to UUID,
  field_mapping JSONB DEFAULT '{}', -- mapeia campos do form para campos do lead
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_form_responses_lead_id ON public.crm_form_responses(lead_id);
CREATE INDEX idx_crm_form_responses_submitted_at ON public.crm_form_responses(submitted_at DESC);
CREATE INDEX idx_crm_notifications_user_id ON public.crm_notifications(user_id);
CREATE INDEX idx_crm_notifications_team_id ON public.crm_notifications(team_id);
CREATE INDEX idx_crm_notifications_unread ON public.crm_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_crm_webhooks_key ON public.crm_webhooks(webhook_key);

-- Enable RLS
ALTER TABLE public.crm_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_webhooks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view form responses" ON public.crm_form_responses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view their notifications" ON public.crm_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their notifications" ON public.crm_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage webhooks" ON public.crm_webhooks
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view webhooks" ON public.crm_webhooks
  FOR SELECT TO authenticated USING (true);

-- Enable realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_notifications;