
-- =====================================================
-- SECURITY FIX: Corrigir políticas RLS vulneráveis
-- =====================================================

-- 1. PATIENT_DATA: Restringir acesso apenas para admins
-- Remove a política permissiva que permite qualquer usuário autenticado ver dados
DROP POLICY IF EXISTS "Members can view patient_data" ON public.patient_data;

-- Criar política restritiva - apenas admins podem ver dados de pacientes
CREATE POLICY "Only admins can view patient_data" 
ON public.patient_data 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. EXECUTED_RECORDS: Restringir visualização de dados sensíveis
-- Usuários só podem ver seus próprios registros ou se forem admin
DROP POLICY IF EXISTS "Team members can view team executed records" ON public.executed_records;

CREATE POLICY "Users can view own executed records" 
ON public.executed_records 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR attributed_to_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 3. REVENUE_RECORDS: Restringir acesso a dados financeiros
-- Usuários só podem ver seus próprios registros de receita
DROP POLICY IF EXISTS "Team members can view team revenue" ON public.revenue_records;

CREATE POLICY "Users can view own revenue records" 
ON public.revenue_records 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR attributed_to_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 4. REFERRAL_LEADS: Limpar políticas duplicadas e restringir acesso
-- Remove políticas duplicadas
DROP POLICY IF EXISTS "Users can view own or assigned leads" ON public.referral_leads;
DROP POLICY IF EXISTS "referral_leads_select_own" ON public.referral_leads;

-- Criar política unificada para SELECT
CREATE POLICY "Users can view their registered or assigned leads" 
ON public.referral_leads 
FOR SELECT 
TO authenticated
USING (
  registered_by = auth.uid() 
  OR assigned_to = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

-- 5. INDIVIDUAL_GOALS: Restringir para que usuários vejam apenas suas próprias metas
DROP POLICY IF EXISTS "Team members can view team goals" ON public.individual_goals;

CREATE POLICY "Users can view own goals or admins view all" 
ON public.individual_goals 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

-- 6. CONTESTATIONS: Restringir para criador e admin apenas
DROP POLICY IF EXISTS "Users can view contestations from their team" ON public.contestations;

CREATE POLICY "Users can view own contestations" 
ON public.contestations 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

-- 7. NOTIFICATIONS: Restringir para próprio usuário apenas
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can only view their own notifications" 
ON public.notifications 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND team_id IN (
    SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
  ) AND user_id IS NULL)
  OR public.has_role(auth.uid(), 'admin')
);

-- 8. CANCELLATIONS: Já está correto, mas vamos garantir consistência
-- As políticas existentes já restringem por user_id ou retained_by

-- 9. USER_ACHIEVEMENTS: Manter visibilidade de equipe mas garantir auth
-- A visibilidade de conquistas é intencional para gamificação
-- Apenas ajustar para garantir que precisa estar autenticado
DROP POLICY IF EXISTS "Team members can view team achievements" ON public.user_achievements;

CREATE POLICY "Authenticated users can view team achievements" 
ON public.user_achievements 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 10. Criar função de auditoria para acessos sensíveis (opcional para futuro)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_log 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Sistema pode inserir logs (via service role)
CREATE POLICY "System can insert audit logs" 
ON public.audit_log 
FOR INSERT 
TO authenticated
WITH CHECK (true);
