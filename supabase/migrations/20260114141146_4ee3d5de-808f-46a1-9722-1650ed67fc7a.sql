-- Inserir templates de checklist faltantes para todos os pipelines

-- ============================================
-- PIPELINE: FIDELIZAÇÃO (FARMER) - 44444444-4444-4444-4444-444444444444
-- ============================================

-- Base Ativa
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('8b084ca9-6c3d-4d5d-a97a-a258ac87e0b0', '44444444-4444-4444-4444-444444444444', 'FA1.1', 'Analisar NPS do paciente', 'Verificar nota NPS e criar ação se menor que 8', 'Farmer', 48, 1, 'Gestor', false),
('8b084ca9-6c3d-4d5d-a97a-a258ac87e0b0', '44444444-4444-4444-4444-444444444444', 'FA1.2', 'Contato de follow-up 90 dias', 'Realizar contato 90 dias após procedimento', 'Farmer', 72, 2, 'Gestor', false),
('8b084ca9-6c3d-4d5d-a97a-a258ac87e0b0', '44444444-4444-4444-4444-444444444444', 'FA1.3', 'Oferecer manutenção de resultados', 'Cross-sell de procedimentos complementares', 'Farmer', 168, 3, 'Gestor', false);

-- Oportunidade Upsell
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('e71d295b-e081-430c-aaf8-dd2724f329ce', '44444444-4444-4444-4444-444444444444', 'FA2.1', 'Apresentar procedimento complementar', 'Enviar proposta de upsell personalizada', 'Farmer', 24, 1, 'Gestor', false),
('e71d295b-e081-430c-aaf8-dd2724f329ce', '44444444-4444-4444-4444-444444444444', 'FA2.2', 'Follow-up da proposta', 'Acompanhar interesse na proposta', 'Farmer', 48, 2, 'Gestor', false);

-- Embaixadora
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('0daa98d2-5807-4114-b8dc-539db0773bfe', '44444444-4444-4444-4444-444444444444', 'FA3.1', 'Convidar para programa de Embaixadoras', 'Pacientes com NPS 9-10', 'Farmer', 48, 1, 'Gestor', false),
('0daa98d2-5807-4114-b8dc-539db0773bfe', '44444444-4444-4444-4444-444444444444', 'FA3.2', 'Enviar kit de embaixadora', 'Material de divulgação e benefícios', 'Farmer', 72, 2, 'Marketing', false);

-- Indicação Recebida
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('57966408-41e8-4267-b988-084a36247d16', '44444444-4444-4444-4444-444444444444', 'FA4.1', 'Agradecer indicação', 'Contato de agradecimento ao paciente que indicou', 'Farmer', 24, 1, 'Gestor', false),
('57966408-41e8-4267-b988-084a36247d16', '44444444-4444-4444-4444-444444444444', 'FA4.2', 'Registrar benefício da indicação', 'Aplicar desconto ou benefício acordado', 'Farmer', 48, 2, 'Coordenador', true);

-- Reativação
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('9ed035a8-8a08-4546-949c-ebdcd2cd68b7', '44444444-4444-4444-4444-444444444444', 'FA5.1', 'Iniciar cadência de reativação', 'Contato com oferta especial', 'Farmer', 24, 1, 'Gestor', false),
('9ed035a8-8a08-4546-949c-ebdcd2cd68b7', '44444444-4444-4444-4444-444444444444', 'FA5.2', 'Follow-up reativação', 'Segunda tentativa de contato', 'Farmer', 72, 2, 'Gestor', false);

-- Recorrência - Por Vencer
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('f123f74e-1ffd-4fea-98e9-61a13ea06e3b', '44444444-4444-4444-4444-444444444444', 'FA6.1', 'Lembrete de renovação', 'Contato sobre protocolo que está vencendo', 'Farmer', 48, 1, 'Gestor', false),
('f123f74e-1ffd-4fea-98e9-61a13ea06e3b', '44444444-4444-4444-4444-444444444444', 'FA6.2', 'Enviar proposta de renovação', 'Oferta para continuar tratamento', 'Farmer', 72, 2, 'Gestor', false);

-- Recorrência - Vencido Recente
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('9bc9b48a-9ee7-491e-a1c7-a5a2c3e153c0', '44444444-4444-4444-4444-444444444444', 'FA7.1', 'Contato urgente de reativação', 'Contato sobre protocolo vencido recentemente', 'Farmer', 24, 1, 'Gestor', false),
('9bc9b48a-9ee7-491e-a1c7-a5a2c3e153c0', '44444444-4444-4444-4444-444444444444', 'FA7.2', 'Oferecer condição especial', 'Desconto para retorno imediato', 'Farmer', 48, 2, 'Gestor', false);

-- Recorrência - Vencido Crítico
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('4a678517-d82a-4da9-9050-62e27b8fe61c', '44444444-4444-4444-4444-444444444444', 'FA8.1', 'Contato de última tentativa', 'Última tentativa antes de marcar como perdido', 'Farmer', 48, 1, 'Gestor', false),
('4a678517-d82a-4da9-9050-62e27b8fe61c', '44444444-4444-4444-4444-444444444444', 'FA8.2', 'Escalonar para Gestor', 'Transferir caso para intervenção do gestor', 'Farmer', 72, 2, 'Gestor', true);

-- Recorrência - Recuperado
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('62ac8c3f-50d5-4e34-9fbb-ea9e72db80b4', '44444444-4444-4444-4444-444444444444', 'FA9.1', 'Agendar novo procedimento', 'Confirmar data do retorno', 'Farmer', 24, 1, 'Coordenador', false),
('62ac8c3f-50d5-4e34-9fbb-ea9e72db80b4', '44444444-4444-4444-4444-444444444444', 'FA9.2', 'Registrar recuperação', 'Documentar motivo do retorno', 'Farmer', 48, 2, 'Gestor', false);

-- ============================================
-- PIPELINE: COORDENAÇÃO - 77777777-7777-7777-7777-777777777777
-- ============================================

-- Negociação
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('090c2487-79e1-412e-a975-170537052f97', '77777777-7777-7777-7777-777777777777', 'CO2.1', 'Validar proposta comercial', 'Revisar condições e descontos', 'Coordenador', 4, 1, 'Gestor', false),
('090c2487-79e1-412e-a975-170537052f97', '77777777-7777-7777-7777-777777777777', 'CO2.2', 'Aprovar desconto especial', 'Se desconto > 10%, validar', 'Coordenador', 2, 2, 'Gestor', true);

-- Aguardando Pagamento
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('aed12cdb-efad-44de-8f27-4d8e3768b48c', '77777777-7777-7777-7777-777777777777', 'CO3.1', 'Monitorar status do pagamento', 'Verificar se entrada foi paga', 'Coordenador', 24, 1, 'Gestor', false),
('aed12cdb-efad-44de-8f27-4d8e3768b48c', '77777777-7777-7777-7777-777777777777', 'CO3.2', 'Confirmar recebimento da entrada', 'Validar pagamento no sistema', 'Coordenador', 4, 2, 'Gestor', true);

-- Processos Administrativos
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('ac92f0f1-605b-40cf-bfd0-88edab217891', '77777777-7777-7777-7777-777777777777', 'CO4.1', 'Validar contratos assinados', 'Verificar todos os documentos', 'Coordenador', 24, 1, 'Gestor', true),
('ac92f0f1-605b-40cf-bfd0-88edab217891', '77777777-7777-7777-7777-777777777777', 'CO4.2', 'Dupla conferência final', 'Checklist completo antes da cirurgia', 'Coordenador', 48, 2, 'Gestor', true);

-- Ganho (Transferência)
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('c8f72723-bb90-4fc5-9120-9665e8354b9d', '77777777-7777-7777-7777-777777777777', 'CO5.1', 'Confirmar transferência para CS', 'Validar handoff para pós-venda', 'Coordenador', 4, 1, 'Gestor', false);

-- Solicitado Cancelamento
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('aa729dae-2aaf-4c4d-9c6f-bab8c340ec80', '77777777-7777-7777-7777-777777777777', 'CO6.1', 'Analisar solicitação de cancelamento', 'Verificar motivo e tentar retenção', 'Coordenador', 4, 1, 'Gestor', false),
('aa729dae-2aaf-4c4d-9c6f-bab8c340ec80', '77777777-7777-7777-7777-777777777777', 'CO6.2', 'Processar cancelamento/retenção', 'Executar ação definida', 'Coordenador', 24, 2, 'Gestor', true);

-- ============================================
-- PIPELINE: RECUPERAÇÃO - 88888888-8888-8888-8888-888888888888
-- ============================================

-- Identificado
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('69ab47a6-6cec-40fc-9561-ef50b15cf72f', '88888888-8888-8888-8888-888888888888', 'RE1.1', 'Analisar histórico do lead', 'Verificar motivo da perda original', 'SDR', 24, 1, 'Gestor', false),
('69ab47a6-6cec-40fc-9561-ef50b15cf72f', '88888888-8888-8888-8888-888888888888', 'RE1.2', 'Preparar abordagem personalizada', 'Criar script baseado no histórico', 'SDR', 24, 2, 'Gestor', false);

-- Em Contato
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('e79a3293-2e80-4cd0-bdf2-fe51307595c3', '88888888-8888-8888-8888-888888888888', 'RE2.1', 'Iniciar cadência de reativação', 'Contato inicial de recuperação', 'SDR', 4, 1, 'Gestor', false),
('e79a3293-2e80-4cd0-bdf2-fe51307595c3', '88888888-8888-8888-8888-888888888888', 'RE2.2', 'Enviar oferta especial', 'Proposta com condição diferenciada', 'SDR', 24, 2, 'Gestor', false);

-- Resposta Recebida
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('26be47bd-973a-4d28-a41a-9c7f6f4710be', '88888888-8888-8888-8888-888888888888', 'RE3.1', 'Qualificar interesse atual', 'Verificar objeções remanescentes', 'SDR', 2, 1, 'Gestor', false),
('26be47bd-973a-4d28-a41a-9c7f6f4710be', '88888888-8888-8888-8888-888888888888', 'RE3.2', 'Agendar consulta de retorno', 'Se interesse confirmado', 'SDR', 24, 2, 'Gestor', false);

-- Reengajado
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('661d73c4-65d5-4362-8a63-20658c07d14c', '88888888-8888-8888-8888-888888888888', 'RE4.1', 'Confirmar agendamento', 'Validar data e horário', 'SDR', 4, 1, 'Coordenador', false),
('661d73c4-65d5-4362-8a63-20658c07d14c', '88888888-8888-8888-8888-888888888888', 'RE4.2', 'Transferir para pipeline principal', 'Mover para Prospecção ou Vendas', 'SDR', 24, 2, 'Gestor', false);

-- Recuperado
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('25a444cc-341c-4397-bb87-123bc4800523', '88888888-8888-8888-8888-888888888888', 'RE5.1', 'Registrar sucesso de recuperação', 'Documentar estratégia que funcionou', 'SDR', 24, 1, 'Gestor', false);

-- ============================================
-- PIPELINE: PROSPECÇÃO (SDR) - Stages faltantes
-- ============================================

-- Consulta Agendada
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('009e26b9-e014-43c0-afe6-bfb0f5c12d95', '11111111-1111-1111-1111-111111111111', 'SDR5.1', 'Confirmar consulta 24h antes', 'Lembrete de confirmação', 'SDR', 24, 1, 'Coordenador', false),
('009e26b9-e014-43c0-afe6-bfb0f5c12d95', '11111111-1111-1111-1111-111111111111', 'SDR5.2', 'Preparar briefing para Closer', 'Resumo do lead para handoff', 'SDR', 4, 2, 'Gestor', false),
('009e26b9-e014-43c0-afe6-bfb0f5c12d95', '11111111-1111-1111-1111-111111111111', 'SDR5.3', 'Transferir para Vendas', 'Mover lead para pipeline Closer', 'SDR', 2, 3, 'Coordenador', true);

-- Nutrição
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('20e2fcf9-118c-4437-a594-d74623340906', '11111111-1111-1111-1111-111111111111', 'SDR6.1', 'Iniciar cadência de nutrição', 'Conteúdo educativo automatizado', 'Automação', 24, 1, 'SDR', false),
('20e2fcf9-118c-4437-a594-d74623340906', '11111111-1111-1111-1111-111111111111', 'SDR6.2', 'Monitorar engajamento', 'Verificar abertura de e-mails', 'SDR', 168, 2, 'Gestor', false);

-- ============================================
-- PIPELINE: VENDAS (CLOSER) - Stages faltantes
-- ============================================

-- Aguardando Consulta
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('f6ae655e-e2ae-4306-bb2d-241d2ea4bd8b', '22222222-2222-2222-2222-222222222222', 'CL1.1', 'Confirmar presença na consulta', 'Contato 24h antes', 'Closer', 24, 1, 'Gestor', false),
('f6ae655e-e2ae-4306-bb2d-241d2ea4bd8b', '22222222-2222-2222-2222-222222222222', 'CL1.2', 'Revisar histórico do lead', 'Preparar para atendimento', 'Closer', 4, 2, 'Gestor', false);

-- Acompanhamento
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('ab0330c7-ddad-4ff7-944e-20686a4341e8', '22222222-2222-2222-2222-222222222222', 'CL6.1', 'Follow-up pós-proposta', 'Contato para tirar dúvidas', 'Closer', 24, 1, 'Gestor', false),
('ab0330c7-ddad-4ff7-944e-20686a4341e8', '22222222-2222-2222-2222-222222222222', 'CL6.2', 'Enviar quebra de objeções', 'Áudios, fotos, depoimentos', 'Closer', 48, 2, 'Gestor', false),
('ab0330c7-ddad-4ff7-944e-20686a4341e8', '22222222-2222-2222-2222-222222222222', 'CL6.3', 'Escalonar se necessário', 'Transferir para Gestor após 14 dias', 'Automação', 336, 3, 'Gestor', true);

-- ============================================
-- PIPELINE: SOCIAL SELLING - Stages faltantes
-- ============================================

-- DM Enviado
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('dd64b344-5fd8-464f-a82f-7a2f69566545', '55555555-5555-5555-5555-555555555555', 'SS2.1', 'Acompanhar resposta da DM', 'Verificar se houve resposta', 'SDR', 24, 1, 'Gestor', false),
('dd64b344-5fd8-464f-a82f-7a2f69566545', '55555555-5555-5555-5555-555555555555', 'SS2.2', 'Enviar segunda DM', 'Follow-up se sem resposta', 'SDR', 48, 2, 'Gestor', false);

-- Interesse Confirmado
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('c82b5f4f-2ccc-49f6-b7ec-3dbe4310d37c', '55555555-5555-5555-5555-555555555555', 'SS3.1', 'Migrar conversa para WhatsApp', 'Coletar telefone e continuar lá', 'SDR', 4, 1, 'Gestor', false),
('c82b5f4f-2ccc-49f6-b7ec-3dbe4310d37c', '55555555-5555-5555-5555-555555555555', 'SS3.2', 'Qualificar lead (BANT)', 'Verificar perfil e interesse', 'SDR', 24, 2, 'Gestor', false);

-- Agendamento
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('3f212359-53b9-40d5-ba68-3fb814abcb9f', '55555555-5555-5555-5555-555555555555', 'SS4.1', 'Enviar link de pagamento', 'Consulta Unique Day', 'SDR', 4, 1, 'Gestor', false),
('3f212359-53b9-40d5-ba68-3fb814abcb9f', '55555555-5555-5555-5555-555555555555', 'SS4.2', 'Confirmar agendamento no Feegow', 'Após pagamento confirmado', 'SDR', 2, 2, 'Coordenador', true);

-- Convertido
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('e43aa8e3-b387-4826-b805-ec6736854115', '55555555-5555-5555-5555-555555555555', 'SS5.1', 'Transferir para Prospecção/Vendas', 'Mover para pipeline principal', 'SDR', 4, 1, 'Gestor', false);

-- Não Converteu
INSERT INTO stage_checklist_templates (stage_id, pipeline_id, task_code, title, description, responsible_role, deadline_hours, order_index, escalation_to, requires_coordinator_validation) VALUES
('5c3ad11d-96f5-4de2-8b63-3acc97425841', '55555555-5555-5555-5555-555555555555', 'SS6.1', 'Registrar motivo', 'Documentar porque não converteu', 'SDR', 24, 1, 'Gestor', false),
('5c3ad11d-96f5-4de2-8b63-3acc97425841', '55555555-5555-5555-5555-555555555555', 'SS6.2', 'Mover para nutrição', 'Cadência de longo prazo', 'SDR', 48, 2, 'Gestor', false);