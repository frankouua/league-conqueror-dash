-- =====================================================
-- SCRIPT PARA REMOVER POLÍTICAS DE MIGRAÇÃO
-- Execute APÓS concluir a migração para restaurar segurança
-- =====================================================

-- Remover todas as políticas de migração
DROP POLICY IF EXISTS "migration_read_teams" ON public.teams;
DROP POLICY IF EXISTS "migration_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "migration_read_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "migration_read_predefined_goals" ON public.predefined_goals;
DROP POLICY IF EXISTS "migration_read_revenue_records" ON public.revenue_records;
DROP POLICY IF EXISTS "migration_read_executed_records" ON public.executed_records;
DROP POLICY IF EXISTS "migration_read_nps_records" ON public.nps_records;
DROP POLICY IF EXISTS "migration_read_testimonial_records" ON public.testimonial_records;
DROP POLICY IF EXISTS "migration_read_referral_records" ON public.referral_records;
DROP POLICY IF EXISTS "migration_read_other_indicators" ON public.other_indicators;
DROP POLICY IF EXISTS "migration_read_crm_pipelines" ON public.crm_pipelines;
DROP POLICY IF EXISTS "migration_read_crm_stages" ON public.crm_stages;
DROP POLICY IF EXISTS "migration_read_crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "migration_read_crm_lead_history" ON public.crm_lead_history;
DROP POLICY IF EXISTS "migration_read_crm_lead_interactions" ON public.crm_lead_interactions;
DROP POLICY IF EXISTS "migration_read_crm_tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "migration_read_crm_lead_tasks" ON public.crm_lead_tasks;
DROP POLICY IF EXISTS "migration_read_notifications" ON public.notifications;
DROP POLICY IF EXISTS "migration_read_crm_notifications" ON public.crm_notifications;
DROP POLICY IF EXISTS "migration_read_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "migration_read_campaign_actions" ON public.campaign_actions;
DROP POLICY IF EXISTS "migration_read_campaign_materials" ON public.campaign_materials;
DROP POLICY IF EXISTS "migration_read_announcements" ON public.announcements;
DROP POLICY IF EXISTS "migration_read_announcement_reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "migration_read_rfv_customers" ON public.rfv_customers;
DROP POLICY IF EXISTS "migration_read_referral_leads" ON public.referral_leads;
DROP POLICY IF EXISTS "migration_read_cancellations" ON public.cancellations;
DROP POLICY IF EXISTS "migration_read_contestations" ON public.contestations;
DROP POLICY IF EXISTS "migration_read_automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "migration_read_user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "migration_read_department_goals" ON public.department_goals;
DROP POLICY IF EXISTS "migration_read_individual_goals" ON public.individual_goals;
DROP POLICY IF EXISTS "migration_read_cards" ON public.cards;
DROP POLICY IF EXISTS "migration_read_contacts" ON public.contacts;
DROP POLICY IF EXISTS "migration_read_contact_rfv_metrics" ON public.contact_rfv_metrics;
DROP POLICY IF EXISTS "migration_read_contact_timeline" ON public.contact_timeline;
DROP POLICY IF EXISTS "migration_read_crm_automations" ON public.crm_automations;
DROP POLICY IF EXISTS "migration_read_crm_automation_logs" ON public.crm_automation_logs;
DROP POLICY IF EXISTS "migration_read_crm_cadences" ON public.crm_cadences;
DROP POLICY IF EXISTS "migration_read_crm_cadence_executions" ON public.crm_cadence_executions;
DROP POLICY IF EXISTS "migration_read_crm_chat_messages" ON public.crm_chat_messages;
DROP POLICY IF EXISTS "migration_read_ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "migration_read_ai_messages" ON public.ai_messages;
DROP POLICY IF EXISTS "migration_read_audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "migration_read_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "migration_read_calendar_event_invitations" ON public.calendar_event_invitations;

-- Desativar modo de migração
CREATE OR REPLACE FUNCTION public.is_migration_mode()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false; -- Migração desativada
$$;

-- Verificar políticas restantes (deve mostrar só as originais)
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND policyname LIKE 'migration_%'
ORDER BY tablename;
