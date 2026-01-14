
-- =====================================================
-- CRM UNIQUE AUTOMAÇÕES - MIGRAÇÃO COMPLETA
-- Baseado no documento CRM_UNIQUE_AUTOMACOES (3 partes)
-- =====================================================

-- 1. TABELA: crm_cadences (Cadências de contato)
-- Armazena as configurações de cadência para cada estágio
CREATE TABLE IF NOT EXISTS public.crm_cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'stage_enter', -- stage_enter, time_based, event_based
  trigger_config JSONB DEFAULT '{}'::jsonb,
  day_offset INTEGER DEFAULT 0, -- D+0, D+1, D+2, etc.
  time_of_day TIME DEFAULT '09:00:00',
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp, email, sms, internal
  action_type TEXT NOT NULL DEFAULT 'send_message', -- send_message, create_task, alert, move_stage
  message_template TEXT,
  message_variables JSONB DEFAULT '[]'::jsonb,
  escalation_rule JSONB DEFAULT NULL, -- Regras de escalation
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA: crm_cadence_executions (Histórico de execuções de cadência)
CREATE TABLE IF NOT EXISTS public.crm_cadence_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID REFERENCES public.crm_cadences(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, executed, skipped, failed, cancelled
  result JSONB DEFAULT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA: crm_escalation_rules (Regras de escalação)
CREATE TABLE IF NOT EXISTS public.crm_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.crm_stages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  condition_type TEXT NOT NULL, -- no_response, time_in_stage, negative_sentiment, value_threshold
  condition_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  threshold_hours INTEGER DEFAULT 24,
  escalation_level INTEGER DEFAULT 1, -- 1, 2, 3 (SDR, Coordenador, Gestor)
  notify_user_ids UUID[] DEFAULT '{}',
  notify_roles TEXT[] DEFAULT '{}',
  action_type TEXT DEFAULT 'notify', -- notify, reassign, move_stage, create_task
  action_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA: crm_gamification_points (Pontuação pessoal - gamificação)
CREATE TABLE IF NOT EXISTS public.crm_gamification_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- first_contact, call_made, proposal_sent, sale_closed, etc.
  points INTEGER NOT NULL DEFAULT 0,
  multiplier DECIMAL(3,2) DEFAULT 1.00,
  description TEXT,
  reference_id UUID, -- ID da tarefa, interação, etc.
  reference_type TEXT, -- task, interaction, lead, sale
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA: crm_gamification_rules (Regras de pontuação)
CREATE TABLE IF NOT EXISTS public.crm_gamification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE,
  base_points INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  icon TEXT,
  color TEXT,
  multiplier_conditions JSONB DEFAULT '[]'::jsonb, -- Condições para multiplicadores
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA: crm_gamification_achievements (Conquistas/Badges)
CREATE TABLE IF NOT EXISTS public.crm_gamification_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  badge_image_url TEXT,
  requirement_type TEXT NOT NULL, -- points_total, streak, sales_count, conversion_rate
  requirement_value INTEGER NOT NULL,
  requirement_period TEXT, -- daily, weekly, monthly, all_time
  xp_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA: crm_user_achievements (Conquistas do usuário)
CREATE TABLE IF NOT EXISTS public.crm_user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.crm_gamification_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- 8. TABELA: crm_sla_config (Configuração de SLA por estágio)
CREATE TABLE IF NOT EXISTS public.crm_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  max_hours INTEGER NOT NULL DEFAULT 24,
  warning_hours INTEGER DEFAULT 12,
  critical_hours INTEGER DEFAULT 48,
  business_hours_only BOOLEAN DEFAULT true,
  business_start TIME DEFAULT '08:00:00',
  business_end TIME DEFAULT '18:00:00',
  exclude_weekends BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pipeline_id, stage_id)
);

-- 9. TABELA: crm_alert_config (Configuração de alertas)
CREATE TABLE IF NOT EXISTS public.crm_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- stale_lead, sla_breach, negative_sentiment, high_value_at_risk
  condition_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  notify_channels TEXT[] DEFAULT ARRAY['notification', 'email'],
  notify_roles TEXT[] DEFAULT ARRAY['assigned_user'],
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. TABELA: crm_surgery_checklist (Checklist cirúrgico D-45 a D+90)
CREATE TABLE IF NOT EXISTS public.crm_surgery_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  checklist_type TEXT NOT NULL, -- pre_surgery, surgery_day, post_surgery
  day_offset INTEGER NOT NULL, -- D-45, D-30, D-7, D0, D+1, D+7, D+30, D+90
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  auto_actions JSONB DEFAULT '[]'::jsonb,
  notify_team BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. TABELA: crm_lead_surgery_checklist (Progresso do checklist por lead)
CREATE TABLE IF NOT EXISTS public.crm_lead_surgery_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES public.crm_surgery_checklist(id) ON DELETE CASCADE,
  completed_items JSONB DEFAULT '[]'::jsonb,
  completion_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, checklist_id)
);

-- 12. TABELA: crm_whatsapp_templates (Templates de mensagem WhatsApp)
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- first_contact, follow_up, proposal, confirmation, post_sale
  pipeline_id UUID REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.crm_stages(id) ON DELETE SET NULL,
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  has_media BOOLEAN DEFAULT false,
  media_type TEXT, -- image, video, document
  media_url TEXT,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. TABELA: crm_nps_responses (Respostas NPS inteligente)
CREATE TABLE IF NOT EXISTS public.crm_nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  patient_data_id UUID,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  category TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN score >= 9 THEN 'promoter'
      WHEN score >= 7 THEN 'passive'
      ELSE 'detractor'
    END
  ) STORED,
  feedback TEXT,
  touchpoint TEXT, -- pre_surgery, post_surgery, 30_days, 90_days, annual
  sentiment_ai TEXT,
  improvement_areas JSONB DEFAULT '[]'::jsonb,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_completed_at TIMESTAMPTZ,
  follow_up_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. TABELA: crm_lost_reasons (Motivos de perda detalhados)
CREATE TABLE IF NOT EXISTS public.crm_lost_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- price, timing, competition, not_qualified, no_response, other
  description TEXT,
  recovery_strategy TEXT,
  recovery_days INTEGER DEFAULT 30, -- Dias para tentar recuperar
  is_recoverable BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. TABELA: crm_cross_sell_opportunities (Oportunidades cross-sell/upsell)
CREATE TABLE IF NOT EXISTS public.crm_cross_sell_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  source_procedure TEXT,
  suggested_procedure TEXT NOT NULL,
  suggestion_reason TEXT,
  estimated_value DECIMAL(12,2),
  priority TEXT DEFAULT 'medium', -- low, medium, high
  status TEXT DEFAULT 'pending', -- pending, contacted, interested, converted, declined
  contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. TABELA: crm_team_routine (Rotina diária da equipe)
CREATE TABLE IF NOT EXISTS public.crm_team_routine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_date DATE NOT NULL,
  planned_activities JSONB DEFAULT '[]'::jsonb,
  completed_activities JSONB DEFAULT '[]'::jsonb,
  goals JSONB DEFAULT '{}'::jsonb,
  achievements JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5),
  productivity_score INTEGER CHECK (productivity_score >= 1 AND productivity_score <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, routine_date)
);

-- 17. Adicionar campos extras na tabela crm_leads
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS nps_score INTEGER,
ADD COLUMN IF NOT EXISTS nps_category TEXT,
ADD COLUMN IF NOT EXISTS last_nps_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lost_reason_id UUID REFERENCES public.crm_lost_reasons(id),
ADD COLUMN IF NOT EXISTS recovery_status TEXT, -- pending, in_progress, recovered, abandoned
ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_recovery_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gamification_points_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_contact_time TIME,
ADD COLUMN IF NOT EXISTS preferred_contact_day TEXT,
ADD COLUMN IF NOT EXISTS travel_info JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS companion_info JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS diet_restrictions TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT NULL;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_crm_cadences_pipeline ON public.crm_cadences(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_cadences_stage ON public.crm_cadences(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_cadence_executions_lead ON public.crm_cadence_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_cadence_executions_status ON public.crm_cadence_executions(status);
CREATE INDEX IF NOT EXISTS idx_crm_cadence_executions_scheduled ON public.crm_cadence_executions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_crm_gamification_points_user ON public.crm_gamification_points(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_gamification_points_period ON public.crm_gamification_points(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_crm_nps_responses_lead ON public.crm_nps_responses(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_nps_responses_score ON public.crm_nps_responses(score);
CREATE INDEX IF NOT EXISTS idx_crm_cross_sell_lead ON public.crm_cross_sell_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_cross_sell_status ON public.crm_cross_sell_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_crm_surgery_checklist_day ON public.crm_surgery_checklist(day_offset);
CREATE INDEX IF NOT EXISTS idx_crm_lead_surgery_progress ON public.crm_lead_surgery_checklist(lead_id);

-- =====================================================
-- HABILITAR RLS
-- =====================================================

ALTER TABLE public.crm_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cadence_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_gamification_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_gamification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_gamification_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_surgery_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_surgery_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lost_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cross_sell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_team_routine ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Cadências - Apenas admins podem criar/editar, todos podem ler
CREATE POLICY "crm_cadences_select" ON public.crm_cadences FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_cadences_admin" ON public.crm_cadences FOR ALL TO authenticated USING (public.is_admin());

-- Execuções de cadência - Usuários veem seus leads
CREATE POLICY "crm_cadence_executions_select" ON public.crm_cadence_executions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM crm_leads WHERE id = lead_id AND (assigned_to = auth.uid() OR public.is_admin()))
);
CREATE POLICY "crm_cadence_executions_admin" ON public.crm_cadence_executions FOR ALL TO authenticated USING (public.is_admin());

-- Escalation rules - Apenas admins
CREATE POLICY "crm_escalation_rules_select" ON public.crm_escalation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_escalation_rules_admin" ON public.crm_escalation_rules FOR ALL TO authenticated USING (public.is_admin());

-- Pontos gamificação - Usuários veem seus próprios pontos
CREATE POLICY "crm_gamification_points_select" ON public.crm_gamification_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_gamification_points_insert" ON public.crm_gamification_points FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Regras gamificação - Todos leem, admins editam
CREATE POLICY "crm_gamification_rules_select" ON public.crm_gamification_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_gamification_rules_admin" ON public.crm_gamification_rules FOR ALL TO authenticated USING (public.is_admin());

-- Achievements - Todos leem
CREATE POLICY "crm_achievements_select" ON public.crm_gamification_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_achievements_admin" ON public.crm_gamification_achievements FOR ALL TO authenticated USING (public.is_admin());

-- User achievements - Usuários veem próprios
CREATE POLICY "crm_user_achievements_select" ON public.crm_user_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_user_achievements_insert" ON public.crm_user_achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- SLA Config - Admins
CREATE POLICY "crm_sla_config_select" ON public.crm_sla_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_sla_config_admin" ON public.crm_sla_config FOR ALL TO authenticated USING (public.is_admin());

-- Alert Config - Admins
CREATE POLICY "crm_alert_config_select" ON public.crm_alert_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_alert_config_admin" ON public.crm_alert_config FOR ALL TO authenticated USING (public.is_admin());

-- Surgery checklist - Todos leem
CREATE POLICY "crm_surgery_checklist_select" ON public.crm_surgery_checklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_surgery_checklist_admin" ON public.crm_surgery_checklist FOR ALL TO authenticated USING (public.is_admin());

-- Lead surgery checklist - Baseado no lead
CREATE POLICY "crm_lead_surgery_checklist_select" ON public.crm_lead_surgery_checklist FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM crm_leads WHERE id = lead_id AND (assigned_to = auth.uid() OR public.is_admin()))
);
CREATE POLICY "crm_lead_surgery_checklist_insert" ON public.crm_lead_surgery_checklist FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM crm_leads WHERE id = lead_id AND (assigned_to = auth.uid() OR public.is_admin()))
);
CREATE POLICY "crm_lead_surgery_checklist_update" ON public.crm_lead_surgery_checklist FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM crm_leads WHERE id = lead_id AND (assigned_to = auth.uid() OR public.is_admin()))
);

-- WhatsApp templates - Todos leem, admins editam
CREATE POLICY "crm_whatsapp_templates_select" ON public.crm_whatsapp_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_whatsapp_templates_admin" ON public.crm_whatsapp_templates FOR ALL TO authenticated USING (public.is_admin());

-- NPS Responses - Baseado no lead
CREATE POLICY "crm_nps_responses_select" ON public.crm_nps_responses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM crm_leads WHERE id = lead_id AND (assigned_to = auth.uid() OR public.is_admin()))
);
CREATE POLICY "crm_nps_responses_insert" ON public.crm_nps_responses FOR INSERT TO authenticated WITH CHECK (true);

-- Lost reasons - Todos leem
CREATE POLICY "crm_lost_reasons_select" ON public.crm_lost_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "crm_lost_reasons_admin" ON public.crm_lost_reasons FOR ALL TO authenticated USING (public.is_admin());

-- Cross sell - Baseado no lead
CREATE POLICY "crm_cross_sell_select" ON public.crm_cross_sell_opportunities FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM crm_leads WHERE id = lead_id AND (assigned_to = auth.uid() OR public.is_admin()))
);
CREATE POLICY "crm_cross_sell_modify" ON public.crm_cross_sell_opportunities FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM crm_leads WHERE id = lead_id AND (assigned_to = auth.uid() OR public.is_admin()))
);

-- Team routine - Próprio usuário
CREATE POLICY "crm_team_routine_select" ON public.crm_team_routine FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "crm_team_routine_insert" ON public.crm_team_routine FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "crm_team_routine_update" ON public.crm_team_routine FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_crm_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_crm_cadences_updated_at BEFORE UPDATE ON public.crm_cadences FOR EACH ROW EXECUTE FUNCTION update_crm_table_updated_at();
CREATE TRIGGER update_crm_escalation_rules_updated_at BEFORE UPDATE ON public.crm_escalation_rules FOR EACH ROW EXECUTE FUNCTION update_crm_table_updated_at();
CREATE TRIGGER update_crm_sla_config_updated_at BEFORE UPDATE ON public.crm_sla_config FOR EACH ROW EXECUTE FUNCTION update_crm_table_updated_at();
CREATE TRIGGER update_crm_surgery_checklist_updated_at BEFORE UPDATE ON public.crm_surgery_checklist FOR EACH ROW EXECUTE FUNCTION update_crm_table_updated_at();
CREATE TRIGGER update_crm_lead_surgery_checklist_updated_at BEFORE UPDATE ON public.crm_lead_surgery_checklist FOR EACH ROW EXECUTE FUNCTION update_crm_table_updated_at();
CREATE TRIGGER update_crm_whatsapp_templates_updated_at BEFORE UPDATE ON public.crm_whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_crm_table_updated_at();
CREATE TRIGGER update_crm_cross_sell_updated_at BEFORE UPDATE ON public.crm_cross_sell_opportunities FOR EACH ROW EXECUTE FUNCTION update_crm_table_updated_at();
CREATE TRIGGER update_crm_team_routine_updated_at BEFORE UPDATE ON public.crm_team_routine FOR EACH ROW EXECUTE FUNCTION update_crm_table_updated_at();

-- =====================================================
-- DADOS INICIAIS - REGRAS DE PONTUAÇÃO
-- =====================================================

INSERT INTO public.crm_gamification_rules (action_type, base_points, description, icon, color) VALUES
('first_contact', 10, 'Primeiro contato com lead', 'Phone', '#3B82F6'),
('call_made', 5, 'Ligação realizada', 'PhoneCall', '#10B981'),
('whatsapp_sent', 3, 'Mensagem WhatsApp enviada', 'MessageCircle', '#25D366'),
('email_sent', 3, 'Email enviado', 'Mail', '#6366F1'),
('proposal_sent', 15, 'Proposta enviada', 'FileText', '#F59E0B'),
('meeting_scheduled', 20, 'Reunião agendada', 'Calendar', '#8B5CF6'),
('meeting_completed', 25, 'Reunião realizada', 'Users', '#EC4899'),
('sale_closed', 100, 'Venda fechada', 'Trophy', '#FFD700'),
('upsell_closed', 50, 'Upsell realizado', 'TrendingUp', '#10B981'),
('referral_received', 30, 'Indicação recebida', 'Gift', '#F97316'),
('nps_promoter', 20, 'NPS Promotor (9-10)', 'Star', '#FFD700'),
('testimonial_received', 25, 'Depoimento recebido', 'MessageSquare', '#EC4899'),
('quick_response', 5, 'Resposta em menos de 5 min', 'Zap', '#EF4444'),
('task_completed', 5, 'Tarefa concluída', 'CheckCircle', '#22C55E'),
('streak_day', 10, 'Dia de streak mantido', 'Flame', '#F97316')
ON CONFLICT (action_type) DO NOTHING;

-- =====================================================
-- DADOS INICIAIS - ACHIEVEMENTS
-- =====================================================

INSERT INTO public.crm_gamification_achievements (name, description, icon, color, requirement_type, requirement_value, requirement_period, xp_reward) VALUES
('Primeiro Contato', 'Realize seu primeiro contato', 'Phone', '#3B82F6', 'action_count', 1, 'all_time', 50),
('Comunicador', '100 mensagens enviadas', 'MessageCircle', '#25D366', 'action_count', 100, 'all_time', 200),
('Fechador', 'Feche 10 vendas', 'Trophy', '#FFD700', 'sales_count', 10, 'all_time', 500),
('Estrela do Mês', 'Seja o top vendedor do mês', 'Star', '#FFD700', 'rank_position', 1, 'monthly', 1000),
('Streak de 7 dias', 'Mantenha atividade por 7 dias seguidos', 'Flame', '#F97316', 'streak', 7, 'all_time', 150),
('Streak de 30 dias', 'Mantenha atividade por 30 dias seguidos', 'Flame', '#EF4444', 'streak', 30, 'all_time', 500),
('Caçador de Leads', 'Converta 50 leads', 'Target', '#8B5CF6', 'conversions', 50, 'all_time', 300),
('Mestre do Upsell', 'Realize 10 upsells', 'TrendingUp', '#10B981', 'upsells', 10, 'all_time', 400),
('Embaixador', 'Receba 20 indicações', 'Gift', '#EC4899', 'referrals', 20, 'all_time', 350),
('NPS Master', 'Receba 50 NPS promotores', 'Heart', '#EF4444', 'nps_promoters', 50, 'all_time', 450)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DADOS INICIAIS - MOTIVOS DE PERDA
-- =====================================================

INSERT INTO public.crm_lost_reasons (name, category, description, recovery_strategy, recovery_days, is_recoverable, order_index) VALUES
('Preço alto', 'price', 'Cliente achou o valor alto demais', 'Oferecer parcelamento ou condições especiais em promoções', 60, true, 1),
('Vai pensar', 'timing', 'Cliente quer mais tempo para decidir', 'Follow-up em 7, 14 e 30 dias com novidades', 30, true, 2),
('Escolheu concorrente', 'competition', 'Fechou com outra clínica', 'Manter relacionamento para futuras oportunidades', 90, true, 3),
('Não respondeu', 'no_response', 'Lead sumiu sem responder', 'Cadência de reativação em 30, 60, 90 dias', 30, true, 4),
('Não qualificado', 'not_qualified', 'Não tem perfil para o procedimento', 'Arquivar sem recontato', 0, false, 5),
('Problemas financeiros', 'price', 'Momento financeiro ruim', 'Recontato em 90 dias com opções flexíveis', 90, true, 6),
('Mudou de cidade', 'other', 'Cliente mudou e não pode mais fazer aqui', 'Indicar parceiros ou manter para viagens', 180, false, 7),
('Desistiu do procedimento', 'other', 'Não quer mais fazer o procedimento', 'Manter contato suave a cada 6 meses', 180, true, 8),
('Teve complicações anteriores', 'not_qualified', 'Histórico de complicações impede', 'Arquivar definitivamente', 0, false, 9),
('Prazo inadequado', 'timing', 'Data desejada não disponível', 'Oferecer próximas datas disponíveis', 15, true, 10)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DADOS INICIAIS - CHECKLISTS CIRÚRGICOS
-- =====================================================

INSERT INTO public.crm_surgery_checklist (name, description, checklist_type, day_offset, items, auto_actions, notify_team, is_required, order_index) VALUES
('D-45: Início Jornada', 'Ações 45 dias antes da cirurgia', 'pre_surgery', -45, 
 '[{"id":"1","title":"Enviar boas-vindas ao grupo VIP","required":true},{"id":"2","title":"Confirmar contato de emergência","required":true},{"id":"3","title":"Enviar protocolo pré-operatório","required":true}]'::jsonb,
 '[{"type":"send_whatsapp","template":"welcome_surgery"}]'::jsonb, true, true, 1),

('D-30: Documentação', 'Documentação e exames', 'pre_surgery', -30,
 '[{"id":"1","title":"Solicitar exames pré-operatórios","required":true},{"id":"2","title":"Confirmar documentação completa","required":true},{"id":"3","title":"Agendar consulta pré-anestésica","required":true}]'::jsonb,
 '[]'::jsonb, true, true, 2),

('D-7: Confirmações finais', 'Semana da cirurgia', 'pre_surgery', -7,
 '[{"id":"1","title":"Confirmar data e horário","required":true},{"id":"2","title":"Enviar orientações finais","required":true},{"id":"3","title":"Confirmar acompanhante","required":true},{"id":"4","title":"Confirmar jejum","required":true}]'::jsonb,
 '[{"type":"send_whatsapp","template":"final_instructions"}]'::jsonb, true, true, 3),

('D0: Dia da cirurgia', 'Check-in no hospital', 'surgery_day', 0,
 '[{"id":"1","title":"Confirmar chegada ao hospital","required":true},{"id":"2","title":"Notificar equipe médica","required":true},{"id":"3","title":"Registrar início do procedimento","required":true},{"id":"4","title":"Notificar término e sucesso","required":true}]'::jsonb,
 '[{"type":"notify_team","message":"Paciente em cirurgia"}]'::jsonb, true, true, 4),

('D+1: Primeiro dia pós', 'Primeiro contato pós-cirurgia', 'post_surgery', 1,
 '[{"id":"1","title":"Ligar para verificar bem-estar","required":true},{"id":"2","title":"Confirmar medicação sendo tomada","required":true},{"id":"3","title":"Enviar mensagem de apoio","required":true}]'::jsonb,
 '[{"type":"create_task","title":"Ligar D+1"}]'::jsonb, false, true, 5),

('D+7: Primeira semana', 'Acompanhamento primeira semana', 'post_surgery', 7,
 '[{"id":"1","title":"Agendar retorno médico","required":true},{"id":"2","title":"Verificar cicatrização","required":true},{"id":"3","title":"Coletar feedback inicial","required":false}]'::jsonb,
 '[]'::jsonb, false, true, 6),

('D+30: Primeiro mês', 'Acompanhamento mensal', 'post_surgery', 30,
 '[{"id":"1","title":"Enviar pesquisa NPS","required":true},{"id":"2","title":"Solicitar depoimento","required":false},{"id":"3","title":"Oferecer manutenção","required":false}]'::jsonb,
 '[{"type":"send_nps","touchpoint":"30_days"}]'::jsonb, false, true, 7),

('D+90: Terceiro mês', 'Acompanhamento trimestral', 'post_surgery', 90,
 '[{"id":"1","title":"Enviar NPS de acompanhamento","required":true},{"id":"2","title":"Identificar oportunidades upsell","required":false},{"id":"3","title":"Solicitar indicações","required":false},{"id":"4","title":"Transferir para Farmer","required":true}]'::jsonb,
 '[{"type":"move_pipeline","to":"Fidelização (Farmer)"}]'::jsonb, false, true, 8)
ON CONFLICT DO NOTHING;

-- Habilitar realtime para tabelas importantes
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_cadence_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_gamification_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_nps_responses;
