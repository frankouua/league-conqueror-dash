-- Tighten permissive RLS policy flagged by linter
DO $$
BEGIN
  -- Drop the overly-permissive policy (if it exists)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'user_achievements'
      AND policyname = 'Service role can insert achievements'
  ) THEN
    EXECUTE 'DROP POLICY "Service role can insert achievements" ON public.user_achievements';
  END IF;
END $$;

-- Allow inserts only for backend jobs running with service role JWT
CREATE POLICY "Service role can insert achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
