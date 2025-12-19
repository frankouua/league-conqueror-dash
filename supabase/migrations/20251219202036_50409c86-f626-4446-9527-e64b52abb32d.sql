-- Create department goals table
CREATE TABLE public.department_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_name TEXT NOT NULL,
  meta1_goal NUMERIC NOT NULL DEFAULT 0,
  meta2_goal NUMERIC NOT NULL DEFAULT 0,
  meta3_goal NUMERIC NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_name, month, year)
);

-- Enable RLS
ALTER TABLE public.department_goals ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view department goals
CREATE POLICY "Authenticated users can view department goals"
ON public.department_goals
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage department goals
CREATE POLICY "Admins can insert department goals"
ON public.department_goals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update department goals"
ON public.department_goals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete department goals"
ON public.department_goals
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_department_goals_updated_at
BEFORE UPDATE ON public.department_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();