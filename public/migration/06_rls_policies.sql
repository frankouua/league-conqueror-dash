-- =====================================================
-- SCRIPT DE MIGRAÇÃO - PARTE 6: POLÍTICAS RLS
-- Execute após todas as tabelas
-- =====================================================

-- ==================== TEAMS POLICIES ====================
CREATE POLICY "Authenticated users can view teams"
  ON public.teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- ==================== PROFILES POLICIES ====================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view team profiles"
  ON public.profiles FOR SELECT
  USING (team_id = get_my_team_id());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Approved users can read profiles"
  ON public.profiles FOR SELECT
  USING (is_approved_user());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== USER_ROLES POLICIES ====================
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== PREDEFINED_GOALS POLICIES ====================
CREATE POLICY "Authenticated users can view goals"
  ON public.predefined_goals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage goals"
  ON public.predefined_goals FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view their own goals"
  ON public.predefined_goals FOR SELECT
  USING (user_id = auth.uid());

-- ==================== REVENUE_RECORDS POLICIES ====================
CREATE POLICY "Authenticated users can view revenue"
  ON public.revenue_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage revenue"
  ON public.revenue_records FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can insert revenue"
  ON public.revenue_records FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update revenue"
  ON public.revenue_records FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete revenue"
  ON public.revenue_records FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- ==================== EXECUTED_RECORDS POLICIES ====================
CREATE POLICY "Authenticated users can view executed"
  ON public.executed_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage executed"
  ON public.executed_records FOR ALL
  USING (is_admin());

-- ==================== NPS_RECORDS POLICIES ====================
CREATE POLICY "Authenticated users can view NPS"
  ON public.nps_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Team members can insert NPS"
  ON public.nps_records FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update NPS"
  ON public.nps_records FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete NPS"
  ON public.nps_records FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- ==================== TESTIMONIAL_RECORDS POLICIES ====================
CREATE POLICY "Authenticated users can view testimonials"
  ON public.testimonial_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Team members can insert testimonials"
  ON public.testimonial_records FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update testimonials"
  ON public.testimonial_records FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete testimonials"
  ON public.testimonial_records FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- ==================== REFERRAL_RECORDS POLICIES ====================
CREATE POLICY "Authenticated users can view referrals"
  ON public.referral_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Team members can insert referrals"
  ON public.referral_records FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update referrals"
  ON public.referral_records FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete referrals"
  ON public.referral_records FOR DELETE
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- ==================== OTHER_INDICATORS POLICIES ====================
CREATE POLICY "Authenticated users can view indicators"
  ON public.other_indicators FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Team members can insert indicators"
  ON public.other_indicators FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage indicators"
  ON public.other_indicators FOR ALL
  USING (is_admin());

-- ==================== CRM_PIPELINES POLICIES ====================
CREATE POLICY "Authenticated can view pipelines"
  ON public.crm_pipelines FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage pipelines"
  ON public.crm_pipelines FOR ALL
  USING (is_admin());

-- ==================== CRM_STAGES POLICIES ====================
CREATE POLICY "Authenticated can view stages"
  ON public.crm_stages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage stages"
  ON public.crm_stages FOR ALL
  USING (is_admin());

-- ==================== CRM_LEADS POLICIES ====================
CREATE POLICY "Users can view assigned leads"
  ON public.crm_leads FOR SELECT
  USING (auth.uid() = assigned_to);

CREATE POLICY "Users can view team leads"
  ON public.crm_leads FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all leads"
  ON public.crm_leads FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can insert leads"
  ON public.crm_leads FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update accessible leads"
  ON public.crm_leads FOR UPDATE
  USING (
    assigned_to = auth.uid() 
    OR team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)
  );

CREATE POLICY "Admins can delete leads"
  ON public.crm_leads FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- ==================== CRM_LEAD_HISTORY POLICIES ====================
CREATE POLICY "Authenticated can view lead history"
  ON public.crm_lead_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert lead history"
  ON public.crm_lead_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==================== CRM_LEAD_INTERACTIONS POLICIES ====================
CREATE POLICY "Authenticated can view interactions"
  ON public.crm_lead_interactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert interactions"
  ON public.crm_lead_interactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==================== CRM_TASKS POLICIES ====================
CREATE POLICY "Users can view assigned tasks"
  ON public.crm_tasks FOR SELECT
  USING (assigned_to = auth.uid() OR is_admin());

CREATE POLICY "Users can create tasks"
  ON public.crm_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their tasks"
  ON public.crm_tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR is_admin());

-- ==================== CRM_LEAD_TASKS POLICIES ====================
CREATE POLICY "Authenticated can view lead tasks"
  ON public.crm_lead_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can manage lead tasks"
  ON public.crm_lead_tasks FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ==================== NOTIFICATIONS POLICIES ====================
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR team_id = get_my_team_id());

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (is_admin());

-- ==================== CRM_NOTIFICATIONS POLICIES ====================
CREATE POLICY "Users can view their CRM notifications"
  ON public.crm_notifications FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "System can insert CRM notifications"
  ON public.crm_notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their CRM notifications"
  ON public.crm_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ==================== CAMPAIGNS POLICIES ====================
CREATE POLICY "Everyone can view active campaigns"
  ON public.campaigns FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage campaigns"
  ON public.campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== CAMPAIGN_ACTIONS POLICIES ====================
CREATE POLICY "Everyone can view campaign actions"
  ON public.campaign_actions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage campaign actions"
  ON public.campaign_actions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== CAMPAIGN_MATERIALS POLICIES ====================
CREATE POLICY "Everyone can view campaign materials"
  ON public.campaign_materials FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage campaign materials"
  ON public.campaign_materials FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- ==================== ANNOUNCEMENTS POLICIES ====================
CREATE POLICY "Everyone can view active announcements"
  ON public.announcements FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== ANNOUNCEMENT_READS POLICIES ====================
CREATE POLICY "Users can view their read status"
  ON public.announcement_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark as read"
  ON public.announcement_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==================== RFV_CUSTOMERS POLICIES ====================
CREATE POLICY "Authenticated can view RFV"
  ON public.rfv_customers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage RFV"
  ON public.rfv_customers FOR ALL
  USING (is_admin());

-- ==================== REFERRAL_LEADS POLICIES ====================
CREATE POLICY "Users can view team referral leads"
  ON public.referral_leads FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all referral leads"
  ON public.referral_leads FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can insert referral leads"
  ON public.referral_leads FOR INSERT
  WITH CHECK (auth.uid() = registered_by);

CREATE POLICY "Users can update their referral leads"
  ON public.referral_leads FOR UPDATE
  USING (auth.uid() = registered_by OR auth.uid() = assigned_to);

CREATE POLICY "Admins can manage referral leads"
  ON public.referral_leads FOR ALL
  USING (is_admin());

-- ==================== CANCELLATIONS POLICIES ====================
CREATE POLICY "Team can view cancellations"
  ON public.cancellations FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "Admins can manage cancellations"
  ON public.cancellations FOR ALL
  USING (is_admin());

-- ==================== CONTESTATIONS POLICIES ====================
CREATE POLICY "Users can view their contestations"
  ON public.contestations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view team contestations"
  ON public.contestations FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all contestations"
  ON public.contestations FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can create contestations"
  ON public.contestations FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage contestations"
  ON public.contestations FOR ALL
  USING (is_admin());

-- ==================== AUTOMATION_LOGS POLICIES ====================
CREATE POLICY "Admins can view automation logs"
  ON public.automation_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true));

-- ==================== USER_ACHIEVEMENTS POLICIES ====================
CREATE POLICY "Authenticated can view achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ==================== DEPARTMENT_GOALS POLICIES ====================
CREATE POLICY "Authenticated can view department goals"
  ON public.department_goals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage department goals"
  ON public.department_goals FOR ALL
  USING (is_admin());

-- ==================== INDIVIDUAL_GOALS POLICIES ====================
CREATE POLICY "Authenticated can view individual goals"
  ON public.individual_goals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their goals"
  ON public.individual_goals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their goals"
  ON public.individual_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their goals"
  ON public.individual_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all goals"
  ON public.individual_goals FOR ALL
  USING (is_admin());

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
