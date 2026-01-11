-- Fix linter: avoid overly permissive INSERT policy (WITH CHECK true)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'form_responses'
      AND policyname = 'Anyone can create form responses'
  ) THEN
    EXECUTE 'DROP POLICY "Anyone can create form responses" ON public.form_responses';
  END IF;
END $$;

CREATE POLICY "Public can create form responses"
ON public.form_responses
FOR INSERT
WITH CHECK (
  form_type IS NOT NULL
  AND form_source IS NOT NULL
  AND responses IS NOT NULL
  AND submitted_at IS NOT NULL
);
