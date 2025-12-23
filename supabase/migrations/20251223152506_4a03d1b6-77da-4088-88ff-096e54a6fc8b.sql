-- Tabela de metas pré-definidas (admin insere, vinculado pelo primeiro nome)
CREATE TABLE public.predefined_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  meta1_goal NUMERIC NOT NULL DEFAULT 0,
  meta2_goal NUMERIC NOT NULL DEFAULT 0,
  meta3_goal NUMERIC NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  matched_user_id UUID REFERENCES auth.users(id),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  contested BOOLEAN NOT NULL DEFAULT false,
  contest_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(first_name, month, year)
);

-- Enable RLS
ALTER TABLE public.predefined_goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage predefined goals"
ON public.predefined_goals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their matched goals"
ON public.predefined_goals
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    matched_user_id = auth.uid() OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update their matched goals for confirmation"
ON public.predefined_goals
FOR UPDATE
USING (matched_user_id = auth.uid())
WITH CHECK (matched_user_id = auth.uid());

-- Function to auto-match users by first name when they register
CREATE OR REPLACE FUNCTION public.match_user_to_predefined_goals()
RETURNS TRIGGER AS $$
DECLARE
  user_first_name TEXT;
BEGIN
  -- Extract first name from full_name
  user_first_name := split_part(NEW.full_name, ' ', 1);
  
  -- Update predefined_goals where first_name matches and no user is matched yet
  UPDATE public.predefined_goals
  SET matched_user_id = NEW.user_id,
      updated_at = now()
  WHERE LOWER(first_name) = LOWER(user_first_name)
    AND matched_user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to match on profile creation
CREATE TRIGGER on_profile_created_match_goals
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.match_user_to_predefined_goals();

-- Function to also try matching on profile update (if name changes)
CREATE OR REPLACE FUNCTION public.rematch_user_to_predefined_goals()
RETURNS TRIGGER AS $$
DECLARE
  user_first_name TEXT;
BEGIN
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    user_first_name := split_part(NEW.full_name, ' ', 1);
    
    -- Clear old matches for this user
    UPDATE public.predefined_goals
    SET matched_user_id = NULL, updated_at = now()
    WHERE matched_user_id = NEW.user_id AND confirmed = false;
    
    -- Try to match with new name
    UPDATE public.predefined_goals
    SET matched_user_id = NEW.user_id, updated_at = now()
    WHERE LOWER(first_name) = LOWER(user_first_name)
      AND matched_user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_updated_rematch_goals
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.rematch_user_to_predefined_goals();