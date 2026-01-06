-- Add approval system to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Update existing users to be approved (they were already in the system)
UPDATE public.profiles SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;

-- Add targeting options to announcements
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'all' CHECK (target_type IN ('all', 'team', 'user')),
ADD COLUMN IF NOT EXISTS target_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS send_whatsapp boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS send_email boolean DEFAULT false;

-- Create a table to track pending user approvals and admin notifications
CREATE TABLE IF NOT EXISTS public.user_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  UNIQUE(user_id)
);

-- Enable RLS on user_approval_requests
ALTER TABLE public.user_approval_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own request
CREATE POLICY "Users can view their own approval request"
ON public.user_approval_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all requests
CREATE POLICY "Admins can view all approval requests"
ON public.user_approval_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can update requests
CREATE POLICY "Admins can update approval requests"
ON public.user_approval_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: System can insert requests (via trigger)
CREATE POLICY "System can insert approval requests"
ON public.user_approval_requests
FOR INSERT
WITH CHECK (true);

-- Create trigger to auto-create approval request when new profile is created
CREATE OR REPLACE FUNCTION public.create_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create approval request for new user
  INSERT INTO public.user_approval_requests (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create notification for all admins
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT 
    ur.user_id,
    '👤 Novo usuário aguardando aprovação',
    'O usuário ' || NEW.full_name || ' (' || NEW.email || ') se cadastrou e aguarda aprovação.',
    'user_approval'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;

-- Trigger for new profile creation
DROP TRIGGER IF EXISTS on_profile_created_approval ON public.profiles;
CREATE TRIGGER on_profile_created_approval
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_approval_request();

-- Function to approve user
CREATE OR REPLACE FUNCTION public.approve_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET is_approved = true,
      approved_by = auth.uid(),
      approved_at = now()
  WHERE user_id = _user_id;
  
  -- Update approval request
  UPDATE public.user_approval_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE user_id = _user_id;
  
  -- Notify the user
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _user_id,
    '✅ Acesso Aprovado!',
    'Seu acesso ao sistema foi aprovado. Você já pode usar todas as funcionalidades.',
    'user_approval'
  );
END;
$$;

-- Function to reject user
CREATE OR REPLACE FUNCTION public.reject_user(_user_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject users';
  END IF;
  
  -- Update approval request
  UPDATE public.user_approval_requests
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = _reason
  WHERE user_id = _user_id;
END;
$$;