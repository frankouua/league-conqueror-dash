-- Corrigir últimas políticas permissivas

-- lead_recurrence_history - restringir a admins e comercial
DROP POLICY IF EXISTS "Authenticated users can manage recurrence history" ON public.lead_recurrence_history;

CREATE POLICY "Admins can manage recurrence history" 
  ON public.lead_recurrence_history 
  FOR ALL 
  USING (
    public.is_admin() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND position IN ('gerente', 'coordenador')
    )
    OR EXISTS (
      SELECT 1 FROM crm_leads 
      WHERE id = lead_recurrence_history.lead_id 
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND position IN ('gerente', 'coordenador')
    )
  );

-- recurrence_notification_logs - restringir a admins
DROP POLICY IF EXISTS "Authenticated users can insert notification logs" ON public.recurrence_notification_logs;

CREATE POLICY "Admins and system can insert notification logs" 
  ON public.recurrence_notification_logs 
  FOR INSERT 
  WITH CHECK (
    public.is_admin() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND position IN ('gerente', 'coordenador')
    )
  );

CREATE POLICY "Admins can view notification logs" 
  ON public.recurrence_notification_logs 
  FOR SELECT 
  USING (public.is_admin());