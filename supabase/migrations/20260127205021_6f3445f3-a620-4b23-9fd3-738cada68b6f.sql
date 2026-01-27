ALTER TABLE public.patient_data ENABLE ROW LEVEL SECURITY;

-- Lock down direct client access (PII table). Use backend/service-role operations instead.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'patient_data' AND policyname = 'No direct access to patient_data'
  ) THEN
    CREATE POLICY "No direct access to patient_data"
    ON public.patient_data
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;