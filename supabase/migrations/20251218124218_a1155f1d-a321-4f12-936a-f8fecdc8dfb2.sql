-- =============================================
-- FIX SECURITY: Add explicit auth.uid() IS NOT NULL to ALL tables
-- =============================================

-- 1. CONTESTATIONS TABLE
DROP POLICY IF EXISTS "Users can view contestations from their team" ON public.contestations;
CREATE POLICY "Users can view contestations from their team" 
ON public.contestations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2. REVENUE_RECORDS TABLE
DROP POLICY IF EXISTS "Team members can view team revenue" ON public.revenue_records;
CREATE POLICY "Team members can view team revenue" 
ON public.revenue_records 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 3. NPS_RECORDS TABLE
DROP POLICY IF EXISTS "Team members can view team NPS" ON public.nps_records;
CREATE POLICY "Team members can view team NPS" 
ON public.nps_records 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 4. NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id
    OR team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
);

-- 5. USER_ROLES TABLE - Fix SELECT policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 6. INDIVIDUAL_GOALS TABLE
DROP POLICY IF EXISTS "Team members can view team goals" ON public.individual_goals;
CREATE POLICY "Team members can view team goals" 
ON public.individual_goals 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 7. REFERRAL_RECORDS TABLE
DROP POLICY IF EXISTS "Team members can view team referrals" ON public.referral_records;
CREATE POLICY "Team members can view team referrals" 
ON public.referral_records 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 8. TESTIMONIAL_RECORDS TABLE
DROP POLICY IF EXISTS "Team members can view team testimonials" ON public.testimonial_records;
CREATE POLICY "Team members can view team testimonials" 
ON public.testimonial_records 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 9. OTHER_INDICATORS TABLE
DROP POLICY IF EXISTS "Team members can view team indicators" ON public.other_indicators;
CREATE POLICY "Team members can view team indicators" 
ON public.other_indicators 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 10. CARDS TABLE
DROP POLICY IF EXISTS "Team members can view team cards" ON public.cards;
CREATE POLICY "Team members can view team cards" 
ON public.cards 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 11. SPECIAL_EVENTS TABLE
DROP POLICY IF EXISTS "Team members can view team special events" ON public.special_events;
CREATE POLICY "Team members can view team special events" 
ON public.special_events 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 12. REFERRAL_LEAD_HISTORY TABLE
DROP POLICY IF EXISTS "Team members can view lead history" ON public.referral_lead_history;
CREATE POLICY "Team members can view lead history" 
ON public.referral_lead_history 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    lead_id IN (
      SELECT referral_leads.id
      FROM referral_leads
      WHERE referral_leads.team_id IN (
        SELECT profiles.team_id
        FROM profiles
        WHERE profiles.user_id = auth.uid()
      )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 13. KANBAN_CHECKLIST_PROGRESS TABLE
DROP POLICY IF EXISTS "Team members can view checklist progress for their leads" ON public.kanban_checklist_progress;
CREATE POLICY "Team members can view checklist progress for their leads" 
ON public.kanban_checklist_progress 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    lead_id IN (
      SELECT rl.id
      FROM referral_leads rl
      WHERE rl.team_id IN (
        SELECT p.team_id
        FROM profiles p
        WHERE p.user_id = auth.uid()
      )
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 14. JOURNEY_CHECKLIST_PROGRESS TABLE
DROP POLICY IF EXISTS "Users can view their own checklist progress" ON public.journey_checklist_progress;
CREATE POLICY "Users can view their own checklist progress" 
ON public.journey_checklist_progress 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 15. WINNING_STREAKS TABLE - Already has auth check but restrict to team members
DROP POLICY IF EXISTS "Streak records are viewable by authenticated users" ON public.winning_streaks;
CREATE POLICY "Team members can view winning streaks" 
ON public.winning_streaks 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    team_id IN (
      SELECT profiles.team_id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);