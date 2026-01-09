-- Add help_score and churn probability columns to crm_leads if they don't exist
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS help_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_churn_probability DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS churn_risk_level TEXT DEFAULT 'low',
ADD COLUMN IF NOT EXISTS help_score_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS churn_analyzed_at TIMESTAMP WITH TIME ZONE;

-- Create function to calculate Help Score (0-100)
CREATE OR REPLACE FUNCTION public.calculate_help_score(p_lead_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score INTEGER := 0;
  v_days_since_first_contact INTEGER;
  v_num_interactions INTEGER;
  v_positive_sentiment_pct DECIMAL;
  v_total_value DECIMAL;
  v_has_won BOOLEAN;
  v_temperature TEXT;
BEGIN
  -- Get lead data
  SELECT 
    EXTRACT(DAY FROM NOW() - created_at)::INTEGER,
    COALESCE(estimated_value, 0) + COALESCE(contract_value, 0),
    won_at IS NOT NULL,
    temperature
  INTO v_days_since_first_contact, v_total_value, v_has_won, v_temperature
  FROM crm_leads 
  WHERE id = p_lead_id;

  -- Count interactions
  SELECT COUNT(*) 
  INTO v_num_interactions
  FROM crm_lead_interactions 
  WHERE lead_id = p_lead_id;

  -- Calculate positive sentiment percentage
  SELECT 
    COALESCE(
      COUNT(*) FILTER (WHERE sentiment = 'positive')::DECIMAL / 
      NULLIF(COUNT(*), 0) * 100, 
      0
    )
  INTO v_positive_sentiment_pct
  FROM crm_lead_interactions 
  WHERE lead_id = p_lead_id;

  -- Calculate Help Score with weighted formula
  -- Days relationship (max 20 points) - longer = better
  v_score := v_score + LEAST(v_days_since_first_contact / 3, 20);
  
  -- Number of interactions (max 30 points) - more = better
  v_score := v_score + LEAST(v_num_interactions * 3, 30);
  
  -- Positive sentiment (max 25 points)
  v_score := v_score + ROUND(v_positive_sentiment_pct * 0.25)::INTEGER;
  
  -- Value contribution (max 15 points)
  v_score := v_score + LEAST(ROUND(v_total_value / 1000)::INTEGER, 15);
  
  -- Temperature bonus (max 10 points)
  v_score := v_score + CASE 
    WHEN v_temperature = 'hot' THEN 10
    WHEN v_temperature = 'warm' THEN 5
    ELSE 0
  END;
  
  -- Won deal bonus
  IF v_has_won THEN
    v_score := v_score + 10;
  END IF;

  -- Limit between 0 and 100
  v_score := LEAST(GREATEST(v_score, 0), 100);

  -- Update lead with new score
  UPDATE crm_leads 
  SET help_score = v_score, 
      help_score_updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN v_score;
END;
$$;

-- Create function to calculate churn probability for a lead
CREATE OR REPLACE FUNCTION public.calculate_churn_probability(p_lead_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_probability DECIMAL := 0;
  v_days_without_contact INTEGER;
  v_num_interactions INTEGER;
  v_negative_sentiment_pct DECIMAL;
  v_is_stale BOOLEAN;
  v_last_activity TIMESTAMP WITH TIME ZONE;
  v_risk_level TEXT;
BEGIN
  -- Get lead data
  SELECT 
    last_activity_at,
    is_stale
  INTO v_last_activity, v_is_stale
  FROM crm_leads 
  WHERE id = p_lead_id;

  -- Calculate days without contact
  v_days_without_contact := EXTRACT(DAY FROM NOW() - COALESCE(v_last_activity, NOW() - INTERVAL '90 days'))::INTEGER;

  -- Count interactions
  SELECT COUNT(*) 
  INTO v_num_interactions
  FROM crm_lead_interactions 
  WHERE lead_id = p_lead_id;

  -- Calculate negative sentiment percentage
  SELECT 
    COALESCE(
      COUNT(*) FILTER (WHERE sentiment = 'negative')::DECIMAL / 
      NULLIF(COUNT(*), 0), 
      0
    )
  INTO v_negative_sentiment_pct
  FROM crm_lead_interactions 
  WHERE lead_id = p_lead_id;

  -- Calculate churn probability
  -- Days without contact factor
  IF v_days_without_contact > 60 THEN
    v_probability := v_probability + 0.4;
  ELSIF v_days_without_contact > 30 THEN
    v_probability := v_probability + 0.25;
  ELSIF v_days_without_contact > 14 THEN
    v_probability := v_probability + 0.1;
  END IF;

  -- Negative sentiment factor
  IF v_negative_sentiment_pct > 0.5 THEN
    v_probability := v_probability + 0.25;
  ELSIF v_negative_sentiment_pct > 0.3 THEN
    v_probability := v_probability + 0.15;
  END IF;

  -- Low engagement factor
  IF v_num_interactions < 3 THEN
    v_probability := v_probability + 0.15;
  ELSIF v_num_interactions < 5 THEN
    v_probability := v_probability + 0.08;
  END IF;

  -- Stale lead factor
  IF v_is_stale THEN
    v_probability := v_probability + 0.15;
  END IF;

  -- Limit between 0 and 1
  v_probability := LEAST(GREATEST(v_probability, 0), 1);

  -- Determine risk level
  v_risk_level := CASE 
    WHEN v_probability >= 0.7 THEN 'critical'
    WHEN v_probability >= 0.5 THEN 'high'
    WHEN v_probability >= 0.3 THEN 'medium'
    ELSE 'low'
  END;

  -- Update lead
  UPDATE crm_leads 
  SET 
    ai_churn_probability = v_probability,
    churn_risk_level = v_risk_level,
    churn_analyzed_at = NOW()
  WHERE id = p_lead_id;

  RETURN v_probability;
END;
$$;

-- Create function to batch calculate all active leads
CREATE OR REPLACE FUNCTION public.batch_calculate_predictive_scores()
RETURNS TABLE(
  leads_processed INTEGER,
  high_risk_count INTEGER,
  avg_help_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_processed INTEGER := 0;
  v_high_risk INTEGER := 0;
  v_total_score INTEGER := 0;
BEGIN
  FOR v_lead IN 
    SELECT id FROM crm_leads 
    WHERE won_at IS NULL AND lost_at IS NULL
  LOOP
    PERFORM calculate_help_score(v_lead.id);
    
    IF calculate_churn_probability(v_lead.id) >= 0.7 THEN
      v_high_risk := v_high_risk + 1;
    END IF;
    
    v_processed := v_processed + 1;
  END LOOP;

  -- Calculate average help score
  SELECT COALESCE(AVG(help_score), 0) INTO v_total_score
  FROM crm_leads
  WHERE won_at IS NULL AND lost_at IS NULL;

  RETURN QUERY SELECT v_processed, v_high_risk, v_total_score::DECIMAL;
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_churn ON crm_leads(ai_churn_probability) WHERE ai_churn_probability >= 0.5;
CREATE INDEX IF NOT EXISTS idx_crm_leads_help_score ON crm_leads(help_score DESC);