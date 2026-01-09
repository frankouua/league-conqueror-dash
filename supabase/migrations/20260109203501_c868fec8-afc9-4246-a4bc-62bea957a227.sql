-- Função SQL para calcular KPIs completos por vendedor
CREATE OR REPLACE FUNCTION get_vendedor_kpis(vendedor_id uuid)
RETURNS TABLE (
  leads_ativos bigint,
  leads_total bigint,
  vendas_mes bigint,
  perdas_mes bigint,
  taxa_conversao numeric,
  faturamento_mes numeric,
  ciclo_medio_dias numeric,
  ticket_medio numeric,
  ltv numeric,
  leads_quentes bigint,
  leads_parados bigint,
  atividades_mes bigint,
  tempo_medio_resposta_horas numeric
) 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_month_start timestamp;
  v_month_end timestamp;
BEGIN
  v_month_start := date_trunc('month', NOW());
  v_month_end := date_trunc('month', NOW()) + interval '1 month' - interval '1 second';
  
  RETURN QUERY
  WITH lead_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE won_at IS NULL AND lost_at IS NULL) as active_leads,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE won_at IS NOT NULL AND won_at >= v_month_start AND won_at <= v_month_end) as won_this_month,
      COUNT(*) FILTER (WHERE lost_at IS NOT NULL AND lost_at >= v_month_start AND lost_at <= v_month_end) as lost_this_month,
      COALESCE(SUM(CASE WHEN won_at IS NOT NULL AND won_at >= v_month_start AND won_at <= v_month_end 
        THEN COALESCE(contract_value, estimated_value, 0) ELSE 0 END), 0) as revenue_this_month,
      COUNT(*) FILTER (WHERE temperature = 'hot' AND won_at IS NULL AND lost_at IS NULL) as hot_leads,
      COUNT(*) FILTER (WHERE is_stale = true AND won_at IS NULL AND lost_at IS NULL) as stale_leads
    FROM crm_leads
    WHERE assigned_to = vendedor_id
  ),
  cycle_stats AS (
    SELECT 
      AVG(EXTRACT(EPOCH FROM (won_at - created_at)) / 86400)::numeric as avg_cycle_days
    FROM crm_leads
    WHERE assigned_to = vendedor_id
      AND won_at IS NOT NULL
      AND won_at >= v_month_start
  ),
  activity_stats AS (
    SELECT 
      COUNT(*) as activities_count
    FROM crm_lead_history
    WHERE performed_by = vendedor_id
      AND created_at >= v_month_start
  ),
  ltv_stats AS (
    SELECT 
      COALESCE(AVG(COALESCE(contract_value, estimated_value, 0)), 0) as avg_customer_value,
      COUNT(*) as total_wins
    FROM crm_leads
    WHERE assigned_to = vendedor_id
      AND won_at IS NOT NULL
  )
  SELECT 
    ls.active_leads::bigint,
    ls.total_leads::bigint,
    ls.won_this_month::bigint,
    ls.lost_this_month::bigint,
    CASE WHEN (ls.won_this_month + ls.lost_this_month) > 0 
      THEN ROUND((ls.won_this_month::numeric / (ls.won_this_month + ls.lost_this_month)) * 100, 1)
      ELSE 0 END,
    ls.revenue_this_month::numeric,
    COALESCE(cs.avg_cycle_days, 0)::numeric,
    CASE WHEN ls.won_this_month > 0 
      THEN ROUND(ls.revenue_this_month::numeric / ls.won_this_month, 2)
      ELSE 0 END,
    (lts.avg_customer_value * 2.5)::numeric,
    ls.hot_leads::bigint,
    ls.stale_leads::bigint,
    acts.activities_count::bigint,
    0::numeric as avg_response_time
  FROM lead_stats ls
  CROSS JOIN cycle_stats cs
  CROSS JOIN activity_stats acts
  CROSS JOIN ltv_stats lts;
END;
$$;

-- Função para listar todos os vendedores com seus KPIs (para visão expandida)
CREATE OR REPLACE FUNCTION get_all_vendedores_kpis(team_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  seller_name text,
  seller_avatar_url text,
  seller_position text,
  leads_ativos bigint,
  vendas_mes bigint,
  taxa_conversao numeric,
  faturamento_mes numeric,
  ciclo_medio_dias numeric,
  ticket_medio numeric,
  ltv numeric,
  leads_quentes bigint,
  atividades_mes bigint,
  rank_position bigint
) 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_month_start timestamp;
  v_month_end timestamp;
BEGIN
  v_month_start := date_trunc('month', NOW());
  v_month_end := date_trunc('month', NOW()) + interval '1 month' - interval '1 second';
  
  RETURN QUERY
  WITH seller_profiles AS (
    SELECT p.user_id, p.full_name, p.avatar_url, p."position"
    FROM profiles p
    WHERE (team_id_param IS NULL OR p.team_id = team_id_param)
      AND p."position" IN (
        'Pré-vendedor', 'Vendedor', 'Vendedor (Pré-agenda)', 
        'Closer', 'Especialista de Vendas', 'Consultor', 
        'Atendente', 'SDR', 'BDR', 'Account Executive'
      )
  ),
  seller_stats AS (
    SELECT 
      sp.user_id,
      sp.full_name,
      sp.avatar_url,
      sp."position" as pos,
      COUNT(*) FILTER (WHERE l.won_at IS NULL AND l.lost_at IS NULL) as active_leads,
      COUNT(*) FILTER (WHERE l.won_at >= v_month_start AND l.won_at <= v_month_end) as won_count,
      COUNT(*) FILTER (WHERE l.lost_at >= v_month_start AND l.lost_at <= v_month_end) as lost_count,
      COALESCE(SUM(CASE WHEN l.won_at >= v_month_start AND l.won_at <= v_month_end 
        THEN COALESCE(l.contract_value, l.estimated_value, 0) ELSE 0 END), 0) as revenue,
      COUNT(*) FILTER (WHERE l.temperature = 'hot' AND l.won_at IS NULL AND l.lost_at IS NULL) as hot_count,
      AVG(CASE WHEN l.won_at >= v_month_start 
        THEN EXTRACT(EPOCH FROM (l.won_at - l.created_at)) / 86400 END) as cycle_days,
      COALESCE(AVG(CASE WHEN l.won_at IS NOT NULL THEN COALESCE(l.contract_value, l.estimated_value, 0) END), 0) as avg_value
    FROM seller_profiles sp
    LEFT JOIN crm_leads l ON l.assigned_to = sp.user_id
    GROUP BY sp.user_id, sp.full_name, sp.avatar_url, sp."position"
  ),
  seller_activities AS (
    SELECT 
      h.performed_by,
      COUNT(*) as act_count
    FROM crm_lead_history h
    WHERE h.created_at >= v_month_start
    GROUP BY h.performed_by
  )
  SELECT 
    ss.user_id,
    ss.full_name::text,
    ss.avatar_url::text,
    ss.pos::text,
    ss.active_leads,
    ss.won_count,
    CASE WHEN (ss.won_count + ss.lost_count) > 0 
      THEN ROUND((ss.won_count::numeric / (ss.won_count + ss.lost_count)) * 100, 1)
      ELSE 0 END,
    ss.revenue,
    COALESCE(ROUND(ss.cycle_days::numeric, 1), 0),
    CASE WHEN ss.won_count > 0 THEN ROUND(ss.revenue / ss.won_count, 2) ELSE 0 END,
    ROUND(ss.avg_value * 2.5, 2),
    ss.hot_count,
    COALESCE(sa.act_count, 0)::bigint,
    ROW_NUMBER() OVER (ORDER BY ss.revenue DESC)::bigint
  FROM seller_stats ss
  LEFT JOIN seller_activities sa ON sa.performed_by = ss.user_id
  ORDER BY ss.revenue DESC;
END;
$$;