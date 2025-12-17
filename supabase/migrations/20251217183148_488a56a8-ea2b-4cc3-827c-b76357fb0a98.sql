-- Fix additional security issues

-- 1. Add UPDATE policy for cards (admin only)
CREATE POLICY "Admins can update cards" 
ON public.cards 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add UPDATE policy for special_events (admin only)
CREATE POLICY "Admins can update special events" 
ON public.special_events 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict notifications INSERT to only allow notifications for own user/team
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Users can create notifications for their team" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  (user_id = auth.uid()) 
  OR (team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Restrict winning_streaks INSERT to admins only
DROP POLICY IF EXISTS "Authenticated users can insert streak records" ON public.winning_streaks;
CREATE POLICY "Admins can insert streak records" 
ON public.winning_streaks 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Add DELETE policy for user_roles (admin only)
CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Add DELETE policy for individual_goals (own goals only)
CREATE POLICY "Users can delete their own goals" 
ON public.individual_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Add DELETE policy for notifications (own notifications)
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- 8. Add DELETE policy for contestations (pending only, own contestations)
CREATE POLICY "Users can delete their pending contestations" 
ON public.contestations 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND status = 'pending'
);

-- 9. Add UPDATE policies for record tables (admin only for corrections)
CREATE POLICY "Admins can update revenue records" 
ON public.revenue_records 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update NPS records" 
ON public.nps_records 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update referral records" 
ON public.referral_records 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update testimonial records" 
ON public.testimonial_records 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update other indicators" 
ON public.other_indicators 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));