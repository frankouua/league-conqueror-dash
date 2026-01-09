-- Create table for individual goals by department per seller
CREATE TABLE IF NOT EXISTS public.seller_department_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  department_name TEXT NOT NULL,
  meta1_goal NUMERIC DEFAULT 0,
  meta2_goal NUMERIC DEFAULT 0,
  meta3_goal NUMERIC DEFAULT 0,
  meta1_qty INTEGER DEFAULT 0,
  meta2_qty INTEGER DEFAULT 0,
  meta3_qty INTEGER DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_name, month, year)
);

-- Enable RLS
ALTER TABLE public.seller_department_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all seller department goals"
ON public.seller_department_goals
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert seller department goals"
ON public.seller_department_goals
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update seller department goals"
ON public.seller_department_goals
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete seller department goals"
ON public.seller_department_goals
FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_seller_department_goals_updated_at
BEFORE UPDATE ON public.seller_department_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();