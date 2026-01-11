
-- Remover duplicatas de revenue_records mantendo apenas um registro por combinação única
-- Usar CTE para identificar duplicatas e deletar
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY patient_name, date, procedure_name, amount
    ORDER BY created_at ASC
  ) as rn
  FROM revenue_records
)
DELETE FROM revenue_records
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Remover duplicatas de executed_records mantendo apenas um registro por combinação única
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY patient_name, date, procedure_name, amount
    ORDER BY created_at ASC
  ) as rn
  FROM executed_records
)
DELETE FROM executed_records
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
