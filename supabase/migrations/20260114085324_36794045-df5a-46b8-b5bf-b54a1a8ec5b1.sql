-- Adicionar colunas faltantes para automações

-- Coluna birth_date em crm_leads para automação de aniversários
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS cross_sell_offered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cross_sell_suggestions TEXT[],
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_violated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS temperature_updated_at TIMESTAMP WITH TIME ZONE;

-- Coluna escalated em crm_tasks (nome correto da tabela)
ALTER TABLE public.crm_tasks 
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false;

-- Tabela para bônus de indicações
CREATE TABLE IF NOT EXISTS public.referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID,
  referrer_name TEXT,
  referrer_phone TEXT,
  referred_lead_id UUID REFERENCES public.crm_leads(id),
  bonus_value NUMERIC DEFAULT 0,
  contract_value NUMERIC,
  status TEXT DEFAULT 'pending_payment',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar colunas em referral_leads
ALTER TABLE public.referral_leads 
ADD COLUMN IF NOT EXISTS crm_lead_id UUID REFERENCES public.crm_leads(id),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bonus_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bonus_value NUMERIC;

-- Tabela para relatórios semanais
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_data JSONB,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Coluna performance_score em profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS performance_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_updated_at TIMESTAMP WITH TIME ZONE;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Policies para referral_bonuses (admins podem ver tudo)
CREATE POLICY "Admins can manage referral_bonuses" ON public.referral_bonuses
  FOR ALL USING (public.is_admin());

-- Policies para weekly_reports (admins podem ver)
CREATE POLICY "Admins can view weekly_reports" ON public.weekly_reports
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Service can insert weekly_reports" ON public.weekly_reports
  FOR INSERT WITH CHECK (true);