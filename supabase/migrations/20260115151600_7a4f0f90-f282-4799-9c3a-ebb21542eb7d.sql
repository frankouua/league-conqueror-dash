
-- FASE 2 e 3: Timeline e RFV Metrics

CREATE TABLE public.contact_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_subtype TEXT,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  reference_table TEXT,
  reference_id UUID,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_timeline_contact_date ON contact_timeline(contact_id, created_at DESC);
CREATE INDEX idx_timeline_type ON contact_timeline(event_type);

ALTER TABLE contact_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view timeline" ON contact_timeline FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true));
CREATE POLICY "Users can insert timeline" ON contact_timeline FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true));

CREATE TABLE public.contact_rfv_metrics (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  recency_score INTEGER NOT NULL DEFAULT 1 CHECK (recency_score BETWEEN 1 AND 5),
  frequency_score INTEGER NOT NULL DEFAULT 1 CHECK (frequency_score BETWEEN 1 AND 5),
  value_score INTEGER NOT NULL DEFAULT 1 CHECK (value_score BETWEEN 1 AND 5),
  rfv_score NUMERIC GENERATED ALWAYS AS ((recency_score * 0.35 + frequency_score * 0.25 + value_score * 0.40)) STORED,
  days_since_last_purchase INTEGER,
  last_purchase_date DATE,
  first_purchase_date DATE,
  total_purchases INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  average_ticket NUMERIC DEFAULT 0,
  segment TEXT NOT NULL DEFAULT 'novo',
  segment_priority INTEGER DEFAULT 5,
  churn_risk TEXT DEFAULT 'baixo',
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rfv_segment ON contact_rfv_metrics(segment);
CREATE INDEX idx_rfv_score ON contact_rfv_metrics(rfv_score DESC);

ALTER TABLE contact_rfv_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view RFV" ON contact_rfv_metrics FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_approved = true));
CREATE POLICY "Admins can manage RFV" ON contact_rfv_metrics FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true));

-- Migrar vendas para timeline
INSERT INTO contact_timeline (contact_id, event_type, title, description, metadata, reference_table, reference_id, created_at)
SELECT r.contact_id, 'sale', 'Venda: ' || COALESCE(r.procedure_name, 'Procedimento'),
  'R$ ' || COALESCE(r.amount::TEXT, '0'),
  jsonb_build_object('amount', r.amount, 'procedure', r.procedure_name),
  'revenue_records', r.id, COALESCE(r.date::TIMESTAMPTZ, r.created_at)
FROM revenue_records r WHERE r.contact_id IS NOT NULL;

-- Migrar execuções
INSERT INTO contact_timeline (contact_id, event_type, title, description, metadata, reference_table, reference_id, created_at)
SELECT e.contact_id, 'execution', 'Execução: ' || COALESCE(e.procedure_name, 'Procedimento'),
  'R$ ' || COALESCE(e.amount::TEXT, '0'),
  jsonb_build_object('amount', e.amount, 'procedure', e.procedure_name),
  'executed_records', e.id, COALESCE(e.date::TIMESTAMPTZ, e.created_at)
FROM executed_records e WHERE e.contact_id IS NOT NULL;

-- Migrar cancelamentos
INSERT INTO contact_timeline (contact_id, event_type, title, description, metadata, reference_table, reference_id, created_at)
SELECT c.contact_id, 'cancellation', 'Cancelamento: ' || COALESCE(c.procedure_name, 'Procedimento'),
  c.reason::TEXT, jsonb_build_object('contract_value', c.contract_value, 'reason', c.reason),
  'cancellations', c.id, c.created_at
FROM cancellations c WHERE c.contact_id IS NOT NULL;
