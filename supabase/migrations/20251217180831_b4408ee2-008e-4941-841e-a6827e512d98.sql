-- Create table for patient journey checklist progress
CREATE TABLE public.journey_checklist_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stage_id INTEGER NOT NULL,
  action_index INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, stage_id, action_index)
);

-- Enable RLS
ALTER TABLE public.journey_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view their own checklist progress"
ON public.journey_checklist_progress
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert their own checklist progress"
ON public.journey_checklist_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update their own checklist progress"
ON public.journey_checklist_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete their own checklist progress"
ON public.journey_checklist_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_journey_checklist_updated_at
BEFORE UPDATE ON public.journey_checklist_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();