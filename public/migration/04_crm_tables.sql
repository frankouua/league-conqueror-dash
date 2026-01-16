-- =====================================================
-- SCRIPT DE MIGRAÇÃO - PARTE 4: TABELAS DO CRM
-- Execute após as tabelas principais
-- =====================================================

-- ==================== CRM_PIPELINES ====================
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  pipeline_type text NOT NULL,
  icon text DEFAULT 'users',
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;

-- ==================== CRM_STAGES ====================
CREATE TABLE IF NOT EXISTS public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  icon text,
  order_index integer NOT NULL DEFAULT 0,
  is_won boolean DEFAULT false,
  is_lost boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sla_hours integer,
  auto_actions jsonb DEFAULT '[]'::jsonb,
  checklist jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_stages_pipeline ON public.crm_stages(pipeline_id);

ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;

-- ==================== CRM_LEADS ====================
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  cpf text,
  prontuario text,
  pipeline_id uuid REFERENCES public.crm_pipelines(id),
  stage_id uuid REFERENCES public.crm_stages(id),
  assigned_to uuid,
  team_id uuid REFERENCES public.teams(id),
  source text,
  source_detail text,
  interested_procedures text[],
  notes text,
  tags text[],
  temperature text DEFAULT 'warm',
  lead_score integer DEFAULT 0,
  estimated_value numeric,
  contract_value numeric,
  budget_score integer DEFAULT 0,
  authority_score integer DEFAULT 0,
  need_score integer DEFAULT 0,
  timing_score integer DEFAULT 0,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  lost_reason_id uuid,
  ai_summary text,
  ai_sentiment text,
  ai_intent text,
  ai_next_action text,
  ai_analyzed_at timestamptz,
  ai_score integer,
  ai_conversion_probability numeric,
  ai_churn_probability numeric,
  churn_risk_level text,
  churn_analyzed_at timestamptz,
  first_contact_at timestamptz,
  last_activity_at timestamptz,
  days_in_stage integer DEFAULT 0,
  total_interactions integer DEFAULT 0,
  is_priority boolean DEFAULT false,
  is_stale boolean DEFAULT false,
  stale_since timestamptz,
  surgery_date date,
  surgery_location text,
  surgery_notes text,
  pre_surgery_checklist_completed boolean DEFAULT false,
  post_surgery_checklist_completed boolean DEFAULT false,
  feegow_id varchar,
  feegow_data jsonb,
  last_feegow_sync timestamptz,
  help_score integer DEFAULT 0,
  help_score_updated_at timestamptz,
  last_procedure_date date,
  last_procedure_name text,
  recurrence_due_date date,
  recurrence_days_overdue integer DEFAULT 0,
  recurrence_group text,
  is_recurrence_lead boolean DEFAULT false,
  nps_score integer,
  nps_category text,
  last_nps_at timestamptz,
  recovery_attempts integer DEFAULT 0,
  recovery_status text,
  last_recovery_at timestamptz,
  gamification_points_total integer DEFAULT 0,
  preferred_contact_time time,
  preferred_contact_day text,
  diet_restrictions text,
  cross_sell_suggestions text[],
  cross_sell_offered boolean DEFAULT false,
  travel_info jsonb,
  companion_info jsonb,
  emergency_contact jsonb,
  needs_travel boolean DEFAULT false,
  travel_organized boolean DEFAULT false,
  needs_weight_loss boolean DEFAULT false,
  initial_weight numeric,
  target_weight numeric,
  current_weight numeric,
  weight_loss_deadline date,
  birth_date date,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_page text,
  referrer_url text,
  escalated boolean DEFAULT false,
  escalated_at timestamptz,
  escalated_to uuid,
  escalation_reason text,
  sla_violated boolean DEFAULT false,
  temperature_updated_at timestamptz,
  stage_changed_at timestamptz,
  coordinator_validated boolean DEFAULT false,
  coordinator_validated_at timestamptz,
  coordinator_validated_by uuid,
  total_discount_percentage numeric,
  discount_percentage numeric,
  discount_amount numeric,
  discount_projects_count integer DEFAULT 0,
  original_value numeric,
  payment_method text,
  payment_installments integer,
  days_without_closing integer DEFAULT 0,
  next_action text,
  next_action_date timestamptz,
  discharge_date date,
  future_letter_written boolean DEFAULT false,
  before_after_photo_delivered boolean DEFAULT false,
  unique_necklace_delivered boolean DEFAULT false,
  testimonial_collected boolean DEFAULT false,
  google_review_requested boolean DEFAULT false,
  discharge_completed boolean DEFAULT false,
  discharge_completed_at timestamptz,
  checklist_total integer DEFAULT 0,
  checklist_completed integer DEFAULT 0,
  checklist_overdue integer DEFAULT 0,
  referral_lead_id uuid,
  patient_data_id uuid,
  rfv_customer_id uuid,
  contact_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE INDEX idx_crm_leads_pipeline ON public.crm_leads(pipeline_id);
CREATE INDEX idx_crm_leads_stage ON public.crm_leads(stage_id);
CREATE INDEX idx_crm_leads_assigned ON public.crm_leads(assigned_to);
CREATE INDEX idx_crm_leads_team ON public.crm_leads(team_id);
CREATE INDEX idx_crm_leads_temperature ON public.crm_leads(temperature);
CREATE INDEX idx_crm_leads_phone ON public.crm_leads(phone);
CREATE INDEX idx_crm_leads_cpf ON public.crm_leads(cpf);
CREATE INDEX idx_crm_leads_email ON public.crm_leads(email);
CREATE INDEX idx_crm_leads_created_at ON public.crm_leads(created_at);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- ==================== CRM_LEAD_HISTORY ====================
CREATE TABLE IF NOT EXISTS public.crm_lead_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  title text,
  description text,
  from_stage_id uuid REFERENCES public.crm_stages(id),
  to_stage_id uuid REFERENCES public.crm_stages(id),
  from_pipeline_id uuid REFERENCES public.crm_pipelines(id),
  to_pipeline_id uuid REFERENCES public.crm_pipelines(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  ai_analysis jsonb,
  performed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_lead_history_lead ON public.crm_lead_history(lead_id);
CREATE INDEX idx_crm_lead_history_created ON public.crm_lead_history(created_at);

ALTER TABLE public.crm_lead_history ENABLE ROW LEVEL SECURITY;

-- ==================== CRM_LEAD_INTERACTIONS ====================
CREATE TABLE IF NOT EXISTS public.crm_lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text,
  sentiment text,
  intention text,
  outcome text,
  next_action text,
  duration_seconds integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_lead_interactions_lead ON public.crm_lead_interactions(lead_id);

ALTER TABLE public.crm_lead_interactions ENABLE ROW LEVEL SECURITY;

-- ==================== CRM_TASKS ====================
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'follow_up',
  priority text DEFAULT 'medium',
  due_date timestamptz NOT NULL,
  reminder_at timestamptz,
  assigned_to uuid NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  is_overdue boolean DEFAULT false,
  escalated boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_tasks_lead ON public.crm_tasks(lead_id);
CREATE INDEX idx_crm_tasks_assigned ON public.crm_tasks(assigned_to);
CREATE INDEX idx_crm_tasks_due_date ON public.crm_tasks(due_date);
CREATE INDEX idx_crm_tasks_completed ON public.crm_tasks(is_completed);

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

-- ==================== CRM_LEAD_TASKS ====================
CREATE TABLE IF NOT EXISTS public.crm_lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  template_id uuid,
  task_code text,
  task_name text NOT NULL,
  task_description text,
  responsible_role text,
  status text DEFAULT 'pending',
  assigned_to uuid,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  requires_coordinator_validation boolean DEFAULT false,
  validated_by uuid,
  validated_at timestamptz,
  validation_notes text,
  escalated boolean DEFAULT false,
  escalated_at timestamptz,
  escalated_to text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_crm_lead_tasks_lead ON public.crm_lead_tasks(lead_id);
CREATE INDEX idx_crm_lead_tasks_assigned ON public.crm_lead_tasks(assigned_to);
CREATE INDEX idx_crm_lead_tasks_status ON public.crm_lead_tasks(status);

ALTER TABLE public.crm_lead_tasks ENABLE ROW LEVEL SECURITY;

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  team_id uuid REFERENCES public.teams(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_team ON public.notifications(team_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==================== CRM_NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS public.crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  team_id uuid REFERENCES public.teams(id),
  lead_id uuid REFERENCES public.crm_leads(id),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_notifications_user ON public.crm_notifications(user_id);
CREATE INDEX idx_crm_notifications_lead ON public.crm_notifications(lead_id);

ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

-- Verificar tabelas CRM criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'crm%' ORDER BY tablename;
