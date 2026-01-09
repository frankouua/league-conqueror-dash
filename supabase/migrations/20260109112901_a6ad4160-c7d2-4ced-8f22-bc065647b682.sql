-- Function to create notification when calendar invitation is created
CREATE OR REPLACE FUNCTION public.notify_calendar_invitation()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  creator_name TEXT;
BEGIN
  -- Get event title
  SELECT title INTO event_title 
  FROM public.calendar_events 
  WHERE id = NEW.event_id;
  
  -- Get creator name
  SELECT p.full_name INTO creator_name 
  FROM public.calendar_events e
  JOIN public.profiles p ON e.created_by = p.id
  WHERE e.id = NEW.event_id;
  
  -- Create notification for the invited user
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    NEW.user_id,
    '📅 Novo Convite de Evento',
    COALESCE(creator_name, 'Alguém') || ' convidou você para: ' || COALESCE(event_title, 'Evento'),
    'calendar_invite'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-notify on invitation
CREATE TRIGGER on_calendar_invitation_created
AFTER INSERT ON public.calendar_event_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_calendar_invitation();

-- Function to notify when invitation status changes
CREATE OR REPLACE FUNCTION public.notify_invitation_response()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  responder_name TEXT;
BEGIN
  -- Only notify if status changed to accepted or declined
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    -- Get event info
    SELECT id, title, created_by INTO event_record 
    FROM public.calendar_events 
    WHERE id = NEW.event_id;
    
    -- Get responder name
    SELECT full_name INTO responder_name 
    FROM public.profiles 
    WHERE id = NEW.user_id;
    
    -- Notify the event creator
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type
    ) VALUES (
      event_record.created_by,
      CASE 
        WHEN NEW.status = 'accepted' THEN '✅ Convite Aceito'
        ELSE '❌ Convite Recusado'
      END,
      COALESCE(responder_name, 'Alguém') || 
      CASE 
        WHEN NEW.status = 'accepted' THEN ' confirmou presença em: '
        ELSE ' recusou o convite para: '
      END || 
      COALESCE(event_record.title, 'Evento'),
      'calendar_response'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for invitation responses
CREATE TRIGGER on_calendar_invitation_response
AFTER UPDATE ON public.calendar_event_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_invitation_response();