-- Dropar função existente que tem tipo de retorno diferente
DROP FUNCTION IF EXISTS public.get_recurrence_stats();
DROP FUNCTION IF EXISTS public.get_recurrence_opportunities(INTEGER, INTEGER);

-- Adicionar colunas de recorrência no crm_leads (caso ainda não existam)
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS last_procedure_date DATE,
ADD COLUMN IF NOT EXISTS last_procedure_name TEXT,
ADD COLUMN IF NOT EXISTS recurrence_due_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_days_overdue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recurrence_group TEXT,
ADD COLUMN IF NOT EXISTS is_recurrence_lead BOOLEAN DEFAULT FALSE;

-- Criar índices para recorrência
CREATE INDEX IF NOT EXISTS idx_crm_leads_recurrence ON public.crm_leads(is_recurrence_lead) WHERE is_recurrence_lead = true;
CREATE INDEX IF NOT EXISTS idx_crm_leads_recurrence_due ON public.crm_leads(recurrence_due_date) WHERE recurrence_due_date IS NOT NULL;

-- Inserir estágios de recorrência no pipeline Farmer (apenas se não existirem)
INSERT INTO public.crm_stages (id, pipeline_id, name, description, color, order_index, icon)
SELECT gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Recorrência - Por Vencer', 'Pacientes com procedimento próximo de vencer (30 dias)', '#F59E0B', 10, 'Clock'
WHERE NOT EXISTS (SELECT 1 FROM public.crm_stages WHERE name = 'Recorrência - Por Vencer' AND pipeline_id = '44444444-4444-4444-4444-444444444444');

INSERT INTO public.crm_stages (id, pipeline_id, name, description, color, order_index, icon)
SELECT gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Recorrência - Vencido Recente', 'Pacientes com procedimento vencido há menos de 60 dias', '#F97316', 11, 'AlertTriangle'
WHERE NOT EXISTS (SELECT 1 FROM public.crm_stages WHERE name = 'Recorrência - Vencido Recente' AND pipeline_id = '44444444-4444-4444-4444-444444444444');

INSERT INTO public.crm_stages (id, pipeline_id, name, description, color, order_index, icon)
SELECT gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Recorrência - Vencido Crítico', 'Pacientes com procedimento vencido há mais de 60 dias', '#EF4444', 12, 'AlertCircle'
WHERE NOT EXISTS (SELECT 1 FROM public.crm_stages WHERE name = 'Recorrência - Vencido Crítico' AND pipeline_id = '44444444-4444-4444-4444-444444444444');

INSERT INTO public.crm_stages (id, pipeline_id, name, description, color, order_index, icon)
SELECT gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'Recorrência - Recuperado', 'Paciente que renovou o procedimento', '#10B981', 13, 'CheckCircle2'
WHERE NOT EXISTS (SELECT 1 FROM public.crm_stages WHERE name = 'Recorrência - Recuperado' AND pipeline_id = '44444444-4444-4444-4444-444444444444');

-- Função para calcular dias de atraso automaticamente
CREATE OR REPLACE FUNCTION public.calculate_recurrence_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recurrence_due_date IS NOT NULL THEN
    NEW.recurrence_days_overdue := GREATEST(0, (CURRENT_DATE - NEW.recurrence_due_date)::INTEGER);
  ELSE
    NEW.recurrence_days_overdue := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular dias de atraso
DROP TRIGGER IF EXISTS trigger_calculate_recurrence_overdue ON public.crm_leads;
CREATE TRIGGER trigger_calculate_recurrence_overdue
  BEFORE INSERT OR UPDATE OF recurrence_due_date ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_recurrence_overdue();

-- Função para identificar oportunidades de recorrência
CREATE OR REPLACE FUNCTION public.get_recurrence_opportunities(
  p_days_before INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  patient_cpf TEXT,
  patient_prontuario TEXT,
  procedure_name TEXT,
  procedure_group TEXT,
  last_procedure_date DATE,
  recurrence_days INTEGER,
  due_date DATE,
  days_overdue INTEGER,
  urgency_level TEXT,
  whatsapp_script TEXT,
  existing_lead_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH patient_procedures AS (
    SELECT 
      er.patient_name,
      er.patient_phone,
      er.patient_email,
      er.patient_cpf,
      er.patient_prontuario,
      er.procedure_name AS proc_name,
      rp.procedure_group,
      er.date::DATE AS proc_date,
      rp.recurrence_days,
      (er.date::DATE + rp.recurrence_days) AS calc_due_date,
      (CURRENT_DATE - (er.date::DATE + rp.recurrence_days))::INTEGER AS calc_days_overdue,
      rp.script_whatsapp,
      rp.id AS procedure_id
    FROM public.executed_records er
    INNER JOIN public.recurrent_procedures rp 
      ON LOWER(er.procedure_name) LIKE '%' || LOWER(rp.procedure_name) || '%'
      OR LOWER(er.department) LIKE '%' || LOWER(rp.procedure_group) || '%'
    WHERE er.patient_name IS NOT NULL
      AND er.date IS NOT NULL
  ),
  ranked_procedures AS (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY COALESCE(patient_cpf, patient_phone, patient_name) ORDER BY proc_date DESC) as rn
    FROM patient_procedures
  ),
  latest_procedures AS (
    SELECT * FROM ranked_procedures WHERE rn = 1
  )
  SELECT 
    lp.patient_name,
    lp.patient_phone,
    lp.patient_email,
    lp.patient_cpf,
    lp.patient_prontuario,
    lp.proc_name,
    lp.procedure_group,
    lp.proc_date,
    lp.recurrence_days,
    lp.calc_due_date,
    lp.calc_days_overdue,
    CASE 
      WHEN lp.calc_days_overdue > 60 THEN 'critical'
      WHEN lp.calc_days_overdue > 0 THEN 'overdue'
      WHEN lp.calc_days_overdue > -p_days_before THEN 'upcoming'
      ELSE 'future'
    END AS calc_urgency_level,
    lp.script_whatsapp,
    cl.id AS existing_lead_id
  FROM latest_procedures lp
  LEFT JOIN public.crm_leads cl 
    ON (cl.cpf = lp.patient_cpf AND lp.patient_cpf IS NOT NULL)
    OR (cl.phone = lp.patient_phone AND lp.patient_phone IS NOT NULL)
    OR (cl.prontuario = lp.patient_prontuario AND lp.patient_prontuario IS NOT NULL)
  WHERE lp.calc_days_overdue > -p_days_before
  ORDER BY lp.calc_days_overdue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de estatísticas de recorrência
CREATE OR REPLACE FUNCTION public.get_recurrence_stats()
RETURNS TABLE (
  total_pending BIGINT,
  upcoming_30_days BIGINT,
  overdue_recent BIGINT,
  overdue_critical BIGINT,
  by_procedure_group JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH opportunities AS (
    SELECT * FROM public.get_recurrence_opportunities(30, 10000)
  ),
  stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE urgency_level = 'upcoming') AS upcoming,
      COUNT(*) FILTER (WHERE urgency_level = 'overdue') AS overdue,
      COUNT(*) FILTER (WHERE urgency_level = 'critical') AS critical
    FROM opportunities
  ),
  by_group AS (
    SELECT COALESCE(jsonb_object_agg(
      COALESCE(procedure_group, 'Outros'),
      group_count
    ), '{}'::jsonb) AS groups
    FROM (
      SELECT procedure_group, COUNT(*) AS group_count
      FROM opportunities
      GROUP BY procedure_group
    ) g
  )
  SELECT 
    s.total,
    s.upcoming,
    s.overdue,
    s.critical,
    bg.groups
  FROM stats s
  CROSS JOIN by_group bg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;