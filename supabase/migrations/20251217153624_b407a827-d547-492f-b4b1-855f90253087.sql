-- Revenue records table
CREATE TABLE public.revenue_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's records
CREATE POLICY "Team members can view their team revenue"
ON public.revenue_records FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Team members can insert records for their team
CREATE POLICY "Team members can insert revenue"
ON public.revenue_records FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Referral records table
CREATE TABLE public.referral_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collected INT NOT NULL DEFAULT 0 CHECK (collected >= 0),
  to_consultation INT NOT NULL DEFAULT 0 CHECK (to_consultation >= 0),
  to_surgery INT NOT NULL DEFAULT 0 CHECK (to_surgery >= 0),
  patient_name TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team referrals"
ON public.referral_records FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team members can insert referrals"
ON public.referral_records FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Testimonial records table
CREATE TYPE public.testimonial_type AS ENUM ('google', 'video', 'gold');

CREATE TABLE public.testimonial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type testimonial_type NOT NULL,
  link TEXT,
  patient_name TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team testimonials"
ON public.testimonial_records FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team members can insert testimonials"
ON public.testimonial_records FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

-- NPS records table
CREATE TABLE public.nps_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score IN (9, 10)),
  cited_member BOOLEAN NOT NULL DEFAULT false,
  member_name TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team NPS"
ON public.nps_records FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team members can insert NPS"
ON public.nps_records FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Other indicators table
CREATE TABLE public.other_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unilovers INT NOT NULL DEFAULT 0 CHECK (unilovers >= 0),
  ambassadors INT NOT NULL DEFAULT 0 CHECK (ambassadors >= 0),
  instagram_mentions INT NOT NULL DEFAULT 0 CHECK (instagram_mentions >= 0),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.other_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team indicators"
ON public.other_indicators FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Team members can insert indicators"
ON public.other_indicators FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT team_id FROM public.profiles WHERE user_id = auth.uid())
);