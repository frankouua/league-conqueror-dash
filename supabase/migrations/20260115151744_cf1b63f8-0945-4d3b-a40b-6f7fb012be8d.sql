
-- =====================================================
-- FASE 4: FUNÇÃO DE RECÁLCULO RFV E TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_contact_rfv(p_contact_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last_purchase DATE; v_first_purchase DATE; v_total_purchases INTEGER; v_total_value NUMERIC;
  v_days_since INTEGER; v_recency INTEGER; v_frequency INTEGER; v_value INTEGER;
  v_segment TEXT; v_priority INTEGER; v_churn TEXT; v_avg_ticket NUMERIC;
BEGIN
  -- Buscar métricas de revenue_records
  SELECT MAX(date), MIN(date), COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_last_purchase, v_first_purchase, v_total_purchases, v_total_value
  FROM revenue_records WHERE contact_id = p_contact_id;
  
  -- Se não tem vendas, usar executed_records
  IF v_total_purchases = 0 OR v_total_purchases IS NULL THEN
    SELECT MAX(date), MIN(date), COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_last_purchase, v_first_purchase, v_total_purchases, v_total_value
    FROM executed_records WHERE contact_id = p_contact_id;
  END IF;
  
  v_days_since := CASE WHEN v_last_purchase IS NOT NULL THEN CURRENT_DATE - v_last_purchase ELSE 999 END;
  v_avg_ticket := CASE WHEN v_total_purchases > 0 THEN v_total_value / v_total_purchases ELSE 0 END;
  
  -- Scores RFV
  v_recency := CASE WHEN v_days_since <= 30 THEN 5 WHEN v_days_since <= 90 THEN 4 WHEN v_days_since <= 180 THEN 3 WHEN v_days_since <= 365 THEN 2 ELSE 1 END;
  v_frequency := CASE WHEN v_total_purchases >= 10 THEN 5 WHEN v_total_purchases >= 5 THEN 4 WHEN v_total_purchases >= 3 THEN 3 WHEN v_total_purchases >= 2 THEN 2 ELSE 1 END;
  v_value := CASE WHEN v_total_value >= 50000 THEN 5 WHEN v_total_value >= 20000 THEN 4 WHEN v_total_value >= 10000 THEN 3 WHEN v_total_value >= 5000 THEN 2 ELSE 1 END;
  
  -- Segmentação
  v_segment := CASE
    WHEN v_recency >= 4 AND v_frequency >= 4 AND v_value >= 4 THEN 'campeao'
    WHEN v_recency >= 3 AND v_frequency >= 3 AND v_value >= 3 THEN 'fiel'
    WHEN v_recency >= 4 AND v_frequency <= 2 AND v_value >= 3 THEN 'potencial'
    WHEN v_recency <= 2 AND v_frequency >= 3 AND v_value >= 3 THEN 'em_risco'
    WHEN v_recency <= 2 AND v_frequency >= 3 THEN 'hibernando'
    WHEN v_total_purchases <= 1 AND v_days_since <= 90 THEN 'novato'
    WHEN v_recency <= 1 THEN 'inativo'
    ELSE 'regular'
  END;
  
  v_priority := CASE v_segment WHEN 'em_risco' THEN 1 WHEN 'hibernando' THEN 2 WHEN 'potencial' THEN 3 WHEN 'campeao' THEN 4 WHEN 'fiel' THEN 5 WHEN 'novato' THEN 6 ELSE 7 END;
  v_churn := CASE WHEN v_recency <= 1 AND v_frequency >= 3 THEN 'critico' WHEN v_recency <= 2 AND v_frequency >= 2 THEN 'alto' WHEN v_recency <= 3 THEN 'medio' ELSE 'baixo' END;
  
  -- Upsert métricas RFV
  INSERT INTO contact_rfv_metrics (contact_id, recency_score, frequency_score, value_score, days_since_last_purchase, last_purchase_date, first_purchase_date, total_purchases, total_value, average_ticket, segment, segment_priority, churn_risk)
  VALUES (p_contact_id, v_recency, v_frequency, v_value, v_days_since, v_last_purchase, v_first_purchase, COALESCE(v_total_purchases, 0), COALESCE(v_total_value, 0), COALESCE(v_avg_ticket, 0), v_segment, v_priority, v_churn)
  ON CONFLICT (contact_id) DO UPDATE SET
    recency_score = EXCLUDED.recency_score, frequency_score = EXCLUDED.frequency_score, value_score = EXCLUDED.value_score,
    days_since_last_purchase = EXCLUDED.days_since_last_purchase, last_purchase_date = EXCLUDED.last_purchase_date, first_purchase_date = EXCLUDED.first_purchase_date,
    total_purchases = EXCLUDED.total_purchases, total_value = EXCLUDED.total_value, average_ticket = EXCLUDED.average_ticket,
    segment = EXCLUDED.segment, segment_priority = EXCLUDED.segment_priority, churn_risk = EXCLUDED.churn_risk,
    last_calculated_at = now(), updated_at = now();
    
  -- Atualizar métricas no contato
  UPDATE contacts SET total_lifetime_value = COALESCE(v_total_value, 0), total_transactions = COALESCE(v_total_purchases, 0), 
    last_activity_at = COALESCE(v_last_purchase, last_activity_at), updated_at = now()
  WHERE id = p_contact_id;
END;
$$;

-- Triggers para timeline automática
CREATE OR REPLACE FUNCTION log_revenue_to_timeline()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    INSERT INTO contact_timeline (contact_id, event_type, title, description, metadata, reference_table, reference_id, created_at)
    VALUES (NEW.contact_id, 'sale', 'Venda: ' || COALESCE(NEW.procedure_name, 'Procedimento'),
      'R$ ' || COALESCE(NEW.amount::TEXT, '0'), jsonb_build_object('amount', NEW.amount, 'procedure', NEW.procedure_name),
      'revenue_records', NEW.id, COALESCE(NEW.date::TIMESTAMPTZ, now()));
    PERFORM recalculate_contact_rfv(NEW.contact_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revenue_to_timeline AFTER INSERT ON revenue_records FOR EACH ROW EXECUTE FUNCTION log_revenue_to_timeline();

CREATE OR REPLACE FUNCTION log_execution_to_timeline()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    INSERT INTO contact_timeline (contact_id, event_type, title, description, metadata, reference_table, reference_id, created_at)
    VALUES (NEW.contact_id, 'execution', 'Execução: ' || COALESCE(NEW.procedure_name, 'Procedimento'),
      'R$ ' || COALESCE(NEW.amount::TEXT, '0'), jsonb_build_object('amount', NEW.amount, 'procedure', NEW.procedure_name),
      'executed_records', NEW.id, COALESCE(NEW.date::TIMESTAMPTZ, now()));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_execution_to_timeline AFTER INSERT ON executed_records FOR EACH ROW EXECUTE FUNCTION log_execution_to_timeline();

-- =====================================================
-- FASE 5: PADRONIZAÇÃO - SOFT DELETE E AUDIT
-- =====================================================

-- Adicionar soft delete em crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Adicionar updated_by em tabelas principais
ALTER TABLE revenue_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE executed_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- View para leads ativos
CREATE OR REPLACE VIEW v_active_leads AS
SELECT * FROM crm_leads WHERE deleted_at IS NULL;

-- View para contatos ativos com RFV
CREATE OR REPLACE VIEW v_contacts_with_rfv AS
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

-- Função para buscar timeline de um contato
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
) LANGUAGE sql STABLE AS $$
  SELECT id, event_type, event_subtype, title, description, metadata, reference_table, reference_id, created_at
  FROM contact_timeline
  WHERE contact_id = p_contact_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Função para buscar perfil completo do contato
CREATE OR REPLACE FUNCTION get_contact_profile(p_contact_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_contact JSON;
  v_rfv JSON;
  v_recent_sales JSON;
  v_recent_executions JSON;
BEGIN
  -- Dados do contato
  SELECT row_to_json(c) INTO v_contact FROM contacts c WHERE id = p_contact_id;
  
  -- Métricas RFV
  SELECT row_to_json(r) INTO v_rfv FROM contact_rfv_metrics r WHERE contact_id = p_contact_id;
  
  -- Vendas recentes
  SELECT json_agg(row_to_json(s)) INTO v_recent_sales
  FROM (SELECT id, date, amount, procedure_name FROM revenue_records WHERE contact_id = p_contact_id ORDER BY date DESC LIMIT 5) s;
  
  -- Execuções recentes
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
