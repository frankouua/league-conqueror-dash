-- Create table for FEEGOW user mapping
CREATE TABLE public.feegow_user_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feegow_name TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.feegow_user_mapping ENABLE ROW LEVEL SECURITY;

-- Only admins can manage mappings
CREATE POLICY "Admins can view mappings"
ON public.feegow_user_mapping
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert mappings"
ON public.feegow_user_mapping
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update mappings"
ON public.feegow_user_mapping
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete mappings"
ON public.feegow_user_mapping
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_feegow_user_mapping_updated_at
BEFORE UPDATE ON public.feegow_user_mapping
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();