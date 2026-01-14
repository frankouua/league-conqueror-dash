-- Fix remaining policies with conflict handling
DROP POLICY IF EXISTS "Authenticated users can view form responses" ON public.form_responses;
DROP POLICY IF EXISTS "Authenticated users can manage form responses" ON public.form_responses;
DROP POLICY IF EXISTS "Authenticated users can view nps responses" ON public.crm_nps_responses;
DROP POLICY IF EXISTS "Authenticated users can manage nps responses" ON public.crm_nps_responses;
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.crm_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can manage chat messages" ON public.crm_chat_messages;

-- Recreate policies safely
CREATE POLICY "Auth users view form responses" 
ON public.form_responses FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users manage form responses" 
ON public.form_responses FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users view nps responses" 
ON public.crm_nps_responses FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users manage nps responses" 
ON public.crm_nps_responses FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users view chat messages" 
ON public.crm_chat_messages FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users manage chat messages" 
ON public.crm_chat_messages FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);