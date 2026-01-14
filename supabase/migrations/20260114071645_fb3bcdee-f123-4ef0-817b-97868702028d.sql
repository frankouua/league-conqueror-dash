-- Criar tabela de logs de automação se não existir
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  results JSONB,
  errors TEXT[],
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_type ON public.automation_logs(automation_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Política para admins visualizarem logs
CREATE POLICY "Admins can view automation logs" ON public.automation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Tabela para configuração de cron jobs
CREATE TABLE IF NOT EXISTS public.automation_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_name TEXT NOT NULL UNIQUE,
  function_name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.automation_schedules ENABLE ROW LEVEL SECURITY;

-- Política para admins
CREATE POLICY "Admins can manage automation schedules" ON public.automation_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Inserir schedules padrão das automações do documento
INSERT INTO public.automation_schedules (automation_name, function_name, cron_expression, description) VALUES
  ('Master CRM Automation', 'crm-master-automation', '0 8,14,18 * * *', 'Orquestrador principal - 3x ao dia'),
  ('Cadências', 'execute-cadences', '*/30 * * * *', 'Executa cadências a cada 30 min'),
  ('SLA Alerts', 'check-sla-alerts', '*/15 * * * *', 'Verifica SLA a cada 15 min'),
  ('Leads Parados', 'check-stale-leads', '0 9,15 * * *', 'Verifica leads parados 2x ao dia'),
  ('Escalonamento', 'escalation-automation', '0 10 * * *', 'Escalonamento diário às 10h'),
  ('Temperatura', 'temperature-automation', '*/30 * * * *', 'Atualiza temperatura a cada 30 min'),
  ('WhatsApp Automation', 'whatsapp-automation', '*/10 * * * *', 'Processa fila WhatsApp a cada 10 min'),
  ('NPS Automation', 'nps-automation', '0 11 * * *', 'Dispara NPS diário às 11h'),
  ('Referral Automation', 'referral-automation', '0 9 * * *', 'Processa indicações diário às 9h'),
  ('AI Manager', 'daily-ai-manager', '0 7 * * 1-5', 'Resumo IA diário às 7h (dias úteis)'),
  ('Seller Alerts', 'daily-seller-alerts', '0 8 * * 1-5', 'Alertas vendedores às 8h (dias úteis)'),
  ('Churn Prediction', 'predict-churn', '0 6 * * *', 'Previsão churn diário às 6h'),
  ('Identify Recurrences', 'identify-recurrences', '0 5 * * *', 'Identifica recorrências às 5h'),
  ('Campaign Alerts', 'campaign-alerts', '0 9 * * *', 'Alertas de campanhas às 9h')
ON CONFLICT (automation_name) DO NOTHING;