-- Continue security fixes - remaining policies

-- =====================================================
-- SECURITY FIX 7: Predefined Goals - Add audit constraints
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage all predefined goals" ON public.predefined_goals;
DROP POLICY IF EXISTS "Users or admins can view predefined goals" ON public.predefined_goals;
DROP POLICY IF EXISTS "Admins can insert predefined goals" ON public.predefined_goals;
DROP POLICY IF EXISTS "Admins can update predefined goals" ON public.predefined_goals;
DROP POLICY IF EXISTS "Admins can delete predefined goals" ON public.predefined_goals;
DROP POLICY IF EXISTS "Admins can view predefined goals" ON public.predefined_goals;

CREATE POLICY "Users or admins can view predefined goals" 
ON public.predefined_goals 
FOR SELECT 
TO authenticated
USING (
  matched_user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can insert predefined goals" 
ON public.predefined_goals 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update predefined goals" 
ON public.predefined_goals 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete predefined goals" 
ON public.predefined_goals 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SECURITY FIX 8: Referral Lead History - ensure proper access control
-- =====================================================
DROP POLICY IF EXISTS "Users can view history of their leads" ON public.referral_lead_history;
CREATE POLICY "Users can view history of their leads" 
ON public.referral_lead_history 
FOR SELECT 
TO authenticated
USING (
  changed_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.referral_leads rl
    WHERE rl.id = referral_lead_history.lead_id
    AND (rl.registered_by = auth.uid() OR rl.assigned_to = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- =====================================================
-- SECURITY FIX 9: Kanban Checklist Progress - ensure proper access
-- =====================================================
DROP POLICY IF EXISTS "Users can manage their checklist progress" ON public.kanban_checklist_progress;
DROP POLICY IF EXISTS "Users can manage own checklist progress" ON public.kanban_checklist_progress;
DROP POLICY IF EXISTS "Users can view own checklist progress" ON public.kanban_checklist_progress;
DROP POLICY IF EXISTS "Users can insert own checklist progress" ON public.kanban_checklist_progress;
DROP POLICY IF EXISTS "Users can update own checklist progress" ON public.kanban_checklist_progress;

CREATE POLICY "Users can view own checklist progress" 
ON public.kanban_checklist_progress 
FOR SELECT 
TO authenticated
USING (
  completed_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert own checklist progress" 
ON public.kanban_checklist_progress 
FOR INSERT 
TO authenticated
WITH CHECK (completed_by = auth.uid());

CREATE POLICY "Users can update own checklist progress" 
ON public.kanban_checklist_progress 
FOR UPDATE 
TO authenticated
USING (completed_by = auth.uid());

-- =====================================================
-- SECURITY FIX 10: Cancellation History - restrict to relevant users
-- =====================================================
DROP POLICY IF EXISTS "Users can view cancellation history from their team" ON public.cancellation_history;
DROP POLICY IF EXISTS "Users can view own cancellation history" ON public.cancellation_history;

CREATE POLICY "Users can view own cancellation history" 
ON public.cancellation_history 
FOR SELECT 
TO authenticated
USING (
  performed_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.cancellations c
    WHERE c.id = cancellation_history.cancellation_id
    AND (c.user_id = auth.uid() OR c.retained_by = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);