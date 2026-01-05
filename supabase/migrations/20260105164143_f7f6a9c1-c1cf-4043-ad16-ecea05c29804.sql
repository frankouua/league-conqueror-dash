-- Create function to notify user when suggestion status changes
CREATE OR REPLACE FUNCTION public.notify_suggestion_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  user_team_id UUID;
BEGIN
  -- Only trigger on status changes to approved or implemented
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'implemented') THEN
    
    -- Get user's team_id
    SELECT team_id INTO user_team_id
    FROM public.profiles
    WHERE user_id = NEW.user_id
    LIMIT 1;
    
    -- Set notification content based on status
    IF NEW.status = 'approved' THEN
      notification_title := '🎉 Sugestão Aprovada!';
      notification_message := 'Sua sugestão de campanha "' || NEW.title || '" foi aprovada pela coordenação!';
    ELSIF NEW.status = 'implemented' THEN
      notification_title := '🚀 Campanha Implementada!';
      notification_message := 'Sua sugestão "' || NEW.title || '" foi implementada como uma nova campanha!';
    END IF;
    
    -- Insert notification
    INSERT INTO public.notifications (user_id, team_id, title, message, type)
    VALUES (NEW.user_id, user_team_id, notification_title, notification_message, 'campaign_suggestion');
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for suggestion status changes
DROP TRIGGER IF EXISTS on_suggestion_status_change ON public.campaign_suggestions;
CREATE TRIGGER on_suggestion_status_change
  AFTER UPDATE ON public.campaign_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_suggestion_status_change();