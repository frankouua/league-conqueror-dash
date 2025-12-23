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
  title: string;
  description: string;
  attributes: {
    title: string;
    items: string[];
  }[];
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
}

export const COORDINATOR_DATA: CoordinatorData = {
  title: "Coordenador Comercial",
  description: "Responsável por liderar, desenvolver e garantir a performance do time comercial, assegurando o atingimento das metas e a excelência no atendimento ao paciente.",
  attributes: [
    {
      title: "Liderança e Gestão de Pessoas",
      items: [
        "Liderar e motivar o time comercial (SDR, Closer, CS, Farmer)",
        "Realizar feedbacks individuais semanais",
        "Desenvolver planos de desenvolvimento individual (PDI)",
        "Resolver conflitos e alinhar expectativas",
        "Conduzir processos seletivos e onboarding de novos membros",
        "Garantir clima positivo e engajamento da equipe"
      ]
    },
    {
      title: "Gestão de Performance",
      items: [
        "Acompanhar indicadores de cada membro do time diariamente",
        "Identificar gaps de performance e criar planos de ação",
        "Garantir cumprimento de SLAs em todas as etapas",
        "Realizar análises de funil e propor melhorias",
        "Acompanhar metas individuais e coletivas",
        "Gerar relatórios de performance para diretoria"
      ]
    },
    {
      title: "Processos e Qualidade",
      items: [
        "Garantir padronização dos processos comerciais",
        "Auditar dossiês e passagens de bastão",
        "Validar qualidade das abordagens e scripts",
        "Propor e implementar melhorias nos processos",
        "Manter documentação atualizada",
        "Treinar equipe em novos processos"
      ]
    },
    {
      title: "Interface com Outras Áreas",
      items: [
        "Alinhar com Marketing sobre qualidade dos leads",
        "Reportar para Diretoria resultados e projeções",
        "Integrar com área Clínica sobre agenda e procedimentos",
        "Comunicar com Financeiro sobre metas e comissões",
        "Participar de reuniões estratégicas da empresa"
      ]
    }
  ],
  metrics: [
    {
      name: "Taxa de Conversão Geral",
      description: "Percentual de leads que se tornaram pacientes",
      formula: "(Pacientes Operados / Leads Recebidos) × 100",
      target: "≥ 15%"
    },
    {
      name: "Tempo Médio de Resposta",
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
      name: "Ticket Médio",
      description: "Valor médio por procedimento fechado",
      target: "Acompanhar tendência mensal"
    },
    {
      name: "NPS do Comercial",
      description: "Satisfação do paciente com atendimento comercial",
      target: "≥ 70"
    },
    {
      name: "SLA de Passagem de Bastão",
      description: "Cumprimento dos prazos de transição entre etapas",
      target: "≥ 95%"
    }
  ],
  rituals: [
    {
      name: "Daily Comercial",
      frequency: "Diário - 9h",
      description: "Alinhamento rápido do time sobre prioridades do dia",
      participants: ["Coordenador", "SDRs", "Closers", "CS", "Farmer"],
      agenda: [
        "Resultados do dia anterior",
        "Leads prioritários do dia",
        "Bloqueios e pendências",
        "Agenda de cirurgias da semana"
      ]
    },
    {
      name: "1:1 Individual",
      frequency: "Semanal",
      description: "Feedback e desenvolvimento individual de cada membro",
      participants: ["Coordenador", "Colaborador"],
      agenda: [
        "Como você está? (pessoal e profissional)",
        "Revisão de metas e indicadores",
        "Feedback de comportamentos",
        "PDI e próximos passos"
      ]
    },
    {
      name: "Reunião de Resultados",
      frequency: "Semanal - Sexta 17h",
      description: "Análise de performance e planejamento da próxima semana",
      participants: ["Coordenador", "Time Comercial"],
      agenda: [
        "Resultados da semana vs meta",
        "Top 3 vitórias",
        "Top 3 aprendizados",
        "Plano de ação para próxima semana"
      ]
    },
    {
      name: "Treinamento Comercial",
      frequency: "Quinzenal",
      description: "Capacitação em técnicas de vendas e produto",
      participants: ["Coordenador", "Time Comercial"],
      agenda: [
        "Role play de objeções",
        "Novos procedimentos/produtos",
        "Cases de sucesso",
        "Técnicas de negociação"
      ]
    },
    {
      name: "Reunião com Diretoria",
      frequency: "Semanal",
      description: "Report de resultados e alinhamento estratégico",
      participants: ["Coordenador", "Diretoria"],
      agenda: [
        "Dashboard de resultados",
        "Projeção do mês",
        "Riscos e oportunidades",
        "Necessidades do time"
      ]
    }
  ],
  tools: [
    {
      name: "CRM (Feegow/Pipedrive)",
      purpose: "Gestão de leads e pipeline comercial",
      usage: "Acompanhar status de cada lead, verificar SLAs, analisar funil"
    },
    {
      name: "Dashboard de Performance",
      purpose: "Visualização de métricas em tempo real",
      usage: "Monitorar KPIs diários, identificar desvios, tomar decisões"
    },
    {
      name: "WhatsApp Business",
      purpose: "Comunicação com pacientes e equipe",
      usage: "Supervisionar atendimentos, responder escalações"
    },
    {
      name: "Planilha de Metas",
      purpose: "Controle de metas individuais e coletivas",
      usage: "Atualizar semanalmente, compartilhar com time"
    },
    {
      name: "Agenda Clínica",
      purpose: "Verificar disponibilidade de consultas e cirurgias",
      usage: "Planejar capacidade, evitar overbooking"
    },
    {
      name: "Sistema de Gravação de Ligações",
      purpose: "Auditoria e treinamento",
      usage: "Escutar ligações, dar feedback, identificar padrões"
    }
  ],
  managementTips: [
    {
      category: "Motivação do Time",
      tips: [
        "Celebre todas as vitórias, pequenas e grandes",
        "Reconheça publicamente os destaques",
        "Crie competições saudáveis com prêmios",
        "Mantenha o ambiente leve, mas focado",
        "Escute as dificuldades e ajude a resolver"
      ]
    },
    {
      category: "Gestão de Baixa Performance",
      tips: [
        "Identifique a causa raiz (falta de skill, vontade ou processo)",
        "Crie plano de ação com metas claras e prazos",
        "Acompanhe de perto com 1:1s mais frequentes",
        "Documente todas as conversas e acordos",
        "Seja transparente sobre consequências"
      ]
    },
    {
      category: "Comunicação Efetiva",
      tips: [
        "Seja claro e direto nas orientações",
        "Use dados para embasar feedbacks",
        "Pratique escuta ativa",
        "Adapte o estilo de comunicação para cada pessoa",
        "Mantenha canais abertos para dúvidas"
      ]
    },
    {
      category: "Priorização",
      tips: [
        "Foque no que gera mais impacto nas metas",
        "Delegue tarefas operacionais quando possível",
        "Reserve tempo para desenvolvimento do time",
        "Evite microgerenciamento",
        "Proteja seu tempo para tarefas estratégicas"
      ]
    }
  ],
  escalationProtocol: [
    {
      situation: "Lead VIP ou indicação importante",
      action: "Assumir acompanhamento pessoal ou designar membro sênior",
      sla: "Imediato"
    },
    {
      situation: "Reclamação de paciente sobre atendimento",
      action: "Investigar, dar feedback ao colaborador, retornar ao paciente",
      sla: "2 horas"
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
    },
    {
      situation: "Oportunidade de fechamento alto valor",
      action: "Apoiar Closer na negociação, liberar condições especiais se necessário",
      sla: "Imediato"
    }
  ]
};

// Helper para buscar script de uma ação específica
export const getActionScript = (stageId: number, actionText: string): ActionScript | undefined => {
  const stage = COMMERCIAL_SCRIPTS.find(s => s.stageId === stageId);
  if (!stage) return undefined;
  return stage.actions.find(a => a.action === actionText);
};
