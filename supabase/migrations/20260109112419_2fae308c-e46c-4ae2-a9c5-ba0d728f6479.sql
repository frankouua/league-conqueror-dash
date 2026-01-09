-- Create calendar events table
CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'meeting', -- meeting, reminder, training, campaign, other
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    location TEXT,
    color TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    is_team_event BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event invitations table
CREATE TABLE public.calendar_event_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted, declined
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_events
CREATE POLICY "Users can view their own events" 
ON public.calendar_events 
FOR SELECT 
USING (
    auth.uid() = created_by 
    OR is_team_event = true
    OR EXISTS (
        SELECT 1 FROM public.calendar_event_invitations 
        WHERE event_id = calendar_events.id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create events" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events" 
ON public.calendar_events 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events" 
ON public.calendar_events 
FOR DELETE 
USING (auth.uid() = created_by);

-- RLS policies for calendar_event_invitations
CREATE POLICY "Users can view their invitations" 
ON public.calendar_event_invitations 
FOR SELECT 
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.calendar_events 
        WHERE id = calendar_event_invitations.event_id AND created_by = auth.uid()
    )
);

CREATE POLICY "Event creators can create invitations" 
ON public.calendar_event_invitations 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.calendar_events 
        WHERE id = event_id AND created_by = auth.uid()
    )
);

CREATE POLICY "Users can update their own invitation status" 
ON public.calendar_event_invitations 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Event creators can delete invitations" 
ON public.calendar_event_invitations 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.calendar_events 
        WHERE id = event_id AND created_by = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();