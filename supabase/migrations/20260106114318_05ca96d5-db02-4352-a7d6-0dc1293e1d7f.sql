-- Create comprehensive patient_data table to store all patient information
-- Uses CPF and prontuario for deduplication

CREATE TABLE IF NOT EXISTS public.patient_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identification (for deduplication)
  prontuario TEXT UNIQUE,
  cpf TEXT,
  
  -- Basic info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  
  -- Demographics
  birth_date DATE,
  age INTEGER,
  gender TEXT,
  nationality TEXT,
  marital_status TEXT,
  profession TEXT,
  has_children BOOLEAN,
  children_count INTEGER,
  
  -- Location
  country TEXT,
  state TEXT,
  city TEXT,
  neighborhood TEXT,
  address TEXT,
  cep TEXT,
  
  -- Physical
  height_cm NUMERIC,
  weight_kg NUMERIC,
  
  -- Marketing & Origin
  origin TEXT,                    -- Where they found us (Instagram, Google, TikTok, etc.)
  origin_detail TEXT,             -- More details about origin
  referral_name TEXT,             -- Name of person who referred
  influencer_name TEXT,           -- Which influencer
  instagram_handle TEXT,
  
  -- Goals & Motivations
  main_objective TEXT,            -- Why they want surgery
  why_not_done_yet TEXT,          -- Barriers/reasons
  
  -- Financial totals (aggregated)
  total_value_sold NUMERIC DEFAULT 0,
  total_value_executed NUMERIC DEFAULT 0,
  total_procedures INTEGER DEFAULT 0,
  
  -- Dates
  first_contact_date DATE,
  last_contact_date DATE,
  first_purchase_date DATE,
  last_purchase_date DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  data_source TEXT                -- Which spreadsheet/import this came from
);

-- Create index on CPF for fast lookups
CREATE INDEX IF NOT EXISTS idx_patient_data_cpf ON public.patient_data(cpf);
CREATE INDEX IF NOT EXISTS idx_patient_data_prontuario ON public.patient_data(prontuario);
CREATE INDEX IF NOT EXISTS idx_patient_data_name ON public.patient_data(name);
CREATE INDEX IF NOT EXISTS idx_patient_data_origin ON public.patient_data(origin);
CREATE INDEX IF NOT EXISTS idx_patient_data_city ON public.patient_data(city);
CREATE INDEX IF NOT EXISTS idx_patient_data_state ON public.patient_data(state);

-- Enable RLS
ALTER TABLE public.patient_data ENABLE ROW LEVEL SECURITY;

-- Create policies for patient_data
CREATE POLICY "Admins can do everything with patient_data"
ON public.patient_data
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view patient_data"
ON public.patient_data
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add origin and referral columns to revenue_records and executed_records
ALTER TABLE public.revenue_records 
ADD COLUMN IF NOT EXISTS patient_prontuario TEXT,
ADD COLUMN IF NOT EXISTS patient_cpf TEXT,
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_email TEXT,
ADD COLUMN IF NOT EXISTS patient_phone TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS referral_name TEXT,
ADD COLUMN IF NOT EXISTS influencer_name TEXT;

ALTER TABLE public.executed_records 
ADD COLUMN IF NOT EXISTS patient_prontuario TEXT,
ADD COLUMN IF NOT EXISTS patient_cpf TEXT,
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_email TEXT,
ADD COLUMN IF NOT EXISTS patient_phone TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS referral_name TEXT,
ADD COLUMN IF NOT EXISTS influencer_name TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_revenue_records_patient_cpf ON public.revenue_records(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_revenue_records_patient_prontuario ON public.revenue_records(patient_prontuario);
CREATE INDEX IF NOT EXISTS idx_revenue_records_origin ON public.revenue_records(origin);

CREATE INDEX IF NOT EXISTS idx_executed_records_patient_cpf ON public.executed_records(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_executed_records_patient_prontuario ON public.executed_records(patient_prontuario);
CREATE INDEX IF NOT EXISTS idx_executed_records_origin ON public.executed_records(origin);

-- Create ICP analysis table for strategic data
CREATE TABLE IF NOT EXISTS public.icp_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Segment info
  segment_name TEXT,
  segment_type TEXT,
  
  -- Demographics
  age_range TEXT,
  gender TEXT,
  location TEXT,
  profession TEXT,
  income_range TEXT,
  
  -- Behavior
  main_procedures TEXT[],
  average_ticket NUMERIC,
  purchase_frequency TEXT,
  
  -- Origin analysis
  main_origins TEXT[],
  main_influencers TEXT[],
  
  -- Pain points & motivations
  pain_points TEXT[],
  motivations TEXT[],
  objectives TEXT[],
  barriers TEXT[],
  
  -- Metrics
  customer_count INTEGER,
  total_revenue NUMERIC,
  conversion_rate NUMERIC,
  
  -- Raw data for AI analysis
  raw_data JSONB,
  
  -- Metadata
  analysis_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS for icp_analysis
ALTER TABLE public.icp_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ICP analysis"
ON public.icp_analysis
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view ICP analysis"
ON public.icp_analysis
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_patient_data_updated_at
BEFORE UPDATE ON public.patient_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_icp_analysis_updated_at
BEFORE UPDATE ON public.icp_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();