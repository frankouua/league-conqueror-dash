-- Create enum for contestation status
CREATE TYPE public.contestation_status AS ENUM ('pending', 'approved', 'rejected');

-- Create contestations table
CREATE TABLE public.contestations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  related_record_id UUID,
  status contestation_status NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deadline TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '48 hours')
);

-- Enable Row Level Security
ALTER TABLE public.contestations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view contestations from their team" 
ON public.contestations 
FOR SELECT 
USING (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can create contestations for their team" 
ON public.contestations 
FOR INSERT 
WITH CHECK (
  team_id IN (SELECT team_id FROM profiles WHERE user_id = auth.uid())
  AND created_at <= (now() + INTERVAL '48 hours')
);

CREATE POLICY "Admins can update contestations" 
ON public.contestations 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));