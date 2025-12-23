// Scripts e modelos extraídos dos documentos comerciais da Unique

export interface ActionScript {
  action: string;
  description?: string;
  script?: string;
  checklist?: string[];
  tips?: string[];
  sla?: string;
}

export interface TeamGoal {
  meta1?: string;
  meta2?: string;
  meta3: string;
  meta3Individual?: string;
  members?: string[];
}

export interface StageScripts {
  stageId: number;
  stageKey: string; // 'sdr', 'social_selling', 'closer', 'cs', 'farmer'
  title: string;
  mission: string;
  objective: string;
  teamGoal?: TeamGoal;
  kpis?: string[];
  actions: ActionScript[];
  dossier?: {
    title: string;
    fields: string[];
  };
  transitionScript?: string;
  notificationTemplate?: string;
  supervisionChecklist?: string[];
  interventions?: { condition: string; action: string }[];
}

export const COMMERCIAL_SCRIPTS: StageScripts[] = [
  // ============================================
  // SDR - Atendimento de Leads Inbound (Concierge Comercial)
  // ============================================
  {
    stageId: 1,
    stageKey: "sdr",
    title: "SDR - Atendimento de Leads Inbound",
    mission: "O SDR (Sales Development Representative) + Concierge Comercial desempenha um papel estratégico na jornada do lead, oferecendo um atendimento ágil, acolhedor e altamente personalizado. Sua missão é garantir que cada potencial paciente seja qualificado com precisão e conduzido de forma natural ao próximo estágio do processo de vendas.",
    objective: "Transformar leads em consultas agendadas e qualificadas. IMPORTANTE: Você NÃO vende a cirurgia. Você vende a CONSULTA (Unique Day). A cirurgia é responsabilidade do Closer (Comercial 2).",
    teamGoal: {
      meta1: "R$ 39.155 (Equipe) | R$ 19.577 (Individual) - 59 consultas",
      meta2: "R$ 42.287 (Equipe) | R$ 21.144 (Individual) - 63 consultas",
      meta3: "R$ 52.206 (Equipe) | R$ 26.103 (Individual) - 70 consultas",
      meta3Individual: "R$ 26.103 - ~35 consultas",
      members: ["Ana Paula", "Ketley"]
    },
    kpis: [
      "Tentativas de contato: 50+/dia",
      "Conversas iniciadas: 15+/dia",
      "Consultas agendadas: 3+/dia",
      "Taxa de resposta: >40%",
      "Taxa de agendamento: >20%",
      "Tempo de Primeira Resposta: < 5 minutos",
      "100% dos leads no CRM atualizados"
    ],
    supervisionChecklist: [
      "Monitorar: Tempo de primeira resposta (meta: < 5 min)",
      "Se tempo de resposta > 5 min: Verificar carga de trabalho e redistribuir leads",
      "Se taxa de qualificação baixa: Revisar critérios e scripts",
      "Se taxa de agendamento baixa: Treinar técnicas de fechamento",
      "Checklist semanal: Ouvir 5 ligações de qualificação",
      "Verificar qualidade das mensagens",
      "Analisar taxa de follow-up"
    ],
    interventions: [
      { condition: "Tempo de resposta > 5 min", action: "Verificar carga de trabalho e redistribuir leads" },
      { condition: "Taxa de qualificação baixa", action: "Revisar critérios de qualificação e scripts" },
      { condition: "Taxa de agendamento baixa", action: "Treinar técnicas de fechamento de agendamento" }
    ],
    actions: [
      // VALORES E CULTURA
      {
        action: "Valores e Cultura SDR",
        description: "Princípios fundamentais para o atendimento de excelência.",
        checklist: [
          "⚡ Proatividade: Não dê desculpas, faça acontecer",
          "🤝 Conexão: Trate cada cliente como um membro da família",
          "😊 Energia e Positividade: Sorrir com a voz é pré-requisito",
          "📂 Organização: Uma boa gestão da carteira garante mais conversões",
          "💪 Trabalho em Equipe: Juntos somos mais fortes",
          "🎯 Resolutividade: Para cada desafio, apresente soluções",
          "🗣 Objetividade: Seja claro e transparente"
        ]
      },
      // RESPONSABILIDADES PRINCIPAIS
      {
        action: "Recepção e Qualificação Premium",
        description: "Atender o lead de forma humanizada e empática, criar conexão emocional desde o primeiro contato.",
        checklist: [
          "Atender o lead de forma humanizada e empática",
          "Sondar necessidades através de perguntas estratégicas",
          "Criar conexão emocional desde o primeiro contato"
        ]
      },
      {
        action: "Curadoria e Recomendação Personalizada",
        description: "Analisar perfil do lead e destacar diferenciais da Unique.",
        checklist: [
          "Analisar o perfil do lead e qualificá-lo",
          "Destacar os diferenciais da Unique de forma persuasiva",
          "Aplicar gatilhos emocionais e provas sociais"
        ]
      },
      {
        action: "Facilitação da Jornada",
        description: "Remover barreiras e direcionar para conversão.",
        checklist: [
          "Remover barreiras para conversão",
          "Direcionar para a melhor abordagem de atendimento"
        ]
      },
      {
        action: "Gestão de Sistemas",
        description: "Manter CRM e Feegow atualizados.",
        checklist: [
          "CRM (Kommo): Manter todas as interações atualizadas",
          "Feegow: Inserir cadastro, agendamentos, anexos e documentação"
        ]
      },
      // AGENDA DE SUCESSO
      {
        action: "Check-in Matinal (08:00 - 08:30)",
        description: "Verificar novos leads da noite, priorizar por temperatura."
      },
      {
        action: "Ligações Urgentes (08:30 - 09:00)",
        description: "Contatar leads que entraram nas últimas 12h."
      },
      {
        action: "Bloco de Prospecção (09:00 - 10:30)",
        description: "Ligações e WhatsApp para leads novos."
      },
      {
        action: "Follow-up D+1 (10:30 - 11:00)",
        description: "Leads que não responderam ontem."
      },
      {
        action: "Qualificação (11:00 - 12:00)",
        description: "Aprofundar conversas em andamento."
      },
      {
        action: "Atualização CRM (13:00 - 13:30)",
        description: "Registrar todas as interações da manhã."
      },
      {
        action: "Bloco de Ligações (13:30 - 15:00)",
        description: "Horário nobre para contatos."
      },
      {
        action: "Follow-up D+3 e D+5 (15:00 - 16:00)",
        description: "Cadência de nutrição."
      },
      {
        action: "Agendamentos (16:00 - 17:00)",
        description: "Confirmar e agendar consultas."
      },
      {
        action: "Preparação Passagem de Bastão (17:00 - 17:30)",
        description: "Preparar dossiês para Closers."
      },
      {
        action: "Check-out (17:30 - 18:00)",
        description: "Atualizar CRM, planejar próximo dia."
      },
      // PROCESSO DE VENDAS
      {
        action: "Etapa 1: Preparação Pré-Chamada",
        description: "Antes de ligar, SEMPRE faça a preparação completa.",
        checklist: [
          "Verificar origem do lead: Instagram? Google? Indicação? Formulário?",
          "Analisar respostas do formulário: Qual procedimento? Qual dor/motivação?",
          "Pesquisar o lead: Ver Instagram, identificar pontos de rapport",
          "Preparar abordagem personalizada: Adaptar script conforme perfil"
        ]
      },
      {
        action: "Etapa 2: Primeiro Contato - Ligação",
        description: "Leads respondidos em até 5 minutos têm 9x mais chances de conversão. LIGUE PRIMEIRO!",
        sla: "5 minutos",
        script: "Oi, [Nome]! Tudo bem?\n\nQuem está falando aqui é [Seu Nome], da Unique Plástica Avançada.\n\nPrimeiro, quero te agradecer por confiar em nós nesse momento tão especial da sua jornada.\n\nFique tranquila, é um bate papo rápido para entender um pouquinho melhor sobre você, para podermos te direcionar para o profissional e o plano que mais combinam com seus sonhos e necessidades, combinado?"
      },
      {
        action: "Quebra-gelo + Perguntas de Qualificação",
        description: "Sequência de perguntas para qualificar o lead.",
        script: "[QUEBRA-GELO]\nVi que você é de [Cidade X], que bacana! Temos muitos pacientes da sua região que buscam aqui na Unique essa transformação especial.\n\n[PERGUNTA 1 - ORIGEM]\nE me conta: como você conheceu a Unique?\n\n[PERGUNTA 2 - PROCEDIMENTO]\nVi que você tem interesse em [Procedimento]. O que te motivou a buscar esse procedimento? Foi algum incômodo, vontade antiga, ou outro motivo especial?\n\n[PERGUNTA 3 - IMPACTO EMOCIONAL]\nE isso te impacta de alguma forma no dia a dia? (deixou de usar alguma roupa, evitou praia?)\n\n[VALIDAR] \"Entendo muito... isso é mais comum do que você imagina.\"\n\n[PERGUNTA 4 - HISTÓRICO]\nVocê já chegou a buscar outras informações ou conversar com algum profissional sobre esse sonho?\n\n[PERGUNTA 5 - PLANEJAMENTO]\nA cirurgia plástica é um momento muito especial — e diferente de outras cirurgias, conseguimos planejar tudo. Você já chegou a pensar ou começou algum tipo de planejamento para esse sonho?\n\n[PERGUNTA 6 - IMAGINAÇÃO DO FUTURO]\nSe pudesse se ver daqui a alguns meses, vivendo essa transformação, como você se imagina?"
      },
      {
        action: "Etapa 3: Apresentação do Unique Day",
        description: "Após qualificar o lead, apresente a consulta.",
        script: "Perfeito, entendi perfeitamente tudo [Nome],\n\nPelo que você me contou, você tem uma história linda e um sonho verdadeiro.\n\nAqui na Unique, a gente leva isso muito a sério, e por isso estamos aqui para te acompanhar...\n\nSomos referência nacional em Cirurgia Plástica Integrativa, com um método exclusivo criado por nós: o Método CPI, que considera não só o estético, mas também seu histórico, sua saúde, sua rotina e sua essência.\n\nPor isso, antes de tudo, nós criamos o UNIQUE DAY – nossa consulta completa de cirurgia plástica.\n\nFaz sentido para você viver essa jornada de transformação?\n\n[ESPERAR RESPOSTA]\n\nNo Unique Day, é uma consulta completa com o nosso time de especialistas, onde você vai:\n✅ Passar por uma análise estética e funcional\n✅ Receber orientações personalizadas com base nos 7 pilares do Método CPI\n✅ Conhecer os caminhos reais e seguros para alcançar seu resultado dos sonhos\n✅ Receber um diagnóstico completo e o plano ideal de procedimento"
      },
      {
        action: "Etapa 4: Apresentação de Valores",
        description: "Apresentar valores do Unique Day.",
        script: "Perfeito, vou te apresentar agora o valor do nosso Unique Day.\n\nOs valores do Unique Day:\n💎 Consulta com o nosso time de cirurgiões plásticos Unique: R$ 750,00\n💎 Consulta com indicação de influenciadora: R$ 600,00\n👑 Com o Dr. André Oliveira (Diretor Unique e criador do Método CPI): R$ 1.270,00\n\nQual opção faz mais sentido para você?"
      },
      {
        action: "Etapa 5: Fechamento do Agendamento",
        description: "Garantir o agendamento e pagamento.",
        script: "Nossa agenda é bastante disputada e temos uma fila de espera ativa.\n\nPosso verificar um horário exclusivo para você agora?\n\nVocê prefere presencial na clínica ou online?\n\n[SE ONLINE] \"Tenho horário [DATA PRÓXIMA] às 10h ou [DATA MAIS DISTANTE] às 11h. Qual fica melhor para você?\"\n\n[SE PRESENCIAL] \"Tenho horário [DATA PRÓXIMA] às 14h ou [DATA MAIS DISTANTE] às 15h. Qual fica melhor para você?\"\n\n[APÓS ESCOLHA]\nPerfeito! Para garantir sua vaga:\n💳 PIX: R$ [VALOR] - CNPJ: 17251106000160\n💳 OU Cartão: até 3x sem juros\n\nQual forma prefere? Vou te passar o link agora mesmo!\n\n🔗 https://www.asaas.com/c/icexf11gibg923b8"
      },
      // SCRIPTS WHATSAPP
      {
        action: "Script - Lead Não Atendeu (WhatsApp)",
        description: "Sequência de mensagens para leads que não atenderam ligação.",
        script: "Mensagem 1 - Quebra-gelo + Procedimento:\nTranquilo, podemos continuar por aqui.. 😊\n\nVi que você é de [Cidade X]… que bacana!\n\nE vi também que você demonstrou interesse em [Procedimento].\n\nMe conta rapidinho: o que te motivou a buscar essa transformação? Algum incômodo, sonho antigo?\n\nMensagem 2 - Planejamento:\nA cirurgia plástica é um momento muito especial — e diferente de outras cirurgias, conseguimos planejar tudo.\n\nVocê já chegou a pensar ou começou algum tipo de planejamento para esse sonho?\n\nMensagem 3 - Impacto + Imaginação:\nE como você se imagina depois de viver essa mudança? ✨\n\n(Às vezes é voltar a usar uma roupa, viajar sem insegurança, se sentir ainda melhor no espelho…)\n\nMensagem 4 - Transição para Unique Day:\nQue lindo, [Nome]!\n\nAqui na Unique, cuidamos de cada paciente de forma única. 🌟\n\nCriamos o Método CPI, que considera não só o estético, mas também sua saúde, sua rotina e sua essência.\n\nPara te guiar nesse processo, oferecemos o Unique Day, nossa consulta premium de avaliação integrativa.\n\nFaz sentido pra você darmos esse primeiro passo juntas?"
      },
      {
        action: "Script - Mensagem Automática (Bot)",
        description: "Primeira mensagem automática para novos leads.",
        script: "Bem-vinda(o) à Unique Plástica Avançada!\n\nRecebemos seu interesse em [Procedimentos Corporais] e estamos felizes em acompanhá-la nessa jornada.\n\nMe conta: o que te motivou a procurar esse procedimento?"
      },
      {
        action: "Script - Após Resposta do Lead",
        description: "Resposta empática e proposta de ligação.",
        script: "Entendo perfeitamente... e saiba que aqui você não está sozinha, recebemos muitas pacientes que chegam até nós [mesma dor citada] e juntos fazemos um plano personalizado baseado nas suas necessidades.\n\nPosso te ligar para verificar o melhor profissional para o seu caso?"
      },
      {
        action: "Script - Passando Média de Valores",
        description: "Como informar valores de procedimentos.",
        script: "Inspiração 1 - Por escrito:\nOi, [Nome]! ✨\n\nPara te deixar ainda mais por dentro, a média dos nossos procedimentos gira em torno de R$ X a R$ Y, dependendo da avaliação personalizada de cada caso.\n\nTrabalhamos com técnicas exclusivas pelo nosso Método CPI, focado em segurança, naturalidade e resultados de alta performance. 🌟\n\nEsse valor era o que você esperava investir?\n\nInspiração 2 - Após ligação:\nOi, [Nome]! 💬\n\nFoi um prazer conversar com você! ✨\n\nSó reforçando o que falamos: a média dos nossos procedimentos fica entre R$ X e R$ Y, variando conforme a necessidade e personalização para cada caso. 💖\n\nNosso foco é garantir segurança, naturalidade e resultados incríveis através do Método CPI. 🌟\n\nO que você achou desse valor?"
      },
      // QUALIFICAÇÃO BANT
      {
        action: "Qualificação BANT",
        description: "Método de qualificação de leads.",
        checklist: [
          "N - Need (Necessidade): Qual procedimento te interessa? Há quanto tempo você pensa nisso? → Avaliar clareza do desejo",
          "A - Authority (Decisão): Você toma as decisões sozinha ou precisa conversar com alguém? → Avaliar autonomia",
          "T - Timeline (Prazo): Para quando você gostaria de fazer? Tem alguma data específica? → Avaliar urgência",
          "B - Budget (Orçamento): Você já pesquisou sobre valores ou é a primeira vez? → Avaliar capacidade de investimento"
        ],
        tips: [
          "🔥 QUENTE: Tem urgência, já pesquisou, tem budget → Agendar HOJE",
          "🟡 MORNO: Interesse real, mas sem urgência definida → Follow-up intensivo",
          "🔵 FRIO: Apenas curiosidade, sem planejamento → Nutrir com conteúdo"
        ]
      },
      // FOLLOW-UP
      {
        action: "Follow-up Cadência 7 Dias",
        description: "Sequência estratégica de follow-up.",
        tips: [
          "D+1 WhatsApp - Retomada: Oi, [Nome]! Passando só para saber se ficou alguma dúvida da nossa conversa de ontem. Lembre-se que a consulta é o passo mais importante para você entender o melhor caminho para o seu sonho! 😊",
          "D+3 WhatsApp - Prova Social: [Nome], lembrei de você! Vi esse depoimento da [Paciente] que tinha a mesma dúvida que você e hoje está super realizada. Dá uma olhada! [LINK]. Quando quiser conversar, estou aqui!",
          "D+5 Ligação - Contato direto: Ligar e retomar conversa",
          "D+7 WhatsApp - Última tentativa: [Nome], essa é minha última tentativa! 😊 Respeito seu tempo, mas não quero que você perca a chance de ter um diagnóstico completo. Se mudar de ideia, é só me chamar. Vou arquivar nossa conversa por enquanto, ok? Um abraço!"
        ]
      },
      // QUEBRA DE OBJEÇÕES
      {
        action: "Quebra de Objeções - Vou Pensar",
        description: "Superar objeção de adiamento.",
        script: "Claro, respeito seu tempo. Mas preciso te avisar com carinho:\n\nO Unique Day tem uma agenda rotativa e filas em algumas agendas, especialmente do Dr. André.\n\nPosso segurar seu horário por 1 hora sem compromisso, apenas para você não perder essa chance. Te reservo?"
      },
      {
        action: "Quebra de Objeções - Está Caro",
        description: "Superar objeção de preço.",
        script: "Entendo sua preocupação com o investimento.\n\nMas me conta: o que é mais importante para você, preço ou segurança na sua vida?\n\nNosso Unique Day é a consulta mais completa do Brasil, com avaliação pelos 7 pilares do Método CPI. É um investimento na sua transformação com segurança.\n\nE lembre-se: se você decidir fazer a cirurgia conosco, o valor da consulta é 100% abatido!"
      },
      {
        action: "Quebra de Objeções - Preciso Falar com Marido/Família",
        description: "Superar objeção de decisão compartilhada.",
        script: "Claro, entendo perfeitamente! É uma decisão importante.\n\nInclusive, você pode trazer seu marido/família na consulta para que ele também conheça nosso método e tire todas as dúvidas.\n\nQue tal agendarmos já pensando nisso? Assim vocês podem vir juntos!"
      },
      {
        action: "Quebra de Objeções - Não Tenho Tempo",
        description: "Superar objeção de falta de tempo.",
        script: "Entendo que a rotina pode ser corrida!\n\nPor isso oferecemos consultas online, que você pode fazer do conforto da sua casa, em apenas 1 hora.\n\nTenho horários no início da manhã ou no final da tarde. Qual período seria melhor para você?"
      },
      // PASSAGEM DE BASTÃO
      {
        action: "Passagem de Bastão para Closer",
        description: "A consulta foi AGENDADA e PAGA. Você NÃO passa o lead antes da consulta. O Closer assume APÓS a consulta médica.",
        sla: "Notificar Closer em até 2 horas após a consulta médica",
        checklist: [
          "Consulta cadastrada na agenda Feegow",
          "Link gerado no Feegow (para online)",
          "Formulário enviado ao paciente",
          "Formulário preenchido e anexado ao Feegow",
          "Ficha do paciente iniciada",
          "Conta criada no sistema",
          "Lead adicionado ao CRM com tags corretas",
          "Conversa registrada com status atualizado"
        ]
      },
      {
        action: "Mensagem de Confirmação para Paciente",
        description: "Enviar após agendamento confirmado.",
        script: "Consulta agendada! 🎉\n\nSerá um prazer te receber em nosso complexo e realizar o seu sonho!\n\nVocê estará no melhor lugar e com os melhores Cirurgiões Plásticos do Brasil!\n\n📅 Data: [DATA]\n⏰ Horário: [HORÁRIO]\nProfissional: [NOME DO MÉDICO]\n📍 Local: [ENDEREÇO ou LINK DA CHAMADA]\n\nQualquer dúvida, estou à disposição! 💖"
      },
      {
        action: "Notificação para Closer",
        description: "Enviar após consulta médica realizada.",
        script: "🚀 NOVA CONSULTA REALIZADA!\n\nPaciente: [NOME]\nData da consulta: [DATA]\nCirurgião: [NOME DO MÉDICO]\nProcedimento de interesse: [PROCEDIMENTO]\n\n📋 Dossiê completo no Feegow e CRM.\n\nObservações importantes:\n- [PONTOS RELEVANTES DA QUALIFICAÇÃO]\n- [DOR PRINCIPAL]\n- [NÍVEL DE URGÊNCIA]\n\nPor favor, entrar em contato em até 2 horas após a consulta."
      },
      // CHECKLISTS DIÁRIOS
      {
        action: "Check-in Matinal (08:00)",
        description: "Checklist de início do dia.",
        checklist: [
          "Verificar novos leads da noite",
          "Priorizar leads por temperatura (quente > morno > frio)",
          "Revisar agenda de follow-ups do dia",
          "Verificar consultas agendadas para hoje",
          "Preparar lista de ligações"
        ]
      },
      {
        action: "Check-out (17:30)",
        description: "Checklist de fim do dia.",
        checklist: [
          "Atualizar TODOS os leads no CRM",
          "Registrar todas as interações do dia",
          "Preparar dossiês de consultas agendadas",
          "Enviar notificações para Closers (se aplicável)",
          "Planejar prioridades do próximo dia",
          "Verificar metas diárias atingidas"
        ]
      },
      // O QUE NÃO FAZER
      {
        action: "O Que NÃO Fazer",
        description: "Erros a evitar no atendimento.",
        checklist: [
          "NÃO passar valores detalhados de procedimentos cirúrgicos antes da consulta",
          "NÃO explicar técnicas médicas – não somos médicos!",
          "NÃO entregar todas as informações sem garantir que o lead avance",
          "NÃO utilizar palavras que desvalorizem a Unique (ex: 'promoção')",
          "NÃO oferecer desconto de primeira sem que o lead demonstre precisar",
          "NÃO se desculpar por ligar – o lead buscou por sua ajuda!"
        ],
        tips: [
          "Se o lead já souber tudo, ele não verá valor na consulta!",
          "Quem chega primeiro, fecha a venda.",
          "Diga o necessário para avançar, não para confundir.",
          "Venda é condução. Seja o guia que o lead precisa!"
        ]
      }
    ],
    dossier: {
      title: "Dossiê Comercial 1 - Venda da Consulta",
      fields: [
        "1. IDENTIFICAÇÃO DO LEAD:",
        "Nome completo",
        "Contato (WhatsApp)",
        "Cidade e Estado",
        "Origem do lead: Instagram / Google / Indicação / Outro",
        "Data do primeiro contato",
        "Status: Agendado",
        "2. AGENDAMENTO DA CONSULTA:",
        "Tipo de consulta: Presencial / Online",
        "Data e horário agendado",
        "Profissional escolhido",
        "Link de consulta online enviado: Sim / Não",
        "3. QUALIFICAÇÃO DO LEAD:",
        "Procedimento de interesse",
        "Dor/motivação principal",
        "Impacto emocional identificado",
        "Histórico (já consultou outros?)",
        "Planejamento financeiro",
        "Sonho/imaginação do futuro",
        "4. CLASSIFICAÇÃO:",
        "Lead quente / morno / frio",
        "5. OBSERVAÇÕES IMPORTANTES"
      ]
    },
    transitionScript: "Consulta agendada! 🎉\n\nSerá um prazer te receber em nosso complexo e realizar o seu sonho!\n\nVocê estará no melhor lugar e com os melhores Cirurgiões Plásticos do Brasil!\n\n📅 Data: [DATA]\n⏰ Horário: [HORÁRIO]\nProfissional: [NOME DO MÉDICO]\n📍 Local: [ENDEREÇO ou LINK DA CHAMADA]\n\nQualquer dúvida, estou à disposição! 💖",
    notificationTemplate: "🚀 NOVA CONSULTA REALIZADA!\n\nPaciente: [NOME]\nData da consulta: [DATA]\nCirurgião: [NOME DO MÉDICO]\nProcedimento de interesse: [PROCEDIMENTO]\n\n📋 Dossiê completo no Feegow e CRM.\n\nObservações importantes:\n- [DOR PRINCIPAL]\n- [NÍVEL DE URGÊNCIA]\n\nPor favor, entrar em contato em até 2 horas após a consulta."
  },
  // ============================================
  // SOCIAL SELLING - Prospecção e Fechamento de Consulta
  // ============================================
  {
    stageId: 2,
    stageKey: "social_selling",
    title: "Social Selling - Prospecção e Fechamento de Consulta",
    mission: "Ser a porta de entrada para a transformação de vida das nossas pacientes. Você é responsável por encontrar, conectar, qualificar e agendar a consulta de pacientes em potencial, garantindo que elas se sintam acolhidas e confiantes desde o primeiro contato.",
    objective: "Prospectar leads nas redes sociais, qualificar e converter em consultas pagas (Unique Day).",
    teamGoal: {
      meta1: "R$ 39.155 (R$ 19.577/vendedora) - ~59 consultas",
      meta2: "R$ 42.287 (R$ 21.144/vendedora) - ~63 consultas",
      meta3: "R$ 52.206 (R$ 26.103/vendedora) - ~70 consultas 🎯",
      meta3Individual: "~35 consultas/mês por vendedora",
      members: ["Ana Paula", "Ketley"]
    },
    kpis: [
      "Nº de Leads Gerados (prospecção) - Meta: 30+ novos seguidores/dia",
      "DMs de Prospecção Enviadas - Meta: 15+ por dia",
      "Interações em Perfis - Meta: 50+ por dia",
      "Taxa de Resposta (abertura)",
      "Taxa de Conversão (Lead → Consulta Agendada)",
      "Consultas Agendadas por Mês"
    ],
    actions: [
      // AGENDA DE SUCESSO - ROTINA DIÁRIA
      {
        action: "AGENDA DE SUCESSO (Rotina Diária)",
        description: "Organização do dia para máxima produtividade em prospecção e fechamento.",
        checklist: [
          "08:00 - 09:00 | Check-in e Planejamento: Organizar o dia, revisar metas, preparar listas de prospecção",
          "09:00 - 11:00 | Prospecção Ativa: Enviar DMs, interagir com perfis, seguir novos leads",
          "11:00 - 12:00 | Follow-up: Acompanhar leads que não responderam",
          "12:00 - 13:00 | Almoço",
          "13:00 - 15:00 | Atendimento e Qualificação: Conversar com leads que responderam, qualificar e apresentar o Unique Day",
          "15:00 - 16:00 | Agendamento e Fechamento: Ligar para leads qualificados, fechar agendamentos, enviar links de pagamento",
          "16:00 - 17:00 | Passagem de Bastão: Preparar dossiês e notificar Closers sobre consultas agendadas",
          "17:00 - 17:30 | Check-out e CRM: Atualizar CRM, registrar interações, planejar o próximo dia"
        ]
      },
      // SCRIPTS DE PROSPECÇÃO - NOVOS SEGUIDORES
      {
        action: "Prospecção: Novos Seguidores - Boas-vindas",
        description: "Abordagem de leads que começaram a seguir o perfil da clínica.",
        script: "Oi [NOME DO CLIENTE], tudo bem? 😊\n\nAqui é [SEU NOME], da equipe da Unique Plástica Avançada.\n\nPassei aqui para te dar as boas-vindas! Espero de verdade que o nosso conteúdo seja útil para você.\n\n[APRECIAÇÃO SINCERA - Personalize!]\n• Que lindo! Vi aqui que você está noiva! Meus parabéns!\n• Amei suas fotos de viagem! Que lugar incrível! 🌴\n• Vi que você tem filhos lindos! Parabéns pela família! 👨‍👩‍👧\n\nÓtima [DIA DA SEMANA] para você!\n\nE aproveitando, qual foi o motivo principal de ter nos seguido? 😊",
        tips: [
          "SEMPRE personalizar com algo do perfil",
          "Usar nome do dia da semana atual",
          "Fazer apreciação sincera e específica",
          "A pergunta final abre a conversa naturalmente"
        ]
      },
      // PROSPECÇÃO ATIVA - COLD OUTREACH
      {
        action: "Prospecção Cold: Abordagem por Perfil (Interesse em Estética)",
        description: "Abordagem de perfis que demonstram interesse em estética, bem-estar ou moda.",
        script: "Oi [NOME], tudo bem? 😊\n\nMeu nome é [SEU NOME], sou especialista em transformação estética na Unique.\n\nVi que você tem interesse em [assunto, ex: bem-estar, moda, estética] e acredito que nosso trabalho pode te interessar.\n\nNós ajudamos mulheres a realizarem o sonho da cirurgia plástica com segurança e um método exclusivo, o CPI.\n\nPosso te mostrar como funciona? Sem compromisso! 😉",
        tips: [
          "Identificar interesse real no perfil",
          "Não parecer spam ou vendedor",
          "Mencionar o método CPI como diferencial",
          "Deixar leve e sem pressão"
        ]
      },
      {
        action: "Prospecção Cold: Abordagem por Localização",
        description: "Abordagem de perfis de pessoas que moram em Goiânia ou região.",
        script: "Oi [NOME], tudo bem? 😊\n\nSou a [SEU NOME] da Unique, o maior complexo de cirurgia plástica do Centro-Oeste.\n\nVi que você é de Goiânia e não poderia deixar de te convidar para conhecer nosso espaço.\n\nJá ouviu falar do nosso método CPI, que transforma a vida de mulheres como você?\n\nSeria um prazer te apresentar! ✨",
        tips: [
          "Verificar localização no perfil",
          "Usar proximidade geográfica como gancho",
          "Destacar posição de liderança regional",
          "Convidar para conhecer o espaço"
        ]
      },
      {
        action: "Prospecção Cold: Abordagem por Interação em Outros Perfis",
        description: "Abordagem de pessoas que comentaram em posts de influenciadoras parceiras ou conteúdos relacionados.",
        script: "Oi [NOME], tudo bem? 😊\n\nMeu nome é [SEU NOME], da Unique.\n\nVi seu comentário no post da [NOME DA INFLUENCIADORA] sobre [assunto] e me identifiquei muito!\n\nNós trabalhamos justamente com isso: ajudar mulheres a alcançarem sua melhor versão com segurança e acolhimento.\n\nVocê já pensou em fazer alguma cirurgia plástica?",
        tips: [
          "Monitorar comentários de influenciadoras parceiras",
          "Referenciar o assunto específico do post",
          "Criar identificação antes de perguntar",
          "Pergunta direta mas acolhedora"
        ]
      },
      // SCRIPTS DE ATENDIMENTO E QUALIFICAÇÃO
      {
        action: "Atendimento: Conexão Emocional (após resposta inicial)",
        description: "Script para criar conexão emocional após o lead responder à abordagem inicial.",
        script: "Que legal, [NOME]! Fico feliz em saber!\n\nMe conta uma coisa... Como você se sente quando se olha no espelho?\n\nSeja sincera comigo 💕 Estou aqui para te ajudar nessa transformação.",
        tips: [
          "Criar ambiente seguro para desabafo",
          "Usar emoji com moderação",
          "Mostrar empatia genuína",
          "Preparar para captar a DOR do lead"
        ]
      },
      {
        action: "Qualificação BANT Estruturada",
        description: "Entender se o lead tem potencial real de fechamento através do método BANT.",
        script: "Entendi perfeitamente, [NOME]. Para te ajudar da melhor forma, preciso entender alguns pontos:\n\n• Necessidade: Qual procedimento mais te interessa e há quanto tempo você pensa nisso?\n• Decisão: Você toma essa decisão sozinha ou precisa conversar com mais alguém?\n• Prazo: Para quando você gostaria de fazer? Tem alguma data em mente?\n• Orçamento: Você já pesquisou sobre valores ou é a primeira vez?",
        checklist: [
          "B - Budget (Orçamento): Já pesquisou valores? É a primeira vez?",
          "A - Authority (Autoridade): Decide sozinha ou precisa consultar alguém?",
          "N - Need (Necessidade): Qual procedimento? Há quanto tempo pensa nisso?",
          "T - Timeline (Prazo): Para quando gostaria? Tem data em mente?"
        ],
        tips: [
          "Não perguntar tudo de uma vez - ir naturalmente",
          "Anotar todas as respostas para o dossiê",
          "Identificar objeções antecipadamente",
          "Entender se há influenciadores na decisão"
        ]
      },
      {
        action: "Apresentação de Valor: Unique Day (Consulta)",
        description: "Apresentar a proposta de valor do Unique Day após qualificação.",
        script: "Perfeito! Baseado no que você me disse, o primeiro passo ideal é o nosso UNIQUE DAY - a consulta mais completa do Brasil.\n\nNela você terá:\n✅ 2h30 com nossa equipe médica especializada\n✅ Diagnóstico completo pelos 7 pilares do Método CPI\n✅ Simulação 3D do seu resultado\n✅ Plano cirúrgico 100% personalizado\n\nO investimento é de R$ 750,00 (ou R$ 600,00 com indicação de influenciadora), e se você decidir fazer a cirurgia conosco, esse valor é 100% abatido! ✨\n\nFaz sentido para você?",
        tips: [
          "Listar os benefícios antes do preço",
          "Mencionar que o valor é abatido na cirurgia",
          "R$ 600 para indicação de influenciadora",
          "Perguntar se faz sentido - não empurrar"
        ]
      },
      // SCRIPTS DE AGENDAMENTO E FECHAMENTO
      {
        action: "Ligação de Fechamento da Consulta",
        description: "Contato por telefone para agilizar o fechamento do agendamento.",
        script: "Oi [NOME], tudo bem? Aqui é a [SEU NOME] da Unique, conversamos agora pouco pelo Instagram/WhatsApp.\n\nEstou te ligando para agilizarmos seu agendamento e tirar qualquer dúvida que tenha ficado.\n\nNossa agenda é bem disputada, mas quero garantir um horário para você.\n\nVocê prefere presencial ou online? Tenho uma vaga para [DATA E HORA] ou [OUTRA DATA E HORA]. Qual fica melhor?",
        tips: [
          "Ligar é mais efetivo que mensagem",
          "Oferecer duas opções de horário",
          "Criar senso de urgência com agenda disputada",
          "Perguntar preferência presencial/online"
        ]
      },
      {
        action: "Fechamento por WhatsApp",
        description: "Script de fechamento para leads que preferem texto.",
        script: "[NOME], vamos garantir sua vaga no Unique Day? 😊\n\nNossa agenda é bastante disputada, mas consegui um horário exclusivo para você!\n\n• Opção 1: [DATA E HORA]\n• Opção 2: [DATA E HORA]\n\nQual prefere?\n\nPara garantir sua vaga, o pagamento pode ser:\n💳 PIX: R$ 750,00 (ou R$ 600,00) - CNPJ: 17251106000160\n💳 Cartão: até 3x sem juros\n\nQual forma prefere? Vou te passar o link agora mesmo!\n\n🔗 https://www.asaas.com/c/icexf11gibg923b8",
        tips: [
          "Oferecer duas opções de data/hora",
          "Incluir link de pagamento já na mensagem",
          "PIX ou Cartão até 3x sem juros",
          "CNPJ para pagamento: 17251106000160"
        ]
      },
      // PASSAGEM DE BASTÃO
      {
        action: "Mensagem de Transição para Paciente",
        description: "Script para preparar a paciente para o atendimento do Closer após pagamento confirmado.",
        script: "Parabéns, [NOME]! Sua consulta está confirmada! 🎉\n\nVocê deu o passo mais importante na sua jornada de transformação.\n\nAgora, a [NOME DA CLOSER], nossa especialista em planejamento cirúrgico, vai te dar as boas-vindas e te acompanhar nos próximos passos até o dia da sua consulta.\n\nEla já tem todas as informações da nossa conversa e vai te chamar em breve!\n\nSeja muito bem-vinda à Unique!"
      },
      {
        action: "Notificação para o Closer (CRM/WhatsApp)",
        description: "Template de notificação com dossiê completo para o Closer.",
        script: "🚀 NOVA CONSULTA AGENDADA!\n\n👤 Paciente: [NOME]\n📱 WhatsApp: [NÚMERO]\n📅 Data da Consulta: [DATA E HORA]\n\n📋 Dossiê de Qualificação:\n• Dor Principal: [DOR]\n• Sonho: [SONHO]\n• Procedimento de Interesse: [PROCEDIMENTO]\n• Nível de Urgência: [ALTO/MÉDIO/BAIXO]\n• Observações: [PONTOS RELEVANTES]\n\n⏰ Por favor, entrar em contato para as boas-vindas em até 2 horas.",
        sla: "Notificar Closer imediatamente após pagamento confirmado"
      },
      // CHECKLISTS OPERACIONAIS
      {
        action: "Checklist de Prospecção Diária",
        description: "Lista de tarefas obrigatórias de prospecção por dia.",
        checklist: [
          "Analisar 30+ novos seguidores",
          "Enviar 15+ DMs de prospecção (cold)",
          "Interagir com 50+ perfis (curtidas, comentários)"
        ]
      },
      {
        action: "Checklist de Agendamento",
        description: "Passos obrigatórios para fechar cada agendamento.",
        checklist: [
          "Qualificação BANT completa",
          "Apresentação de valor do Unique Day",
          "Confirmação de data e hora",
          "Envio do link de pagamento",
          "Confirmação do pagamento",
          "Preparação do dossiê para o Closer",
          "Notificação do Closer"
        ]
      },
      {
        action: "Onde Encontrar Leads para Prospecção",
        description: "Fontes de leads para prospecção ativa.",
        checklist: [
          "Hashtags: #cirurgiaplastica, #rinoplastia, #lipoaspiração, #mamoplastia, #abdominoplastia, #silicone, #plástica",
          "Comentários em posts de procedimentos",
          "Stories mencionando insatisfação corporal",
          "Seguidores de influencers de beleza",
          "Grupos de mães (pós-gravidez)",
          "Seguidores de clínicas concorrentes"
        ]
      },
      {
        action: "Engajamento antes da Abordagem Direta",
        description: "Passos para criar conexão antes de abordar diretamente.",
        checklist: [
          "Curtir 3-5 fotos do perfil",
          "Comentar genuinamente em 1-2 posts",
          "Responder stories com interesse genuíno",
          "Esperar 24-48h antes de abordar diretamente",
          "NUNCA parecer vendedor na primeira interação"
        ],
        tips: [
          "Engajamento genuíno aumenta taxa de resposta",
          "Paciência é fundamental - não atropelar",
          "Qualidade > Quantidade nas interações"
        ]
      }
    ],
    dossier: {
      title: "Dossiê de Qualificação Social Selling",
      fields: [
        "Nome completo",
        "WhatsApp (com DDD)",
        "Instagram (@)",
        "Cidade/Estado",
        "Origem: Social Selling (Novo seguidor / Cold)",
        "Como foi encontrada",
        "Dor principal (o que incomoda)",
        "Sonho (resultado esperado)",
        "Procedimento(s) de interesse",
        "Nível de urgência (Alto/Médio/Baixo)",
        "Decisão: sozinha ou com influenciadores?",
        "Já pesquisou valores antes?",
        "Observações relevantes",
        "Data e horário da consulta"
      ]
    },
    transitionScript: "Parabéns, [NOME]! Sua consulta está confirmada! 🎉\n\nVocê deu o passo mais importante na sua jornada de transformação.\n\nAgora, a [NOME DA CLOSER], nossa especialista em planejamento cirúrgico, vai te dar as boas-vindas e te acompanhar nos próximos passos até o dia da sua consulta.\n\nEla já tem todas as informações da nossa conversa e vai te chamar em breve!\n\nSeja muito bem-vinda à Unique!",
    notificationTemplate: "🚀 NOVA CONSULTA AGENDADA!\n\n👤 Paciente: [NOME]\n📱 WhatsApp: [NÚMERO]\n📅 Data da Consulta: [DATA E HORA]\n\n📋 Dossiê:\n• Dor: [DOR]\n• Sonho: [SONHO]\n• Procedimento: [PROCEDIMENTO]\n• Urgência: [NÍVEL]\n\n⏰ SLA: Boas-vindas em até 2 horas.",
    supervisionChecklist: [
      "Verificar se rotina diária está sendo seguida",
      "Analisar volume de perfis prospectados (meta: 30+ novos seguidores/dia)",
      "Verificar quantidade de DMs enviadas (meta: 15+/dia)",
      "Conferir interações em perfis (meta: 50+/dia)",
      "Analisar taxa de resposta às abordagens",
      "Verificar qualidade das qualificações BANT",
      "Conferir dossiês preenchidos",
      "Verificar se passagens de bastão estão em até 2h"
    ],
    interventions: [
      { condition: "Taxa de resposta < 20%", action: "Revisar scripts de abordagem e personalização" },
      { condition: "Conversão < 10%", action: "Fazer sessão de roleplay e coaching de qualificação" },
      { condition: "Volume baixo (< 30 perfis/dia)", action: "Verificar se há bloqueio operacional ou motivacional" },
      { condition: "Agenda não seguida", action: "Reunião de alinhamento sobre rotina diária" }
    ]
  },
  // ============================================
  // CLOSER - Fechamento de Vendas
  // ============================================
  {
    stageId: 3,
    stageKey: "closer",
    title: "Closer - Fechamento de Vendas",
    mission: "O Closer é a peça-chave para transformar leads qualificados em clientes efetivos, sendo responsável por negociar e fechar acordos de forma eficiente, alinhada aos valores e metas da Unique Plástica Avançada.",
    objective: "Transformar consultas realizadas em cirurgias fechadas. IMPORTANTE: O Closer assume o lead APÓS a consulta médica. Seu trabalho é apresentar a proposta, negociar e fechar a venda.",
    teamGoal: {
      meta1: "R$ 1.778.761 (Equipe) | R$ 889.380 (Individual) - 29 cirurgias",
      meta2: "R$ 1.921.061 (Equipe) | R$ 960.531 (Individual) - 32 cirurgias",
      meta3: "R$ 2.134.513 (Equipe) | R$ 1.067.256 (Individual) - 35 cirurgias",
      meta3Individual: "R$ 1.067.256 - ~18 cirurgias",
      members: ["Larissa", "Bianca"]
    },
    kpis: [
      "Contatos pós-consulta: 5+/dia",
      "Reuniões de proposta: 3+/dia",
      "Follow-ups realizados: 15+/dia",
      "Fechamentos: 1+/dia",
      "Taxa de conversão (consulta → venda): >30%",
      "Ticket médio: R$ 60.000+",
      "NPS pós-venda: >9"
    ],
    supervisionChecklist: [
      "Monitorar: Taxa de comparecimento, conversão, ticket médio",
      "Se taxa de comparecimento < 80%: Revisar processo de confirmação",
      "Se taxa de conversão < 50%: Fazer sessão de roleplay do Método CPI",
      "Se ticket médio baixo: Treinar técnicas de upsell",
      "Checklist semanal: Acompanhar 1+ consulta presencialmente",
      "Analisar 5 propostas comerciais enviadas",
      "Verificar se política de descontos está sendo respeitada"
    ],
    interventions: [
      { condition: "Taxa de comparecimento < 80%", action: "Revisar processo de confirmação" },
      { condition: "Taxa de conversão < 50%", action: "Fazer sessão de roleplay do Método CPI" },
      { condition: "Ticket médio baixo", action: "Treinar técnicas de upsell" }
    ],
    actions: [
      // ATRIBUIÇÕES PRINCIPAIS
      {
        action: "Principais Atribuições",
        description: "Responsabilidades do Closer.",
        checklist: [
          "Negociação e Fechamento: Gerenciar reuniões presenciais e remotas",
          "Apresentar serviços valorizando métodos exclusivos (CPI, 3R, Unique Travel)",
          "Trabalhar objeções de forma estratégica",
          "Gestão do Processo: Lançamento no Feegow e planilhas",
          "Atualizar CRM (Kommo) com dados e interações",
          "Garantir cumprimento das etapas do pipeline",
          "Relacionamento: Desenvolver confiança e conexão emocional",
          "Acompanhar cliente nas etapas pré e pós-fechamento",
          "Colaboração: Feedback para gestor sobre objeções comuns",
          "Alinhar estratégias com SDRs e gestores"
        ]
      },
      // AGENDA DE SUCESSO
      {
        action: "Check-in Matinal (08:00 - 08:30)",
        description: "Verificar consultas do dia anterior, preparar abordagens."
      },
      {
        action: "Contato Pós-Consulta (08:30 - 09:00)",
        description: "Ligar para pacientes que consultaram ontem."
      },
      {
        action: "Reuniões de Proposta (09:00 - 10:30)",
        description: "Apresentações de orçamento (Zoom/presencial)."
      },
      {
        action: "Follow-up D+2 a D+4 (10:30 - 11:30)",
        description: "Cadência de acompanhamento."
      },
      {
        action: "Atualização CRM (11:30 - 12:00)",
        description: "Registrar todas as interações."
      },
      {
        action: "Reuniões de Proposta (13:00 - 14:00)",
        description: "Apresentações de orçamento."
      },
      {
        action: "Negociações Ativas (14:00 - 15:00)",
        description: "Trabalhar objeções, fechar vendas."
      },
      {
        action: "Follow-up D+6 a D+9 (15:00 - 16:00)",
        description: "Cadência de acompanhamento."
      },
      {
        action: "Preparação de Passagem (16:00 - 17:00)",
        description: "Dossiês para CS (vendas fechadas)."
      },
      {
        action: "Encaminhamento ao Coordenador (17:00 - 17:30)",
        description: "Leads D+14 sem fechamento."
      },
      {
        action: "Check-out (17:30 - 18:00)",
        description: "Atualizar CRM, planejar próximo dia."
      },
      // PROCESSO DE VENDAS
      {
        action: "Etapa 1: Recebimento do Lead (Pós-Consulta)",
        description: "O que você recebe do SDR após a consulta médica.",
        checklist: [
          "Dossiê completo do paciente",
          "Informações da consulta médica",
          "Procedimento recomendado pelo cirurgião",
          "Nível de urgência do paciente"
        ],
        sla: "Contatar paciente em até 2 horas após a consulta. Ligar primeiro, se não atender, enviar WhatsApp."
      },
      {
        action: "Etapa 2: Primeiro Contato Pós-Consulta",
        description: "Ligação inicial após a consulta médica.",
        script: "Olá, [Nome]! Tudo bem?\n\nAqui é [Seu Nome] da Unique Plástica Avançada.\n\nQue bom falar com você! Sei que durante a consulta você já deu o primeiro passo em direção ao sonho da sua transformação.\n\nEstou aqui para tirar todas as dúvidas e entender como podemos avançar juntos nesse processo.\n\nMe conta: como foi a consulta? O que você achou do Dr. [Nome do Médico]?\n\n[OUVIR ATENTAMENTE]\n\nQue maravilha! E me conta: o que mais te chamou atenção no que o Dr. [Nome] explicou?\n\n[OUVIR E ANOTAR]\n\nPerfeito! Agora vou te explicar como funciona o próximo passo para realizarmos esse sonho juntas..."
      },
      // MÉTODO SPIN SELLING
      {
        action: "Etapa 3: Perguntas SPIN Selling - Situação",
        description: "Entender o contexto do paciente.",
        script: "• O que te motivou a buscar a cirurgia plástica neste momento da sua vida?\n• Quais mudanças você gostaria de ver ao final do procedimento?\n• Quais foram as principais dúvidas ou preocupações que surgiram após a consulta?\n• O que seria mais importante para você nesse processo? (Ex.: resultado natural, recuperação rápida, suporte no pós-operatório)"
      },
      {
        action: "Perguntas SPIN Selling - Problema",
        description: "Identificar a dor do paciente.",
        script: "• O que mais te incomoda no seu corpo/rosto que gostaria de mudar?\n• Existe algo que você tentou fazer para melhorar essa situação e não funcionou?\n• O que te impede de se sentir completamente confiante hoje?\n• Se não resolvermos esse problema agora, como isso pode afetar sua autoestima?\n• Qual é a principal barreira que você sente para dar o próximo passo nesse sonho?"
      },
      {
        action: "Perguntas SPIN Selling - Implicação",
        description: "Mostrar consequências de não agir.",
        script: "• Se não realizar esse procedimento agora, como você acha que se sentirá daqui a 6 meses?\n• Como a falta de ação pode impactar sua rotina ou seus planos futuros?\n• Já imaginou como seria continuar se sentindo assim por mais um ano?\n• De que maneira essa situação pode prejudicar sua vida social ou profissional?\n• Você acha que resolver isso agora poderia trazer benefícios para outras áreas da sua vida?"
      },
      {
        action: "Perguntas SPIN Selling - Necessidade de Solução",
        description: "Criar desejo pela solução.",
        script: "• Se você pudesse mudar algo hoje, o que seria e por quê?\n• Como você imagina que sua vida seria após realizar esse procedimento?\n• O que é mais importante para você ao escolher uma clínica ou um cirurgião?\n• Se eu pudesse garantir um resultado que atendesse todas as suas expectativas, você estaria pronta para avançar?\n• Quais benefícios imediatos você espera obter com essa transformação?"
      },
      // APRESENTAÇÃO DA PROPOSTA
      {
        action: "Etapa 4: Apresentação da Proposta - Ancoragem de Valor",
        description: "Valorizar o investimento antes do preço.",
        script: "[Nome], agora que entendi perfeitamente o que você busca, vou te apresentar o plano ideal para a sua transformação.\n\nDiferente de outras clínicas, aqui na Unique oferecemos um acompanhamento completo, desde o planejamento personalizado até o pós-operatório, garantindo segurança e resultados naturais.\n\nO nosso Método CPI é focado em transformar vidas com excelência e cuidado em cada detalhe.\n\nSabemos que uma transformação como essa não é apenas uma cirurgia, mas um investimento em você mesma, na sua autoestima e qualidade de vida.\n\nPense assim: dividindo o valor do procedimento pelos anos que você aproveitará esse resultado, o custo mensal se torna mínimo perto do impacto positivo que você terá diariamente."
      },
      {
        action: "Apresentação do Orçamento",
        description: "Detalhar o investimento e formas de pagamento.",
        script: "O investimento para o seu procedimento de [PROCEDIMENTO] é de R$ [VALOR].\n\nEsse valor inclui:\n✅ Cirurgia completa com o Dr. [Nome]\n✅ Anestesia e equipe médica\n✅ Internação e todos os cuidados hospitalares\n✅ Acompanhamento pós-operatório completo\n✅ Protocolo CPI de preparação e recuperação\n\nTrabalhamos com as seguintes formas de pagamento:\n💳 PIX à vista: 10% de desconto\n💳 Cartão de crédito: até 12x\n💳 Financiamento: até 36x\n\nQual dessas opções faz mais sentido para você?"
      },
      // MÉTODO CPI E DIFERENCIAIS
      {
        action: "Apresentação de Valor e Método CPI",
        description: "Destacar diferenciais exclusivos da Unique.",
        script: "[Nome], quero te explicar por que a Unique é diferente de qualquer outra clínica que você já pesquisou.\n\nAqui, criamos um método que vai muito além da cirurgia. É o Método CPI – Cirurgia Plástica Integrativa, que prepara seu corpo e mente para um resultado mais seguro, saudável e duradouro.\n\nNosso método considera não só o estético, mas também seu histórico, sua saúde, sua rotina e sua essência.\n\nPor isso, nossos resultados são tão superiores. Não é só cirurgia, é transformação completa.",
        checklist: [
          "Método CPI (Cirurgia Plástica Integrativa): 7 pilares de cuidado integral",
          "Método 3R: Recuperação otimizada, Resultados naturais, Retorno rápido",
          "Unique Travel: Suporte completo para pacientes de fora",
          "Equipe de Excelência: Dr. André Oliveira - criador do Método CPI"
        ]
      },
      // POLÍTICA DE DESCONTOS
      {
        action: "Política de Descontos e Projetos",
        description: "Regras de benefícios e projetos.",
        checklist: [
          "Cada projeto validado = 5% de benefício sobre o valor",
          "Máximo 2 projetos = 10% de benefício",
          "PIX sem projeto = 10% OFF | Com 1 projeto = 15% OFF | Com 2 projetos = 20% OFF",
          "Cartão sem projeto = Valor integral | Com 1 projeto = 5% OFF | Com 2 projetos = 10% OFF"
        ],
        tips: [
          "Nunca falar 'desconto' - usar 'benefício' ou 'condição especial'",
          "Não dar desconto de primeira sem lead demonstrar precisar"
        ]
      },
      {
        action: "Projetos Válidos (cada um vale 5%)",
        description: "Opções de projetos para benefícios.",
        script: "[Nome], aqui na Unique, criamos projetos que celebram histórias reais.\n\nVocê pode participar como protagonista da sua transformação e, com isso, desbloquear benefícios especiais.\n\nSe você quiser fazer parte de uma dessas ações – como gravar seu depoimento, compartilhar seu antes e depois ou até indicar amigas – a gente reconhece isso com um presente exclusivo e um benefício especial.\n\nTemos um plano para quem quer fazer parte do nosso projeto de transformação com a Unique. Você pode ser nossa paciente destaque, embaixadora ou inspiração.\n\nE isso, claro, vem com benefícios exclusivos.",
        checklist: [
          "Espelho Unique: Autoriza antes/depois, responde perguntas, collab nas redes",
          "Minha Jornada Unique: Registro completo pré ao pós-op, minidocumentário",
          "Por Trás da Transformação: Compartilha história em texto ou entrevista",
          "Voz Unique: Participação especial no podcast",
          "Indica & Transforma: Indica 3+ pessoas para agendar consulta"
        ]
      },
      {
        action: "Fluxo de Liberação do Benefício",
        description: "Processo para aplicar benefício de projeto.",
        checklist: [
          "1. Apresentar projetos com ênfase no pertencimento e inspiração",
          "2. Paciente preenche formulário: https://uniquemedicespa.typeform.com/to/Kh7ExpFG",
          "3. Criar cupom personalizado: NOMEESOBRENOMEPACIENTE10 (Ex: BRUNAGUIMARAES10)",
          "4. Registrar na planilha com projetos escolhidos",
          "5. Comunicar ao marketing para programar ações"
        ]
      },
      // SCRIPTS
      {
        action: "Script - WhatsApp Pós-Consulta",
        description: "Mensagem para pacientes que não atenderam ligação.",
        script: "Olá, [Nome], tudo bem?\n\nAqui é [Seu Nome] da Unique Plástica Avançada.\n\nEstou acompanhando o seu caso e notei que ainda não avançamos com sua cirurgia.\n\nPosso te ajudar a esclarecer alguma dúvida ou alinhar um planejamento para você conquistar o resultado que deseja?\n\nEstou à disposição! 💖"
      },
      {
        action: "Script - E-mail Pós-Consulta",
        description: "E-mail de acompanhamento.",
        script: "Assunto: Realize seu sonho com as condições atuais\n\nOlá, [Nome],\n\nDurante a consulta, vimos o quanto a cirurgia plástica pode transformar sua vida e autoestima. Quero reforçar que estamos aqui para te apoiar em cada etapa desse processo.\n\nAtualmente, ainda temos condições especiais para o seu caso, mas elas são válidas por tempo limitado devido ao aumento dos custos dos insumos cirúrgicos.\n\nVamos agendar sua transformação e garantir as melhores condições?\n\nEstou à disposição para tirar dúvidas e ajudar no planejamento.\n\nAbraços,\n[Seu Nome]\nUnique Plástica Avançada"
      },
      {
        action: "Script - Criação de Urgência",
        description: "Criar senso de urgência com escassez real.",
        script: "[Nome], essa é uma oportunidade única.\n\nCom o dólar em alta, nossos materiais cirúrgicos têm sofrido reajustes, e os valores serão atualizados em breve.\n\nSe fecharmos hoje, conseguimos garantir as condições atuais e priorizar sua agenda.\n\nVamos dar esse próximo passo juntos?"
      },
      {
        action: "Script - Fechamento",
        description: "Momento do fechamento da venda.",
        script: "[Nome], pelo que conversamos, você tem uma história linda e um sonho verdadeiro.\n\nEstou aqui para te ajudar a realizar esse sonho com toda segurança e cuidado que você merece.\n\nVamos fechar hoje e garantir sua vaga na agenda do Dr. [Nome]?\n\nQual forma de pagamento fica melhor para você: PIX com 10% de desconto ou parcelamento no cartão?\n\n[SILÊNCIO ESTRATÉGICO - AGUARDAR RESPOSTA]"
      },
      // QUEBRA DE OBJEÇÕES
      {
        action: "Quebra de Objeções - Está Caro / Preço Alto",
        description: "Superar objeção de preço.",
        script: "Entendo que o valor é um ponto importante. Mas me conta: o que é mais importante para você, preço ou segurança na sua vida?\n\nSe pensarmos no custo-benefício, você estará investindo em um resultado que vai te acompanhar por muitos anos.\n\nDiferente de uma viagem ou um bem material, a cirurgia plástica é um investimento que vai te acompanhar por toda a vida.\n\nSe dividirmos o valor do procedimento por anos de resultados e autoestima elevada, o custo se torna quase insignificante perto do impacto que terá na sua confiança e qualidade de vida.\n\nAlém disso, oferecemos opções de parcelamento para facilitar esse sonho."
      },
      {
        action: "Quebra de Objeções - Vou Pensar / Deixar para Depois",
        description: "Superar objeção de adiamento.",
        script: "Claro, entendo perfeitamente. Esse é um passo importante e deve ser dado com segurança.\n\nMas preciso te avisar com carinho: adiar esse sonho vale a pena?\n\nHoje temos condições exclusivas para garantir sua cirurgia ainda este mês, com toda a qualidade e atenção que você merece.\n\nDevido ao aumento dos custos dos materiais cirúrgicos (dólar em alta), nossos valores serão reajustados em breve.\n\nAproveitar agora não é apenas realizar um sonho, mas também fazer isso com as melhores condições.\n\nPosso segurar seu horário por 1 hora sem compromisso, apenas para você não perder essa chance. Te reservo?"
      },
      {
        action: "Quebra de Objeções - Preciso Falar com Marido/Família",
        description: "Superar objeção de decisão compartilhada.",
        script: "Claro, entendo perfeitamente! É uma decisão importante e é ótimo que você queira compartilhar com quem você ama.\n\nInclusive, podemos agendar uma conversa com você e seu marido juntos, para que ele também conheça nosso método e tire todas as dúvidas.\n\nQue tal marcarmos essa conversa para amanhã? Assim vocês podem decidir juntos com todas as informações."
      },
      {
        action: "Quebra de Objeções - Não Tenho Tempo Agora",
        description: "Superar objeção de tempo.",
        script: "Eu entendo que a rotina pode ser corrida, mas sabemos como planejar cada etapa para que sua recuperação seja tranquila e eficiente, respeitando seu tempo.\n\nInclusive, o Método CPI foi criado justamente para otimizar sua recuperação e você voltar às atividades o mais rápido possível.\n\nQual seria o melhor período para você? Podemos planejar com antecedência."
      },
      {
        action: "Quebra de Objeções - Estou Insegura",
        description: "Superar objeção de medo/insegurança.",
        script: "Compreendo que tomar uma decisão como essa gera muitas emoções.\n\nPor isso, nossa equipe estará com você em cada etapa, garantindo total segurança e apoio.\n\nQuais são suas maiores dúvidas ou preocupações?\n\nVamos conversar para garantir que você esteja completamente confiante e tranquila com esse próximo passo."
      },
      {
        action: "Quebra de Objeções - Vi Mais Barato em Outro Lugar",
        description: "Superar objeção de concorrência.",
        script: "Entendo sua preocupação com o investimento.\n\nMas me permite uma pergunta: você sabe exatamente o que está incluído nesse valor mais baixo?\n\nAqui na Unique, nosso valor inclui:\n• Cirurgião referência nacional\n• Equipe completa de anestesia e enfermagem\n• Hospital de primeira linha\n• Acompanhamento pós-operatório completo\n• Protocolo CPI de preparação e recuperação\n\nMuitas vezes, valores muito baixos escondem custos extras ou falta de estrutura adequada.\n\nQuando se trata da sua saúde e segurança, o barato pode sair muito caro.\n\nO que você prefere: economizar agora e se arriscar, ou investir na sua segurança e ter resultados garantidos?"
      },
      // FOLLOW-UP 14 DIAS
      {
        action: "Follow-up Cadência 14 Dias",
        description: "Sequência obrigatória de acompanhamento.",
        tips: [
          "D0 Zoom/Presencial: Proposta + Projeto - Apresentação completa",
          "D+2 WhatsApp: Vídeo ou depoimento - 'Oi [Nome]! Lembrei de você e separei esse depoimento da [Paciente] que fez o mesmo procedimento. Olha só o resultado! [LINK]'",
          "D+4 Ligação: Confirmação - Ligar para tirar dúvidas",
          "D+6 WhatsApp: Escassez - 'Oi [Nome]! Passando para avisar que a agenda do Dr. [Nome] está fechando para este mês. Consegui segurar uma vaga para você até amanhã. Vamos fechar?'",
          "D+9 Áudio: Emocional - Enviar áudio personalizado reforçando o sonho",
          "D+12 WhatsApp: Último incentivo - 'Oi [Nome]! Essa é minha última tentativa de te ajudar a realizar esse sonho. Respeito sua decisão, mas não quero que você perca essa oportunidade. Me avisa o que decidiu?'",
          "D+14: Encaminhar para Coordenador - Passar dossiê completo"
        ]
      },
      // PASSAGEM DE BASTÃO
      {
        action: "Passagem de Bastão para CS - Checklist",
        description: "O paciente FECHOU A CIRURGIA (contrato assinado e pagamento confirmado).",
        checklist: [
          "Contrato assinado",
          "Pagamento confirmado (ou entrada paga)",
          "Data da cirurgia agendada",
          "Cadastro completo no Feegow",
          "Ficha do paciente atualizada",
          "Cupom e projeto comunicados ao marketing",
          "Paciente ciente dos prazos e regras",
          "Paciente ciente dos pilares do Método CPI"
        ]
      },
      {
        action: "Mensagem de Boas-Vindas para Paciente",
        description: "Enviar após fechamento confirmado.",
        script: "🎉 Parabéns, [Nome]!\n\nVocê acaba de dar o passo mais importante para a sua transformação!\n\nA partir de agora, você faz parte da família Unique e teremos o maior prazer em cuidar de você em cada etapa dessa jornada.\n\nEm breve, nossa equipe de Customer Success entrará em contato para te apresentar todo o processo de preparação pelo Método CPI.\n\nVocê está em excelentes mãos! 💖\n\nQualquer dúvida, estou à disposição.\n\nAbraços,\n[Seu Nome]"
      },
      {
        action: "Notificação para CS",
        description: "Enviar no grupo ou diretamente para o CS.",
        script: "🎉 NOVA VENDA FECHADA!\n\n📋 DADOS DO PACIENTE:\n• Nome: [NOME]\n• WhatsApp: [NÚMERO]\n• Cirurgião: [NOME DO MÉDICO]\n• Procedimento: [PROCEDIMENTO]\n• Data da cirurgia: [DATA]\n\n📊 DADOS COMERCIAIS:\n• Valor: R$ [VALOR]\n• Forma de pagamento: [FORMA]\n• Projeto Unique: [PROJETO ESCOLHIDO]\n• Cupom: [CÓDIGO]\n\n📝 OBSERVAÇÕES:\n• Nível de entusiasmo: [ALTO/MÉDIO/BAIXO]\n• Pontos de atenção: [OBSERVAÇÕES]\n\n📎 Dossiê completo no Feegow e CRM.\n\nPor favor, entrar em contato em até 24 horas para iniciar o onboarding!",
        sla: "CS assumir em até 24h (cirurgia < 30 dias) | 48h (30-60 dias) | 72h (> 60 dias)"
      },
      {
        action: "Passagem para Coordenador - Lead Não Fechou",
        description: "Se após 14 dias o lead não fechou.",
        script: "⚠️ LEAD PARA RECUPERAÇÃO - COORDENADOR\n\n📋 DADOS DO LEAD:\n• Nome: [NOME]\n• WhatsApp: [NÚMERO]\n• Cirurgião consultado: [NOME]\n• Procedimento de interesse: [PROCEDIMENTO]\n\n📊 HISTÓRICO:\n• Data da consulta: [DATA]\n• Data da última interação: [DATA]\n• Objeção principal: [OBJEÇÃO]\n• Proposta apresentada: R$ [VALOR]\n• Projeto oferecido: [ ] Sim [ ] Não\n\n📝 AÇÕES REALIZADAS:\n• D0: Proposta apresentada\n• D2: WhatsApp com depoimento\n• D4: Ligação de confirmação\n• D6: WhatsApp com escassez\n• D9: Áudio emocional\n• D12: Último incentivo\n\n❓ MOTIVO DO NÃO FECHAMENTO:\n[EXPLICAR]\n\n📎 Dossiê completo no CRM."
      },
      // O QUE NÃO FAZER
      {
        action: "O Que NÃO Fazer",
        description: "Erros a evitar no processo de fechamento.",
        checklist: [
          "NÃO dar desconto de primeira sem que o lead demonstre precisar",
          "NÃO falar em 'promoção' - use 'condição especial' ou 'benefício'",
          "NÃO pressionar de forma agressiva - seja consultivo",
          "NÃO ignorar objeções - trate cada uma com empatia",
          "NÃO passar o lead para CS antes do pagamento confirmado",
          "NÃO deixar lead sem follow-up por mais de 2 dias"
        ],
        tips: [
          "Venda é transferência de confiança. Se você acredita, o cliente acredita.",
          "Objeção é pedido de mais informação, não rejeição.",
          "Silêncio estratégico é sua melhor ferramenta de fechamento.",
          "Cada 'não' te aproxima do 'sim'."
        ]
      }
    ],
    dossier: {
      title: "Dossiê Comercial 2 - Paciente que Fechou",
      fields: [
        "1. DADOS DO FECHAMENTO:",
        "Nome completo",
        "Data do fechamento",
        "Cirurgião",
        "Data da cirurgia agendada",
        "Procedimentos",
        "Tipo de anestesia",
        "Pacote contratado: Básico / Intermediário / Avançado",
        "2. INFORMAÇÕES COMERCIAIS:",
        "Forma de pagamento: PIX / Cartão / Financiamento",
        "Valor total",
        "Desconto aplicado (%)",
        "Cupom utilizado",
        "Projeto Unique escolhido",
        "Formulário preenchido: Sim / Não",
        "Termo assinado: Sim / Não",
        "3. CONFIRMAÇÕES:",
        "Cadastro completo no Feegow",
        "Ficha do paciente atualizada",
        "Cupom e projeto comunicados ao marketing",
        "Mensagem de boas-vindas enviada",
        "4. ALINHAMENTO COM O PACIENTE:",
        "Entendeu os prazos e regras",
        "Ciente dos pilares do Método CPI",
        "Se sente acolhido e seguro",
        "Confirmou participação nos projetos",
        "5. OBSERVAÇÕES IMPORTANTES",
        "6. NÍVEL DE ENTUSIASMO: Muito alto / Médio / Baixo",
        "7. POSSIBILIDADE DE DEPOIMENTO/INDICAÇÃO: Alta / Média / Baixa"
      ]
    },
    transitionScript: "🎉 Parabéns, [Nome]!\n\nVocê acaba de dar o passo mais importante para a sua transformação!\n\nA partir de agora, você faz parte da família Unique e teremos o maior prazer em cuidar de você em cada etapa dessa jornada.\n\nEm breve, nossa equipe de Customer Success entrará em contato para te apresentar todo o processo de preparação pelo Método CPI.\n\nVocê está em excelentes mãos! 💖",
    notificationTemplate: "🎉 NOVA VENDA FECHADA!\n\n📋 DADOS DO PACIENTE:\n• Nome: [NOME]\n• WhatsApp: [NÚMERO]\n• Cirurgião: [NOME DO MÉDICO]\n• Procedimento: [PROCEDIMENTO]\n• Data da cirurgia: [DATA]\n\n📊 DADOS COMERCIAIS:\n• Valor: R$ [VALOR]\n• Forma de pagamento: [FORMA]\n• Projeto Unique: [PROJETO ESCOLHIDO]\n\n📎 Dossiê completo no Feegow e CRM.\n\nPor favor, entrar em contato em até 24 horas para iniciar o onboarding!"
  },
  // ============================================
  // CUSTOMER SUCCESS - Pós-Venda
  // ============================================
  {
    stageId: 4,
    stageKey: "cs",
    title: "Customer Success - Pós-Venda",
    mission: "Garantir a melhor experiência do paciente desde o fechamento até a alta, maximizando satisfação, NPS e indicações.",
    objective: "Transformar pacientes cirúrgicos em promotores da marca através de experiência excepcional.",
    teamGoal: {
      meta3: "R$ 754.462",
      meta3Individual: "R$ 377.231",
      members: ["Paula", "Viviane"]
    },
    kpis: [
      "Taxa de Upsell/Cross-sell (pré e pós-operatório)",
      "NPS (Net Promoter Score) - Meta: ≥ 9",
      "Aderência ao Cronograma Pós-Venda - Meta: ≥ 90%",
      "Taxa de Conclusão do Programa UniLovers"
    ],
    actions: [
      {
        action: "Receber dossiê do Closer",
        description: "Revisar informações antes do primeiro contato."
      },
      {
        action: "Boas-vindas em até 1 hora após fechamento",
        description: "Primeiro contato do CS com a paciente.",
        sla: "1 hora",
        script: "Olá [NOME]! Sou [SEU NOME], sua anja da guarda aqui na Unique! 😇\n\nVou cuidar de você em cada detalhe até o dia da sua cirurgia e depois dela.\n\nEstou aqui para qualquer dúvida, ansiedade ou necessidade. Vamos juntas nessa jornada!"
      },
      {
        action: "Adicionar paciente ao grupo exclusivo WhatsApp",
        description: "Criar grupo de acompanhamento da paciente."
      },
      {
        action: "Orientar sobre exames e preparativos",
        description: "Enviar checklist de pré-operatório.",
        checklist: [
          "Lista de exames necessários",
          "Prazos para entrega",
          "Orientações de jejum",
          "O que levar no dia",
          "Roupas adequadas pós-op"
        ]
      },
      {
        action: "Explicar Método CPI e 7 pilares",
        description: "Garantir que paciente entenda o diferencial."
      },
      {
        action: "Acompanhar necessidades especiais (Unique Travel)",
        description: "Suporte para pacientes de fora."
      },
      {
        action: "Acompanhar retornos médicos",
        description: "Monitorar agenda de retornos pós-op."
      },
      {
        action: "Monitorar recuperação (perfil emocional)",
        description: "Acompanhar estado emocional da paciente.",
        tips: [
          "Identificar pacientes ansiosas",
          "Dar suporte extra quando necessário",
          "Celebrar cada conquista da recuperação"
        ]
      },
      {
        action: "Identificar oportunidades de upsell",
        description: "Oferecer procedimentos complementares quando apropriado."
      },
      {
        action: "Coletar NPS com citação de nome",
        description: "Solicitar avaliação mencionando o profissional.",
        script: "Oi [NOME]! Como está se sentindo com sua recuperação? 💕\n\nPoderia me ajudar com uma avaliação rápida? Se puder mencionar meu nome ou da equipe que te atendeu, ajuda muito! 🙏"
      },
      {
        action: "Solicitar depoimentos (Google, vídeo, gold)",
        description: "Coletar diferentes tipos de depoimentos.",
        tips: [
          "Google: mais fácil, pedir primeiro",
          "Vídeo: maior valor, pedir quando satisfeita",
          "Gold: pacientes especiais, embaixadoras"
        ]
      },
      {
        action: "Incentivar indicações durante acompanhamento",
        description: "Aproveitar momento de satisfação para pedir indicações.",
        script: "Você conhece alguém que também tem esse sonho de transformação? Adoraria ajudar uma amiga sua também! 💕"
      },
      {
        action: "Registrar UniLovers ativos",
        description: "Documentar pacientes engajadas."
      },
      {
        action: "Confirmar alta após 6 meses",
        description: "Verificar liberação médica para alta."
      },
      {
        action: "Preencher Dossiê de Pós-Venda e Alta",
        description: "Documentar informações para o Farmer.",
        checklist: [
          "Histórico de procedimentos",
          "Nível de satisfação (NPS)",
          "Interesses futuros (outros procedimentos, LuxSkin)",
          "Aniversário e datas importantes"
        ]
      },
      {
        action: "Registrar NPS e nível de satisfação",
        description: "Documentar feedback final."
      },
      {
        action: "Identificar interesses futuros (procedimentos, LuxSkin)",
        description: "Mapear oportunidades de reativação."
      },
      {
        action: "Enviar mensagem de transição para paciente",
        description: "Preparar paciente para o Farmer.",
        script: "[NOME], que alegria ver sua jornada de transformação completa! Você está maravilhosa! 😍\n\nMesmo com a alta, nosso cuidado com você não termina. Agora você faz parte do nosso clube exclusivo de pacientes Unique.\n\nA [NOME DA FARMER], nossa especialista em relacionamento, vai manter contato com você para garantir que seus resultados continuem incríveis e te apresentar novidades e benefícios exclusivos.\n\nVocê é e sempre será parte da família Unique!"
      },
      {
        action: "Notificar Farmer em até 24h após alta",
        description: "SLA de passagem de bastão.",
        sla: "24 horas",
        script: "🌱 NOVA PACIENTE PARA CULTIVO (LTV)!\n\nPaciente: [NOME]\nWhatsApp: [NÚMERO]\nÚltima Cirurgia: [NOME DA CIRURGIA]\nData da Alta: [DATA]\n\nDossiê de Alta completo no CRM. Paciente com alto potencial para [procedimento de interesse].\n\nPor favor, adicionar à cadência de relacionamento em até 24 horas."
      }
    ],
    dossier: {
      title: "Dossiê de Pós-Venda e Alta",
      fields: [
        "Histórico de procedimentos",
        "Nível de satisfação (NPS)",
        "Interesses futuros",
        "Aniversário",
        "Datas importantes",
        "Observações de relacionamento"
      ]
    },
    transitionScript: "[NOME], que alegria ver sua jornada de transformação completa! Você está maravilhosa! 😍\n\nMesmo com a alta, nosso cuidado com você não termina. Agora você faz parte do nosso clube exclusivo de pacientes Unique.\n\nA [NOME DA FARMER], nossa especialista em relacionamento, vai manter contato com você para garantir que seus resultados continuem incríveis e te apresentar novidades e benefícios exclusivos.\n\nVocê é e sempre será parte da família Unique!",
    notificationTemplate: "🌱 NOVA PACIENTE PARA CULTIVO (LTV)!\n\nPaciente: [NOME]\nWhatsApp: [NÚMERO]\nÚltima Cirurgia: [NOME DA CIRURGIA]\nData da Alta: [DATA]\n\nDossiê de Alta completo no CRM. Paciente com alto potencial para [procedimento de interesse].\n\nPor favor, adicionar à cadência de relacionamento em até 24 horas."
  },
  // ============================================
  // FARMER - Relacionamento e LTV
  // ============================================
  {
    stageId: 5,
    stageKey: "farmer",
    title: "Farmer - Relacionamento e LTV",
    mission: "O Farmer é responsável por cultivar relacionamentos de longo prazo com pacientes que já passaram pela jornada Unique, maximizando o Lifetime Value (LTV) através de recompras, indicações e fidelização.",
    objective: "Transformar pacientes em clientes recorrentes e geradores de indicações.",
    teamGoal: {
      meta1: "R$ 49.815 (Equipe) | R$ 24.907 (Individual)",
      meta2: "R$ 53.800 (Equipe) | R$ 26.900 (Individual)",
      meta3: "R$ 59.778 (Equipe) | R$ 29.889 (Individual)",
      meta3Individual: "R$ 29.889",
      members: ["Kamila", "Novo Integrante"]
    },
    kpis: [
      "Taxa de Reativação - Meta: >15%",
      "Taxa de Indicações - Meta: >20%",
      "Taxa de Recompra - Meta: >10%",
      "Contatos de Relacionamento - Meta: 400+/mês",
      "Leads Reativados para SDR - Meta: 20+/mês",
      "20+ contatos de relacionamento/dia",
      "10+ tentativas de reativação/dia",
      "5+ solicitações de indicação/dia",
      "3+ ofertas de upsell/dia"
    ],
    supervisionChecklist: [
      "Monitorar: Taxa de reativação, LTV, vendas recorrentes, engajamento",
      "Se taxa de reativação < 15%: Revisar scripts e ofertas",
      "Se LTV estagnado: Criar novas campanhas de relacionamento",
      "Se vendas recorrentes baixas: Treinar venda consultiva",
      "Checklist semanal: Analisar 10 conversas de reativação",
      "Verificar se segmentação RFV está sendo usada",
      "Conferir execução de campanhas de base"
    ],
    interventions: [
      { condition: "Taxa reativação < 15%", action: "Revisar scripts e ofertas" },
      { condition: "LTV estagnado", action: "Criar novas campanhas de relacionamento" },
      { condition: "Vendas recorrentes baixas", action: "Treinar venda consultiva" }
    ],
    actions: [
      // ATRIBUIÇÕES PRINCIPAIS
      {
        action: "Cultivo de Relacionamento",
        description: "O Farmer assume o paciente APÓS a alta médica (passagem do CS). Seu trabalho é manter o relacionamento, gerar recompras e indicações.",
        checklist: [
          "Manter contato regular com base de pacientes",
          "Criar conexões genuínas e duradouras",
          "Ser o 'amigo' da paciente na Unique"
        ]
      },
      {
        action: "Maximização de LTV",
        description: "Identificar e converter oportunidades de novos procedimentos.",
        checklist: [
          "Identificar oportunidades de novos procedimentos",
          "Oferecer tratamentos complementares",
          "Gerar recompras recorrentes"
        ]
      },
      {
        action: "Geração de Indicações",
        description: "Ativar programa de indicações e acompanhar conversões.",
        checklist: [
          "Ativar programa Indica & Transforma",
          "Solicitar indicações de forma estratégica",
          "Acompanhar indicações geradas"
        ]
      },
      {
        action: "Reativação de Leads Frios",
        description: "Recuperar pacientes inativos e leads antigos.",
        checklist: [
          "Recuperar pacientes inativos",
          "Reconectar com leads antigos",
          "Reaquecer base de dados"
        ]
      },
      // AGENDA DE SUCESSO
      {
        action: "Check-in Matinal (08:00 - 08:30)",
        description: "Verificar aniversariantes, datas especiais do dia."
      },
      {
        action: "Mensagens de Relacionamento (08:30 - 09:30)",
        description: "Contato com pacientes ativos da base."
      },
      {
        action: "Reativação de Leads (09:30 - 10:30)",
        description: "Trabalhar lista de pacientes inativos."
      },
      {
        action: "Ligações de Relacionamento (10:30 - 11:30)",
        description: "Contato telefônico com pacientes VIP."
      },
      {
        action: "Atualização CRM (11:30 - 12:00)",
        description: "Registrar todas as interações do período matinal."
      },
      {
        action: "Ofertas de Upsell (13:00 - 14:00)",
        description: "Apresentar novos procedimentos e tratamentos."
      },
      {
        action: "Solicitação de Indicações (14:00 - 15:00)",
        description: "Ativar programa Indica & Transforma."
      },
      {
        action: "Campanhas Segmentadas (15:00 - 16:00)",
        description: "Enviar comunicações por segmento RFV."
      },
      {
        action: "Acompanhamento de Indicações (16:00 - 17:00)",
        description: "Verificar status das indicações geradas."
      },
      {
        action: "Passagem para SDR (17:00 - 17:30)",
        description: "Encaminhar leads reativados prontos para agendamento."
      },
      {
        action: "Check-out (17:30 - 18:00)",
        description: "Atualizar CRM e planejar próximo dia."
      },
      // MATRIZ RFV - SEGMENTAÇÃO
      {
        action: "🏆 Campeões - Tratamento VIP",
        description: "Compraram recentemente, compram frequentemente e gastam muito.",
        script: "Oi, [Nome]! Tudo bem? 💖\n\nPassando para te agradecer por ser uma paciente tão especial para nós!\n\nVocê faz parte do nosso grupo VIP de pacientes e quero te convidar para um evento exclusivo que estamos preparando.\n\nTambém queria te perguntar: você tem alguma amiga que gostaria de viver a experiência Unique? Temos condições especiais para indicações de pacientes VIP como você! ✨",
        checklist: [
          "Tratamento VIP e exclusivo",
          "Acesso antecipado a novidades",
          "Convites para eventos exclusivos",
          "Pedir indicações ativamente",
          "Oferecer participação em projetos especiais"
        ],
        tips: ["Cadência: 2x/mês", "Canais: WhatsApp + Ligação"]
      },
      {
        action: "💎 Clientes Fiéis - Upgrades Premium",
        description: "Gastam bem e compram frequentemente.",
        script: "Oi, [Nome]! Como você está? 💖\n\nLembrei de você e queria te contar sobre uma novidade que acabou de chegar!\n\nTemos um novo protocolo de [TRATAMENTO] que é perfeito para complementar o que você já fez conosco.\n\nComo paciente fiel, você tem acesso a condições especiais. Quer saber mais?",
        checklist: [
          "Oferecer upgrades e pacotes premium",
          "Programa de fidelidade com benefícios",
          "Comunicação personalizada",
          "Antecipar necessidades"
        ],
        tips: ["Cadência: 2x/mês", "Canal: WhatsApp"]
      },
      {
        action: "⭐ Potenciais Fiéis - Nutrir",
        description: "Clientes recentes com bom potencial.",
        script: "Oi, [Nome]! Tudo bem? 💖\n\nComo você está se sentindo depois do seu procedimento?\n\nPassando para te contar que temos várias opções de tratamentos que podem complementar e potencializar seus resultados.\n\nVocê já conhece nosso portfólio completo? Posso te apresentar!",
        checklist: [
          "Nutrir relacionamento",
          "Oferecer benefícios para segunda compra",
          "Criar conexão emocional",
          "Apresentar portfólio completo"
        ],
        tips: ["Cadência: 1x/mês", "Canal: WhatsApp"]
      },
      {
        action: "💤 Precisam de Atenção - Reativar",
        description: "Recência e frequência médias.",
        script: "Oi, [Nome]! Quanto tempo! 💖\n\nPassando para saber como você está e se está tudo bem!\n\nSentimos sua falta por aqui! Temos algumas novidades incríveis que acho que você vai adorar.\n\nQue tal marcarmos uma conversa para eu te contar tudo?",
        checklist: [
          "Reativar com ofertas especiais",
          "Lembrar dos benefícios da Unique",
          "Criar urgência moderada"
        ],
        tips: ["Cadência: 1x/mês", "Canais: WhatsApp + E-mail"]
      },
      {
        action: "😴 Prestes a Dormir - Urgente",
        description: "Recência baixa, costumavam comprar.",
        script: "Oi, [Nome]! Tudo bem? 💖\n\nFaz um tempinho que não conversamos e queria saber como você está!\n\nAconteceu alguma coisa? Tem algo que possamos fazer para te ajudar?\n\nEstamos com saudades e preparamos algo especial para você voltar! ✨",
        checklist: [
          "Reativar urgentemente",
          "Oferta especial de reconexão",
          "Entender motivo do afastamento"
        ],
        tips: ["Cadência: 2x/mês", "Canais: WhatsApp + Ligação"]
      },
      {
        action: "⚠️ Em Risco - Recuperar",
        description: "Gastaram muito mas não compram há tempo.",
        script: "Oi, [Nome]! Aqui é [Seu Nome] da Unique. 💖\n\nVocê é uma paciente muito especial para nós e percebemos que faz um tempo que não nos vemos.\n\nQueria muito entender: aconteceu alguma coisa? Tem algo que possamos fazer diferente?\n\nPreparamos uma condição exclusiva para você, como forma de agradecer por tudo que já vivemos juntas. Posso te contar?",
        checklist: [
          "Recuperar com atenção especial",
          "Ligação personalizada",
          "Oferta exclusiva de alto valor"
        ],
        tips: ["Cadência: 2x/mês", "Canais: Ligação + WhatsApp"]
      },
      {
        action: "🚨 Não Posso Perder - Prioritário",
        description: "Eram os melhores clientes, estão inativos.",
        script: "Oi, [Nome]! Aqui é [Nome do Coordenador], Coordenador Comercial da Unique. 💖\n\nVocê é uma das nossas pacientes mais especiais e percebemos que faz muito tempo que não nos vemos.\n\nQueria pessoalmente entender o que aconteceu e como podemos reconquistar sua confiança.\n\nPosso te ligar para conversarmos? É muito importante para nós.",
        checklist: [
          "Recuperação prioritária",
          "Contato do gestor/coordenador",
          "Oferta irrecusável",
          "Entender profundamente o motivo"
        ],
        tips: ["Cadência: Semanal", "Canais: Ligação + WhatsApp + E-mail"]
      },
      {
        action: "💀 Hibernando - Reativação Forte",
        description: "Última compra há muito tempo.",
        script: "Oi, [Nome]! Tudo bem? 💖\n\nFaz um tempinho que não conversamos e muita coisa mudou por aqui!\n\nTemos novos procedimentos, novos protocolos e muitas novidades que acho que você vai adorar conhecer.\n\nQue tal uma visita para ver tudo de novo? Preparamos algo especial para pacientes que estão voltando! ✨",
        checklist: [
          "Reativação com oferta forte",
          "Campanha de reconexão",
          "Mostrar novidades desde a última visita"
        ],
        tips: ["Cadência: 1x/mês", "Canais: E-mail + WhatsApp"]
      },
      {
        action: "👋 Perdidos - Última Tentativa",
        description: "Inativos há muito tempo.",
        script: "Oi, [Nome]! 💖\n\nPassando para dizer que sentimos muito sua falta!\n\nSei que faz muito tempo que não nos falamos, mas queria que você soubesse que as portas da Unique estão sempre abertas para você.\n\nSe um dia quiser voltar, estaremos aqui de braços abertos! ✨\n\nUm abraço carinhoso!",
        checklist: [
          "Última tentativa de reconexão",
          "Mensagem de despedida com porta aberta",
          "Oferta final"
        ],
        tips: ["Cadência: 1x/trimestre", "Canal: E-mail"]
      },
      // REATIVAÇÃO DE LEADS FRIOS
      {
        action: "Fase 1: Reconexão e Curiosidade",
        description: "Reestabelecer contato de forma leve com leads frios.",
        script: "Olá, [Nome]! Aqui é [Seu Nome] da Unique Medic & SPA.\n\nEstávamos revisando nosso histórico e vimos que você realizou uma consulta conosco no passado.\n\nGostaríamos de saber: você ainda tem interesse em realizar sua cirurgia plástica?\n\nEstamos prontos para te ajudar a realizar esse sonho!",
        tips: [
          "Categoria A: Consultas há 1 ano - Prioridade Alta",
          "Categoria B: Consultas 1-2 anos - Prioridade Média",
          "Categoria C: Consultas +2 anos - Prioridade Baixa"
        ]
      },
      {
        action: "Fase 2: Reengajamento por Conteúdo",
        description: "Demonstrar valor e autoridade com histórias inspiradoras.",
        script: "Oi, [Nome]! 💖\n\nGostaríamos de enviar para você um guia atualizado com as informações completas sobre [procedimento].\n\nGostaria de receber?"
      },
      {
        action: "Fase 3: Oferta e Benefício Exclusivo",
        description: "Criar senso de urgência e oportunidade.",
        script: "Olá, [Nome]! 💖\n\nEstamos com uma condição especial para pacientes que realizaram consultas no passado e desejam retomar o sonho da cirurgia plástica.\n\nGostaria de saber mais detalhes?"
      },
      {
        action: "Fase 4: Reunião ou Nova Consulta",
        description: "Trazer o paciente de volta.",
        script: "Oi, [Nome]! 💖\n\nQue tal agendarmos um momento para conversarmos sobre o [procedimento]?\n\nPodemos ajustar o plano para que ele atenda exatamente às suas necessidades hoje.\n\nQual o melhor horário para você?"
      },
      // SCRIPTS ESPECIAIS
      {
        action: "Script - Aniversário",
        description: "Mensagem de aniversário com presente exclusivo.",
        script: "Oi, [Nome]! 🎂💖\n\nFELIZ ANIVERSÁRIO!\n\nQue esse novo ciclo seja repleto de realizações, saúde e muita felicidade!\n\nVocê é muito especial para nós e queremos te presentear com algo exclusivo.\n\nEntre em contato para descobrir seu presente de aniversário! 🎁✨\n\nUm abraço carinhoso de toda a equipe Unique!"
      },
      {
        action: "Script - Aniversário de Cirurgia",
        description: "Comemorar data importante da transformação.",
        script: "Oi, [Nome]! 💖\n\nHoje faz [X] ano(s) da sua transformação! 🎉\n\nLembra como você se sentia antes? E agora?\n\nEstamos muito felizes por ter feito parte dessa jornada com você!\n\nComo você está se sentindo? Adoraríamos saber! ✨"
      },
      {
        action: "Script - Solicitação de Indicação",
        description: "Pedir indicações através do programa Indica & Transforma.",
        script: "Oi, [Nome]! Tudo bem? 💖\n\nPassando para saber como você está!\n\nE queria te fazer uma pergunta: você tem alguma amiga ou conhecida que também gostaria de viver a experiência Unique?\n\nTemos o programa Indica & Transforma, onde você ganha benefícios exclusivos a cada indicação que agenda consulta!\n\nSe tiver alguém em mente, é só me passar o contato que eu entro em contato com todo carinho! ✨"
      },
      {
        action: "Script - Oferta de Novo Procedimento",
        description: "Apresentar novidades relevantes para a paciente.",
        script: "Oi, [Nome]! Tudo bem? 💖\n\nLembrei de você porque acabou de chegar uma novidade que é a sua cara!\n\nTemos um novo protocolo de [TRATAMENTO] que é perfeito para complementar o que você já fez.\n\nMuitas pacientes que fizeram [PROCEDIMENTO ANTERIOR] estão amando os resultados!\n\nQuer que eu te conte mais? Posso te mandar um vídeo explicando!"
      },
      {
        action: "Script - Pesquisa de Qualidade",
        description: "Entender o que faltou para a paciente avançar.",
        script: "Oi, [Nome]! 💖\n\nAqui é [Seu Nome] da Unique, do nosso setor de qualidade.\n\nComo estamos sempre focados em proporcionar a melhor experiência, queremos saber: o que faltou para que você se sentisse totalmente segura para realizar seu procedimento conosco?\n\nSuas respostas nos ajudam a melhorar cada vez mais nossos serviços! 🙏"
      },
      // OFERTAS E UPSELL
      {
        action: "Estratégia de Upsell por Procedimento",
        description: "Recomendar tratamentos complementares baseado no histórico.",
        checklist: [
          "Mamoplastia → Harmonização corporal, Luxskin",
          "Abdominoplastia → Lipo complementar, Soroterapia",
          "Lipo → Harmonização, Protocolos nutricionais",
          "Rinoplastia → Harmonização facial",
          "Blefaroplastia → Botox, Preenchimento"
        ],
        tips: [
          "Cirurgia: R$ 60.000+",
          "Harmonização: R$ 5.000 - R$ 15.000",
          "Soroterapia: R$ 500 - R$ 2.000",
          "SPA: R$ 200 - R$ 1.000",
          "Luxskin: R$ 300 - R$ 3.000"
        ]
      },
      // PASSAGEM DE BASTÃO
      {
        action: "Passagem para SDR - Lead Reativado",
        description: "Lead reativado demonstra interesse em NOVO PROCEDIMENTO.",
        script: "🔄 LEAD REATIVADO - PRONTO PARA AGENDAMENTO!\n\n📋 DADOS DO PACIENTE:\n- Nome: [NOME]\n- WhatsApp: [NÚMERO]\n- Histórico: Paciente desde [ANO]\n- Último procedimento: [PROCEDIMENTO] em [DATA]\n\n🎯 INTERESSE ATUAL:\n- Procedimento de interesse: [PROCEDIMENTO]\n- Nível de interesse: [ALTO/MÉDIO]\n- Urgência: [IMEDIATA/1-3 MESES/+3 MESES]\n\n💡 OBSERVAÇÕES:\n- [PONTOS IMPORTANTES DA CONVERSA]\n\n📎 Histórico completo no CRM.\n\nPor favor, entrar em contato em até 2 horas!",
        sla: "2 horas",
        checklist: [
          "Lead confirmou interesse em novo procedimento",
          "Lead está qualificado (tem condições de investir)",
          "Conversa registrada no CRM",
          "Dossiê atualizado"
        ]
      },
      {
        action: "Passagem para Coordenador - Atenção Especial",
        description: "Lead importante que não está respondendo ou precisa de abordagem especial.",
        script: "⚠️ LEAD IMPORTANTE - PRECISA DE ATENÇÃO ESPECIAL\n\n📋 DADOS DO PACIENTE:\n- Nome: [NOME]\n- WhatsApp: [NÚMERO]\n- Segmento RFV: [SEGMENTO]\n- Histórico: [RESUMO]\n\n📊 TENTATIVAS REALIZADAS:\n- [DATA] | [CANAL] | [RESULTADO]\n\n❓ MOTIVO DO ENCAMINHAMENTO:\n[EXPLICAR SITUAÇÃO]\n\n💡 SUGESTÃO:\n[SUA SUGESTÃO DE ABORDAGEM]"
      }
    ],
    dossier: {
      title: "Dossiê de Reativação",
      fields: [
        "Histórico completo da paciente",
        "Procedimentos anteriores",
        "Novo procedimento de interesse",
        "Segmento RFV",
        "Objeções e dúvidas levantadas",
        "Potencial de fechamento"
      ]
    },
    transitionScript: "[NOME], que ótimo saber que você está pensando em [NOVO PROCEDIMENTO]! ✨\n\nPara te dar a melhor orientação, vou pedir para a [NOME DA SDR/CLOSER], nossa especialista nesse procedimento, entrar em contato com você.\n\nEla vai te explicar tudo em detalhes e montar um plano especial para você, que já é da casa!\n\nPode aguardar o contato dela?",
    notificationTemplate: "🔄 LEAD REATIVADO - PRONTO PARA AGENDAMENTO!\n\n📋 DADOS DO PACIENTE:\n- Nome: [NOME]\n- WhatsApp: [NÚMERO]\n- Histórico: Paciente desde [ANO]\n- Último procedimento: [PROCEDIMENTO] em [DATA]\n\n🎯 INTERESSE ATUAL:\n- Procedimento de interesse: [PROCEDIMENTO]\n- Nível de interesse: [ALTO/MÉDIO]\n- Urgência: [IMEDIATA/1-3 MESES/+3 MESES]\n\n📎 Histórico completo no CRM.\n\nPor favor, entrar em contato em até 2 horas!"
  }
];

// Quebra de objeções do Closer
export const OBJECTION_HANDLERS = [
  {
    objection: "Está caro / Preço alto",
    response: "Entendo que o valor é um ponto importante.\n\nMas me conta: o que é mais importante para você, preço ou segurança na sua vida?\n\nSe pensarmos no custo-benefício, você estará investindo em um resultado que vai te acompanhar por muitos anos.\n\nDiferente de uma viagem ou um bem material, a cirurgia plástica é um investimento que vai te acompanhar por toda a vida.\n\nSe dividirmos o valor do procedimento por anos de resultados e autoestima elevada, o custo se torna quase insignificante perto do impacto que terá na sua confiança e qualidade de vida.\n\nAlém disso, oferecemos opções de parcelamento para facilitar esse sonho."
  },
  {
    objection: "Vou pensar / Deixar para depois",
    response: "Claro, entendo perfeitamente. Esse é um passo importante e deve ser dado com segurança.\n\nMas preciso te avisar com carinho: adiar esse sonho vale a pena?\n\nHoje temos condições exclusivas para garantir sua cirurgia ainda este mês, com toda a qualidade e atenção que você merece.\n\nDevido ao aumento dos custos dos materiais cirúrgicos (dólar em alta), nossos valores serão reajustados em breve.\n\nAproveitar agora não é apenas realizar um sonho, mas também fazer isso com as melhores condições.\n\nPosso segurar seu horário por 1 hora sem compromisso, apenas para você não perder essa chance. Te reservo?"
  },
  {
    objection: "Preciso falar com meu marido/família",
    response: "Claro, entendo perfeitamente! É uma decisão importante e é ótimo que você queira compartilhar com quem você ama.\n\nInclusive, podemos agendar uma conversa com você e seu marido juntos, para que ele também conheça nosso método e tire todas as dúvidas.\n\nQue tal marcarmos essa conversa para amanhã? Assim vocês podem decidir juntos com todas as informações."
  },
  {
    objection: "Não tenho tempo agora",
    response: "Eu entendo que a rotina pode ser corrida, mas sabemos como planejar cada etapa para que sua recuperação seja tranquila e eficiente, respeitando seu tempo.\n\nInclusive, o Método CPI foi criado justamente para otimizar sua recuperação e você voltar às atividades o mais rápido possível.\n\nQual seria o melhor período para você? Podemos planejar com antecedência."
  },
  {
    objection: "Estou insegura",
    response: "Compreendo que tomar uma decisão como essa gera muitas emoções.\n\nPor isso, nossa equipe estará com você em cada etapa, garantindo total segurança e apoio.\n\nQuais são suas maiores dúvidas ou preocupações?\n\nVamos conversar para garantir que você esteja completamente confiante e tranquila com esse próximo passo."
  },
  {
    objection: "Vi mais barato em outro lugar",
    response: "Entendo sua preocupação com o investimento.\n\nMas me permite uma pergunta: você sabe exatamente o que está incluído nesse valor mais baixo?\n\nAqui na Unique, nosso valor inclui:\n- Cirurgião referência nacional\n- Equipe completa de anestesia e enfermagem\n- Hospital de primeira linha\n- Acompanhamento pós-operatório completo\n- Protocolo CPI de preparação e recuperação\n\nMuitas vezes, valores muito baixos escondem custos extras ou falta de estrutura adequada.\n\nQuando se trata da sua saúde e segurança, o barato pode sair muito caro.\n\nO que você prefere: economizar agora e se arriscar, ou investir na sua segurança e ter resultados garantidos?"
  }
];

// Projetos com benefícios
export const BENEFIT_PROJECTS = [
  {
    name: "Espelho Unique",
    benefit: "5%",
    description: "Autoriza uso do antes e depois, responde perguntas sobre a jornada e participa de collab nas redes"
  },
  {
    name: "Minha Jornada Unique",
    benefit: "5%",
    description: "Registro completo do pré ao pós-operatório. Minidocumentário profissional"
  },
  {
    name: "Por Trás da Transformação",
    benefit: "5%",
    description: "Compartilha história real em texto ou entrevista para campanhas"
  },
  {
    name: "Voz Unique",
    benefit: "5%",
    description: "Participação especial no podcast da Unique"
  },
  {
    name: "Indica & Transforma",
    benefit: "5%",
    description: "Indica 3 ou mais pessoas para agendarem consulta"
  }
];

// Tabela de pagamentos
export const PAYMENT_CONDITIONS = {
  withoutProject: {
    pix: "10% OFF",
    card: "Valor integral"
  },
  withOneProject: {
    pix: "15% OFF",
    card: "5% OFF"
  },
  withTwoProjects: {
    pix: "20% OFF",
    card: "10% OFF"
  }
};

// Dados do Coordenador Comercial
export interface CoordinatorData {
  mission: string;
  attributes: string[];
  metrics: {
    name: string;
    description: string;
    formula?: string;
    target?: string;
  }[];
  rituals: {
    name: string;
    frequency: string;
    description: string;
    participants?: string[];
    agenda?: string[];
  }[];
  tools: {
    name: string;
    purpose: string;
    usage: string;
  }[];
  managementTips: {
    category: string;
    tips: string[];
  }[];
  escalationProtocol: {
    situation: string;
    action: string;
    sla: string;
  }[];
  rescueProcess?: {
    title: string;
    description: string;
    steps: string[];
    whatsappScript: string;
    callScript: {
      abertura: string;
      diagnostico: string;
      solucoes: {
        objecao: string;
        resposta: string;
      }[];
      fechamento: string;
    };
  };
  feedbackScript?: {
    title: string;
    abertura: string;
    analisePerformance: string;
    feedbackEspecifico: string;
    planoAcao: string;
    fechamento: string;
  };
  dailyChecklist?: string[];
  weeklyAudit?: {
    title: string;
    description: string;
    checklist: string[];
  };
  weeklyReport?: {
    title: string;
    sections: string[];
  };
  kpisByTeam?: {
    team: string;
    kpis: string[];
  }[];
  handoffFlow?: {
    from: string;
    to: string;
    trigger: string;
    maxTime: string;
  }[];
}

export const COORDINATOR_DATA: CoordinatorData = {
  mission: "Orquestrar toda a máquina comercial da Unique, garantindo que cada equipe (Social Selling, SDR, Closers, CS, Farmer) opere em sua máxima performance, de forma sinérgica e alinhada, para esmagar as metas de faturamento e proporcionar uma experiência lendária para cada paciente, do primeiro contato à fidelização eterna.",
  attributes: [
    "Liderança inspiradora e motivacional",
    "Visão analítica de indicadores e dados",
    "Comunicação clara e assertiva",
    "Capacidade de coaching e desenvolvimento de pessoas",
    "Resolução de conflitos e mediação",
    "Gestão de tempo e priorização estratégica",
    "Reporte direto ao CEO com todas as equipes comerciais sob sua gestão",
    "Maestro da orquestra comercial - elevar performance de cada músico"
  ],
  metrics: [
    {
      name: "Atingimento da Meta Global",
      description: "Faturamento total do time comercial",
      target: "≥ 100% da META 3"
    },
    {
      name: "Meta Social Selling + SDR",
      description: "Ana Paula + Ketley - SDR + Social Selling",
      formula: "META 3 Equipe: R$ 52.206 | Individual: R$ 26.103",
      target: "100%"
    },
    {
      name: "Meta Closers",
      description: "Larissa + Bianca - Closers",
      formula: "META 3 Equipe: R$ 2.134.513 | Individual: R$ 1.067.256",
      target: "100%"
    },
    {
      name: "Meta Customer Success",
      description: "Paula + Viviane - CS",
      formula: "META 3 Equipe: R$ 754.462 | Individual: R$ 377.231",
      target: "100%"
    },
    {
      name: "Meta Farmer",
      description: "Kamila + Novo Integrante - Farmer",
      formula: "META 3 Equipe: R$ 59.778 | Individual: R$ 29.889",
      target: "100%"
    },
    {
      name: "Meta Total Comercial",
      description: "Soma de todas as equipes",
      target: "R$ 3.006.180"
    },
    {
      name: "Tempo de Primeira Resposta",
      description: "Tempo entre recebimento do lead e primeiro contato",
      target: "≤ 5 minutos"
    },
    {
      name: "Taxa de Agendamento",
      description: "Leads que agendaram consulta",
      formula: "(Consultas Agendadas / Leads Qualificados) × 100",
      target: "≥ 40%"
    },
    {
      name: "Taxa de Comparecimento",
      description: "Pacientes que compareceram à consulta agendada",
      formula: "(Consultas Realizadas / Consultas Agendadas) × 100",
      target: "≥ 85%"
    },
    {
      name: "Taxa de Fechamento",
      description: "Consultas que resultaram em cirurgia fechada",
      formula: "(Cirurgias Fechadas / Consultas Realizadas) × 100",
      target: "≥ 35%"
    },
    {
      name: "SLA de Passagem de Bastão",
      description: "Cumprimento dos prazos de transição entre etapas",
      target: "≥ 95%"
    }
  ],
  rituals: [
    {
      name: "Reunião de Huddle (Daily)",
      frequency: "Diário - 15 min",
      description: "Alinhar prioridades do dia, remover bloqueios e energizar o time. Em pé, rápido e focado.",
      participants: ["Coordenador", "Todas as equipes"],
      agenda: [
        "O que você fez ontem?",
        "O que vai fazer hoje?",
        "Quais são seus bloqueios?",
        "Prioridades do dia"
      ]
    },
    {
      name: "Análise de Dashboards",
      frequency: "Diário - 30 min",
      description: "Verificar performance do dia anterior e identificar desvios",
      participants: ["Coordenador"],
      agenda: [
        "Leads gerados vs meta",
        "Consultas agendadas vs meta",
        "Cirurgias fechadas vs meta",
        "Identificar gargalos"
      ]
    },
    {
      name: "1-on-1 com cada Vendedora",
      frequency: "Semanal - 30 min cada",
      description: "Coaching, feedback, análise de performance individual e plano de ação. Usar metodologia GROW.",
      participants: ["Coordenador", "Colaborador"],
      agenda: [
        "G - Goal: Qual seu objetivo?",
        "R - Reality: Onde você está agora?",
        "O - Options: Quais opções você tem?",
        "W - Will: O que você vai fazer?"
      ]
    },
    {
      name: "Reunião de Pipeline Review",
      frequency: "Semanal - 1h",
      description: "Analisar o funil de vendas completo, identificar gargalos e oportunidades",
      participants: ["Coordenador", "Time Comercial"],
      agenda: [
        "Funil por etapa",
        "Leads parados",
        "Oportunidades de resgate",
        "Previsão de fechamento"
      ]
    },
    {
      name: "Auditoria de Qualidade",
      frequency: "Semanal - 2h",
      description: "Ouvir ligações, ler conversas e analisar prontuários para garantir a excelência",
      participants: ["Coordenador"],
      agenda: [
        "Ouvir 5+ ligações",
        "Ler 10+ conversas",
        "Identificar pontos de melhoria",
        "Preparar feedbacks"
      ]
    },
    {
      name: "Reunião de Resultados Mensal",
      frequency: "Mensal - 1.5h",
      description: "Apresentar resultados do mês, reconhecer destaques e definir foco para o próximo mês",
      participants: ["Coordenador", "Time Comercial"],
      agenda: [
        "Resultados vs Meta",
        "Destaques do mês",
        "Aprendizados",
        "Foco do próximo mês"
      ]
    },
    {
      name: "Planejamento Estratégico Mensal",
      frequency: "Mensal - 2h",
      description: "Definir campanhas, ações e estratégias para o mês seguinte",
      participants: ["Coordenador", "Liderança"],
      agenda: [
        "Análise do mês anterior",
        "Oportunidades identificadas",
        "Campanhas planejadas",
        "Recursos necessários"
      ]
    },
    {
      name: "QBR - Revisão Estratégica Trimestral",
      frequency: "Trimestral - 4h",
      description: "Análise profunda do trimestre, revisão do plano estratégico e definição de metas para o próximo QBR",
      participants: ["Coordenador", "CEO", "Liderança"],
      agenda: [
        "Performance do trimestre",
        "Análise de tendências",
        "Revisão estratégica",
        "Metas do próximo trimestre"
      ]
    }
  ],
  tools: [
    {
      name: "Go High Level (GHL)",
      purpose: "CRM, pipelines, dashboards, automações - Ferramenta principal",
      usage: "Todos os dashboards, relatórios, pipelines e históricos devem ser centralizados no GHL para uma visão 360º da operação"
    },
    {
      name: "Dashboard Diário",
      purpose: "Monitoramento de métricas em tempo real",
      usage: "Leads gerados, atendidos, consultas agendadas/realizadas, cirurgias fechadas, valor vendido"
    },
    {
      name: "Dashboard Semanal",
      purpose: "Análise de funil e performance",
      usage: "Funil completo, taxa de conversão por etapa, tempo médio de ciclo, top 5 motivos de perda, ranking de vendedoras"
    },
    {
      name: "Dashboard Mensal",
      purpose: "Visão estratégica de resultados",
      usage: "Faturamento vs Meta, evolução de KPIs, NPS, LTV, taxa de recompra, ROI de campanhas"
    },
    {
      name: "WhatsApp Business",
      purpose: "Comunicação com equipe e resgates",
      usage: "Supervisionar atendimentos, responder escalações, resgates de leads VIP"
    },
    {
      name: "Google Sheets/Planilhas",
      purpose: "Relatórios customizados e análises",
      usage: "Controle de metas individuais e coletivas, atualizar semanalmente"
    },
    {
      name: "Trello",
      purpose: "Gestão de tarefas e projetos da equipe",
      usage: "Acompanhar iniciativas, treinamentos, projetos especiais"
    },
    {
      name: "Zoom/Google Meet",
      purpose: "Reuniões e treinamentos remotos",
      usage: "1-on-1s, treinamentos, roleplay de vendas"
    }
  ],
  managementTips: [
    {
      category: "Supervisão Social Selling",
      tips: [
        "Monitorar: 30-50 perfis prospectados/dia",
        "Se taxa de resposta < 20%: Revisar scripts de abordagem",
        "Se conversão < 10%: Fazer sessão de roleplay e coaching",
        "Se volume baixo: Verificar bloqueio operacional ou motivacional",
        "Checklist semanal: Analisar 10 conversas de prospecção",
        "Verificar se checklists de engajamento estão sendo seguidos",
        "Conferir se leads estão sendo movidos corretamente no pipeline"
      ]
    },
    {
      category: "Supervisão SDR",
      tips: [
        "Monitorar: Tempo de primeira resposta (meta: < 5 min)",
        "Se tempo de resposta > 5 min: Verificar carga de trabalho e redistribuir leads",
        "Se taxa de qualificação baixa: Revisar critérios e scripts",
        "Se taxa de agendamento baixa: Treinar técnicas de fechamento",
        "Checklist semanal: Ouvir 5 ligações de qualificação",
        "Verificar qualidade das mensagens",
        "Analisar taxa de follow-up"
      ]
    },
    {
      category: "Supervisão Closers",
      tips: [
        "Monitorar: Taxa de comparecimento, conversão, ticket médio",
        "Se taxa de comparecimento < 80%: Revisar processo de confirmação",
        "Se taxa de conversão < 50%: Fazer sessão de roleplay do Método CPI",
        "Se ticket médio baixo: Treinar técnicas de upsell",
        "Checklist semanal: Acompanhar 1+ consulta presencialmente",
        "Analisar 5 propostas comerciais enviadas",
        "Verificar se política de descontos está sendo respeitada"
      ]
    },
    {
      category: "Supervisão Customer Success",
      tips: [
        "Monitorar: Aderência ao cronograma, taxa de upsell, NPS, UniLovers",
        "Se aderência ao cronograma < 90%: Verificar carga de trabalho",
        "Se taxa de upsell baixa: Treinar identificação de oportunidades",
        "Se NPS < 9: Investigar causas e criar plano de ação",
        "Checklist semanal: Verificar contatos programados",
        "Analisar 5 conversas de pós-venda",
        "Conferir se oportunidades de upsell estão sendo exploradas"
      ]
    },
    {
      category: "Supervisão Farmer",
      tips: [
        "Monitorar: Taxa de reativação, LTV, vendas recorrentes, engajamento",
        "Se taxa de reativação < 15%: Revisar scripts e ofertas",
        "Se LTV estagnado: Criar novas campanhas de relacionamento",
        "Se vendas recorrentes baixas: Treinar venda consultiva",
        "Checklist semanal: Analisar 10 conversas de reativação",
        "Verificar se segmentação RFV está sendo usada",
        "Conferir execução de campanhas de base"
      ]
    },
    {
      category: "Gestão de Baixa Performance",
      tips: [
        "Semana 1: Feedback e plano de ação",
        "Semana 2: Acompanhamento intensivo e coaching",
        "Semana 3: Avaliação de progresso",
        "Semana 4: Decisão (manter, realocar ou desligar)",
        "Documentar todas as conversas e acordos",
        "Identificar causa raiz: falta de skill, vontade ou processo"
      ]
    },
    {
      category: "Gestão de Conflitos entre Equipes",
      tips: [
        "Ouvir ambas as partes separadamente",
        "Analisar o histórico no GHL",
        "Tomar decisão baseada em dados e regras pré-estabelecidas",
        "Comunicar a decisão de forma clara e justa",
        "Documentar para evitar recorrência"
      ]
    },
    {
      category: "Desenvolvimento da Equipe",
      tips: [
        "Treinamento Método CPI: Mensal",
        "Técnicas de Vendas (SPIN): Quinzenal",
        "Produto (Procedimentos): Mensal com equipe médica",
        "Ferramentas (GHL): Sob demanda",
        "Roleplay de Vendas: Semanal"
      ]
    },
    {
      category: "Plano de Carreira",
      tips: [
        "SDR → Closer: Após 6 meses de alta performance",
        "Closer → Closer Sênior: Após 12 meses de alta performance",
        "CS → Farmer: Após 6 meses de alta performance",
        "Qualquer → Coordenador: Após 24 meses + perfil de liderança",
        "Mapear potencial de cada membro e criar PDI individual"
      ]
    }
  ],
  escalationProtocol: [
    {
      situation: "Lead de alto valor (> R$ 50k) sem resposta há 10 dias",
      action: "Coordenador assume o resgate pessoal seguindo o processo de resgate estratégico",
      sla: "Imediato"
    },
    {
      situation: "Lead VIP ou indicação importante",
      action: "Assumir acompanhamento pessoal ou designar membro sênior",
      sla: "Imediato"
    },
    {
      situation: "Oportunidade de fechamento alto valor",
      action: "Apoiar Closer na negociação, liberar condições especiais se necessário",
      sla: "Imediato"
    },
    {
      situation: "Reclamação de paciente sobre atendimento",
      action: "Investigar, dar feedback ao colaborador, retornar ao paciente",
      sla: "2 horas"
    },
    {
      situation: "Passagem de bastão pendente",
      action: "Verificar e garantir transição. SLA: Social Selling/SDR→Closer: 2h | Closer→CS: 4h | CS→Farmer: 24h",
      sla: "Conforme etapa"
    },
    {
      situation: "Conflito entre membros do time",
      action: "Mediar conversa, alinhar expectativas, documentar acordos",
      sla: "24 horas"
    },
    {
      situation: "Queda significativa de performance",
      action: "Reunião com colaborador, identificar causas, criar plano de ação",
      sla: "48 horas"
    },
    {
      situation: "Problema com ferramenta/sistema",
      action: "Escalar para TI, comunicar time sobre workaround temporário",
      sla: "30 minutos"
    }
  ],
  rescueProcess: {
    title: "Processo de Resgate Estratégico",
    description: "Quando um lead de alto valor (potencial de cirurgia > R$ 50k) fica mais de 10 dias sem resposta no funil do Closer, o Coordenador assume o resgate.",
    steps: [
      "1. Análise do Dossiê: Estudar todo o histórico do lead no GHL (conversas, perfil, objeções)",
      "2. Contato Pessoal: Fazer contato pessoal, se apresentando como figura de autoridade",
      "3. Diagnóstico: Entender o real motivo do bloqueio (preço, medo, tempo, etc.)",
      "4. Ação Estratégica: Oferecer solução personalizada (condição especial, conversa com especialista, apresentação de projeto)",
      "5. Redirecionamento: Após reaquecer o lead, devolver para a Closer com plano de ação claro"
    ],
    whatsappScript: "Olá, [Nome do Paciente], tudo bem? Meu nome é [Nome do Coordenador] e sou Coordenador Comercial aqui na Unique. Vi que você conversou com a [Nome da Vendedora] sobre seu sonho de realizar a cirurgia plástica, mas notei que não conseguimos avançar. Gostaria de entender pessoalmente se houve alguma falha em nosso atendimento ou se há algo que eu possa fazer para te ajudar a dar o próximo passo com segurança e confiança. Podemos conversar por 5 minutos?",
    callScript: {
      abertura: "Olá, [Nome do Paciente]! Aqui é o [Nome do Coordenador], Coordenador Comercial da Unique. Tudo bem com você?\n\nEstou ligando pessoalmente porque você é muito importante para nós. Vi que você conversou com a [Nome da Vendedora] sobre seu sonho de [procedimento] e quero entender como posso te ajudar a dar o próximo passo.",
      diagnostico: "Me conta, o que te impediu de avançar? Foi algo relacionado a preço, tempo, medo, ou alguma outra coisa?",
      solucoes: [
        {
          objecao: "Preço",
          resposta: "Entendo perfeitamente. Olha, temos condições especiais de parcelamento e também a possibilidade de você participar de um projeto com desconto. Posso te apresentar essas opções?"
        },
        {
          objecao: "Medo",
          resposta: "É completamente normal ter esse receio. O que acha de conversarmos com uma de nossas pacientes que já realizou o procedimento? Ela pode te contar como foi a experiência dela."
        },
        {
          objecao: "Tempo",
          resposta: "Compreendo que a agenda é apertada. Podemos agendar a consulta para um horário que seja mais conveniente para você. Qual seria o melhor dia e horário?"
        }
      ],
      fechamento: "Então, vamos fazer o seguinte: vou agendar uma nova conversa com a [Nome da Vendedora] para [data/hora]. Ela vai te apresentar as opções que conversamos e te ajudar a dar o próximo passo. Combinado?"
    }
  },
  feedbackScript: {
    title: "Script de Feedback para Vendedora (1-on-1)",
    abertura: "Oi, [Nome da Vendedora]! Obrigado por reservar esse tempo para a gente conversar. Como você está se sentindo em relação ao seu trabalho essa semana?",
    analisePerformance: "Olhando para os números, você teve [X] leads atendidos, [Y] consultas agendadas e [Z] fechamentos. Isso representa uma taxa de conversão de [%]. O que você acha desse resultado?",
    feedbackEspecifico: "Ouvi algumas das suas ligações e quero te dar um feedback. Percebi que você está muito bem em [ponto positivo], mas notei uma oportunidade de melhoria em [ponto de melhoria]. O que você acha de trabalharmos isso juntos?",
    planoAcao: "Para a próxima semana, vamos focar em [ação específica]. Vou te acompanhar de perto e fazer um roleplay contigo na quarta-feira. Combinado?",
    fechamento: "Tem mais alguma coisa que você gostaria de compartilhar ou algum apoio que você precisa de mim?"
  },
  dailyChecklist: [
    "07:30 - Revisar dashboards e identificar prioridades do dia",
    "08:00 - Realizar Daily Huddle com a equipe",
    "08:30 - Verificar leads de alto valor parados e iniciar resgates",
    "10:00 - Acompanhar consultas agendadas do dia",
    "12:00 - Verificar passagens de bastão pendentes",
    "14:00 - Realizar 1-on-1 ou coaching (conforme agenda)",
    "16:00 - Auditoria de qualidade (ligações/conversas)",
    "17:30 - Atualizar relatórios e preparar próximo dia",
    "18:00 - Enviar resumo do dia para o CEO (se aplicável)"
  ],
  weeklyAudit: {
    title: "Auditoria Semanal de Passagem de Bastão",
    description: "Auditar 10 passagens de bastão aleatórias",
    checklist: [
      "Dossiê completo?",
      "Tempo de transição dentro do limite?",
      "Paciente recebeu a mensagem de apresentação do novo responsável?",
      "Histórico completo no GHL?"
    ]
  },
  weeklyReport: {
    title: "Relatório Semanal para o CEO",
    sections: [
      "1. Resumo de Performance: Faturamento vs Meta, principais KPIs",
      "2. Destaques: Vitórias da semana, casos de sucesso",
      "3. Alertas: Problemas identificados, riscos",
      "4. Ações: O que foi feito para resolver problemas",
      "5. Próximos Passos: Foco da próxima semana"
    ]
  },
  kpisByTeam: [
    {
      team: "Social Selling",
      kpis: [
        "Nº de Leads Gerados (prospecção)",
        "Taxa de Resposta (abertura)",
        "Taxa de Conversão (Lead → Consulta Agendada)",
        "Custo por Consulta Agendada (se aplicável)"
      ]
    },
    {
      team: "SDR",
      kpis: [
        "Nº de Leads Atendidos (inbound)",
        "Taxa de Conversão (Lead → Consulta Agendada)",
        "Tempo de Primeira Resposta",
        "Nº de Follow-ups por Lead"
      ]
    },
    {
      team: "Closers",
      kpis: [
        "Taxa de Comparecimento à Consulta",
        "Taxa de Conversão (Consulta → Cirurgia Fechada)",
        "Ticket Médio por Cirurgia",
        "Valor Total Vendido (R$)"
      ]
    },
    {
      team: "Customer Success",
      kpis: [
        "Taxa de Upsell/Cross-sell (pré e pós-operatório)",
        "NPS (Net Promoter Score)",
        "Aderência ao Cronograma Pós-Venda",
        "Taxa de Conclusão do Programa UniLovers"
      ]
    },
    {
      team: "Farmer",
      kpis: [
        "Taxa de Reativação de Clientes",
        "LTV (Lifetime Value)",
        "Vendas Recorrentes (procedimentos e produtos)",
        "Engajamento em Campanhas de Base"
      ]
    }
  ],
  handoffFlow: [
    {
      from: "Social Selling",
      to: "Closer",
      trigger: "Consulta agendada e confirmada",
      maxTime: "2 horas"
    },
    {
      from: "SDR",
      to: "Closer",
      trigger: "Consulta agendada e confirmada",
      maxTime: "2 horas"
    },
    {
      from: "Closer",
      to: "CS",
      trigger: "Cirurgia fechada e contrato assinado",
      maxTime: "4 horas"
    },
    {
      from: "CS",
      to: "Farmer",
      trigger: "Alta do paciente (6 meses pós-cirurgia)",
      maxTime: "24 horas"
    },
    {
      from: "Qualquer",
      to: "Coordenador",
      trigger: "Lead de alto valor sem resposta há 10 dias",
      maxTime: "Imediato"
    }
  ]
};

// Helper para buscar script de uma ação específica
export const getActionScript = (stageId: number, actionText: string): ActionScript | undefined => {
  const stage = COMMERCIAL_SCRIPTS.find(s => s.stageId === stageId);
  if (!stage) return undefined;
  return stage.actions.find(a => a.action === actionText);
};
