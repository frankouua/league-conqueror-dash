-- Fix remaining permissive RLS policy
DROP POLICY IF EXISTS "Users can manage lead weight tracking" ON public.lead_weight_tracking;

-- Ensure only our new policy exists
DROP POLICY IF EXISTS "Authenticated users can manage weight tracking" ON public.lead_weight_tracking;
CREATE POLICY "Authenticated users can manage weight tracking" 
ON public.lead_weight_tracking 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);