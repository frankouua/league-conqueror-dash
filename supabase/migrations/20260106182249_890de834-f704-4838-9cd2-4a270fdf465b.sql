-- Fix the overly permissive INSERT policy - limit to authenticated users only
DROP POLICY IF EXISTS "System can insert approval requests" ON public.user_approval_requests;

CREATE POLICY "Authenticated users can insert their own approval request"
ON public.user_approval_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);