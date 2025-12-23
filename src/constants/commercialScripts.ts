// Scripts e modelos extraídos dos documentos comerciais da Unique

export interface ActionScript {
  action: string;
  description?: string;
  script?: string;
  checklist?: string[];
  tips?: string[];
  sla?: string;
}

export interface StageScripts {
  stageId: number;
  title: string;
  mission: string;
  objective: string;
  actions: ActionScript[];
  dossier?: {
    title: string;
    fields: string[];
  };
  transitionScript?: string;
  notificationTemplate?: string;
}

export const COMMERCIAL_SCRIPTS: StageScripts[] = [
  {
    stageId: 1,
    title: "Comercial 1 - SDR / Social Selling",
    mission: "Captar leads qualificados através de prospecção ativa nas redes sociais e canais digitais, convertendo-os em consultas agendadas.",
    objective: "Transformar leads em consultas pagas e agendadas.",
    actions: [
      {
        action: "Prospecção ativa (redes sociais, tráfego pago, indicações)",
        description: "Identificar e abordar potenciais pacientes através de diferentes canais.",
        tips: [
          "Redes Sociais → Social Selling",
          "Tráfego Pago/Orgânico/Indicações → SDR",
          "Monitorar comentários e DMs no Instagram",
          "Responder stories de interesse em procedimentos"
        ]
      },
      {
        action: "Responder leads em até 5 minutos",
        description: "Velocidade de resposta é crucial para conversão.",
        sla: "5 minutos",
        tips: [
          "Configurar notificações do CRM",
          "Manter WhatsApp Web sempre aberto",
          "Usar templates de resposta rápida"
        ]
      },
      {
        action: "Qualificar lead (dor, sonho, urgência)",
        description: "Entender profundamente o que motiva o paciente.",
        checklist: [
          "Qual a dor principal?",
          "Qual o sonho/resultado esperado?",
          "Qual o nível de urgência (alto/médio/baixo)?",
          "Procedimento de interesse"
        ]
      },
      {
        action: "Preencher Dossiê de Qualificação completo",
        description: "Documentar todas as informações do lead para passagem de bastão.",
        checklist: [
          "Nome completo, WhatsApp, Instagram",
          "Dor principal e sonho",
          "Procedimento de interesse",
          "Nível de urgência",
          "Observações relevantes (ex: 'mãe de 2 filhos', 'sonho antigo')"
        ]
      },
      {
        action: "Apresentar diferenciais Unique (CPI, 3R, Travel)",
        description: "Destacar os métodos exclusivos da clínica.",
        script: "Aqui na Unique, temos o Método CPI - Cirurgia Plástica Integrativa, que prepara seu corpo e mente para um resultado mais seguro e duradouro. Também oferecemos o Método 3R para recuperação otimizada e o Unique Travel para pacientes de fora."
      },
      {
        action: "Quebrar objeções de agendamento",
        description: "Superar barreiras para o agendamento da consulta.",
        tips: [
          "'Está caro a consulta' → Falar do valor agregado e método CPI",
          "'Vou pensar' → Criar urgência com agenda limitada",
          "'Preciso ver com marido' → Oferecer conversa conjunta"
        ]
      },
      {
        action: "Agendar consulta e confirmar pagamento",
        description: "Fechar o agendamento e garantir confirmação financeira.",
        checklist: [
          "Verificar disponibilidade na agenda",
          "Confirmar data e horário com paciente",
          "Gerar link de pagamento"
        ]
      },
      {
        action: "Confirmar pagamento no Asaas",
        description: "Verificar que o pagamento foi processado antes de passar o lead.",
        sla: "Antes de passar para Closer"
      },
      {
        action: "Enviar mensagem de transição para paciente",
        description: "Preparar o paciente para o próximo atendimento.",
        script: "Parabéns, [NOME]! Sua consulta está confirmada! 🎉\n\nVocê deu o passo mais importante na sua jornada de transformação.\n\nAgora, a [NOME DA CLOSER], nossa especialista em planejamento cirúrgico, vai te dar as boas-vindas e te acompanhar nos próximos passos até o dia da sua consulta.\n\nEla já tem todas as informações da nossa conversa e vai te chamar em breve!\n\nSeja muito bem-vinda à Unique!"
      },
      {
        action: "Notificar Closer com dossiê completo",
        description: "Enviar todas as informações para o Closer assumir.",
        script: "🚀 NOVA CONSULTA AGENDADA! (Origem: SDR/Social Selling)\n\nPaciente: [NOME]\nWhatsApp: [NÚMERO]\nData da Consulta: [DATA E HORA]\n\n📋 Dossiê de Qualificação:\n- Dor Principal: [DOR]\n- Sonho: [SONHO]\n- Procedimento de Interesse: [PROCEDIMENTO]\n- Nível de Urgência: [ALTO/MÉDIO/BAIXO]\n- Observações: [PONTOS RELEVANTES]\n\nPor favor, entrar em contato para as boas-vindas em até 2 horas."
      },
      {
        action: "Passar lead em até 2 horas após confirmação",
        description: "SLA de passagem de bastão para o Closer.",
        sla: "2 horas"
      }
    ],
    dossier: {
      title: "Dossiê de Qualificação",
      fields: [
        "Nome completo",
        "WhatsApp",
        "Instagram",
        "Dor principal",
        "Sonho/resultado esperado",
        "Procedimento de interesse",
        "Nível de urgência (alto/médio/baixo)",
        "Observações relevantes"
      ]
    },
    transitionScript: "Parabéns, [NOME]! Sua consulta está confirmada! 🎉\n\nVocê deu o passo mais importante na sua jornada de transformação.\n\nAgora, a [NOME DA CLOSER], nossa especialista em planejamento cirúrgico, vai te dar as boas-vindas e te acompanhar nos próximos passos até o dia da sua consulta.\n\nEla já tem todas as informações da nossa conversa e vai te chamar em breve!\n\nSeja muito bem-vinda à Unique!",
    notificationTemplate: "🚀 NOVA CONSULTA AGENDADA!\n\nPaciente: [NOME]\nWhatsApp: [NÚMERO]\nData da Consulta: [DATA E HORA]\n\n📋 Dossiê de Qualificação:\n- Dor Principal: [DOR]\n- Sonho: [SONHO]\n- Procedimento de Interesse: [PROCEDIMENTO]\n- Nível de Urgência: [ALTO/MÉDIO/BAIXO]\n- Observações: [PONTOS RELEVANTES]\n\nPor favor, entrar em contato para as boas-vindas em até 2 horas."
  },
  {
    stageId: 2,
    title: "Comercial 2 - Closer",
    mission: "Transformar leads qualificados em clientes efetivos, negociando e fechando acordos de forma eficiente, alinhada aos valores e metas da Unique.",
    objective: "Transformar consultas realizadas em cirurgias fechadas.",
    actions: [
      {
        action: "Receber dossiê do SDR/Social Selling",
        description: "Revisar todas as informações antes do primeiro contato.",
        checklist: [
          "Dossiê completo do paciente",
          "Informações da consulta médica",
          "Procedimento recomendado pelo cirurgião",
          "Nível de urgência do paciente"
        ]
      },
      {
        action: "Contatar paciente em até 2h após consulta",
        description: "Primeiro contato pós-consulta é crucial.",
        sla: "2 horas",
        script: "Olá, [Nome]! Tudo bem?\n\nAqui é [Seu Nome] da Unique Plástica Avançada.\n\nQue bom falar com você! Sei que durante a consulta você já deu o primeiro passo em direção ao sonho da sua transformação.\n\nEstou aqui para tirar todas as dúvidas e entender como podemos avançar juntos nesse processo.\n\nMe conta: como foi a consulta? O que você achou do Dr. [Nome do Médico]?"
      },
      {
        action: "Aplicar método SPIN Selling (Situação, Problema, Implicação, Necessidade)",
        description: "Técnica de vendas consultivas para entender profundamente o cliente.",
        checklist: [
          "S - SITUAÇÃO: O que te motivou a buscar a cirurgia neste momento?",
          "P - PROBLEMA: O que mais te incomoda que gostaria de mudar?",
          "I - IMPLICAÇÃO: Se não realizar agora, como se sentirá em 6 meses?",
          "N - NECESSIDADE: Se pudesse mudar algo hoje, o que seria?"
        ],
        tips: [
          "Ouvir atentamente e anotar",
          "Fazer perguntas abertas",
          "Conectar emocionalmente",
          "Identificar a dor real"
        ]
      },
      {
        action: "Apresentar proposta e ancoragem de valor",
        description: "Valorizar o investimento antes de falar do preço.",
        script: "[Nome], agora que entendi perfeitamente o que você busca, vou te apresentar o plano ideal para a sua transformação.\n\nDiferente de outras clínicas, aqui na Unique oferecemos um acompanhamento completo, desde o planejamento personalizado até o pós-operatório, garantindo segurança e resultados naturais.\n\nO nosso Método CPI é focado em transformar vidas com excelência e cuidado em cada detalhe.\n\nPense assim: dividindo o valor do procedimento pelos anos que você aproveitará esse resultado, o custo mensal se torna mínimo perto do impacto positivo que você terá diariamente."
      },
      {
        action: "Explicar Método CPI e diferenciais",
        description: "Destacar os métodos exclusivos da Unique.",
        checklist: [
          "Método CPI - Cirurgia Plástica Integrativa (7 pilares)",
          "Método 3R - Recuperação, Resultados naturais, Retorno rápido",
          "Unique Travel - Suporte completo para pacientes de fora",
          "Equipe de excelência - Dr. André Oliveira"
        ]
      },
      {
        action: "Oferecer projetos (Espelho, Minha Jornada, Indica & Transforma)",
        description: "Projetos que geram benefícios para o paciente.",
        script: "[Nome], aqui na Unique, criamos projetos que celebram histórias reais.\n\nVocê pode participar como protagonista da sua transformação e, com isso, desbloquear benefícios especiais.\n\nSe você quiser fazer parte de uma dessas ações – como gravar seu depoimento, compartilhar seu antes e depois ou até indicar amigas – a gente reconhece isso com um presente exclusivo e um benefício especial.",
        checklist: [
          "Espelho Unique - Autoriza uso do antes/depois (5%)",
          "Minha Jornada Unique - Minidocumentário (5%)",
          "Por Trás da Transformação - História em texto/entrevista (5%)",
          "Voz Unique - Participação no podcast (5%)",
          "Indica & Transforma - Indica 3+ pessoas (5%)"
        ],
        tips: [
          "Máximo 2 projetos = 10% de benefício",
          "PIX à vista = 10% OFF",
          "Nunca falar 'desconto', falar 'benefício'"
        ]
      },
      {
        action: "Criar cupom personalizado se participar de projeto",
        description: "Registrar participação em projetos.",
        tips: [
          "Formato: NOMEESOBRENOMEPACIENTE10",
          "Ex: BRUNAGUIMARAES10",
          "Registrar na planilha com projetos escolhidos",
          "Comunicar ao marketing"
        ]
      },
      {
        action: "Negociar formas de pagamento",
        description: "Apresentar opções de pagamento.",
        checklist: [
          "PIX à vista: 10% de desconto",
          "Cartão de crédito: até 12x",
          "Financiamento: até 36x"
        ],
        script: "Qual dessas opções faz mais sentido para você: PIX com 10% de desconto ou parcelamento no cartão?"
      },
      {
        action: "D+2: Enviar depoimento/vídeo de paciente similar",
        description: "Primeiro follow-up com prova social.",
        script: "Oi [Nome]! Lembrei de você e separei esse depoimento da [Paciente] que fez o mesmo procedimento. Olha só o resultado! [LINK]"
      },
      {
        action: "D+4: Ligar para tirar dúvidas",
        description: "Contato por ligação para resolver objeções.",
        tips: [
          "Preferir ligação a mensagem",
          "Se não atender, deixar áudio",
          "Anotar todas as dúvidas no CRM"
        ]
      },
      {
        action: "D+6: WhatsApp de escassez (agenda fechando)",
        description: "Criar urgência com disponibilidade limitada.",
        script: "Oi [Nome]! Passando para avisar que a agenda do Dr. [Nome] está fechando para este mês. Consegui segurar uma vaga para você até amanhã. Vamos fechar?"
      },
      {
        action: "D+9: Áudio personalizado emocional",
        description: "Conexão emocional através de áudio.",
        tips: [
          "Mencionar o sonho dela",
          "Falar do impacto na autoestima",
          "Ser genuína e empática",
          "Máximo 1 minuto"
        ]
      },
      {
        action: "D+12: Última tentativa de fechamento",
        description: "Último contato antes de encaminhar ao coordenador.",
        script: "Oi [Nome]! Essa é minha última tentativa de te ajudar a realizar esse sonho. Respeito sua decisão, mas não quero que você perca essa oportunidade. Posso te ajudar de alguma forma?"
      },
      {
        action: "D+14: Encaminhar ao coordenador se não fechou",
        description: "Lead sem fechamento vai para avaliação do coordenador.",
        sla: "14 dias"
      },
      {
        action: "Confirmar assinatura do contrato",
        description: "Verificar contrato assinado antes de passar para CS."
      },
      {
        action: "Confirmar pagamento da entrada",
        description: "Verificar pagamento confirmado."
      },
      {
        action: "Preencher Dossiê de Pré-Operatório",
        description: "Documentar informações para o CS.",
        checklist: [
          "Dados pessoais completos",
          "Cirurgia(s) contratada(s) e valor",
          "Data da cirurgia",
          "Forma de pagamento",
          "Necessidades especiais (ex: Unique Travel)",
          "Perfil emocional (ansiosa, tranquila, etc.)"
        ]
      },
      {
        action: "Atualizar cadastro no Feegow",
        description: "Manter sistema atualizado."
      },
      {
        action: "Enviar mensagem de transição para paciente",
        description: "Preparar paciente para o CS.",
        script: "[NOME], parabéns pela decisão que vai mudar sua vida! Seu contrato está confirmado e sua jornada de transformação começou oficialmente! 🚀\n\nAgora, a [NOME DA CS], nossa anja da guarda do pós-venda, vai cuidar de você em cada detalhe até o dia da sua cirurgia e depois dela.\n\nEla vai te adicionar em um grupo exclusivo no WhatsApp e te passar todas as orientações sobre exames, preparativos e o que mais você precisar.\n\nA Unique inteira está com você!"
      },
      {
        action: "Notificar CS em até 1 hora após fechamento",
        description: "SLA de passagem de bastão.",
        sla: "1 hora",
        script: "🎉 NOVA PACIENTE CIRÚRGICA!\n\nPaciente: [NOME]\nWhatsApp: [NÚMERO]\nCirurgia: [NOME DA CIRURGIA]\nData da Cirurgia: [DATA]\n\nContrato assinado e entrada paga. Dossiê completo no CRM.\n\nPor favor, iniciar o onboarding em até 1 hora."
      }
    ],
    dossier: {
      title: "Dossiê de Pré-Operatório",
      fields: [
        "Nome completo",
        "Data do fechamento",
        "Cirurgião",
        "Data da cirurgia agendada",
        "Procedimentos",
        "Tipo de anestesia",
        "Pacote contratado",
        "Forma de pagamento",
        "Necessidades especiais",
        "Perfil emocional"
      ]
    },
    transitionScript: "[NOME], parabéns pela decisão que vai mudar sua vida! Seu contrato está confirmado e sua jornada de transformação começou oficialmente! 🚀\n\nAgora, a [NOME DA CS], nossa anja da guarda do pós-venda, vai cuidar de você em cada detalhe até o dia da sua cirurgia e depois dela.\n\nEla vai te adicionar em um grupo exclusivo no WhatsApp e te passar todas as orientações sobre exames, preparativos e o que mais você precisar.\n\nA Unique inteira está com você!",
    notificationTemplate: "🎉 NOVA PACIENTE CIRÚRGICA!\n\nPaciente: [NOME]\nWhatsApp: [NÚMERO]\nCirurgia: [NOME DA CIRURGIA]\nData da Cirurgia: [DATA]\n\nContrato assinado e entrada paga. Dossiê completo no CRM.\n\nPor favor, iniciar o onboarding em até 1 hora."
  },
  {
    stageId: 3,
    title: "Comercial 3 - Customer Success",
    mission: "Garantir a melhor experiência do paciente desde o fechamento até a alta, maximizando satisfação, NPS e indicações.",
    objective: "Transformar pacientes cirúrgicos em promotores da marca através de experiência excepcional.",
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
  {
    stageId: 4,
    title: "Comercial 4 - Farmer",
    mission: "Cultivar relacionamento de longo prazo com pacientes, maximizando LTV através de recompras, indicações e embaixadorismo.",
    objective: "Transformar pacientes em embaixadoras e gerar novas oportunidades de negócio.",
    actions: [
      {
        action: "Receber dossiê de Alta do CS",
        description: "Revisar histórico completo da paciente."
      },
      {
        action: "Adicionar à cadência de relacionamento em 24h",
        description: "Incluir paciente no fluxo de cultivo.",
        sla: "24 horas"
      },
      {
        action: "Mapear histórico completo de procedimentos",
        description: "Conhecer toda a jornada da paciente."
      },
      {
        action: "Manter contato em datas importantes (aniversário)",
        description: "Enviar mensagens personalizadas em datas especiais.",
        tips: [
          "Aniversário da paciente",
          "Aniversário da cirurgia",
          "Datas comemorativas",
          "Natal, Dia das Mães, etc."
        ]
      },
      {
        action: "Enviar conteúdos exclusivos e novidades",
        description: "Manter paciente informada e engajada."
      },
      {
        action: "Apresentar novos protocolos e procedimentos",
        description: "Oferecer novidades relevantes para a paciente."
      },
      {
        action: "Incentivar programa de Embaixadores",
        description: "Convidar pacientes especiais para o programa."
      },
      {
        action: "Coletar depoimentos Google e Vídeo",
        description: "Solicitar depoimentos de pacientes satisfeitas."
      },
      {
        action: "Identificar interesse em novo procedimento",
        description: "Detectar oportunidades de reativação."
      },
      {
        action: "Qualificar interesse antes de reativar",
        description: "Entender profundidade do interesse."
      },
      {
        action: "Preencher Dossiê de Reativação",
        description: "Documentar informações para SDR/Closer.",
        checklist: [
          "Histórico completo da paciente",
          "Novo procedimento de interesse",
          "Objeções e dúvidas levantadas"
        ]
      },
      {
        action: "Enviar mensagem de transição para paciente",
        description: "Preparar paciente para nova jornada.",
        script: "[NOME], que ótimo saber que você está pensando em [NOVO PROCEDIMENTO]! ✨\n\nPara te dar a melhor orientação, vou pedir para a [NOME DA SDR/CLOSER], nossa especialista nesse procedimento, entrar em contato com você.\n\nEla vai te explicar tudo em detalhes e montar um plano especial para você, que já é da casa!\n\nPode aguardar o contato dela?"
      },
      {
        action: "Notificar SDR/Closer em até 1h para reativação",
        description: "SLA de passagem de bastão para reativação.",
        sla: "1 hora",
        script: "🔥 OPORTUNIDADE DE REATIVAÇÃO!\n\nPaciente: [NOME]\nWhatsApp: [NÚMERO]\nInteresse: [NOVO PROCEDIMENTO]\n\nPaciente da base, cultivada pelo Farmer. Dossiê completo no CRM.\n\nPor favor, entrar em contato em até 1 hora."
      }
    ],
    dossier: {
      title: "Dossiê de Reativação",
      fields: [
        "Histórico completo da paciente",
        "Procedimentos anteriores",
        "Novo procedimento de interesse",
        "Objeções e dúvidas levantadas",
        "Potencial de fechamento"
      ]
    },
    transitionScript: "[NOME], que ótimo saber que você está pensando em [NOVO PROCEDIMENTO]! ✨\n\nPara te dar a melhor orientação, vou pedir para a [NOME DA SDR/CLOSER], nossa especialista nesse procedimento, entrar em contato com você.\n\nEla vai te explicar tudo em detalhes e montar um plano especial para você, que já é da casa!\n\nPode aguardar o contato dela?",
    notificationTemplate: "🔥 OPORTUNIDADE DE REATIVAÇÃO!\n\nPaciente: [NOME]\nWhatsApp: [NÚMERO]\nInteresse: [NOVO PROCEDIMENTO]\n\nPaciente da base, cultivada pelo Farmer. Dossiê completo no CRM.\n\nPor favor, entrar em contato em até 1 hora."
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
