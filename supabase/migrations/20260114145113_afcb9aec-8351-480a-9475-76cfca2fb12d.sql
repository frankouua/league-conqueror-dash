-- Schedule daily backup cron job at 3:00 AM Brasília (6:00 UTC)
SELECT cron.schedule(
  'daily-backup-job',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/daily-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Insert/update automation schedule record for tracking
INSERT INTO public.automation_schedules (
  automation_name,
  function_name,
  cron_expression,
  description,
  is_active
) VALUES (
  'Backup Diário Automático',
  'daily-backup',
  '0 6 * * *',
  'Backup automático diário às 3h (horário de Brasília). Salva dados críticos dos últimos 30 dias.',
  true
) ON CONFLICT (function_name) DO UPDATE SET
  cron_expression = EXCLUDED.cron_expression,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();