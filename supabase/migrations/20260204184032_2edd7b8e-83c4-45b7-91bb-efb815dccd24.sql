-- =====================================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS
-- Remove políticas permissivas e garante autenticação
-- =====================================================

-- 1. CONTACTS: Remover políticas muito permissivas
DROP POLICY IF EXISTS "authenticated_users_can_view_contacts" ON public.contacts;
DROP POLICY IF EXISTS "authenticated_users_can_update_contacts" ON public.contacts;

-- Recriar com verificação adequada (apenas usuários aprovados)
CREATE POLICY "approved_users_can_view_contacts" 
ON public.contacts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_approved = true
  )
);

CREATE POLICY "approved_users_can_update_contacts" 
ON public.contacts FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_approved = true
  )
);

-- 2. CANCELLATIONS: Consolidar políticas SELECT para authenticated apenas
DROP POLICY IF EXISTS "Admins can view all cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Admins view all cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Users view own cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Users view team cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "Cancellations visible to owner and admins" ON public.cancellations;
DROP POLICY IF EXISTS "Admins can manage all cancellations" ON public.cancellations;

-- Recriar com TO authenticated
CREATE POLICY "cancellations_select_admin" 
ON public.cancellations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cancellations_select_own" 
ON public.cancellations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "cancellations_select_team" 
ON public.cancellations FOR SELECT TO authenticated
USING (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "cancellations_all_admin" 
ON public.cancellations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. CRM_LEADS: Consolidar políticas SELECT para authenticated
DROP POLICY IF EXISTS "Admins can view all leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Admins view all leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Users view assigned leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Users view team leads" ON public.crm_leads;
DROP POLICY IF EXISTS "CRM leads visible to assigned and team leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.crm_leads;

-- Recriar com TO authenticated
CREATE POLICY "crm_leads_select_admin" 
ON public.crm_leads FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "crm_leads_select_assigned" 
ON public.crm_leads FOR SELECT TO authenticated
USING (auth.uid() = assigned_to);

CREATE POLICY "crm_leads_select_created" 
ON public.crm_leads FOR SELECT TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "crm_leads_select_team" 
ON public.crm_leads FOR SELECT TO authenticated
USING (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "crm_leads_all_admin" 
ON public.crm_leads FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));