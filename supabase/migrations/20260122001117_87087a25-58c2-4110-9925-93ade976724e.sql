-- =====================================================
-- POLÍTICAS RLS TEMPORÁRIAS PARA MIGRAÇÃO
-- Execute antes da migração, remova depois!
-- =====================================================

-- Criar função para verificar se é migração (usando header ou flag)
CREATE OR REPLACE FUNCTION public.is_migration_mode()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true; -- Temporariamente habilitado para migração
$$;

-- TEAMS
CREATE POLICY "migration_read_teams" ON public.teams FOR SELECT USING (is_migration_mode());

-- PROFILES
CREATE POLICY "migration_read_profiles" ON public.profiles FOR SELECT USING (is_migration_mode());

-- USER_ROLES
CREATE POLICY "migration_read_user_roles" ON public.user_roles FOR SELECT USING (is_migration_mode());

-- PREDEFINED_GOALS
CREATE POLICY "migration_read_predefined_goals" ON public.predefined_goals FOR SELECT USING (is_migration_mode());

-- REVENUE_RECORDS
CREATE POLICY "migration_read_revenue_records" ON public.revenue_records FOR SELECT USING (is_migration_mode());

-- EXECUTED_RECORDS
CREATE POLICY "migration_read_executed_records" ON public.executed_records FOR SELECT USING (is_migration_mode());

-- NPS_RECORDS
CREATE POLICY "migration_read_nps_records" ON public.nps_records FOR SELECT USING (is_migration_mode());

-- TESTIMONIAL_RECORDS
CREATE POLICY "migration_read_testimonial_records" ON public.testimonial_records FOR SELECT USING (is_migration_mode());

-- REFERRAL_RECORDS
CREATE POLICY "migration_read_referral_records" ON public.referral_records FOR SELECT USING (is_migration_mode());

-- OTHER_INDICATORS
CREATE POLICY "migration_read_other_indicators" ON public.other_indicators FOR SELECT USING (is_migration_mode());

-- CRM_PIPELINES
CREATE POLICY "migration_read_crm_pipelines" ON public.crm_pipelines FOR SELECT USING (is_migration_mode());

-- CRM_STAGES
CREATE POLICY "migration_read_crm_stages" ON public.crm_stages FOR SELECT USING (is_migration_mode());

-- CRM_LEADS
CREATE POLICY "migration_read_crm_leads" ON public.crm_leads FOR SELECT USING (is_migration_mode());

-- CRM_LEAD_HISTORY
CREATE POLICY "migration_read_crm_lead_history" ON public.crm_lead_history FOR SELECT USING (is_migration_mode());

-- CRM_LEAD_INTERACTIONS
CREATE POLICY "migration_read_crm_lead_interactions" ON public.crm_lead_interactions FOR SELECT USING (is_migration_mode());

-- CRM_TASKS
CREATE POLICY "migration_read_crm_tasks" ON public.crm_tasks FOR SELECT USING (is_migration_mode());

-- CRM_LEAD_TASKS
CREATE POLICY "migration_read_crm_lead_tasks" ON public.crm_lead_tasks FOR SELECT USING (is_migration_mode());

-- NOTIFICATIONS
CREATE POLICY "migration_read_notifications" ON public.notifications FOR SELECT USING (is_migration_mode());

-- CRM_NOTIFICATIONS
CREATE POLICY "migration_read_crm_notifications" ON public.crm_notifications FOR SELECT USING (is_migration_mode());

-- CAMPAIGNS
CREATE POLICY "migration_read_campaigns" ON public.campaigns FOR SELECT USING (is_migration_mode());

-- CAMPAIGN_ACTIONS
CREATE POLICY "migration_read_campaign_actions" ON public.campaign_actions FOR SELECT USING (is_migration_mode());

-- CAMPAIGN_MATERIALS
CREATE POLICY "migration_read_campaign_materials" ON public.campaign_materials FOR SELECT USING (is_migration_mode());

-- ANNOUNCEMENTS
CREATE POLICY "migration_read_announcements" ON public.announcements FOR SELECT USING (is_migration_mode());

-- ANNOUNCEMENT_READS
CREATE POLICY "migration_read_announcement_reads" ON public.announcement_reads FOR SELECT USING (is_migration_mode());

-- RFV_CUSTOMERS
CREATE POLICY "migration_read_rfv_customers" ON public.rfv_customers FOR SELECT USING (is_migration_mode());

-- REFERRAL_LEADS
CREATE POLICY "migration_read_referral_leads" ON public.referral_leads FOR SELECT USING (is_migration_mode());

-- CANCELLATIONS
CREATE POLICY "migration_read_cancellations" ON public.cancellations FOR SELECT USING (is_migration_mode());

-- CONTESTATIONS
CREATE POLICY "migration_read_contestations" ON public.contestations FOR SELECT USING (is_migration_mode());

-- AUTOMATION_LOGS
CREATE POLICY "migration_read_automation_logs" ON public.automation_logs FOR SELECT USING (is_migration_mode());

-- USER_ACHIEVEMENTS
CREATE POLICY "migration_read_user_achievements" ON public.user_achievements FOR SELECT USING (is_migration_mode());

-- DEPARTMENT_GOALS
CREATE POLICY "migration_read_department_goals" ON public.department_goals FOR SELECT USING (is_migration_mode());

-- INDIVIDUAL_GOALS
CREATE POLICY "migration_read_individual_goals" ON public.individual_goals FOR SELECT USING (is_migration_mode());

-- CARDS
CREATE POLICY "migration_read_cards" ON public.cards FOR SELECT USING (is_migration_mode());

-- CONTACTS
CREATE POLICY "migration_read_contacts" ON public.contacts FOR SELECT USING (is_migration_mode());

-- CONTACT_RFV_METRICS
CREATE POLICY "migration_read_contact_rfv_metrics" ON public.contact_rfv_metrics FOR SELECT USING (is_migration_mode());

-- CONTACT_TIMELINE
CREATE POLICY "migration_read_contact_timeline" ON public.contact_timeline FOR SELECT USING (is_migration_mode());

-- CRM_AUTOMATIONS
CREATE POLICY "migration_read_crm_automations" ON public.crm_automations FOR SELECT USING (is_migration_mode());

-- CRM_AUTOMATION_LOGS
CREATE POLICY "migration_read_crm_automation_logs" ON public.crm_automation_logs FOR SELECT USING (is_migration_mode());

-- CRM_CADENCES
CREATE POLICY "migration_read_crm_cadences" ON public.crm_cadences FOR SELECT USING (is_migration_mode());

-- CRM_CADENCE_EXECUTIONS
CREATE POLICY "migration_read_crm_cadence_executions" ON public.crm_cadence_executions FOR SELECT USING (is_migration_mode());

-- CRM_CHAT_MESSAGES
CREATE POLICY "migration_read_crm_chat_messages" ON public.crm_chat_messages FOR SELECT USING (is_migration_mode());

-- AI_CONVERSATIONS
CREATE POLICY "migration_read_ai_conversations" ON public.ai_conversations FOR SELECT USING (is_migration_mode());

-- AI_MESSAGES
CREATE POLICY "migration_read_ai_messages" ON public.ai_messages FOR SELECT USING (is_migration_mode());

-- AUDIT_LOG
CREATE POLICY "migration_read_audit_log" ON public.audit_log FOR SELECT USING (is_migration_mode());

-- CALENDAR_EVENTS
CREATE POLICY "migration_read_calendar_events" ON public.calendar_events FOR SELECT USING (is_migration_mode());

-- CALENDAR_EVENT_INVITATIONS
CREATE POLICY "migration_read_calendar_event_invitations" ON public.calendar_event_invitations FOR SELECT USING (is_migration_mode());