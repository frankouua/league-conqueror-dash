-- Corrigir políticas duplicadas em protocols que ainda existem
DROP POLICY IF EXISTS "Vendedores podem criar protocolos" ON public.protocols;
DROP POLICY IF EXISTS "Vendedores podem editar protocolos" ON public.protocols;

-- Corrigir políticas ALL muito permissivas - substituir por políticas específicas
-- protocol_recurrence_tracking
DROP POLICY IF EXISTS "System can manage recurrence" ON public.protocol_recurrence_tracking;

CREATE POLICY "Admins podem gerenciar recurrence tracking"
ON public.protocol_recurrence_tracking FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- protocol_referrals
DROP POLICY IF EXISTS "System can manage referrals" ON public.protocol_referrals;

CREATE POLICY "Admins podem gerenciar referrals"
ON public.protocol_referrals FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- protocol_suggestions
DROP POLICY IF EXISTS "System can manage suggestions" ON public.protocol_suggestions;

CREATE POLICY "Admins podem gerenciar suggestions"
ON public.protocol_suggestions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());