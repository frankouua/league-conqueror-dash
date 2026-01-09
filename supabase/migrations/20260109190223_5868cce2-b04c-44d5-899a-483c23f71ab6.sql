-- =====================================================
-- CORREÇÃO COMPLETA DE SEGURANÇA - TREINAMENTO E DADOS
-- =====================================================

-- 1. CORRIGIR RLS das tabelas de TREINAMENTO (remover acesso público)

-- Training Materials - Remover policy pública e criar restritiva
DROP POLICY IF EXISTS "Anyone can view active training materials" ON training_materials;
DROP POLICY IF EXISTS "Authenticated users can view training materials" ON training_materials;
CREATE POLICY "Approved users can view active training materials"
ON training_materials FOR SELECT
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL 
  AND public.is_approved_user()
);

-- Training Quizzes - Restringir para usuários aprovados
DROP POLICY IF EXISTS "Anyone can view active quizzes" ON training_quizzes;
DROP POLICY IF EXISTS "Authenticated users can view quizzes" ON training_quizzes;
CREATE POLICY "Approved users can view active quizzes"
ON training_quizzes FOR SELECT
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL 
  AND public.is_approved_user()
);

-- Training Simulations - Restringir para usuários aprovados
DROP POLICY IF EXISTS "Anyone can view active simulations" ON training_simulations;
DROP POLICY IF EXISTS "Authenticated users can view simulations" ON training_simulations;
CREATE POLICY "Approved users can view active simulations"
ON training_simulations FOR SELECT
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL 
  AND public.is_approved_user()
);

-- Training Tracks - Restringir para usuários aprovados
DROP POLICY IF EXISTS "Anyone can view active tracks" ON training_tracks;
DROP POLICY IF EXISTS "Authenticated users can view tracks" ON training_tracks;
CREATE POLICY "Approved users can view active tracks"
ON training_tracks FOR SELECT
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL 
  AND public.is_approved_user()
);

-- 2. CORRIGIR RLS de seller_department_goals (dados sensíveis de vendedores)
DROP POLICY IF EXISTS "Anyone can view seller department goals" ON seller_department_goals;
DROP POLICY IF EXISTS "Enable read access for all users" ON seller_department_goals;
CREATE POLICY "Approved users can view seller department goals"
ON seller_department_goals FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND public.is_approved_user()
);

-- 3. CORRIGIR RLS de department_quantity_goals (metas de departamento)
DROP POLICY IF EXISTS "Anyone can view department quantity goals" ON department_quantity_goals;
DROP POLICY IF EXISTS "Enable read access for all users" ON department_quantity_goals;
CREATE POLICY "Approved users can view department quantity goals"
ON department_quantity_goals FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND public.is_approved_user()
);

-- 4. CORRIGIR RLS de department_goals (metas de departamento)
DROP POLICY IF EXISTS "Anyone can view department goals" ON department_goals;
DROP POLICY IF EXISTS "Enable read access for all users" ON department_goals;
CREATE POLICY "Approved users can view department goals"
ON department_goals FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND public.is_approved_user()
);

-- 5. CORRIGIR RLS das tabelas de progresso de treinamento (INSERT com true)

-- Training Material Progress - Corrigir INSERT policy
DROP POLICY IF EXISTS "Users can create their own material progress" ON training_material_progress;
CREATE POLICY "Users can create their own material progress"
ON training_material_progress FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_approved_user()
);

-- Training Quiz Attempts - Corrigir INSERT policy
DROP POLICY IF EXISTS "Users can create their own quiz attempts" ON training_quiz_attempts;
CREATE POLICY "Users can create their own quiz attempts"
ON training_quiz_attempts FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_approved_user()
);

-- Training Simulation Attempts - Corrigir INSERT policy
DROP POLICY IF EXISTS "Users can create their own simulation attempts" ON training_simulation_attempts;
CREATE POLICY "Users can create their own simulation attempts"
ON training_simulation_attempts FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_approved_user()
);

-- Training Track Progress - Corrigir INSERT policy
DROP POLICY IF EXISTS "Users can insert their own track progress" ON training_track_progress;
CREATE POLICY "Users can insert their own track progress"
ON training_track_progress FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_approved_user()
);

-- Training XP History - Corrigir INSERT policy
DROP POLICY IF EXISTS "Allow insert for user's own XP" ON training_xp_history;
CREATE POLICY "Allow insert for user's own XP"
ON training_xp_history FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_approved_user()
);

-- Training User Stats - Corrigir INSERT e UPDATE policies
DROP POLICY IF EXISTS "Allow insert own stats" ON training_user_stats;
DROP POLICY IF EXISTS "Allow update own stats" ON training_user_stats;
CREATE POLICY "Allow insert own stats"
ON training_user_stats FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_approved_user()
);
CREATE POLICY "Allow update own stats"
ON training_user_stats FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Criar índices para melhorar PERFORMANCE das consultas mais usadas

-- Índices para treinamento
CREATE INDEX IF NOT EXISTS idx_training_materials_target_role ON training_materials(target_role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_training_quizzes_target_role ON training_quizzes(target_role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_training_simulations_target_role ON training_simulations(target_role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_training_tracks_target_role ON training_tracks(target_role) WHERE is_active = true;

-- Índices para progresso do usuário
CREATE INDEX IF NOT EXISTS idx_training_material_progress_user ON training_material_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_user ON training_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_training_simulation_attempts_user ON training_simulation_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_training_track_progress_user ON training_track_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_user_stats_user ON training_user_stats(user_id);

-- Índices para CRM
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline ON crm_leads(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_team ON crm_leads(team_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_history_lead ON crm_lead_history(lead_id);

-- Índices para vendas e metas
CREATE INDEX IF NOT EXISTS idx_revenue_records_user_date ON revenue_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_revenue_records_team_date ON revenue_records(team_id, date);
CREATE INDEX IF NOT EXISTS idx_executed_records_user_date ON executed_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_executed_records_team_date ON executed_records(team_id, date);

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_profiles_team_department ON profiles(team_id, department);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- 7. Otimizar função is_approved_user para melhor performance
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    false
  );
$$;