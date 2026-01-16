-- =====================================================
-- SCRIPT DE MIGRAÇÃO - PARTE 7: TRIGGERS
-- Execute após as políticas RLS
-- =====================================================

-- ==================== TRIGGER: AUTO UPDATE TIMESTAMPS ====================

-- Profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Predefined Goals
CREATE TRIGGER update_predefined_goals_updated_at
  BEFORE UPDATE ON public.predefined_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Individual Goals
CREATE TRIGGER update_individual_goals_updated_at
  BEFORE UPDATE ON public.individual_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Department Goals
CREATE TRIGGER update_department_goals_updated_at
  BEFORE UPDATE ON public.department_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- CRM Pipelines
CREATE TRIGGER update_crm_pipelines_updated_at
  BEFORE UPDATE ON public.crm_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- CRM Stages
CREATE TRIGGER update_crm_stages_updated_at
  BEFORE UPDATE ON public.crm_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- CRM Leads
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- CRM Tasks
CREATE TRIGGER update_crm_tasks_updated_at
  BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- CRM Lead Tasks
CREATE TRIGGER update_crm_lead_tasks_updated_at
  BEFORE UPDATE ON public.crm_lead_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Campaigns
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Announcements
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RFV Customers
CREATE TRIGGER update_rfv_customers_updated_at
  BEFORE UPDATE ON public.rfv_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Referral Leads
CREATE TRIGGER update_referral_leads_updated_at
  BEFORE UPDATE ON public.referral_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cancellations
CREATE TRIGGER update_cancellations_updated_at
  BEFORE UPDATE ON public.cancellations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Contestations
CREATE TRIGGER update_contestations_updated_at
  BEFORE UPDATE ON public.contestations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== TRIGGER: CREATE PROFILE ON NEW USER ====================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verificar triggers criados
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
