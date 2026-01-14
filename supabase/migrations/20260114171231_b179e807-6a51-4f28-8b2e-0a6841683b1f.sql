-- =====================================================
-- MIGRAÇÃO DE SEGURANÇA: Proteger credenciais de API
-- Apenas admins podem ver configurações sensíveis
-- =====================================================

-- Função helper para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- =====================================================
-- WHATSAPP_CONFIG - Apenas admins
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view whatsapp config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Admins can manage whatsapp config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Only admins can view whatsapp config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Only admins can insert whatsapp config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Only admins can update whatsapp config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Only admins can delete whatsapp config" ON public.whatsapp_config;

CREATE POLICY "Only admins can view whatsapp config"
  ON public.whatsapp_config FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Only admins can insert whatsapp config"
  ON public.whatsapp_config FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update whatsapp config"
  ON public.whatsapp_config FOR UPDATE
  USING (public.is_admin_user());

CREATE POLICY "Only admins can delete whatsapp config"
  ON public.whatsapp_config FOR DELETE
  USING (public.is_admin_user());

-- =====================================================
-- EMAIL_CONFIG - Apenas admins
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view email config" ON public.email_config;
DROP POLICY IF EXISTS "Admins can manage email config" ON public.email_config;
DROP POLICY IF EXISTS "Only admins can view email config" ON public.email_config;
DROP POLICY IF EXISTS "Only admins can insert email config" ON public.email_config;
DROP POLICY IF EXISTS "Only admins can update email config" ON public.email_config;
DROP POLICY IF EXISTS "Only admins can delete email config" ON public.email_config;

CREATE POLICY "Only admins can view email config"
  ON public.email_config FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Only admins can insert email config"
  ON public.email_config FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update email config"
  ON public.email_config FOR UPDATE
  USING (public.is_admin_user());

CREATE POLICY "Only admins can delete email config"
  ON public.email_config FOR DELETE
  USING (public.is_admin_user());

-- =====================================================
-- SMS_CONFIG - Apenas admins
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view sms config" ON public.sms_config;
DROP POLICY IF EXISTS "Admins can manage sms config" ON public.sms_config;
DROP POLICY IF EXISTS "Only admins can view sms config" ON public.sms_config;
DROP POLICY IF EXISTS "Only admins can insert sms config" ON public.sms_config;
DROP POLICY IF EXISTS "Only admins can update sms config" ON public.sms_config;
DROP POLICY IF EXISTS "Only admins can delete sms config" ON public.sms_config;

CREATE POLICY "Only admins can view sms config"
  ON public.sms_config FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Only admins can insert sms config"
  ON public.sms_config FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update sms config"
  ON public.sms_config FOR UPDATE
  USING (public.is_admin_user());

CREATE POLICY "Only admins can delete sms config"
  ON public.sms_config FOR DELETE
  USING (public.is_admin_user());

-- =====================================================
-- CONTRACT_CONFIG - Apenas admins
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view contract config" ON public.contract_config;
DROP POLICY IF EXISTS "Admins can manage contract config" ON public.contract_config;
DROP POLICY IF EXISTS "Only admins can view contract config" ON public.contract_config;
DROP POLICY IF EXISTS "Only admins can insert contract config" ON public.contract_config;
DROP POLICY IF EXISTS "Only admins can update contract config" ON public.contract_config;
DROP POLICY IF EXISTS "Only admins can delete contract config" ON public.contract_config;

CREATE POLICY "Only admins can view contract config"
  ON public.contract_config FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Only admins can insert contract config"
  ON public.contract_config FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update contract config"
  ON public.contract_config FOR UPDATE
  USING (public.is_admin_user());

CREATE POLICY "Only admins can delete contract config"
  ON public.contract_config FOR DELETE
  USING (public.is_admin_user());

-- =====================================================
-- CRM_WEBHOOKS - Apenas admins
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view webhooks" ON public.crm_webhooks;
DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.crm_webhooks;
DROP POLICY IF EXISTS "Only admins can view webhooks" ON public.crm_webhooks;
DROP POLICY IF EXISTS "Only admins can insert webhooks" ON public.crm_webhooks;
DROP POLICY IF EXISTS "Only admins can update webhooks" ON public.crm_webhooks;
DROP POLICY IF EXISTS "Only admins can delete webhooks" ON public.crm_webhooks;

CREATE POLICY "Only admins can view webhooks"
  ON public.crm_webhooks FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Only admins can insert webhooks"
  ON public.crm_webhooks FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Only admins can update webhooks"
  ON public.crm_webhooks FOR UPDATE
  USING (public.is_admin_user());

CREATE POLICY "Only admins can delete webhooks"
  ON public.crm_webhooks FOR DELETE
  USING (public.is_admin_user());