-- Function to calculate sentiment statistics from CRM lead interactions
CREATE OR REPLACE FUNCTION public.get_sentiment_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_count INTEGER;
  positive_count INTEGER;
  neutral_count INTEGER;
  negative_count INTEGER;
BEGIN
  -- Get total interactions with sentiment
  SELECT COUNT(*) INTO total_count 
  FROM crm_lead_interactions 
  WHERE sentiment IS NOT NULL;

  IF total_count = 0 THEN
    RETURN json_build_object(
      'positive', 0,
      'neutral', 0,
      'negative', 0,
      'total', 0,
      'top_intentions', '[]'::json,
      'negative_leads', '[]'::json
    );
  END IF;

  -- Count by sentiment
  SELECT COUNT(*) INTO positive_count 
  FROM crm_lead_interactions 
  WHERE sentiment = 'positive';

  SELECT COUNT(*) INTO neutral_count 
  FROM crm_lead_interactions 
  WHERE sentiment = 'neutral';

  SELECT COUNT(*) INTO negative_count 
  FROM crm_lead_interactions 
  WHERE sentiment = 'negative';

  -- Build result with top intentions and negative leads
  SELECT json_build_object(
    'positive', ROUND((positive_count::numeric / total_count) * 100, 1),
    'neutral', ROUND((neutral_count::numeric / total_count) * 100, 1),
    'negative', ROUND((negative_count::numeric / total_count) * 100, 1),
    'positive_count', positive_count,
    'neutral_count', neutral_count,
    'negative_count', negative_count,
    'total', total_count,
    'top_intentions', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT intention, COUNT(*) as count
        FROM crm_lead_interactions
        WHERE intention IS NOT NULL
        GROUP BY intention
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'negative_leads', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT 
          l.id,
          l.name,
          l.phone,
          l.temperature,
          COUNT(*) as negative_count,
          MAX(i.created_at) as last_negative_at
        FROM crm_lead_interactions i
        JOIN crm_leads l ON l.id = i.lead_id
        WHERE i.sentiment = 'negative'
        GROUP BY l.id, l.name, l.phone, l.temperature
        ORDER BY negative_count DESC, last_negative_at DESC
        LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get sentiment stats for a specific period
CREATE OR REPLACE FUNCTION public.get_sentiment_stats_by_period(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT (now() - interval '30 days'),
  end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_count INTEGER;
  positive_count INTEGER;
  neutral_count INTEGER;
  negative_count INTEGER;
BEGIN
  -- Get total interactions with sentiment in period
  SELECT COUNT(*) INTO total_count 
  FROM crm_lead_interactions 
  WHERE sentiment IS NOT NULL
    AND created_at BETWEEN start_date AND end_date;

  IF total_count = 0 THEN
    RETURN json_build_object(
      'positive', 0,
      'neutral', 0,
      'negative', 0,
      'total', 0,
      'period_start', start_date,
      'period_end', end_date
    );
  END IF;

  -- Count by sentiment in period
  SELECT COUNT(*) INTO positive_count 
  FROM crm_lead_interactions 
  WHERE sentiment = 'positive'
    AND created_at BETWEEN start_date AND end_date;

  SELECT COUNT(*) INTO neutral_count 
  FROM crm_lead_interactions 
  WHERE sentiment = 'neutral'
    AND created_at BETWEEN start_date AND end_date;

  SELECT COUNT(*) INTO negative_count 
  FROM crm_lead_interactions 
  WHERE sentiment = 'negative'
    AND created_at BETWEEN start_date AND end_date;

  SELECT json_build_object(
    'positive', ROUND((positive_count::numeric / total_count) * 100, 1),
    'neutral', ROUND((neutral_count::numeric / total_count) * 100, 1),
    'negative', ROUND((negative_count::numeric / total_count) * 100, 1),
    'positive_count', positive_count,
    'neutral_count', neutral_count,
    'negative_count', negative_count,
    'total', total_count,
    'period_start', start_date,
    'period_end', end_date,
    'daily_trend', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
      FROM (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) FILTER (WHERE sentiment = 'positive') as positive,
          COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral,
          COUNT(*) FILTER (WHERE sentiment = 'negative') as negative
        FROM crm_lead_interactions
        WHERE created_at BETWEEN start_date AND end_date
          AND sentiment IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY date
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;