-- ============================================
-- TABELA DE BASE DE CONHECIMENTO OTIMIZADA
-- ============================================

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Categorização
  tipo VARCHAR NOT NULL CHECK (tipo IN (
    'script_vendas', 'protocolo', 'objecao', 'faq', 'estudo_caso',
    'metodo_cpi', 'experiencia_unique', 'departamento', 'cadencia',
    'qualificacao', 'manual', 'procedimento_info'
  )),
  
  -- Conteúdo
  titulo VARCHAR NOT NULL,
  conteudo TEXT NOT NULL,
  conteudo_estruturado JSONB,
  
  -- Contexto e busca
  tags TEXT[] DEFAULT '{}',
  categoria VARCHAR,
  departamento VARCHAR,
  etapa_funil VARCHAR,
  procedimentos_relacionados TEXT[],
  
  -- Metadados
  prioridade INT DEFAULT 5,
  ativo BOOLEAN DEFAULT true,
  visualizacoes INT DEFAULT 0,
  avaliacoes_positivas INT DEFAULT 0,
  avaliacoes_negativas INT DEFAULT 0,
  
  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  atualizado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários aprovados podem ler knowledge_base"
  ON knowledge_base FOR SELECT TO authenticated
  USING (public.is_approved_user());

CREATE POLICY "Admins podem gerenciar knowledge_base"
  ON knowledge_base FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Índices
CREATE INDEX idx_kb_tipo ON knowledge_base(tipo);
CREATE INDEX idx_kb_categoria ON knowledge_base(categoria);
CREATE INDEX idx_kb_departamento ON knowledge_base(departamento);
CREATE INDEX idx_kb_tags ON knowledge_base USING GIN(tags);
CREATE INDEX idx_kb_busca ON knowledge_base USING GIN(to_tsvector('portuguese', titulo || ' ' || conteudo));

-- Trigger
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CONHECIMENTO INICIAL
-- ============================================

-- Método CPI
INSERT INTO knowledge_base (tipo, titulo, conteudo, conteudo_estruturado, tags, categoria, prioridade) VALUES
('metodo_cpi', 'Método CPI - Cirurgia Plástica Integrativa', 
'O Método CPI é a abordagem exclusiva da Unique que combina: Corpo, Pele e Injetáveis em um protocolo personalizado. Não tratamos apenas sintomas - buscamos a causa raiz do envelhecimento.',
'{"pilares": ["Corpo", "Pele", "Injetáveis"], "diferencial": "Visão 360° do paciente"}',
ARRAY['metodo', 'cpi', 'integrativo'], 'metodologia', 10),

('experiencia_unique', 'Unique Day - Experiência Premium', 
'Experiência VIP de um dia inteiro: múltiplos procedimentos, café da manhã, almoço gourmet, sala VIP de recuperação e kit pós-procedimento.',
'{"inclui": ["Café da manhã", "Múltiplos procedimentos", "Almoço gourmet", "Sala VIP"], "valor_medio": "R$ 15.000+"}',
ARRAY['spa', 'day', 'premium', 'vip'], 'experiencias', 10);

-- Cadências
INSERT INTO knowledge_base (tipo, titulo, conteudo, conteudo_estruturado, tags, departamento, prioridade) VALUES
('cadencia', 'Cadência SDR - Leads Novos', 
'Dia 0: Contato em 5 min. Dia 1: Follow-up manhã. Dia 2: Follow-up tarde. Dia 3: Última tentativa + oferta.',
'{"dias": [{"dia": 0, "acao": "5 min"}, {"dia": 1, "acao": "Manhã"}, {"dia": 2, "acao": "Tarde"}, {"dia": 3, "acao": "Final"}]}',
ARRAY['cadencia', 'sdr', 'follow-up'], 'SDR', 9),

('cadencia', 'Cadência Closer - Pós-Avaliação', 
'Dia 0: Proposta enviada. Dia 1: Follow-up decisão. Dia 3: Lembrete condição especial. Dia 7: Última tentativa.',
'{"dias": [{"dia": 0, "acao": "Proposta"}, {"dia": 1, "acao": "Decisão"}, {"dia": 3, "acao": "Lembrete"}, {"dia": 7, "acao": "Final"}]}',
ARRAY['cadencia', 'closer', 'proposta'], 'Closer', 9);

-- Qualificação BANT
INSERT INTO knowledge_base (tipo, titulo, conteudo, conteudo_estruturado, tags, departamento, prioridade) VALUES
('qualificacao', 'Critérios BANT', 
'Budget: tem orçamento? Authority: decide sozinha? Need: qual a dor? Timeline: quando quer fazer? Lead qualificado = 3/4 positivos.',
'{"criterios": ["Budget", "Authority", "Need", "Timeline"], "minimo_qualificado": 3}',
ARRAY['bant', 'qualificacao', 'lead'], 'SDR', 10);

-- Objeções
INSERT INTO knowledge_base (tipo, titulo, conteudo, conteudo_estruturado, tags, prioridade) VALUES
('objecao', 'Está muito caro', 
'Valorize o Método CPI e ofereça parcelamento: "O diferencial da Unique é a experiência completa. Temos parcelamento em até 24x. Posso simular?"',
'{"tipo": "preco", "tecnica": "Reframe de valor + parcelamento"}',
ARRAY['objecao', 'preco', 'caro'], 9),

('objecao', 'Vou pensar', 
'Descubra a objeção real: "Claro! O que exatamente você gostaria de pensar? É sobre o procedimento, o investimento ou a data?"',
'{"tipo": "adiamento", "tecnica": "Clarificação"}',
ARRAY['objecao', 'pensar', 'adiamento'], 9),

('objecao', 'Preciso falar com meu marido/esposa', 
'Inclua o cônjuge: "Que tal agendarmos uma consulta onde ele/ela possa participar? Assim vocês tiram dúvidas juntos."',
'{"tipo": "autoridade", "tecnica": "Envolvimento"}',
ARRAY['objecao', 'marido', 'esposa'], 8),

('objecao', 'Tenho medo de cirurgia', 
'Tranquilize e mostre opções: "Entendo! Temos muitas opções não-cirúrgicas como Morpheus, Ultraformer e bioestimuladores. O Dr. Rogério avalia o melhor para você."',
'{"tipo": "medo", "tecnica": "Alternativas"}',
ARRAY['objecao', 'medo', 'cirurgia'], 9),

('objecao', 'Vi preço menor em outro lugar', 
'Diferencie pela experiência: "Entendo a comparação. Na Unique você leva o Método CPI completo, equipe especializada e acompanhamento. Não é só o procedimento, é toda a jornada."',
'{"tipo": "concorrencia", "tecnica": "Diferenciação de valor"}',
ARRAY['objecao', 'concorrencia', 'preco'], 9);

-- Scripts
INSERT INTO knowledge_base (tipo, titulo, conteudo, tags, departamento, etapa_funil, prioridade) VALUES
('script_vendas', 'Primeiro Contato SDR', 
'Olá [NOME]! Tudo bem? 😊 Aqui é a [SEU_NOME] da Unique! Vi seu interesse em [PROCEDIMENTO]. Posso te ajudar? O que te motivou a buscar esse tratamento?',
ARRAY['script', 'primeiro', 'contato'], 'SDR', 'Prospecção', 10),

('script_vendas', 'Agendamento de Avaliação', 
'[NOME], pelo que você me contou, o [PROCEDIMENTO] pode ser ideal! A próxima etapa é uma avaliação GRATUITA. Temos horários [DATA]. Manhã ou tarde fica melhor?',
ARRAY['script', 'agendamento', 'avaliacao'], 'SDR', 'Qualificação', 9),

('script_vendas', 'Apresentação de Proposta', 
'[NOME], com base na avaliação, montamos um protocolo CPI exclusivo. Vou mostrar o que inclui, os resultados esperados e o investimento. Vamos lá?',
ARRAY['script', 'proposta', 'fechamento'], 'Closer', 'Proposta', 9),

('script_vendas', 'Follow-up Pós-Procedimento', 
'Oi [NOME]! Como você está se sentindo após o procedimento? Qualquer dúvida estou aqui! Lembre-se de seguir as orientações do pós.',
ARRAY['script', 'pos-venda', 'follow-up'], 'CS', 'Pós-venda', 8);

-- FAQs
INSERT INTO knowledge_base (tipo, titulo, conteudo, tags, prioridade) VALUES
('faq', 'Quanto tempo dura a recuperação?', 
'Varia: Injetáveis = imediato. Laser = 24-48h. Cirurgias menores = 3-7 dias. Cirurgias maiores = 15-30 dias. Dr. Rogério orienta caso a caso.',
ARRAY['faq', 'recuperacao', 'tempo'], 8),

('faq', 'Vocês parcelam?', 
'Sim! Cartão até 24x, boleto/PIX à vista com desconto, financiamento próprio. A equipe financeira apresenta a melhor condição.',
ARRAY['faq', 'pagamento', 'parcelamento'], 8),

('faq', 'A consulta é paga?', 
'A avaliação inicial é GRATUITA! Dr. Rogério analisa seu caso, tira dúvidas e monta protocolo personalizado. Você decide depois.',
ARRAY['faq', 'consulta', 'gratis'], 9),

('faq', 'Os resultados são naturais?', 
'Sim! A filosofia da Unique é realçar sua beleza natural. O Método CPI busca resultados harmoniosos, nunca artificiais.',
ARRAY['faq', 'resultado', 'natural'], 8);

-- Departamentos
INSERT INTO knowledge_base (tipo, titulo, conteudo, conteudo_estruturado, tags, departamento, prioridade) VALUES
('departamento', 'SDR - Sales Development', 
'Primeiro contato e qualificação. Meta: qualificar leads e agendar avaliações. KPIs: tempo resposta, taxa agendamento.',
'{"metas": ["Contato em 5 min", "30% conversão agendamento"]}',
ARRAY['departamento', 'sdr'], 'SDR', 9),

('departamento', 'Closer - Consultor de Vendas', 
'Apresentação de propostas e fechamento. Meta: converter avaliações em vendas. KPIs: conversão, ticket médio.',
'{"metas": ["50% conversão", "Ticket R$ 8.000+"]}',
ARRAY['departamento', 'closer'], 'Closer', 9),

('departamento', 'CS - Customer Success', 
'Jornada pós-venda e satisfação. Meta: experiência excelente e indicações. KPIs: NPS, recompra.',
'{"metas": ["NPS > 80", "30% recompra"]}',
ARRAY['departamento', 'cs'], 'CS', 9),

('departamento', 'Farmer - Gestão de Carteira', 
'Reativação e fidelização. Meta: maximizar LTV e recuperar inativos. KPIs: taxa reativação, upsell.',
'{"metas": ["20% reativação", "2+ procedimentos/ano"]}',
ARRAY['departamento', 'farmer'], 'Farmer', 9);