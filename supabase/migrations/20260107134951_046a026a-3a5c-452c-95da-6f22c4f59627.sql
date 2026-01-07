-- Remover constraint antigo e adicionar novo com mais tipos
ALTER TABLE crm_pipelines DROP CONSTRAINT crm_pipelines_pipeline_type_check;

ALTER TABLE crm_pipelines ADD CONSTRAINT crm_pipelines_pipeline_type_check 
CHECK (pipeline_type = ANY (ARRAY['sdr', 'closer', 'cs', 'farmer', 'influencer', 'custom', 'social_selling', 'rfv_matrix']));

-- Criar pipeline Social Selling
INSERT INTO crm_pipelines (id, name, description, pipeline_type, icon, color, order_index, is_active)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Social Selling',
  'Pipeline de vendas através de redes sociais e marketing digital',
  'social_selling',
  'share-2',
  '#8B5CF6',
  5,
  true
);

-- Criar estágios do Social Selling
INSERT INTO crm_stages (pipeline_id, name, description, order_index, color, sla_hours, is_win_stage, is_lost_stage) VALUES
('55555555-5555-5555-5555-555555555555', 'Engajamento', 'Lead interagiu nas redes sociais', 1, '#E0E7FF', 24, false, false),
('55555555-5555-5555-5555-555555555555', 'DM Enviado', 'Mensagem direta enviada', 2, '#C7D2FE', 48, false, false),
('55555555-5555-5555-5555-555555555555', 'Em Conversa', 'Respondeu e está em conversa', 3, '#A5B4FC', 72, false, false),
('55555555-5555-5555-5555-555555555555', 'Interesse Confirmado', 'Demonstrou interesse em procedimento', 4, '#818CF8', 48, false, false),
('55555555-5555-5555-5555-555555555555', 'Agendamento', 'Tentando agendar consulta/avaliação', 5, '#6366F1', 24, false, false),
('55555555-5555-5555-5555-555555555555', 'Convertido', 'Virou lead qualificado ou cliente', 6, '#4F46E5', NULL, true, false),
('55555555-5555-5555-5555-555555555555', 'Não Converteu', 'Não houve conversão', 7, '#EF4444', NULL, false, true);

-- Criar pipeline Matriz RFV
INSERT INTO crm_pipelines (id, name, description, pipeline_type, icon, color, order_index, is_active)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'Matriz RFV',
  'Clientes segmentados por Recência, Frequência e Valor',
  'rfv_matrix',
  'grid-3x3',
  '#06B6D4',
  6,
  true
);

-- Criar estágios da Matriz RFV baseado nos segmentos
INSERT INTO crm_stages (pipeline_id, name, description, order_index, color, sla_hours, is_win_stage, is_lost_stage) VALUES
('66666666-6666-6666-6666-666666666666', 'Campeões', 'Clientes com alta recência, frequência e valor', 1, '#10B981', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Leais', 'Clientes fiéis com boa frequência', 2, '#22C55E', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Potenciais Leais', 'Clientes com potencial de se tornarem leais', 3, '#84CC16', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Novos', 'Clientes recentes', 4, '#3B82F6', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Promissores', 'Clientes com bom potencial', 5, '#6366F1', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Precisam Atenção', 'Clientes que precisam de atenção', 6, '#F59E0B', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Em Risco', 'Clientes em risco de churn', 7, '#EF4444', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Não Podem Perder', 'Clientes valiosos em risco', 8, '#DC2626', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Hibernando', 'Clientes inativos há algum tempo', 9, '#9CA3AF', NULL, false, false),
('66666666-6666-6666-6666-666666666666', 'Perdidos', 'Clientes que não compram há muito tempo', 10, '#6B7280', NULL, false, true);