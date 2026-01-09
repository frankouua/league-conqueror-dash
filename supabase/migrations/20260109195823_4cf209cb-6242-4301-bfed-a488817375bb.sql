-- Atualizar constraint para incluir 'feegow'
ALTER TABLE crm_pipelines DROP CONSTRAINT crm_pipelines_pipeline_type_check;
ALTER TABLE crm_pipelines ADD CONSTRAINT crm_pipelines_pipeline_type_check 
  CHECK (pipeline_type = ANY (ARRAY['sdr'::text, 'closer'::text, 'cs'::text, 'farmer'::text, 'influencer'::text, 'custom'::text, 'social_selling'::text, 'rfv_matrix'::text, 'feegow'::text]));

-- Criar pipeline FEEGOW
INSERT INTO crm_pipelines (name, description, pipeline_type, icon, color, is_active, order_index)
SELECT 'FEEGOW', 'Pacientes importados do Feegow não classificados na matriz RFV', 'feegow', 'Users', '#6366f1', true, 10
WHERE NOT EXISTS (SELECT 1 FROM crm_pipelines WHERE name = 'FEEGOW');

-- Criar estágios para a pipeline FEEGOW
INSERT INTO crm_stages (pipeline_id, name, description, order_index, color, is_win_stage, is_lost_stage)
SELECT p.id, 'Novo', 'Paciente recém importado do Feegow', 1, '#6366f1', false, false
FROM crm_pipelines p WHERE p.name = 'FEEGOW'
AND NOT EXISTS (SELECT 1 FROM crm_stages s WHERE s.pipeline_id = p.id AND s.name = 'Novo');

INSERT INTO crm_stages (pipeline_id, name, description, order_index, color, is_win_stage, is_lost_stage)
SELECT p.id, 'Contato Pendente', 'Aguardando primeiro contato', 2, '#f59e0b', false, false
FROM crm_pipelines p WHERE p.name = 'FEEGOW'
AND NOT EXISTS (SELECT 1 FROM crm_stages s WHERE s.pipeline_id = p.id AND s.name = 'Contato Pendente');

INSERT INTO crm_stages (pipeline_id, name, description, order_index, color, is_win_stage, is_lost_stage)
SELECT p.id, 'Em Análise RFV', 'Sendo analisado para classificação RFV', 3, '#8b5cf6', false, false
FROM crm_pipelines p WHERE p.name = 'FEEGOW'
AND NOT EXISTS (SELECT 1 FROM crm_stages s WHERE s.pipeline_id = p.id AND s.name = 'Em Análise RFV');

INSERT INTO crm_stages (pipeline_id, name, description, order_index, color, is_win_stage, is_lost_stage)
SELECT p.id, 'Classificado RFV', 'Movido para pipeline de classificação RFV', 4, '#10b981', true, false
FROM crm_pipelines p WHERE p.name = 'FEEGOW'
AND NOT EXISTS (SELECT 1 FROM crm_stages s WHERE s.pipeline_id = p.id AND s.name = 'Classificado RFV');

INSERT INTO crm_stages (pipeline_id, name, description, order_index, color, is_win_stage, is_lost_stage)
SELECT p.id, 'Inativo', 'Paciente inativo ou sem interesse', 5, '#94a3b8', false, true
FROM crm_pipelines p WHERE p.name = 'FEEGOW'
AND NOT EXISTS (SELECT 1 FROM crm_stages s WHERE s.pipeline_id = p.id AND s.name = 'Inativo');