-- =============================================
-- ÍNDICES PARA OTIMIZAÇÃO DE RECORRÊNCIAS
-- =============================================

-- Índices na tabela executed_records para busca de recorrências
CREATE INDEX IF NOT EXISTS idx_executed_records_patient_cpf 
ON public.executed_records(patient_cpf);

CREATE INDEX IF NOT EXISTS idx_executed_records_date 
ON public.executed_records(date DESC);

CREATE INDEX IF NOT EXISTS idx_executed_records_procedure_name 
ON public.executed_records(procedure_name);

CREATE INDEX IF NOT EXISTS idx_executed_records_patient_procedure 
ON public.executed_records(patient_cpf, date DESC, procedure_name);

-- Índices na tabela crm_leads para recorrências
CREATE INDEX IF NOT EXISTS idx_crm_leads_recurrence 
ON public.crm_leads(is_recurrence_lead, recurrence_due_date)
WHERE is_recurrence_lead = true;

CREATE INDEX IF NOT EXISTS idx_crm_leads_recurrence_group 
ON public.crm_leads(recurrence_group)
WHERE is_recurrence_lead = true;

CREATE INDEX IF NOT EXISTS idx_crm_leads_recurrence_overdue 
ON public.crm_leads(recurrence_days_overdue DESC)
WHERE is_recurrence_lead = true AND recurrence_days_overdue > 0;

CREATE INDEX IF NOT EXISTS idx_crm_leads_cpf 
ON public.crm_leads(cpf);

CREATE INDEX IF NOT EXISTS idx_crm_leads_prontuario 
ON public.crm_leads(prontuario);

-- Índices na tabela recurrent_procedures
CREATE INDEX IF NOT EXISTS idx_recurrent_procedures_group 
ON public.recurrent_procedures(group_name)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_recurrent_procedures_name 
ON public.recurrent_procedures(procedure_name)
WHERE is_active = true;

-- Índice para busca por pipeline e stage em leads
CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline_stage 
ON public.crm_leads(pipeline_id, stage_id);

-- Índice para busca por assigned_to
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned 
ON public.crm_leads(assigned_to)
WHERE assigned_to IS NOT NULL;