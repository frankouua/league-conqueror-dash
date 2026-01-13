
-- Pegar próximo número de sequência
DO $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(procedure_number), 0) + 1 INTO next_num FROM recurrent_procedures;
  
  -- Adicionar procedimentos de Harmonização que faltam
  INSERT INTO recurrent_procedures (procedure_number, procedure_name, group_name, recurrence_days, is_active)
  VALUES 
    (next_num, 'Pro 1.101 - Botox Terço Superior E Inferior', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 180, true),
    (next_num + 1, 'Pro 1.19 - Laser Co2 Full Face', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 2, 'Pro 1.18 - Laser Co2 Full Face Pescoço', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 3, 'Pro 1.96 - Laser Co2 Fracionado Cicatriz', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 4, 'Pro 1.97 - Laser Co2 Fracionado Cicatriz Abdominal', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 5, 'Pro 1.98 - Laser Co2 Fracionado Cicatriz Mamas', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 6, 'Pro 1.99 - Laser Co2 Fracionado Cicatriz Braços', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 7, 'Pro 1.110 - Laser Co2 Fracionado Rejuvenescimento', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 8, 'Pro 1.111 - Laser Co2 Fracionado Clareamento', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 9, 'Pro 1.85 - Ultraformer Rosto', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 180, true),
    (next_num + 10, 'Pro 1.86 - Ultraformer Rosto Completo', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 180, true),
    (next_num + 11, 'Pro 1.43 - Microagulhamento Robótico', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 60, true),
    (next_num + 12, 'Pro 1.150 - Exossomos Facial', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 180, true),
    (next_num + 13, 'Pro 1.151 - Exossomos Capilar', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 180, true),
    (next_num + 14, 'End 1.20 - Endolifiting Full Face', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 15, 'End 1.23 - Endolifiting Full Face Lipo', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 16, 'End 1.24 - Endolifiting Lipo Papada', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 17, 'Pro 1.119 - Morpheus Facial', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 180, true),
    (next_num + 18, 'Pro 1.100 - Luminicen Pdrn', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 90, true),
    (next_num + 19, 'Pro 1.87 - Evo Pdrn Bioremodelador', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 180, true),
    (next_num + 20, 'Pro 1.88 - Hyaluronidase', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 90, true),
    (next_num + 21, 'Pro 1.51 - Preenchedor Yvoire', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 22, 'Pro 1.145 - Rennova Lips', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 180, true),
    (next_num + 23, 'Pro 1.95 - Gold Incision', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true),
    (next_num + 24, 'Com 164 - Preenchimento Facial Gordura Nano Fat', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true);
END $$;

-- Recriar função de match pelo código do procedimento (antes do " - ")
DROP FUNCTION IF EXISTS get_recurrence_opportunities(INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_recurrence_opportunities(
  p_days_before INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 5000,
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
      -- Match pelo código: extrai "Pro 1.63" de "Pro 1.63 - Preenchimento Com Ácido Hialurônico"
      SPLIT_PART(LOWER(er.procedure_name), ' - ', 1) = SPLIT_PART(LOWER(rp.procedure_name), ' - ', 1)
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
