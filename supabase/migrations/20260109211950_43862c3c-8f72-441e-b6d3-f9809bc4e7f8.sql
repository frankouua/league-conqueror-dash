-- =====================================================
-- SECURITY FIXES & PERFORMANCE OPTIMIZATION
-- =====================================================

-- 1. Corrigir políticas de INSERT permissivas
DROP POLICY IF EXISTS "Anyone can insert stages" ON public.crm_stages;
CREATE POLICY "Only admins can insert stages" 
  ON public.crm_stages 
  FOR INSERT 
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can insert pipelines" ON public.crm_pipelines;
CREATE POLICY "Only admins can insert pipelines" 
  ON public.crm_pipelines 
  FOR INSERT 
  WITH CHECK (public.is_admin());

-- 2. Restringir acesso a dados sensíveis de pacientes
DROP POLICY IF EXISTS "Team members can view patient data" ON public.patient_data;
DROP POLICY IF EXISTS "Users can view patient data" ON public.patient_data;

CREATE POLICY "Patient data visible to admins and authorized users" 
  ON public.patient_data 
  FOR SELECT 
  USING (
    public.is_admin() 
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND position IN ('gerente', 'coordenador')
    )
  );

-- 3. Restringir rfv_customers a admins e comercial (usando valor correto do enum)
DROP POLICY IF EXISTS "RFV customers viewable by authenticated" ON public.rfv_customers;
DROP POLICY IF EXISTS "Users can view RFV customers" ON public.rfv_customers;

CREATE POLICY "RFV customers visible to admins and comercial" 
  ON public.rfv_customers 
  FOR SELECT 
  USING (
    public.is_admin() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND (
        department = 'comercial'
        OR position IN ('gerente', 'coordenador')
      )
    )
  );

-- 4. Restringir cancellations a admins e responsáveis
DROP POLICY IF EXISTS "Team members can view cancellations" ON public.cancellations;

CREATE POLICY "Cancellations visible to owner and admins" 
  ON public.cancellations 
  FOR SELECT 
  USING (
    public.is_admin() 
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND position IN ('gerente', 'coordenador')
    )
  );

-- 5. Restringir revenue_records
DROP POLICY IF EXISTS "Team members can view revenue" ON public.revenue_records;
DROP POLICY IF EXISTS "Users can view team revenue" ON public.revenue_records;

CREATE POLICY "Revenue visible to owner team and admins" 
  ON public.revenue_records 
  FOR SELECT 
  USING (
    public.is_admin() 
    OR user_id = auth.uid()
    OR (
      team_id = public.get_my_team_id()
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND position IN ('gerente', 'coordenador')
      )
    )
  );

-- 6. Restringir executed_records
DROP POLICY IF EXISTS "Team members can view executed" ON public.executed_records;
DROP POLICY IF EXISTS "Users can view team executed records" ON public.executed_records;

CREATE POLICY "Executed records visible to team and admins" 
  ON public.executed_records 
  FOR SELECT 
  USING (
    public.is_admin() 
    OR user_id = auth.uid()
    OR (
      team_id = public.get_my_team_id()
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND position IN ('gerente', 'coordenador')
      )
    )
  );

-- 7. Restringir crm_leads a vendedores atribuídos e admins
DROP POLICY IF EXISTS "CRM leads viewable by team" ON public.crm_leads;
DROP POLICY IF EXISTS "Users can view CRM leads" ON public.crm_leads;

CREATE POLICY "CRM leads visible to assigned and team leads" 
  ON public.crm_leads 
  FOR SELECT 
  USING (
    public.is_admin() 
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR (
      team_id = public.get_my_team_id()
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND position IN ('gerente', 'coordenador', 'sdr', 'comercial_2_closer')
      )
    )
  );

-- 8. Restringir referral_leads
DROP POLICY IF EXISTS "Team members can view referrals" ON public.referral_leads;
DROP POLICY IF EXISTS "Users can view referral leads" ON public.referral_leads;

CREATE POLICY "Referral leads visible to team" 
  ON public.referral_leads 
  FOR SELECT 
  USING (
    public.is_admin() 
    OR assigned_to = auth.uid()
    OR team_id = public.get_my_team_id()
  );

-- 9. Restringir individual_goals
DROP POLICY IF EXISTS "Users can view all goals" ON public.individual_goals;
DROP POLICY IF EXISTS "Individual goals viewable by all" ON public.individual_goals;

CREATE POLICY "Individual goals visible to owner and managers" 
  ON public.individual_goals 
  FOR SELECT 
  USING (
    public.is_admin() 
    OR user_id = auth.uid()
    OR (
      team_id = public.get_my_team_id()
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND position IN ('gerente', 'coordenador')
      )
    )
  );

-- 10. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to ON public.crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline_stage ON public.crm_leads(pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_temperature ON public.crm_leads(temperature);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON public.crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_last_activity ON public.crm_leads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_is_stale ON public.crm_leads(is_stale) WHERE is_stale = true;

CREATE INDEX IF NOT EXISTS idx_crm_lead_history_lead_id ON public.crm_lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_history_created ON public.crm_lead_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_lead_interactions_lead ON public.crm_lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_interactions_created ON public.crm_lead_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned ON public.crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON public.crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_completed ON public.crm_tasks(is_completed);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_user ON public.crm_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_notifications_unread ON public.crm_notifications(user_id) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_revenue_records_date ON public.revenue_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_records_user_date ON public.revenue_records(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_executed_records_date ON public.executed_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_executed_records_user_date ON public.executed_records(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_team ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_position ON public.profiles(position);

-- 11. Coluna para arquivamento de mensagens
ALTER TABLE public.crm_chat_messages ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 12. Garantir que webhooks só podem ser gerenciados por admins
DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.crm_webhooks;
DROP POLICY IF EXISTS "Users can create webhooks" ON public.crm_webhooks;

CREATE POLICY "Only admins can manage webhooks" 
  ON public.crm_webhooks 
  FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());