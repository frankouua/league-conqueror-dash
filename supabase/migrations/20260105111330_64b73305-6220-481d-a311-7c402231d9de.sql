
-- Add template support to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN template_id UUID REFERENCES public.campaigns(id),
ADD COLUMN prize_description TEXT,
ADD COLUMN prize_value NUMERIC(10,2),
ADD COLUMN alert_days_before INTEGER DEFAULT 3;

-- Create campaign materials table
CREATE TABLE public.campaign_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('link', 'pdf', 'script', 'image', 'video')),
  url TEXT,
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.campaign_materials ENABLE ROW LEVEL SECURITY;

-- Everyone can view materials
CREATE POLICY "Everyone can view campaign materials"
ON public.campaign_materials
FOR SELECT
USING (true);

-- Only admins can manage materials
CREATE POLICY "Admins can insert campaign materials"
ON public.campaign_materials
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update campaign materials"
ON public.campaign_materials
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete campaign materials"
ON public.campaign_materials
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create campaign alerts table for tracking sent alerts
CREATE TABLE public.campaign_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('deadline_approaching', 'goal_behind', 'campaign_started', 'campaign_ended')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message TEXT
);

-- Enable RLS
ALTER TABLE public.campaign_alerts ENABLE ROW LEVEL SECURITY;

-- Everyone can view alerts
CREATE POLICY "Everyone can view campaign alerts"
ON public.campaign_alerts
FOR SELECT
USING (true);

-- Only system can insert alerts (via edge functions)
CREATE POLICY "Admins can insert campaign alerts"
ON public.campaign_alerts
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
