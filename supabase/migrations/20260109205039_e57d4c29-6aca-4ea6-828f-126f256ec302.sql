-- Function to calculate cadence metrics for a lead
CREATE OR REPLACE FUNCTION public.calculate_cadence_metrics(p_lead_id UUID)
RETURNS TABLE (
  tempo_medio_resposta_minutos INTEGER,
  numero_interacoes_dia NUMERIC,
  tempo_entre_interacoes_media_horas NUMERIC,
  melhor_horario_resposta INTEGER,
  taxa_resposta_24h NUMERIC,
  total_interacoes INTEGER,
  primeira_interacao TIMESTAMPTZ,
  ultima_interacao TIMESTAMPTZ,
  dias_ativos INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH interaction_data AS (
    SELECT 
      i.id,
      i.created_at,
      i.type,
      LAG(i.created_at) OVER (ORDER BY i.created_at) as prev_interaction_at,
      EXTRACT(HOUR FROM i.created_at) as interaction_hour
    FROM crm_lead_interactions i
    WHERE i.lead_id = p_lead_id
    ORDER BY i.created_at
  ),
  time_gaps AS (
    SELECT 
      EXTRACT(EPOCH FROM (created_at - prev_interaction_at)) / 60 as gap_minutes,
      EXTRACT(EPOCH FROM (created_at - prev_interaction_at)) / 3600 as gap_hours,
      CASE WHEN EXTRACT(EPOCH FROM (created_at - prev_interaction_at)) < 86400 THEN 1 ELSE 0 END as within_24h,
      interaction_hour
    FROM interaction_data
    WHERE prev_interaction_at IS NOT NULL
  ),
  aggregated AS (
    SELECT
      COALESCE(ROUND(AVG(gap_minutes))::INTEGER, 0) as avg_response_minutes,
      COALESCE(ROUND(AVG(gap_hours)::NUMERIC, 2), 0) as avg_hours_between,
      COALESCE(ROUND(SUM(within_24h)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1), 0) as response_rate_24h,
      MODE() WITHIN GROUP (ORDER BY interaction_hour)::INTEGER as best_hour
    FROM time_gaps
  ),
  total_stats AS (
    SELECT
      COUNT(*)::INTEGER as total_count,
      MIN(created_at) as first_interaction,
      MAX(created_at) as last_interaction,
      GREATEST(1, EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) + 1)::INTEGER as active_days
    FROM crm_lead_interactions
    WHERE lead_id = p_lead_id
  )
  SELECT
    a.avg_response_minutes,
    ROUND(t.total_count::NUMERIC / NULLIF(t.active_days, 0), 2),
    a.avg_hours_between,
    COALESCE(a.best_hour, 9),
    a.response_rate_24h,
    t.total_count,
    t.first_interaction,
    t.last_interaction,
    t.active_days
  FROM aggregated a
  CROSS JOIN total_stats t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get cadence metrics for all leads of a seller
CREATE OR REPLACE FUNCTION public.get_seller_cadence_summary(p_seller_id UUID)
RETURNS TABLE (
  total_leads_ativos INTEGER,
  media_interacoes_por_lead NUMERIC,
  tempo_medio_resposta_geral INTEGER,
  leads_sem_contato_24h INTEGER,
  leads_sem_contato_48h INTEGER,
  melhor_horario_geral INTEGER,
  pior_horario_geral INTEGER,
  taxa_resposta_geral NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH seller_leads AS (
    SELECT id FROM crm_leads 
    WHERE assigned_to = p_seller_id 
    AND lost_at IS NULL 
    AND won_at IS NULL
  ),
  interaction_stats AS (
    SELECT 
      i.lead_id,
      COUNT(*) as interaction_count,
      MAX(i.created_at) as last_interaction,
      EXTRACT(HOUR FROM i.created_at) as interaction_hour
    FROM crm_lead_interactions i
    INNER JOIN seller_leads sl ON i.lead_id = sl.id
    GROUP BY i.lead_id, EXTRACT(HOUR FROM i.created_at)
  ),
  response_times AS (
    SELECT 
      i.lead_id,
      EXTRACT(EPOCH FROM (i.created_at - LAG(i.created_at) OVER (PARTITION BY i.lead_id ORDER BY i.created_at))) / 60 as response_minutes
    FROM crm_lead_interactions i
    INNER JOIN seller_leads sl ON i.lead_id = sl.id
  ),
  hour_distribution AS (
    SELECT 
      interaction_hour,
      COUNT(*) as count
    FROM interaction_stats
    GROUP BY interaction_hour
    ORDER BY count DESC
  ),
  no_contact_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE last_interaction < NOW() - INTERVAL '24 hours' OR last_interaction IS NULL) as no_contact_24h,
      COUNT(*) FILTER (WHERE last_interaction < NOW() - INTERVAL '48 hours' OR last_interaction IS NULL) as no_contact_48h
    FROM (
      SELECT l.id, MAX(i.created_at) as last_interaction
      FROM seller_leads l
      LEFT JOIN crm_lead_interactions i ON l.id = i.lead_id
      GROUP BY l.id
    ) lead_last_contact
  )
  SELECT
    (SELECT COUNT(*)::INTEGER FROM seller_leads),
    COALESCE(ROUND(AVG(interaction_count)::NUMERIC, 2), 0),
    COALESCE(ROUND(AVG(response_minutes))::INTEGER, 0),
    COALESCE(ncs.no_contact_24h::INTEGER, 0),
    COALESCE(ncs.no_contact_48h::INTEGER, 0),
    COALESCE((SELECT interaction_hour::INTEGER FROM hour_distribution LIMIT 1), 9),
    COALESCE((SELECT interaction_hour::INTEGER FROM hour_distribution ORDER BY count ASC LIMIT 1), 18),
    COALESCE(
      ROUND(
        (SELECT COUNT(*) FILTER (WHERE response_minutes < 1440) * 100.0 / NULLIF(COUNT(*), 0) FROM response_times)::NUMERIC, 
        1
      ), 
      0
    )
  FROM no_contact_stats ncs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get hourly distribution of interactions
CREATE OR REPLACE FUNCTION public.get_interaction_hour_distribution(p_lead_id UUID DEFAULT NULL, p_seller_id UUID DEFAULT NULL)
RETURNS TABLE (
  hora INTEGER,
  total_interacoes BIGINT,
  percentual NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_interactions AS (
    SELECT 
      EXTRACT(HOUR FROM i.created_at)::INTEGER as hour
    FROM crm_lead_interactions i
    INNER JOIN crm_leads l ON i.lead_id = l.id
    WHERE 
      (p_lead_id IS NULL OR i.lead_id = p_lead_id)
      AND (p_seller_id IS NULL OR l.assigned_to = p_seller_id)
  ),
  hour_counts AS (
    SELECT 
      hour,
      COUNT(*) as count
    FROM filtered_interactions
    GROUP BY hour
  ),
  total AS (
    SELECT SUM(count)::NUMERIC as total_count FROM hour_counts
  )
  SELECT 
    hc.hour,
    hc.count,
    ROUND(hc.count * 100.0 / NULLIF(t.total_count, 0), 1)
  FROM hour_counts hc
  CROSS JOIN total t
  ORDER BY hc.hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;