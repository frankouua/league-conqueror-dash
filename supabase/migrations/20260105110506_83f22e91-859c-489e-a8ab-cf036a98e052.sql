-- Create announcements table for management notices
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('mensal', 'semestral', 'anual', 'oportuna', 'estrategica')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal_description TEXT,
  goal_value NUMERIC,
  goal_metric TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign actions/tasks table
CREATE TABLE public.campaign_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign checklist progress for each user
CREATE TABLE public.campaign_checklist_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.campaign_actions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(action_id, user_id)
);

-- Create announcement read status per user
CREATE TABLE public.announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Announcements policies (everyone can read, only admin can create/update/delete)
CREATE POLICY "Everyone can view active announcements" 
ON public.announcements 
FOR SELECT 
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can create announcements" 
ON public.announcements 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update announcements" 
ON public.announcements 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete announcements" 
ON public.announcements 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Campaigns policies
CREATE POLICY "Everyone can view active campaigns" 
ON public.campaigns 
FOR SELECT 
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can create campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete campaigns" 
ON public.campaigns 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Campaign actions policies
CREATE POLICY "Everyone can view campaign actions" 
ON public.campaign_actions 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage campaign actions" 
ON public.campaign_actions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Campaign checklist progress policies
CREATE POLICY "Users can view all checklist progress" 
ON public.campaign_checklist_progress 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own progress" 
ON public.campaign_checklist_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress update" 
ON public.campaign_checklist_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Announcement reads policies
CREATE POLICY "Users can view their own read status" 
ON public.announcement_reads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark announcements as read" 
ON public.announcement_reads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_checklist_progress_updated_at
BEFORE UPDATE ON public.campaign_checklist_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();