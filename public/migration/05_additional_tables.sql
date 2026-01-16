-- =====================================================
-- SCRIPT DE MIGRAÇÃO - PARTE 5: TABELAS ADICIONAIS
-- Execute após as tabelas do CRM
-- =====================================================

-- ==================== CAMPAIGNS ====================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  goal_value numeric,
  goal_description text,
  goal_metric text,
  prize_value numeric,
  prize_description text,
  is_active boolean NOT NULL DEFAULT true,
  is_template boolean NOT NULL DEFAULT false,
  template_id uuid REFERENCES public.campaigns(id),
  alert_days_before integer DEFAULT 3,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- ==================== CAMPAIGN_ACTIONS ====================
CREATE TABLE IF NOT EXISTS public.campaign_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_actions ENABLE ROW LEVEL SECURITY;

-- ==================== CAMPAIGN_MATERIALS ====================
CREATE TABLE IF NOT EXISTS public.campaign_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  material_type text NOT NULL,
  url text,
  content text,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_materials ENABLE ROW LEVEL SECURITY;

-- ==================== ANNOUNCEMENTS ====================
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  is_active boolean NOT NULL DEFAULT true,
  target_type text,
  target_team_id uuid REFERENCES public.teams(id),
  target_user_id uuid,
  send_email boolean DEFAULT false,
  send_whatsapp boolean DEFAULT false,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ==================== ANNOUNCEMENT_READS ====================
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- ==================== RFV_CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS public.rfv_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  cpf text,
  prontuario text,
  feegow_id text,
  last_purchase_date date,
  first_purchase_date date,
  total_purchases integer DEFAULT 0,
  total_value numeric DEFAULT 0,
  avg_ticket numeric,
  recency_score integer DEFAULT 0,
  frequency_score integer DEFAULT 0,
  monetary_score integer DEFAULT 0,
  rfv_score integer DEFAULT 0,
  segment text,
  last_procedure text,
  preferred_procedure text,
  tags text[],
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rfv_customers_phone ON public.rfv_customers(phone);
CREATE INDEX idx_rfv_customers_cpf ON public.rfv_customers(cpf);
CREATE INDEX idx_rfv_customers_segment ON public.rfv_customers(segment);

ALTER TABLE public.rfv_customers ENABLE ROW LEVEL SECURITY;

-- ==================== REFERRAL_LEADS ====================
CREATE TABLE IF NOT EXISTS public.referral_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  referrer_name text NOT NULL,
  referrer_phone text,
  referrer_email text,
  referred_name text NOT NULL,
  referred_phone text NOT NULL,
  referred_email text,
  interested_procedure text,
  notes text,
  status text DEFAULT 'nova',
  assigned_to uuid,
  registered_by uuid NOT NULL,
  last_contact_at timestamptz,
  converted_at timestamptz,
  contract_value numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_referral_leads_team ON public.referral_leads(team_id);
CREATE INDEX idx_referral_leads_status ON public.referral_leads(status);
CREATE INDEX idx_referral_leads_assigned ON public.referral_leads(assigned_to);

ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;

-- ==================== CANCELLATIONS ====================
CREATE TABLE IF NOT EXISTS public.cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL,
  patient_name text NOT NULL,
  patient_phone text,
  patient_email text,
  procedure_name text NOT NULL,
  contract_value numeric NOT NULL,
  fine_percentage numeric NOT NULL DEFAULT 30,
  fine_amount numeric,
  refund_amount numeric,
  reason cancellation_reason NOT NULL,
  reason_details text,
  status cancellation_status NOT NULL DEFAULT 'pending_retention',
  retention_attempts integer NOT NULL DEFAULT 0,
  retention_notes text,
  retained_by uuid,
  retained_at timestamptz,
  apply_fine boolean NOT NULL DEFAULT true,
  refund_deadline date,
  refund_completed boolean DEFAULT false,
  refund_completed_at timestamptz,
  credit_valid_until date,
  credit_used_at timestamptz,
  credit_used_for text,
  original_sale_date date,
  cancellation_request_date date NOT NULL DEFAULT CURRENT_DATE,
  contract_signed boolean DEFAULT false,
  contract_url text,
  contact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cancellations_team ON public.cancellations(team_id);
CREATE INDEX idx_cancellations_status ON public.cancellations(status);

ALTER TABLE public.cancellations ENABLE ROW LEVEL SECURITY;

-- ==================== CONTESTATIONS ====================
CREATE TABLE IF NOT EXISTS public.contestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL,
  record_type text NOT NULL,
  record_id uuid,
  description text NOT NULL,
  evidence_url text,
  status contestation_status NOT NULL DEFAULT 'pending',
  response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contestations_team ON public.contestations(team_id);
CREATE INDEX idx_contestations_user ON public.contestations(user_id);
CREATE INDEX idx_contestations_status ON public.contestations(status);

ALTER TABLE public.contestations ENABLE ROW LEVEL SECURITY;

-- ==================== AUTOMATION_LOGS ====================
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  results jsonb,
  errors text[],
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- ==================== USER_ACHIEVEMENTS ====================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  description text,
  icon text,
  points_value integer DEFAULT 0,
  month integer,
  year integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_team ON public.user_achievements(team_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- ==================== DEPARTMENT_GOALS ====================
CREATE TABLE IF NOT EXISTS public.department_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name text NOT NULL,
  meta1_goal numeric NOT NULL DEFAULT 0,
  meta2_goal numeric NOT NULL DEFAULT 0,
  meta3_goal numeric NOT NULL DEFAULT 0,
  month integer NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_name, month, year)
);

ALTER TABLE public.department_goals ENABLE ROW LEVEL SECURITY;

-- ==================== INDIVIDUAL_GOALS (alias for predefined_goals) ====================
CREATE TABLE IF NOT EXISTS public.individual_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  month integer NOT NULL,
  year integer NOT NULL,
  department_name text,
  revenue_goal numeric DEFAULT 0,
  meta2_goal numeric,
  meta3_goal numeric,
  nps_goal integer DEFAULT 0,
  testimonials_goal integer DEFAULT 0,
  referrals_goal integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_individual_goals_user ON public.individual_goals(user_id);
CREATE INDEX idx_individual_goals_team ON public.individual_goals(team_id);

ALTER TABLE public.individual_goals ENABLE ROW LEVEL SECURITY;

-- Verificar tabelas adicionais criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
