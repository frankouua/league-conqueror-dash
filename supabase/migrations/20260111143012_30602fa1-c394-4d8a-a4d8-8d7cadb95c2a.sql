-- Tabela para backups de importação
CREATE TABLE public.data_import_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  backup_date TIMESTAMPTZ DEFAULT now(),
  backup_type TEXT NOT NULL,
  revenue_records_count INT DEFAULT 0,
  executed_records_count INT DEFAULT 0,
  rfv_customers_count INT DEFAULT 0,
  backup_data JSONB NOT NULL DEFAULT '{}',
  tables_backed_up TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'completed',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_by UUID,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para logs de importação
CREATE TABLE public.data_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID DEFAULT gen_random_uuid(),
  backup_id UUID REFERENCES public.data_import_backups(id),
  file_type TEXT NOT NULL,
  file_name TEXT,
  period_start DATE,
  period_end DATE,
  total_rows INT DEFAULT 0,
  imported_rows INT DEFAULT 0,
  updated_rows INT DEFAULT 0,
  skipped_rows INT DEFAULT 0,
  duplicate_rows INT DEFAULT 0,
  error_rows INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  duplicates_removed JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  duration_seconds INT,
  rfv_recalculated BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_import_logs_status ON public.data_import_logs(status);
CREATE INDEX idx_import_logs_created_at ON public.data_import_logs(created_at DESC);
CREATE INDEX idx_import_backups_status ON public.data_import_backups(status);
CREATE INDEX idx_import_backups_expires ON public.data_import_backups(expires_at);

-- Enable RLS
ALTER TABLE public.data_import_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_import_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para admins apenas
CREATE POLICY "Admins can manage import backups" ON public.data_import_backups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage import logs" ON public.data_import_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );