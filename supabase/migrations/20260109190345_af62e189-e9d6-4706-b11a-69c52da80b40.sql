-- REMOÇÃO DE TODAS AS POLÍTICAS PÚBLICAS RESTANTES

-- 1. training_materials - remover política pública
DROP POLICY IF EXISTS "Anyone can view active materials" ON training_materials;

-- 2. department_quantity_goals - remover políticas públicas
DROP POLICY IF EXISTS "Everyone can view quantity goals" ON department_quantity_goals;
DROP POLICY IF EXISTS "approved_users_can_read_department_quantity_goals" ON department_quantity_goals;

-- 3. seller_department_goals - remover política pública
DROP POLICY IF EXISTS "Users can view all seller department goals" ON seller_department_goals;

-- 4. crm_lead_checklist_progress - corrigir política pública
DROP POLICY IF EXISTS "Users can view checklist progress" ON crm_lead_checklist_progress;
CREATE POLICY "Authenticated users can view checklist progress"
ON crm_lead_checklist_progress FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. training_user_stats - corrigir leaderboard para usuários autenticados
DROP POLICY IF EXISTS "Users can view leaderboard stats" ON training_user_stats;
CREATE POLICY "Authenticated users can view leaderboard stats"
ON training_user_stats FOR SELECT
USING (auth.uid() IS NOT NULL AND public.is_approved_user());