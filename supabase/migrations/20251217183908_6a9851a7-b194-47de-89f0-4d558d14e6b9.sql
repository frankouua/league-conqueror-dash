-- Create enum for referral lead status
CREATE TYPE public.referral_lead_status AS ENUM (
  'nova',
  'em_contato', 
  'sem_interesse',
  'agendou',
  'consultou',
  'operou'
);

-- Create referral leads table (CRM for referrals)
CREATE TABLE public.referral_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  
  -- Person who made the referral (paciente que indicou)
  referrer_name TEXT NOT NULL,
  referrer_phone TEXT,
  
  -- Person who was referred (pessoa indicada)
  referred_name TEXT NOT NULL,
  referred_phone TEXT,
  referred_email TEXT,
  
  -- Tracking
  status referral_lead_status NOT NULL DEFAULT 'nova',
  assigned_to UUID REFERENCES auth.users(id), -- Responsible person
  registered_by UUID NOT NULL,
  
  -- Notes and history
  notes TEXT,
  last_contact_at TIMESTAMP WITH TIME ZONE,
  consultation_date DATE,
  surgery_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view team referral leads" 
ON public.referral_leads 
FOR SELECT 
USING (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Team members can insert referral leads" 
ON public.referral_leads 
FOR INSERT 
WITH CHECK (
  team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
);

CREATE POLICY "Assigned user or admin can update referral leads" 
ON public.referral_leads 
FOR UPDATE 
USING (
  assigned_to = auth.uid()
  OR registered_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can delete referral leads" 
ON public.referral_leads 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_referral_leads_updated_at
BEFORE UPDATE ON public.referral_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for tracking status history
CREATE TABLE public.referral_lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.referral_leads(id) ON DELETE CASCADE,
  old_status referral_lead_status,
  new_status referral_lead_status NOT NULL,
  changed_by UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for history
ALTER TABLE public.referral_lead_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view lead history" 
ON public.referral_lead_history 
FOR SELECT 
USING (
  lead_id IN (
    SELECT id FROM referral_leads 
    WHERE team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Team members can insert lead history" 
ON public.referral_lead_history 
FOR INSERT 
WITH CHECK (
  lead_id IN (
    SELECT id FROM referral_leads 
    WHERE team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.user_id = auth.uid())
  )
);