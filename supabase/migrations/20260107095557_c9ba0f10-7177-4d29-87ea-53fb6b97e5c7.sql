-- ===========================================
-- CRM UNIQUE - FASE 1: FUNDAÇÃO DO CRM
-- ===========================================

-- 1. PIPELINES CONFIGURÁVEIS
CREATE TABLE public.crm_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  pipeline_type TEXT NOT NULL CHECK (pipeline_type IN ('sdr', 'closer', 'cs', 'farmer', 'influencer', 'custom')),
  icon TEXT DEFAULT 'users',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. ESTÁGIOS DOS PIPELINES
CREATE TABLE public.crm_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  is_win_stage BOOLEAN DEFAULT false,
  is_lost_stage BOOLEAN DEFAULT false,
  auto_actions JSONB DEFAULT '[]',
  required_fields JSONB DEFAULT '[]',
  sla_hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. LEADS/CARDS DO CRM (evolução do referral_leads)
CREATE TABLE public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  cpf TEXT,
  prontuario TEXT,
  
  -- Localização no CRM
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id),
  stage_id UUID NOT NULL REFERENCES public.crm_stages(id),
  
  -- Atribuição
  assigned_to UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES public.teams(id),
  
  -- Origem
  source TEXT, -- 'indicacao', 'feegow', 'api', 'manual', 'influencer', 'campanha'
  source_detail TEXT, -- nome do indicador, campanha, etc
  referral_lead_id UUID REFERENCES public.referral_leads(id), -- link para lead de indicação original
  patient_data_id UUID REFERENCES public.patient_data(id), -- link para dados do paciente
  rfv_customer_id UUID REFERENCES public.rfv_customers(id), -- link para RFV
  
  -- Qualificação BANT
  budget_score INTEGER CHECK (budget_score BETWEEN 0 AND 10),
  authority_score INTEGER CHECK (authority_score BETWEEN 0 AND 10),
  need_score INTEGER CHECK (need_score BETWEEN 0 AND 10),
  timing_score INTEGER CHECK (timing_score BETWEEN 0 AND 10),
  lead_score INTEGER GENERATED ALWAYS AS (
    COALESCE(budget_score, 0) + COALESCE(authority_score, 0) + 
    COALESCE(need_score, 0) + COALESCE(timing_score, 0)
  ) STORED,
  
  -- Interesse
  interested_procedures TEXT[],
  estimated_value NUMERIC(12,2),
  
  -- Dados adicionais
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Resultado
  won_at TIMESTAMP WITH TIME ZONE,
  lost_at TIMESTAMP WITH TIME ZONE,
  lost_reason TEXT,
  contract_value NUMERIC(12,2),
  
  -- IA
  ai_summary TEXT,
  ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  ai_intent TEXT,
  ai_next_action TEXT,
  ai_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Métricas
  first_contact_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  days_in_stage INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  
  -- Controle
  is_priority BOOLEAN DEFAULT false,
  is_stale BOOLEAN DEFAULT false,
  stale_since TIMESTAMP WITH TIME ZONE,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. HISTÓRICO DE MOVIMENTAÇÕES
CREATE TABLE public.crm_lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'stage_change', 'assignment', 'field_update', 'note', 'task', 'email', 'whatsapp', 'call', 'meeting'
  
  -- Mudança de estágio
  from_stage_id UUID REFERENCES public.crm_stages(id),
  to_stage_id UUID REFERENCES public.crm_stages(id),
  from_pipeline_id UUID REFERENCES public.crm_pipelines(id),
  to_pipeline_id UUID REFERENCES public.crm_pipelines(id),
  
  -- Detalhes
  title TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- IA
  ai_analysis JSONB,
  
  performed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. TAREFAS DO LEAD
CREATE TABLE public.crm_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up', -- 'follow_up', 'call', 'meeting', 'email', 'whatsapp', 'other'
  
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_at TIMESTAMP WITH TIME ZONE,
  
  assigned_to UUID NOT NULL,
  
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  
  is_overdue BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. REGRAS DE AUTOMAÇÃO
CREATE TABLE public.crm_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Gatilho
  trigger_type TEXT NOT NULL, -- 'stage_enter', 'stage_exit', 'lead_created', 'inactivity', 'task_overdue', 'field_change'
  trigger_config JSONB NOT NULL DEFAULT '{}',
  
  -- Condições
  conditions JSONB DEFAULT '[]',
  
  -- Ações
  actions JSONB NOT NULL DEFAULT '[]', -- [{type: 'create_task', config: {...}}, {type: 'send_notification', config: {...}}]
  
  -- Escopo
  pipeline_id UUID REFERENCES public.crm_pipelines(id),
  stage_id UUID REFERENCES public.crm_stages(id),
  
  is_active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. LOG DE EXECUÇÃO DE AUTOMAÇÕES
CREATE TABLE public.crm_automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.crm_automations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'skipped'
  actions_executed JSONB DEFAULT '[]',
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_leads_pipeline ON public.crm_leads(pipeline_id);
CREATE INDEX idx_crm_leads_stage ON public.crm_leads(stage_id);
CREATE INDEX idx_crm_leads_assigned ON public.crm_leads(assigned_to);
CREATE INDEX idx_crm_leads_team ON public.crm_leads(team_id);
CREATE INDEX idx_crm_leads_source ON public.crm_leads(source);
CREATE INDEX idx_crm_leads_created ON public.crm_leads(created_at DESC);
CREATE INDEX idx_crm_leads_last_activity ON public.crm_leads(last_activity_at DESC);
CREATE INDEX idx_crm_leads_stale ON public.crm_leads(is_stale) WHERE is_stale = true;
CREATE INDEX idx_crm_lead_history_lead ON public.crm_lead_history(lead_id);
CREATE INDEX idx_crm_tasks_lead ON public.crm_tasks(lead_id);
CREATE INDEX idx_crm_tasks_assigned ON public.crm_tasks(assigned_to);
CREATE INDEX idx_crm_tasks_due ON public.crm_tasks(due_date) WHERE is_completed = false;
CREATE INDEX idx_crm_stages_pipeline ON public.crm_stages(pipeline_id);

-- Enable RLS
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Pipelines - todos podem ver
CREATE POLICY "Pipelines are viewable by authenticated users"
ON public.crm_pipelines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage pipelines"
ON public.crm_pipelines FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Stages - todos podem ver
CREATE POLICY "Stages are viewable by authenticated users"
ON public.crm_stages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage stages"
ON public.crm_stages FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Leads - usuários veem leads do seu time ou atribuídos a eles
CREATE POLICY "Users can view leads from their team or assigned to them"
ON public.crm_leads FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid() OR
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can insert leads"
ON public.crm_leads FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update leads they have access to"
ON public.crm_leads FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid() OR
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete leads"
ON public.crm_leads FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- History - mesmas regras dos leads
CREATE POLICY "Users can view history of their leads"
ON public.crm_lead_history FOR SELECT
TO authenticated
USING (
  lead_id IN (
    SELECT id FROM public.crm_leads WHERE
      assigned_to = auth.uid() OR
      team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Users can insert history"
ON public.crm_lead_history FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());

-- Tasks
CREATE POLICY "Users can view tasks assigned to them or on their leads"
ON public.crm_tasks FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid() OR
  lead_id IN (
    SELECT id FROM public.crm_leads WHERE
      assigned_to = auth.uid() OR
      team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  ) OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can create tasks"
ON public.crm_tasks FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their tasks"
ON public.crm_tasks FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid() OR
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can delete their tasks"
ON public.crm_tasks FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Automations - apenas admins
CREATE POLICY "Admins can manage automations"
ON public.crm_automations FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view active automations"
ON public.crm_automations FOR SELECT
TO authenticated
USING (is_active = true);

-- Automation Logs - apenas admins
CREATE POLICY "Admins can view automation logs"
ON public.crm_automation_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_tasks_updated_at
BEFORE UPDATE ON public.crm_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_automations_updated_at
BEFORE UPDATE ON public.crm_automations
FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_pipelines_updated_at
BEFORE UPDATE ON public.crm_pipelines
FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

CREATE TRIGGER update_crm_stages_updated_at
BEFORE UPDATE ON public.crm_stages
FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

-- ===========================================
-- DADOS INICIAIS: 4 PIPELINES PRINCIPAIS
-- ===========================================

-- Pipeline 1: SDR - Prospecção e Qualificação
INSERT INTO public.crm_pipelines (id, name, description, pipeline_type, icon, color, order_index) VALUES
('11111111-1111-1111-1111-111111111111', 'Prospecção (SDR)', 'Pipeline de prospecção e qualificação de leads', 'sdr', 'user-search', '#3B82F6', 1);

INSERT INTO public.crm_stages (pipeline_id, name, description, color, order_index, sla_hours) VALUES
('11111111-1111-1111-1111-111111111111', 'Novo Lead', 'Lead acabou de entrar no sistema', '#6B7280', 1, 2),
('11111111-1111-1111-1111-111111111111', 'Primeiro Contato', 'Tentando primeiro contato', '#F59E0B', 2, 24),
('11111111-1111-1111-1111-111111111111', 'Em Qualificação', 'Aplicando BANT e entendendo necessidades', '#8B5CF6', 3, 48),
('11111111-1111-1111-1111-111111111111', 'Agendamento', 'Tentando agendar consulta', '#EC4899', 4, 72),
('11111111-1111-1111-1111-111111111111', 'Consulta Agendada', 'Consulta marcada, aguardando', '#10B981', 5, NULL),
('11111111-1111-1111-1111-111111111111', 'Nutrição', 'Lead frio em cadência de nutrição', '#6366F1', 6, NULL),
('11111111-1111-1111-1111-111111111111', 'Descartado', 'Lead sem perfil ou desqualificado', '#EF4444', 7, NULL);

-- Pipeline 2: Closer - Vendas e Fechamento
INSERT INTO public.crm_pipelines (id, name, description, pipeline_type, icon, color, order_index) VALUES
('22222222-2222-2222-2222-222222222222', 'Vendas (Closer)', 'Pipeline de negociação e fechamento', 'closer', 'handshake', '#10B981', 2);

INSERT INTO public.crm_stages (pipeline_id, name, description, color, order_index, sla_hours, is_win_stage, is_lost_stage) VALUES
('22222222-2222-2222-2222-222222222222', 'Consulta Agendada', 'Lead veio do Pipeline SDR', '#6B7280', 1, 24, false, false),
('22222222-2222-2222-2222-222222222222', 'Consulta Realizada', 'Consulta feita, preparando proposta', '#F59E0B', 2, 48, false, false),
('22222222-2222-2222-2222-222222222222', 'Proposta Enviada', 'Proposta enviada ao paciente', '#8B5CF6', 3, 72, false, false),
('22222222-2222-2222-2222-222222222222', 'Em Negociação', 'Follow-up ativo de negociação', '#EC4899', 4, 168, false, false),
('22222222-2222-2222-2222-222222222222', 'Fechado (Ganho)', 'Venda realizada!', '#10B981', 5, NULL, true, false),
('22222222-2222-2222-2222-222222222222', 'Perdido', 'Venda não concretizada', '#EF4444', 6, NULL, false, true);

-- Pipeline 3: CS - Pós-Venda
INSERT INTO public.crm_pipelines (id, name, description, pipeline_type, icon, color, order_index) VALUES
('33333333-3333-3333-3333-333333333333', 'Pós-Venda (CS)', 'Acompanhamento do paciente pós-contrato', 'cs', 'heart', '#EC4899', 3);

INSERT INTO public.crm_stages (pipeline_id, name, description, color, order_index) VALUES
('33333333-3333-3333-3333-333333333333', 'Contrato Assinado', 'Paciente acabou de fechar', '#6B7280', 1),
('33333333-3333-3333-3333-333333333333', 'Pré-Operatório', 'Preparação para cirurgia', '#F59E0B', 2),
('33333333-3333-3333-3333-333333333333', 'Cirurgia Realizada', 'Cirurgia concluída', '#8B5CF6', 3),
('33333333-3333-3333-3333-333333333333', 'Pós-Op Recente', 'Primeiros 30 dias pós-cirurgia', '#EC4899', 4),
('33333333-3333-3333-3333-333333333333', 'Pós-Op Tardio', 'Acompanhamento de resultados', '#10B981', 5),
('33333333-3333-3333-3333-333333333333', 'Alta Médica', 'Paciente com alta completa', '#3B82F6', 6);

-- Pipeline 4: Farmer - Fidelização
INSERT INTO public.crm_pipelines (id, name, description, pipeline_type, icon, color, order_index) VALUES
('44444444-4444-4444-4444-444444444444', 'Fidelização (Farmer)', 'Gestão da base de clientes e recorrência', 'farmer', 'crown', '#F59E0B', 4);

INSERT INTO public.crm_stages (pipeline_id, name, description, color, order_index) VALUES
('44444444-4444-4444-4444-444444444444', 'Base Ativa', 'Cliente satisfeito, manter relacionamento', '#10B981', 1),
('44444444-4444-4444-4444-444444444444', 'Oportunidade Upsell', 'Identificada oportunidade de novo procedimento', '#F59E0B', 2),
('44444444-4444-4444-4444-444444444444', 'Embaixadora', 'Cliente no programa de embaixadoras', '#8B5CF6', 3),
('44444444-4444-4444-4444-444444444444', 'Indicação Recebida', 'Cliente indicou novo lead', '#EC4899', 4),
('44444444-4444-4444-4444-444444444444', 'Reativação', 'Cliente inativo sendo reativado', '#6366F1', 5);

-- Enable realtime para leads e tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_tasks;