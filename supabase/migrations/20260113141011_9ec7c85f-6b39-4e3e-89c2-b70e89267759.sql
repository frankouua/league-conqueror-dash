-- Add recurrence columns to protocols if not exist
ALTER TABLE public.protocols 
ADD COLUMN IF NOT EXISTS recurrence_days INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_script TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upsell_protocols TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cross_sell_protocols TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS referral_bonus NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_script TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Create protocol suggestions table for AI-generated suggestions
CREATE TABLE IF NOT EXISTS public.protocol_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.protocols(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('recurrence', 'upsell', 'cross_sell', 'reactivation', 'referral', 'loyalty', 'new_client')),
  priority INTEGER DEFAULT 1,
  reason TEXT NOT NULL,
  personalized_script TEXT,
  ai_confidence NUMERIC DEFAULT 0,
  suggested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  acted_at TIMESTAMP WITH TIME ZONE,
  action_result TEXT,
  created_by TEXT DEFAULT 'ai',
  is_active BOOLEAN DEFAULT true
);

-- Create protocol recurrence tracking
CREATE TABLE IF NOT EXISTS public.protocol_recurrence_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.protocols(id) ON DELETE CASCADE,
  last_procedure_date TIMESTAMP WITH TIME ZONE NOT NULL,
  next_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  days_overdue INTEGER DEFAULT 0,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  reactivated_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reminded', 'scheduled', 'completed', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create referral tracking for protocols
CREATE TABLE IF NOT EXISTS public.protocol_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_lead_id UUID REFERENCES public.crm_leads(id),
  referred_lead_id UUID REFERENCES public.crm_leads(id),
  protocol_id UUID REFERENCES public.protocols(id),
  referral_code TEXT UNIQUE,
  bonus_earned NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired', 'paid')),
  converted_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.protocol_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_recurrence_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for protocol_suggestions
CREATE POLICY "Team members can view suggestions" ON public.protocol_suggestions
FOR SELECT USING (true);

CREATE POLICY "System can manage suggestions" ON public.protocol_suggestions
FOR ALL USING (true);

-- RLS policies for protocol_recurrence_tracking
CREATE POLICY "Team members can view recurrence" ON public.protocol_recurrence_tracking
FOR SELECT USING (true);

CREATE POLICY "System can manage recurrence" ON public.protocol_recurrence_tracking
FOR ALL USING (true);

-- RLS policies for protocol_referrals
CREATE POLICY "Team members can view referrals" ON public.protocol_referrals
FOR SELECT USING (true);

CREATE POLICY "System can manage referrals" ON public.protocol_referrals
FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_protocol_suggestions_lead ON public.protocol_suggestions(lead_id);
CREATE INDEX IF NOT EXISTS idx_protocol_suggestions_type ON public.protocol_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_protocol_suggestions_active ON public.protocol_suggestions(is_active);
CREATE INDEX IF NOT EXISTS idx_protocol_recurrence_due ON public.protocol_recurrence_tracking(next_due_date);
CREATE INDEX IF NOT EXISTS idx_protocol_recurrence_status ON public.protocol_recurrence_tracking(status);