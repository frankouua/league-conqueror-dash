-- Fix overly permissive RLS policies for security
-- These tables had USING(true) for INSERT/UPDATE/DELETE which is a security risk

-- 1. coordinator_validation_checklist - should require authentication
DROP POLICY IF EXISTS "Users can manage coordinator checklist" ON public.coordinator_validation_checklist;
CREATE POLICY "Authenticated users can manage coordinator checklist" 
ON public.coordinator_validation_checklist 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. lead_contracts - should require authentication
DROP POLICY IF EXISTS "Users can manage lead contracts" ON public.lead_contracts;
CREATE POLICY "Authenticated users can manage lead contracts" 
ON public.lead_contracts 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. lead_projects - require authentication
DROP POLICY IF EXISTS "Users can manage lead projects" ON public.lead_projects;
CREATE POLICY "Authenticated users can manage lead projects" 
ON public.lead_projects 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. lead_spa_preferences - require authentication
DROP POLICY IF EXISTS "Users can manage spa preferences" ON public.lead_spa_preferences;
CREATE POLICY "Authenticated users can manage spa preferences" 
ON public.lead_spa_preferences 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. lead_travel - require authentication
DROP POLICY IF EXISTS "Users can manage lead travel" ON public.lead_travel;
CREATE POLICY "Authenticated users can manage lead travel" 
ON public.lead_travel 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. lead_weight_tracking - require authentication
DROP POLICY IF EXISTS "Users can manage weight tracking" ON public.lead_weight_tracking;
CREATE POLICY "Authenticated users can manage weight tracking" 
ON public.lead_weight_tracking 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. email_dispatch_queue - admin only
DROP POLICY IF EXISTS "Users can manage email queue" ON public.email_dispatch_queue;
CREATE POLICY "Admins can manage email queue" 
ON public.email_dispatch_queue 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- 8. sms_dispatch_queue - admin only
DROP POLICY IF EXISTS "Users can manage sms queue" ON public.sms_dispatch_queue;
CREATE POLICY "Admins can manage sms queue" 
ON public.sms_dispatch_queue 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);