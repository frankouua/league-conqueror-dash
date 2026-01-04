-- Allow admins to insert revenue records (needed for spreadsheet imports that insert rows for multiple teams)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'revenue_records'
      AND policyname = 'Admins can insert revenue records'
  ) THEN
    CREATE POLICY "Admins can insert revenue records"
    ON public.revenue_records
    FOR INSERT
    TO public
    WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;
