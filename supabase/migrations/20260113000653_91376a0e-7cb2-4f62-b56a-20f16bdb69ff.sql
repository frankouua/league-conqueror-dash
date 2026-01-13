-- Corrigir funções com nomes de colunas não ambíguos
DROP FUNCTION IF EXISTS public.get_recurrence_opportunities(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_recurrence_stats();

-- Função para identificar oportunidades de recorrência (CORRIGIDA - nomes sem ambiguidade)
CREATE OR REPLACE FUNCTION public.get_recurrence_opportunities(
  p_days_before INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  out_patient_name TEXT,
  out_patient_phone TEXT,
  out_patient_email TEXT,
  out_patient_cpf TEXT,
  out_patient_prontuario TEXT,
  out_procedure_name TEXT,
  out_procedure_group TEXT,
  out_last_procedure_date DATE,
  out_recurrence_days INTEGER,
  out_due_date DATE,
  out_days_overdue INTEGER,
  out_urgency_level TEXT,
  out_whatsapp_script TEXT,
  out_existing_lead_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH patient_procedures AS (
    SELECT 
      er.patient_name AS p_name,
      er.patient_phone AS p_phone,
      er.patient_email AS p_email,
      er.patient_cpf AS p_cpf,
      er.patient_prontuario AS p_prontuario,
      er.procedure_name AS proc_name,
      rp.group_name AS p_group,
      er.date::DATE AS proc_date,
      rp.recurrence_days AS rec_days,
      (er.date::DATE + rp.recurrence_days) AS calc_due_date,
      (CURRENT_DATE - (er.date::DATE + rp.recurrence_days))::INTEGER AS calc_days_overdue,
      rp.script_whatsapp AS script_wa,
      rp.id AS procedure_id
    FROM public.executed_records er
    INNER JOIN public.recurrent_procedures rp 
      ON LOWER(er.procedure_name) LIKE '%' || LOWER(rp.procedure_name) || '%'
      OR LOWER(er.department) LIKE '%' || LOWER(rp.group_name) || '%'
    WHERE er.patient_name IS NOT NULL
      AND er.date IS NOT NULL
      AND rp.is_active = true
  ),
  ranked_procedures AS (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY COALESCE(p_cpf, p_phone, p_name) ORDER BY proc_date DESC) as rn
    FROM patient_procedures
  ),
  latest_procedures AS (
    SELECT * FROM ranked_procedures WHERE rn = 1
  )
  SELECT 
    lp.p_name,
    lp.p_phone,
    lp.p_email,
    lp.p_cpf,
    lp.p_prontuario,
    lp.proc_name,
    lp.p_group,
    lp.proc_date,
    lp.rec_days,
    lp.calc_due_date,
    lp.calc_days_overdue,
    CASE 
      WHEN lp.calc_days_overdue > 60 THEN 'critical'
      WHEN lp.calc_days_overdue > 0 THEN 'overdue'
      WHEN lp.calc_days_overdue > -p_days_before THEN 'upcoming'
      ELSE 'future'
    END AS calc_urgency_level,
    lp.script_wa,
    cl.id AS existing_lead_id
  FROM latest_procedures lp
  LEFT JOIN public.crm_leads cl 
    ON (cl.cpf = lp.p_cpf AND lp.p_cpf IS NOT NULL)
    OR (cl.phone = lp.p_phone AND lp.p_phone IS NOT NULL)
    OR (cl.prontuario = lp.p_prontuario AND lp.p_prontuario IS NOT NULL)
  WHERE lp.calc_days_overdue > -p_days_before
  ORDER BY lp.calc_days_overdue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função de estatísticas de recorrência (CORRIGIDA)
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
      COUNT(*) FILTER (WHERE out_urgency_level = 'upcoming') AS upcoming,
      COUNT(*) FILTER (WHERE out_urgency_level = 'overdue') AS overdue,
      COUNT(*) FILTER (WHERE out_urgency_level = 'critical') AS critical
    FROM opportunities
  ),
  by_group AS (
    SELECT COALESCE(jsonb_object_agg(
      COALESCE(out_procedure_group, 'Outros'),
      group_count
    ), '{}'::jsonb) AS groups
    FROM (
      SELECT out_procedure_group, COUNT(*) AS group_count
      FROM opportunities
      GROUP BY out_procedure_group
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;