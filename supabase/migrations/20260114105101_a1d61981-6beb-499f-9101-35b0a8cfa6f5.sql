-- =============================================================
-- PERFORMANCE: Adicionar índices para queries comuns
-- =============================================================

-- Índice para RFV customers por segment
CREATE INDEX IF NOT EXISTS idx_rfv_customers_segment ON public.rfv_customers(segment);

-- Índice para RFV customers por recency (coluna correta)
CREATE INDEX IF NOT EXISTS idx_rfv_customers_recency ON public.rfv_customers(days_since_last_purchase);

-- Índice para RFV customers por last_purchase_date
CREATE INDEX IF NOT EXISTS idx_rfv_customers_last_purchase ON public.rfv_customers(last_purchase_date);

-- =============================================================
-- AUDIT: Função para auditoria de operações sensíveis
-- =============================================================

CREATE OR REPLACE FUNCTION public.log_sensitive_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, table_name, action, record_id, details)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, table_name, action, record_id, details)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, NEW.id::text, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;