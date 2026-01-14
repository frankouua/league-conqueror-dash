
-- Insert Lost Reasons (using correct columns)
INSERT INTO crm_lost_reasons (name, category, description, recovery_strategy, recovery_days, is_recoverable, order_index, is_active) VALUES
('Preço alto', 'financial', 'Cliente achou o valor muito alto', 'Oferecer condições especiais ou parcelamento', 90, true, 1, true),
('Sem condições financeiras', 'financial', 'Cliente sem recursos no momento', 'Aguardar melhora financeira e recontatar', 60, true, 2, true),
('Escolheu concorrente', 'competition', 'Cliente optou por outra clínica', 'Destacar diferenciais da Unique', 180, true, 3, true),
('Não gostou do atendimento', 'service', 'Experiência negativa no atendimento', 'Escalar para coordenação', null, false, 4, true),
('Desistiu do procedimento', 'timing', 'Cliente desistiu de fazer o procedimento', 'Reengajar com conteúdo educativo', 120, true, 5, true),
('Vai fazer depois', 'timing', 'Cliente quer adiar para outro momento', 'Follow-up mensal', 30, true, 6, true),
('Problemas de saúde', 'health', 'Impedimento por questões de saúde', 'Acompanhar evolução do quadro', 90, true, 7, true),
('Não conseguiu contato', 'contact', 'Lead não responde tentativas de contato', 'Tentar canais alternativos', 14, true, 8, true),
('Mudou de cidade', 'other', 'Cliente se mudou', 'Verificar se pretende retornar', null, false, 9, true),
('Lead duplicado', 'system', 'Lead já existe no sistema', null, null, false, 10, true),
('Lead inválido', 'system', 'Dados incorretos ou spam', null, null, false, 11, true),
('Fez em outro lugar', 'competition', 'Já realizou procedimento em outro local', 'Oferecer procedimentos complementares', 365, true, 12, true)
ON CONFLICT DO NOTHING;

-- Insert WhatsApp Templates (using correct columns: template_text instead of content)
INSERT INTO crm_whatsapp_templates (name, category, template_text, variables, is_active) VALUES
('Boas-vindas Lead', 'first_contact', 'Olá {{nome}}! 👋 Sou da Unique CPA. Vi que você tem interesse em {{procedimento}}. Podemos conversar sobre isso?', '["nome", "procedimento"]'::jsonb, true),
('Follow-up 24h', 'follow_up', 'Oi {{nome}}! Como vai? Conseguiu pensar sobre nossa conversa sobre {{procedimento}}? Estou à disposição para tirar dúvidas! 😊', '["nome", "procedimento"]'::jsonb, true),
('Agendamento Consulta', 'scheduling', 'Perfeito, {{nome}}! Sua consulta está confirmada para {{data}} às {{hora}}. Endereço: {{endereco}}. Até lá! 🏥', '["nome", "data", "hora", "endereco"]'::jsonb, true),
('Lembrete Consulta', 'reminder', 'Oi {{nome}}! 📅 Lembrete: sua consulta é amanhã às {{hora}}. Confirma presença? Responda SIM ou NÃO.', '["nome", "hora"]'::jsonb, true),
('Pós-Consulta', 'post_meeting', 'Olá {{nome}}! Foi um prazer te receber hoje! 😊 Envio em seguida sua proposta personalizada. Qualquer dúvida, estou aqui!', '["nome"]'::jsonb, true),
('Proposta Enviada', 'proposal', 'Oi {{nome}}! Conforme combinado, segue sua proposta: {{link_proposta}}. Posso explicar os detalhes?', '["nome", "link_proposta"]'::jsonb, true),
('Fechamento', 'closing', '{{nome}}, que alegria ter você conosco! 🎉 Próximos passos: {{proximos_passos}}. Bem-vinda à família Unique!', '["nome", "proximos_passos"]'::jsonb, true),
('NPS Solicitação', 'nps', 'Oi {{nome}}! De 0 a 10, quanto você indicaria a Unique para uma amiga? Sua opinião é muito importante! ⭐', '["nome"]'::jsonb, true),
('Aniversário', 'engagement', 'Feliz aniversário, {{nome}}! 🎂🎈 Que seu dia seja maravilhoso! A Unique deseja tudo de bom! 💖', '["nome"]'::jsonb, true),
('Reativação', 'reactivation', 'Oi {{nome}}! Há quanto tempo! 😊 Lembrei de você e quis saber como está. Temos novidades incríveis! Podemos conversar?', '["nome"]'::jsonb, true),
('Cirurgia Amanhã', 'surgery', 'Olá {{nome}}! 🏥 Amanhã é o grande dia! Lembre-se: jejum de {{horas_jejum}}h, chegue às {{horario}}. Estamos te esperando! 💪', '["nome", "horas_jejum", "horario"]'::jsonb, true),
('Pós-Cirurgia D+1', 'post_surgery', 'Oi {{nome}}! 💖 Como você está se sentindo hoje? Qualquer dúvida sobre a recuperação, estou aqui!', '["nome"]'::jsonb, true),
('Indicação', 'referral', 'Oi {{nome}}! 😊 Você tem alguma amiga que também gostaria de conhecer a Unique? Temos condições especiais para indicações!', '["nome"]'::jsonb, true),
('Retorno Manutenção', 'maintenance', 'Oi {{nome}}! Já faz {{meses}} meses desde seu {{procedimento}}. Que tal agendar sua manutenção? 🌟', '["nome", "meses", "procedimento"]'::jsonb, true)
ON CONFLICT DO NOTHING;
