-- Dropar função existente e recriar com nova assinatura
DROP FUNCTION IF EXISTS public.get_recurrence_stats();

-- Recriar função para obter estatísticas de recorrência
CREATE OR REPLACE FUNCTION public.get_recurrence_stats()
RETURNS TABLE (
  total_upcoming BIGINT,
  total_overdue_recent BIGINT,
  total_overdue_critical BIGINT,
  total_recovered_month BIGINT,
  by_procedure_group JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE recurrence_days_overdue < 0 AND recurrence_days_overdue >= -30) AS upcoming,
      COUNT(*) FILTER (WHERE recurrence_days_overdue BETWEEN 1 AND 60) AS overdue_recent,
      COUNT(*) FILTER (WHERE recurrence_days_overdue > 60) AS overdue_critical,
      COUNT(*) FILTER (WHERE 
        won_at IS NOT NULL 
        AND won_at >= date_trunc('month', CURRENT_DATE)
        AND is_recurrence_lead = true
      ) AS recovered
    FROM public.crm_leads
    WHERE is_recurrence_lead = true
  ),
  by_group AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'group', recurrence_group,
        'count', cnt,
        'overdue', overdue_cnt
      )
    ) AS groups
    FROM (
      SELECT 
        recurrence_group,
        COUNT(*) AS cnt,
        COUNT(*) FILTER (WHERE recurrence_days_overdue > 0) AS overdue_cnt
      FROM public.crm_leads
      WHERE is_recurrence_lead = true AND recurrence_group IS NOT NULL
      GROUP BY recurrence_group
      ORDER BY cnt DESC
    ) sub
  )
  SELECT 
    s.upcoming,
    s.overdue_recent,
    s.overdue_critical,
    s.recovered,
    COALESCE(bg.groups, '[]'::jsonb)
  FROM stats s
  CROSS JOIN by_group bg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;