
-- Corrigir política de audit_log para não usar WITH CHECK (true)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- Criar política mais restritiva - apenas usuários autenticados podem inserir logs sobre si mesmos
CREATE POLICY "Users can insert audit logs for their actions" 
ON public.audit_log 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());
