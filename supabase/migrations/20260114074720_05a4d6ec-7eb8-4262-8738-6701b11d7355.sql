-- Add unique constraint on function_name
ALTER TABLE automation_schedules ADD CONSTRAINT automation_schedules_function_name_key UNIQUE (function_name);

-- Insert automation schedules
INSERT INTO automation_schedules (automation_name, function_name, cron_expression, description, is_active) VALUES 
('Orquestrador Master CRM', 'crm-master-automation', '0 */2 * * *', 'Executa todas as automações do CRM a cada 2 horas', true),
('Mudança de Estágio', 'stage-change-automation', '*/30 * * * *', 'Processa mudanças de estágio e dispara ações', true),
('Escalação de Leads', 'escalation-automation', '0 * * * *', 'Verifica leads que precisam de escalação', true),
('Automação de Indicações', 'referral-automation', '0 9,14 * * *', 'Processa leads de indicação e bonificações', true),
('Automação WhatsApp', 'whatsapp-automation', '*/15 * * * *', 'Processa fila de mensagens WhatsApp', true),
('Automação NPS', 'nps-automation', '0 10 * * *', 'Envia pesquisas NPS para pacientes pós-procedimento', true),
('Atualização de Temperatura', 'temperature-automation', '0 */4 * * *', 'Recalcula temperatura dos leads baseado em atividade', true),
('Automação Pós-Venda', 'post-sale-automation', '0 11 * * *', 'Follow-up automático pós-venda', true),
('Distribuição de Leads', 'lead-distribution', '*/10 * * * *', 'Distribui leads novos entre vendedores', true),
('Reativação de Leads', 'reactivation-automation', '0 9 * * 1', 'Identifica e reativa leads inativos (segundas)', true),
('Cross-Sell', 'cross-sell-automation', '0 14 * * *', 'Identifica oportunidades de cross-sell', true),
('Aniversariantes', 'birthday-automation', '0 8 * * *', 'Envia mensagens de aniversário', true),
('Conquista de Metas', 'goal-achievement-automation', '0 18 * * *', 'Verifica e celebra conquistas de metas', true),
('Identificar Recorrências', 'identify-recurrences', '0 7 * * *', 'Identifica oportunidades de retorno de procedimentos', true)
ON CONFLICT (function_name) DO UPDATE SET 
  automation_name = EXCLUDED.automation_name,
  cron_expression = EXCLUDED.cron_expression,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();