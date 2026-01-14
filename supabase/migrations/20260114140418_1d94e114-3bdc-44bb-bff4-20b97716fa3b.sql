
-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.calendar_event_invitations;

-- Recreate calendar_events SELECT policy without recursion
CREATE POLICY "Users can view their own events" 
ON public.calendar_events 
FOR SELECT 
USING (
  auth.uid() = created_by 
  OR is_team_event = true
  OR id IN (
    SELECT event_id FROM public.calendar_event_invitations 
    WHERE user_id = auth.uid()
  )
);

-- Recreate calendar_event_invitations SELECT policy without recursion
CREATE POLICY "Users can view their invitations" 
ON public.calendar_event_invitations 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR event_id IN (
    SELECT id FROM public.calendar_events 
    WHERE created_by = auth.uid()
  )
);
