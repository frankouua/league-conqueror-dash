-- =====================================================
-- SCRIPT DE MIGRAÇÃO - PARTE 3: TABELAS PRINCIPAIS
-- Execute após as funções auxiliares
-- =====================================================

-- Habilitar extensão UUID se ainda não estiver
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== TEAMS ====================
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  motto text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  team_id uuid REFERENCES public.teams(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  whatsapp text,
  avatar_url text,
  department department_type,
  position position_type,
  is_approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  is_admin boolean DEFAULT false,
  last_access_at timestamptz,
  access_count integer DEFAULT 0,
  performance_score integer DEFAULT 0,
  performance_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX idx_profiles_is_approved ON public.profiles(is_approved);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==================== USER_ROLES ====================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==================== PREDEFINED_GOALS ====================
CREATE TABLE IF NOT EXISTS public.predefined_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  month integer NOT NULL,
  year integer NOT NULL,
  department_name text,
  meta1_goal numeric DEFAULT 0,
  meta2_goal numeric DEFAULT 0,
  meta3_goal numeric DEFAULT 0,
  nps_goal integer DEFAULT 0,
  testimonials_goal integer DEFAULT 0,
  referrals_goal integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year, department_name)
);

CREATE INDEX idx_predefined_goals_user ON public.predefined_goals(user_id);
CREATE INDEX idx_predefined_goals_team ON public.predefined_goals(team_id);
CREATE INDEX idx_predefined_goals_period ON public.predefined_goals(month, year);

ALTER TABLE public.predefined_goals ENABLE ROW LEVEL SECURITY;

-- ==================== REVENUE_RECORDS ====================
CREATE TABLE IF NOT EXISTS public.revenue_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL,
  date date NOT NULL,
  value_sold numeric NOT NULL DEFAULT 0,
  value_received numeric NOT NULL DEFAULT 0,
  counts_for_individual boolean NOT NULL DEFAULT true,
  attributed_to_user_id uuid,
  registered_by_admin boolean NOT NULL DEFAULT false,
  patient_name text,
  procedure_name text,
  prontuario text,
  payment_method text,
  upload_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_revenue_records_team ON public.revenue_records(team_id);
CREATE INDEX idx_revenue_records_user ON public.revenue_records(user_id);
CREATE INDEX idx_revenue_records_date ON public.revenue_records(date);
CREATE INDEX idx_revenue_records_attributed ON public.revenue_records(attributed_to_user_id);

ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;

-- ==================== EXECUTED_RECORDS ====================
CREATE TABLE IF NOT EXISTS public.executed_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL,
  date date NOT NULL,
  value_executed numeric NOT NULL DEFAULT 0,
  counts_for_individual boolean NOT NULL DEFAULT true,
  attributed_to_user_id uuid,
  registered_by_admin boolean NOT NULL DEFAULT false,
  patient_name text,
  procedure_name text,
  prontuario text,
  upload_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_executed_records_team ON public.executed_records(team_id);
CREATE INDEX idx_executed_records_user ON public.executed_records(user_id);
CREATE INDEX idx_executed_records_date ON public.executed_records(date);
CREATE INDEX idx_executed_records_attributed ON public.executed_records(attributed_to_user_id);

ALTER TABLE public.executed_records ENABLE ROW LEVEL SECURITY;

-- ==================== NPS_RECORDS ====================
CREATE TABLE IF NOT EXISTS public.nps_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 10),
  date date NOT NULL,
  counts_for_individual boolean NOT NULL DEFAULT true,
  attributed_to_user_id uuid,
  registered_by_admin boolean NOT NULL DEFAULT false,
  patient_name text,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nps_records_team ON public.nps_records(team_id);
CREATE INDEX idx_nps_records_user ON public.nps_records(user_id);
CREATE INDEX idx_nps_records_date ON public.nps_records(date);

ALTER TABLE public.nps_records ENABLE ROW LEVEL SECURITY;

-- ==================== TESTIMONIAL_RECORDS ====================
CREATE TABLE IF NOT EXISTS public.testimonial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL,
  type testimonial_type NOT NULL,
  date date NOT NULL,
  counts_for_individual boolean NOT NULL DEFAULT true,
  attributed_to_user_id uuid,
  registered_by_admin boolean NOT NULL DEFAULT false,
  patient_name text,
  link text,
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_testimonial_records_team ON public.testimonial_records(team_id);
CREATE INDEX idx_testimonial_records_user ON public.testimonial_records(user_id);
CREATE INDEX idx_testimonial_records_date ON public.testimonial_records(date);

ALTER TABLE public.testimonial_records ENABLE ROW LEVEL SECURITY;

-- ==================== REFERRAL_RECORDS ====================
CREATE TABLE IF NOT EXISTS public.referral_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL,
  date date NOT NULL,
  counts_for_individual boolean NOT NULL DEFAULT true,
  attributed_to_user_id uuid,
  registered_by_admin boolean NOT NULL DEFAULT false,
  referrer_name text,
  referred_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_records_team ON public.referral_records(team_id);
CREATE INDEX idx_referral_records_user ON public.referral_records(user_id);
CREATE INDEX idx_referral_records_date ON public.referral_records(date);

ALTER TABLE public.referral_records ENABLE ROW LEVEL SECURITY;

-- ==================== OTHER_INDICATORS ====================
CREATE TABLE IF NOT EXISTS public.other_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  user_id uuid NOT NULL,
  unilovers integer NOT NULL DEFAULT 0,
  ambassadors integer NOT NULL DEFAULT 0,
  instagram_mentions integer NOT NULL DEFAULT 0,
  date date NOT NULL,
  counts_for_individual boolean NOT NULL DEFAULT true,
  attributed_to_user_id uuid,
  registered_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_other_indicators_team ON public.other_indicators(team_id);
CREATE INDEX idx_other_indicators_user ON public.other_indicators(user_id);
CREATE INDEX idx_other_indicators_date ON public.other_indicators(date);

ALTER TABLE public.other_indicators ENABLE ROW LEVEL SECURITY;

-- Verificar tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
