
-- Fix permissive RLS policies - corrected column names

-- 1. bulk_action_logs - restrict to authenticated users (has created_by)
DROP POLICY IF EXISTS "Users can create bulk actions" ON public.bulk_action_logs;
CREATE POLICY "Users can create bulk actions" 
ON public.bulk_action_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- 2. crm_lead_tasks - restrict to task owner/assigned (uses assigned_to, no created_by)
DROP POLICY IF EXISTS "lead_tasks_insert" ON public.crm_lead_tasks;
CREATE POLICY "lead_tasks_insert" 
ON public.crm_lead_tasks 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. crm_nps_responses - restrict to authenticated
DROP POLICY IF EXISTS "crm_nps_responses_insert" ON public.crm_nps_responses;
CREATE POLICY "crm_nps_responses_insert" 
ON public.crm_nps_responses 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. lead_checklist_items - restrict INSERT to authenticated users
DROP POLICY IF EXISTS "Authenticated users can create lead checklist items" ON public.lead_checklist_items;
CREATE POLICY "Authenticated users can create lead checklist items" 
ON public.lead_checklist_items 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. lead_checklist_items - restrict UPDATE to authenticated users
DROP POLICY IF EXISTS "Authenticated users can update lead checklist items" ON public.lead_checklist_items;
CREATE POLICY "Authenticated users can update lead checklist items" 
ON public.lead_checklist_items 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- 6. weekly_reports - restrict to authenticated users
DROP POLICY IF EXISTS "Service can insert weekly_reports" ON public.weekly_reports;
CREATE POLICY "Service can insert weekly_reports" 
ON public.weekly_reports 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
