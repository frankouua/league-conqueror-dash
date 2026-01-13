
-- Adicionar procedimentos que faltavam (com formato diferente)
DO $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(procedure_number), 0) + 1 INTO next_num FROM recurrent_procedures;
  
  INSERT INTO recurrent_procedures (procedure_number, procedure_name, group_name, recurrence_days, is_active)
  VALUES 
    (next_num, 'Consulta Dr. Leonardo 1.03 - Harmonização Facial', '08 - HARMONIZAÇÃO FACIAL E CORPORAL', 365, true)
  ON CONFLICT DO NOTHING;
END $$;

-- Atualizar função get_recurrence_stats
DROP FUNCTION IF EXISTS get_recurrence_stats(INTEGER);

CREATE OR REPLACE FUNCTION get_recurrence_stats(p_year_from INTEGER DEFAULT 2024)
RETURNS TABLE (
  total_pending BIGINT,
  upcoming_30_days BIGINT,
  overdue_recent BIGINT,
  overdue_critical BIGINT,
  by_procedure_group JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH opportunities AS (
    SELECT * FROM get_recurrence_opportunities(30, 10000, p_year_from)
    WHERE out_days_overdue > -30
  ),
  stats AS (
    SELECT 
      COUNT(*)::BIGINT AS total_pending,
      COUNT(*) FILTER (WHERE out_days_overdue <= 0 AND out_days_overdue > -30)::BIGINT AS upcoming_30_days,
      COUNT(*) FILTER (WHERE out_days_overdue > 0 AND out_days_overdue <= 60)::BIGINT AS overdue_recent,
      COUNT(*) FILTER (WHERE out_days_overdue > 60)::BIGINT AS overdue_critical
    FROM opportunities
  ),
  groups AS (
    SELECT 
      out_procedure_group,
      COUNT(*)::BIGINT as cnt
    FROM opportunities
    GROUP BY out_procedure_group
  )
  SELECT 
    s.total_pending,
    s.upcoming_30_days,
    s.overdue_recent,
    s.overdue_critical,
    COALESCE((SELECT jsonb_object_agg(out_procedure_group, cnt) FROM groups), '{}'::jsonb) AS by_procedure_group
  FROM stats s;
END;
$$;
