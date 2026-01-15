
-- =============================================
-- MIGRAÇÃO PARTE 2: BACKUP E MIGRAÇÃO DE DADOS
-- =============================================

-- Backup de patient_data
INSERT INTO migration_backup_2025_01 (backup_type, table_name, record_id, data)
SELECT 'pre_contacts_migration', 'patient_data', id::text, to_jsonb(pd.*)
FROM patient_data pd;

-- Backup de crm_leads
INSERT INTO migration_backup_2025_01 (backup_type, table_name, record_id, data)
SELECT 'pre_contacts_migration', 'crm_leads', id::text, to_jsonb(cl.*)
FROM crm_leads cl;

-- Backup de rfv_customers
INSERT INTO migration_backup_2025_01 (backup_type, table_name, record_id, data)
SELECT 'pre_contacts_migration', 'rfv_customers', id::text, to_jsonb(rc.*)
FROM rfv_customers rc;

-- Inserir contatos de patient_data
INSERT INTO contacts (
  cpf, prontuario, name, email, phone, whatsapp,
  birth_date, gender, nationality, country, state, city, address,
  status, source_table, source_id, created_at, total_lifetime_value, total_transactions
)
SELECT DISTINCT ON (COALESCE(normalize_cpf(cpf), prontuario, normalize_phone(phone), email, name))
  normalize_cpf(cpf),
  prontuario,
  COALESCE(name, 'Nome não informado'),
  NULLIF(TRIM(email), ''),
  normalize_phone(phone),
  normalize_phone(COALESCE(whatsapp, phone)),
  birth_date, gender, nationality, country, state, city, address,
  'cliente', 'patient_data', id, COALESCE(created_at, now()),
  COALESCE(total_value_sold, 0), COALESCE(total_procedures, 0)
FROM patient_data
WHERE name IS NOT NULL AND TRIM(name) != ''
ORDER BY COALESCE(normalize_cpf(cpf), prontuario, normalize_phone(phone), email, name), updated_at DESC NULLS LAST;

-- Inserir contatos de crm_leads
INSERT INTO contacts (cpf, prontuario, name, email, phone, whatsapp, birth_date, status, lifecycle_stage, source_table, source_id, created_at)
SELECT normalize_cpf(cl.cpf), cl.prontuario, COALESCE(cl.name, 'Nome não informado'),
  NULLIF(TRIM(cl.email), ''), normalize_phone(cl.phone), normalize_phone(COALESCE(cl.whatsapp, cl.phone)),
  cl.birth_date,
  CASE WHEN cl.won_at IS NOT NULL THEN 'cliente' WHEN cl.lost_at IS NOT NULL THEN 'perdido' ELSE 'lead' END,
  cl.temperature, 'crm_leads', cl.id, cl.created_at
FROM crm_leads cl
WHERE cl.name IS NOT NULL AND TRIM(cl.name) != ''
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE (c.cpf IS NOT NULL AND c.cpf = normalize_cpf(cl.cpf))
       OR (c.prontuario IS NOT NULL AND c.prontuario = cl.prontuario)
       OR (c.phone IS NOT NULL AND c.phone = normalize_phone(cl.phone) AND normalize_phone(cl.phone) IS NOT NULL)
  )
ON CONFLICT DO NOTHING;

-- Inserir contatos de rfv_customers
INSERT INTO contacts (cpf, prontuario, name, email, phone, status, total_lifetime_value, total_transactions, source_table, source_id, created_at)
SELECT normalize_cpf(rc.cpf), rc.prontuario, COALESCE(rc.name, 'Nome não informado'),
  NULLIF(TRIM(rc.email), ''), normalize_phone(rc.phone), 'cliente',
  COALESCE(rc.total_value, 0), COALESCE(rc.total_purchases, 0), 'rfv_customers', rc.id, COALESCE(rc.created_at, now())
FROM rfv_customers rc
WHERE rc.name IS NOT NULL AND TRIM(rc.name) != ''
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE (c.cpf IS NOT NULL AND c.cpf = normalize_cpf(rc.cpf))
       OR (c.prontuario IS NOT NULL AND c.prontuario = rc.prontuario)
       OR (c.phone IS NOT NULL AND c.phone = normalize_phone(rc.phone) AND normalize_phone(rc.phone) IS NOT NULL)
  )
ON CONFLICT DO NOTHING;

-- Vincular crm_leads
UPDATE crm_leads cl SET contact_id = c.id
FROM contacts c
WHERE cl.contact_id IS NULL AND (
  (cl.cpf IS NOT NULL AND normalize_cpf(cl.cpf) = c.cpf) OR
  (cl.prontuario IS NOT NULL AND cl.prontuario = c.prontuario) OR
  (cl.phone IS NOT NULL AND normalize_phone(cl.phone) = c.phone AND c.phone IS NOT NULL)
);

-- Vincular revenue_records
UPDATE revenue_records rr SET contact_id = c.id
FROM contacts c
WHERE rr.contact_id IS NULL AND (
  (rr.patient_cpf IS NOT NULL AND normalize_cpf(rr.patient_cpf) = c.cpf) OR
  (rr.patient_prontuario IS NOT NULL AND rr.patient_prontuario = c.prontuario) OR
  (rr.patient_phone IS NOT NULL AND normalize_phone(rr.patient_phone) = c.phone AND c.phone IS NOT NULL)
);

-- Vincular executed_records
UPDATE executed_records er SET contact_id = c.id
FROM contacts c
WHERE er.contact_id IS NULL AND (
  (er.patient_cpf IS NOT NULL AND normalize_cpf(er.patient_cpf) = c.cpf) OR
  (er.patient_prontuario IS NOT NULL AND er.patient_prontuario = c.prontuario) OR
  (er.patient_phone IS NOT NULL AND normalize_phone(er.patient_phone) = c.phone AND c.phone IS NOT NULL)
);

-- Log
INSERT INTO migration_backup_2025_01 (backup_type, table_name, record_id, data)
VALUES ('migration_log', 'contacts', 'phase_1_complete', jsonb_build_object(
  'completed_at', now(),
  'contacts_created', (SELECT COUNT(*) FROM contacts),
  'crm_leads_linked', (SELECT COUNT(*) FROM crm_leads WHERE contact_id IS NOT NULL),
  'revenue_linked', (SELECT COUNT(*) FROM revenue_records WHERE contact_id IS NOT NULL),
  'executed_linked', (SELECT COUNT(*) FROM executed_records WHERE contact_id IS NOT NULL)
));
