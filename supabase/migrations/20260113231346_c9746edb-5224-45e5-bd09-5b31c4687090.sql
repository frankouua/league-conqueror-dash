
-- Update the get_recurrence_opportunities function for better matching
CREATE OR REPLACE FUNCTION public.get_recurrence_opportunities(
  p_days_before INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 2000,
  p_year_from INTEGER DEFAULT 2024
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    INNER JOIN public.recurrent_procedures rp ON (
      -- More flexible matching: match by code OR by partial name
      SPLIT_PART(LOWER(er.procedure_name), ' - ', 1) = SPLIT_PART(LOWER(rp.procedure_name), ' - ', 1)
      OR LOWER(er.procedure_name) LIKE '%' || LOWER(SPLIT_PART(rp.procedure_name, ' - ', 1)) || '%'
    )
    WHERE er.patient_name IS NOT NULL
      AND er.date IS NOT NULL
      AND rp.is_active = true
      AND EXTRACT(YEAR FROM er.date) >= p_year_from
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
    OR (cl.prontuario = lp.p_prontuario AND lp.p_prontuario IS NOT NULL)
  WHERE lp.calc_days_overdue > -p_days_before
  ORDER BY lp.calc_days_overdue DESC
  LIMIT p_limit;
END;
$$;
