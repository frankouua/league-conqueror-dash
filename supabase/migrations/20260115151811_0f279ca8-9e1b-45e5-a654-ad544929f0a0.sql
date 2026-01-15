
-- Corrigir views com SECURITY INVOKER (padrão correto)
DROP VIEW IF EXISTS v_active_leads;
DROP VIEW IF EXISTS v_contacts_with_rfv;

CREATE VIEW v_active_leads WITH (security_invoker = true) AS
SELECT * FROM crm_leads WHERE deleted_at IS NULL;

CREATE VIEW v_contacts_with_rfv WITH (security_invoker = true) AS
SELECT 
  c.*,
  r.recency_score,
  r.frequency_score,
  r.value_score,
  r.rfv_score,
  r.segment,
  r.segment_priority,
  r.churn_risk,
  r.average_ticket,
  r.last_purchase_date,
  r.first_purchase_date
FROM contacts c
LEFT JOIN contact_rfv_metrics r ON c.id = r.contact_id
WHERE c.deleted_at IS NULL;

-- Corrigir funções com search_path
CREATE OR REPLACE FUNCTION get_contact_timeline(p_contact_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  event_subtype TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB,
  reference_table TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT id, event_type, event_subtype, title, description, metadata, reference_table, reference_id, created_at
  FROM contact_timeline
  WHERE contact_id = p_contact_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_contact_profile(p_contact_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_contact JSON;
  v_rfv JSON;
  v_recent_sales JSON;
  v_recent_executions JSON;
BEGIN
  SELECT row_to_json(c) INTO v_contact FROM contacts c WHERE id = p_contact_id;
  SELECT row_to_json(r) INTO v_rfv FROM contact_rfv_metrics r WHERE contact_id = p_contact_id;
  SELECT json_agg(row_to_json(s)) INTO v_recent_sales
  FROM (SELECT id, date, amount, procedure_name FROM revenue_records WHERE contact_id = p_contact_id ORDER BY date DESC LIMIT 5) s;
  SELECT json_agg(row_to_json(e)) INTO v_recent_executions
  FROM (SELECT id, date, amount, procedure_name FROM executed_records WHERE contact_id = p_contact_id ORDER BY date DESC LIMIT 5) e;
  
  RETURN json_build_object(
    'contact', v_contact,
    'rfv_metrics', v_rfv,
    'recent_sales', COALESCE(v_recent_sales, '[]'::json),
    'recent_executions', COALESCE(v_recent_executions, '[]'::json)
  );
END;
$$;
