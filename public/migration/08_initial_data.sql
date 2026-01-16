-- =====================================================
-- SCRIPT DE MIGRAÇÃO - PARTE 8: DADOS INICIAIS
-- Execute após os triggers
-- =====================================================

-- ==================== TEAMS INICIAIS ====================
INSERT INTO public.teams (id, name, motto) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Troia', 'Conquistando resultados'),
  ('22222222-2222-2222-2222-222222222222', 'Lioness', 'Força e determinação')
ON CONFLICT DO NOTHING;

-- ==================== PIPELINE COMERCIAL ====================
INSERT INTO public.crm_pipelines (id, name, description, pipeline_type, icon, color, is_active, order_index) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Comercial', 'Pipeline principal de vendas', 'sales', 'users', '#3B82F6', true, 0)
ON CONFLICT DO NOTHING;

-- ==================== STAGES DO PIPELINE COMERCIAL ====================
INSERT INTO public.crm_stages (id, pipeline_id, name, description, color, order_index, is_won, is_lost) VALUES
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Novo Lead', 'Lead recém chegado', '#6B7280', 0, false, false),
  ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Primeiro Contato', 'Primeiro contato realizado', '#3B82F6', 1, false, false),
  ('bbbbbbbb-0003-0003-0003-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Qualificação', 'Em processo de qualificação', '#8B5CF6', 2, false, false),
  ('bbbbbbbb-0004-0004-0004-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Proposta Enviada', 'Proposta enviada ao cliente', '#F59E0B', 3, false, false),
  ('bbbbbbbb-0005-0005-0005-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Negociação', 'Em negociação', '#EF4444', 4, false, false),
  ('bbbbbbbb-0006-0006-0006-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fechado Ganho', 'Venda realizada', '#10B981', 5, true, false),
  ('bbbbbbbb-0007-0007-0007-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fechado Perdido', 'Oportunidade perdida', '#6B7280', 6, false, true)
ON CONFLICT DO NOTHING;

-- ==================== PIPELINE DE RECORRÊNCIA ====================
INSERT INTO public.crm_pipelines (id, name, description, pipeline_type, icon, color, is_active, order_index) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Recorrência', 'Pipeline de clientes para recompra', 'recurrence', 'repeat', '#10B981', true, 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.crm_stages (id, pipeline_id, name, description, color, order_index, is_won, is_lost) VALUES
  ('dddddddd-0001-0001-0001-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Vencendo', 'Recorrência próxima do vencimento', '#F59E0B', 0, false, false),
  ('dddddddd-0002-0002-0002-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Vencido', 'Recorrência vencida', '#EF4444', 1, false, false),
  ('dddddddd-0003-0003-0003-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Em Contato', 'Cliente em contato para reagendamento', '#3B82F6', 2, false, false),
  ('dddddddd-0004-0004-0004-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Agendou', 'Cliente agendou retorno', '#10B981', 3, true, false),
  ('dddddddd-0005-0005-0005-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Não Retornou', 'Cliente não retornou', '#6B7280', 4, false, true)
ON CONFLICT DO NOTHING;

-- ==================== PIPELINE PÓS-VENDA ====================
INSERT INTO public.crm_pipelines (id, name, description, pipeline_type, icon, color, is_active, order_index) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Pós-Venda', 'Acompanhamento pós-cirúrgico', 'post_sale', 'heart', '#EC4899', true, 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.crm_stages (id, pipeline_id, name, description, color, order_index, is_won, is_lost) VALUES
  ('ffffffff-0001-0001-0001-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Aguardando Cirurgia', 'Aguardando data da cirurgia', '#6B7280', 0, false, false),
  ('ffffffff-0002-0002-0002-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Pré-Operatório', 'Em preparação pré-operatória', '#3B82F6', 1, false, false),
  ('ffffffff-0003-0003-0003-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Pós-Operatório', 'Em recuperação pós-operatória', '#F59E0B', 2, false, false),
  ('ffffffff-0004-0004-0004-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Alta', 'Alta médica concedida', '#10B981', 3, true, false)
ON CONFLICT DO NOTHING;

-- Verificar dados inseridos
SELECT 'Teams' as table_name, count(*) as count FROM public.teams
UNION ALL
SELECT 'Pipelines', count(*) FROM public.crm_pipelines
UNION ALL
SELECT 'Stages', count(*) FROM public.crm_stages;
