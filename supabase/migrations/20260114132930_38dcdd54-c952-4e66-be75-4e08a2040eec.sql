-- 1. Adicionar campos faltantes na tabela stage_checklist_templates
ALTER TABLE stage_checklist_templates 
ADD COLUMN IF NOT EXISTS task_code TEXT,
ADD COLUMN IF NOT EXISTS trigger_event TEXT DEFAULT 'lead_entered_stage',
ADD COLUMN IF NOT EXISTS trigger_timing TEXT,
ADD COLUMN IF NOT EXISTS sla_unit TEXT DEFAULT 'hours',
ADD COLUMN IF NOT EXISTS escalation_to TEXT,
ADD COLUMN IF NOT EXISTS requires_coordinator_validation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES crm_pipelines(id);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_stage_checklist_pipeline ON stage_checklist_templates(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stage_checklist_stage ON stage_checklist_templates(stage_id);

-- 3. Criar tabela para tarefas criadas automaticamente por lead
CREATE TABLE IF NOT EXISTS crm_lead_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES stage_checklist_templates(id),
  task_code TEXT,
  task_name TEXT NOT NULL,
  task_description TEXT,
  responsible_role TEXT,
  assigned_to UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  requires_coordinator_validation BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  escalated_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices para crm_lead_tasks
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON crm_lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON crm_lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assigned_to ON crm_lead_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due_at ON crm_lead_tasks(due_at);

-- 5. RLS para crm_lead_tasks
ALTER TABLE crm_lead_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_tasks_select" ON crm_lead_tasks
FOR SELECT USING (
  assigned_to = auth.uid() 
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_lead_tasks.lead_id AND crm_leads.assigned_to = auth.uid())
);

CREATE POLICY "lead_tasks_update" ON crm_lead_tasks
FOR UPDATE USING (
  assigned_to = auth.uid() 
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "lead_tasks_insert" ON crm_lead_tasks
FOR INSERT WITH CHECK (true);

CREATE POLICY "lead_tasks_delete" ON crm_lead_tasks
FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_lead_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_lead_tasks_timestamp ON crm_lead_tasks;
CREATE TRIGGER update_lead_tasks_timestamp
BEFORE UPDATE ON crm_lead_tasks
FOR EACH ROW EXECUTE FUNCTION update_lead_tasks_updated_at();

-- 7. Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE crm_lead_tasks;