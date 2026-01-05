-- Create campaign suggestions table
CREATE TABLE public.campaign_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  suggested_prize TEXT,
  suggested_goal TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions
CREATE POLICY "Users can view their own suggestions"
ON public.campaign_suggestions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own suggestions
CREATE POLICY "Users can create suggestions"
ON public.campaign_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all suggestions
CREATE POLICY "Admins can view all suggestions"
ON public.campaign_suggestions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update suggestions (respond)
CREATE POLICY "Admins can update suggestions"
ON public.campaign_suggestions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_campaign_suggestions_updated_at
BEFORE UPDATE ON public.campaign_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();