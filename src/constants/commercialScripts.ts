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
  // SDR - Atendimento de Leads Inbound
  // ============================================
  {
    stageId: 1,
    stageKey: "sdr",
    title: "SDR - Atendimento de Leads Inbound",
    mission: "Atender leads que chegam através de tráfego pago, orgânico e indicações, qualificando-os e convertendo em consultas agendadas.",
    objective: "Transformar leads inbound em consultas pagas e agendadas.",
    teamGoal: {
      meta3: "R$ 52.206 (Equipe SDR + Social Selling)",
      meta3Individual: "R$ 26.103",
      members: ["Ana Paula", "Ketley"]
    },
    kpis: [
      "Nº de Leads Atendidos (inbound)",
      "Taxa de Conversão (Lead → Consulta Agendada)",
      "Tempo de Primeira Resposta (meta: < 5 minutos)",
      "Nº de Follow-ups por Lead"
    ],
    actions: [
      {
        action: "Receber leads de tráfego pago, orgânico e indicações",
        description: "Leads que chegam através de anúncios, buscas ou indicações de pacientes.",
        tips: [
          "Leads de tráfego pago: resposta imediata é crucial",
          "Leads de indicação: mencionar quem indicou",
          "Leads orgânicos: entender como encontraram a clínica"
        ]
      },
      {
        action: "Responder lead em até 5 minutos",
        description: "A velocidade de resposta é o principal fator de conversão. Lead que espera, esfria.",
        sla: "5 minutos",
        script: "Olá, [NOME]! Tudo bem? 😊\n\nSou [SEU NOME] da Unique Plástica Avançada!\n\nVi que você tem interesse em [PROCEDIMENTO]. Que maravilha! Esse é o primeiro passo para realizar seu sonho de transformação.\n\nPosso te fazer algumas perguntinhas rápidas para entender melhor o que você busca?",
        tips: [
          "Configurar notificações do CRM no celular",
          "Manter WhatsApp Web sempre aberto",
          "Usar templates de resposta rápida",
          "Nunca deixar lead sem resposta"
        ]
      },
      {
        action: "Qualificação BANT: Budget, Authority, Need, Timeline",
        description: "Entender se o lead tem potencial real de fechamento.",
        checklist: [
          "B - Budget: Tem condições de investir? Já pesquisou valores?",
          "A - Authority: Decide sozinha ou precisa consultar alguém?",
          "N - Need: Qual a dor/sonho principal? O que quer mudar?",
          "T - Timeline: Tem urgência? Quando pretende realizar?"
        ],
        tips: [
          "Não perguntar diretamente sobre dinheiro",
          "Identificar se há influenciadores na decisão",
          "Entender a profundidade da dor/sonho",
          "Criar urgência se não houver timeline definida"
        ]
      },
      {
        action: "Identificar procedimento de interesse e expectativas",
        description: "Mapear exatamente o que a paciente busca.",
        script: "Me conta mais sobre o que você gostaria de mudar? Qual é o resultado que você sonha alcançar?",
        checklist: [
          "Procedimento principal de interesse",
          "Procedimentos secundários (combo)",
          "Expectativa de resultado",
          "Referências visuais (se tiver)"
        ]
      },
      {
        action: "Aplicar técnica de espelhamento emocional",
        description: "Conectar com as emoções da paciente para criar rapport.",
        script: "Entendo perfeitamente como você se sente, [NOME]. Muitas das nossas pacientes também tinham essa mesma insegurança antes de realizarem a transformação. E sabe o que elas dizem depois? Que o único arrependimento foi não ter feito antes!",
        tips: [
          "Repetir palavras-chave que a paciente usa",
          "Validar sentimentos antes de apresentar soluções",
          "Usar histórias de pacientes similares",
          "Criar conexão genuína, não apenas vender"
        ]
      },
      {
        action: "Apresentar diferenciais Unique (Método CPI)",
        description: "Destacar os métodos exclusivos que justificam o investimento.",
        script: "Aqui na Unique, desenvolvemos o Método CPI - Cirurgia Plástica Integrativa. São 7 pilares que preparam seu corpo e mente para resultados muito superiores:\n\n1. Avaliação nutricional personalizada\n2. Preparação psicológica\n3. Fisioterapia pré-operatória\n4. Cirurgia com técnicas avançadas\n5. Recuperação otimizada (Método 3R)\n6. Acompanhamento pós-op intensivo\n7. Resultados naturais e duradouros\n\nIsso garante mais segurança, menos inchaço, recuperação mais rápida e resultados que você vai amar!",
        tips: [
          "Adaptar os pilares ao procedimento de interesse",
          "Enfatizar segurança e resultados",
          "Diferenciar da concorrência sem criticar"
        ]
      },
      {
        action: "Apresentar Unique Travel (pacientes de fora)",
        description: "Suporte completo para pacientes que vêm de outras cidades.",
        script: "Você é de [CIDADE]? Temos o programa Unique Travel, que cuida de tudo para você: indicação de hospedagem parceira, transfers, acompanhamento especial no pós-operatório. Tudo para que você realize seu sonho com tranquilidade, mesmo estando longe de casa!",
        checklist: [
          "Identificar cidade/estado de origem",
          "Explicar suporte de hospedagem",
          "Mencionar acompanhamento diferenciado",
          "Oferecer orientações de viagem"
        ]
      },
      {
        action: "Quebrar objeções de agendamento",
        description: "Superar barreiras para o agendamento da consulta.",
        tips: [
          "'Está caro a consulta' → 'A consulta é um investimento. Nela você terá uma avaliação completa com o Dr. André, projeto personalizado da sua cirurgia, e todas as informações para tomar a melhor decisão. É o primeiro passo para realizar seu sonho com segurança.'",
          "'Vou pensar' → 'Entendo, é uma decisão importante. Mas preciso te avisar que a agenda do Dr. André está muito concorrida. Hoje tenho um horário especial disponível para você. Posso reservar sem compromisso?'",
          "'Preciso ver com meu marido' → 'Que ótimo que você quer compartilhar com ele! Inclusive, ele pode vir junto na consulta. Assim vocês tiram todas as dúvidas juntos.'"
        ]
      },
      {
        action: "Criar urgência genuína para agendamento",
        description: "Motivar a ação imediata sem pressão agressiva.",
        script: "Olha, [NOME], a agenda do Dr. André está bem concorrida para os próximos meses. Mas consegui ver aqui um horário especial disponível para [DATA]. Esse horário costuma ser disputado. Posso reservar para você?",
        tips: [
          "Usar escassez real (agenda limitada)",
          "Oferecer horários específicos",
          "Não pressionar, mas criar senso de oportunidade"
        ]
      },
      {
        action: "Agendar consulta e enviar link de pagamento",
        description: "Fechar o agendamento e garantir confirmação financeira.",
        script: "Perfeito, [NOME]! Sua consulta está agendada para [DATA] às [HORA].\n\nVou te enviar agora o link para confirmar sua reserva. Assim que o pagamento for confirmado, sua vaga fica garantida e você receberá todas as orientações para o dia da consulta.\n\nQualquer dúvida, estou por aqui!",
        checklist: [
          "Verificar disponibilidade na agenda",
          "Confirmar data e horário com paciente",
          "Gerar link de pagamento (Asaas)",
          "Enviar confirmação por WhatsApp"
        ],
        sla: "Enviar link em até 2 minutos após confirmação verbal"
      },
      {
        action: "Follow-up se pagamento não confirmado em 30 min",
        description: "Garantir que o lead não esfrie após manifestar interesse.",
        script: "Oi, [NOME]! Tudo bem? 😊\n\nVi que você ainda não conseguiu confirmar sua consulta. Aconteceu alguma coisa? Posso te ajudar com alguma dúvida?\n\nSeu horário ainda está reservado, mas preciso de uma confirmação para garantir sua vaga!",
        sla: "30 minutos após envio do link"
      },
      {
        action: "Preencher Dossiê de Qualificação completo",
        description: "Documentar todas as informações do lead para passagem de bastão.",
        checklist: [
          "Nome completo",
          "WhatsApp (com DDD)",
          "Instagram",
          "Cidade/Estado",
          "Origem do lead (anúncio, orgânico, indicação)",
          "Se indicação: nome de quem indicou",
          "Dor principal (o que incomoda)",
          "Sonho (resultado esperado)",
          "Procedimento(s) de interesse",
          "Nível de urgência (alto/médio/baixo)",
          "Influenciadores na decisão (marido, família)",
          "Condição financeira percebida",
          "Observações relevantes",
          "Data e horário da consulta"
        ]
      },
      {
        action: "Confirmar pagamento no Asaas",
        description: "Verificar que o pagamento foi processado antes de passar o lead.",
        sla: "Antes de passar para Closer",
        tips: [
          "Não passar lead sem pagamento confirmado",
          "Se demorar, entrar em contato para verificar"
        ]
      },
      {
        action: "Enviar mensagem de transição para paciente",
        description: "Preparar o paciente para o próximo atendimento.",
        script: "Parabéns, [NOME]! 🎉 Sua consulta está CONFIRMADA!\n\nVocê deu o passo mais importante na sua jornada de transformação. Estamos muito felizes em te receber!\n\nAgora, a [NOME DA CLOSER], nossa especialista em planejamento cirúrgico, vai entrar em contato para te dar as boas-vindas e te acompanhar até o dia da sua consulta.\n\nEla já tem todas as informações da nossa conversa e vai te chamar em breve!\n\nSeja muito bem-vinda à família Unique! 💛"
      },
      {
        action: "Notificar Closer com dossiê completo",
        description: "Enviar todas as informações para o Closer assumir.",
        script: "🚀 NOVA CONSULTA AGENDADA!\n📍 Origem: SDR (Lead Inbound)\n\n👤 Paciente: [NOME]\n📱 WhatsApp: [NÚMERO]\n📸 Instagram: [@INSTAGRAM]\n📍 Cidade: [CIDADE/ESTADO]\n📅 Data da Consulta: [DATA E HORA]\n\n📋 DOSSIÊ DE QUALIFICAÇÃO:\n• Origem: [Anúncio/Orgânico/Indicação de NOME]\n• Dor Principal: [DOR]\n• Sonho: [SONHO]\n• Procedimento(s): [PROCEDIMENTO]\n• Urgência: [ALTO/MÉDIO/BAIXO]\n• Influenciadores: [Se houver]\n• Observações: [PONTOS RELEVANTES]\n\n⏰ SLA: Entrar em contato para boas-vindas em até 2 horas.",
        sla: "Passar lead em até 2 horas após confirmação de pagamento"
      }
    ],
    dossier: {
      title: "Dossiê de Qualificação SDR",
      fields: [
        "Nome completo",
        "WhatsApp (com DDD)",
        "Instagram",
        "Cidade/Estado",
        "Origem do lead",
        "Se indicação: nome de quem indicou",
        "Dor principal",
        "Sonho/resultado esperado",
        "Procedimento(s) de interesse",
        "Nível de urgência",
        "Influenciadores na decisão",
        "Condição financeira percebida",
        "Observações relevantes",
        "Data e horário da consulta"
      ]
    },
    transitionScript: "Parabéns, [NOME]! 🎉 Sua consulta está CONFIRMADA!\n\nVocê deu o passo mais importante na sua jornada de transformação. Estamos muito felizes em te receber!\n\nAgora, a [NOME DA CLOSER], nossa especialista em planejamento cirúrgico, vai entrar em contato para te dar as boas-vindas e te acompanhar até o dia da sua consulta.\n\nEla já tem todas as informações da nossa conversa e vai te chamar em breve!\n\nSeja muito bem-vinda à família Unique! 💛",
    notificationTemplate: "🚀 NOVA CONSULTA AGENDADA!\n📍 Origem: SDR (Lead Inbound)\n\n👤 Paciente: [NOME]\n📱 WhatsApp: [NÚMERO]\n📅 Data da Consulta: [DATA E HORA]\n\n📋 DOSSIÊ:\n• Dor: [DOR]\n• Sonho: [SONHO]\n• Procedimento: [PROCEDIMENTO]\n• Urgência: [NÍVEL]\n\n⏰ SLA: Boas-vindas em até 2 horas.",
    supervisionChecklist: [
      "Ouvir 5 ligações de qualificação",
      "Verificar tempo de primeira resposta de cada lead",
      "Analisar taxa de conversão lead → consulta",
      "Conferir qualidade dos dossiês preenchidos",
      "Verificar se follow-ups estão sendo feitos"
    ],
    interventions: [
      { condition: "Tempo de resposta > 5 min", action: "Verificar carga de trabalho e redistribuir leads" },
      { condition: "Taxa de qualificação baixa", action: "Revisar critérios de qualificação e scripts" },
      { condition: "Taxa de agendamento baixa", action: "Treinar técnicas de fechamento de agendamento" }
    ]
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
    mission: "Transformar leads qualificados em clientes efetivos, negociando e fechando acordos de forma eficiente, alinhada aos valores e metas da Unique.",
    objective: "Transformar consultas realizadas em cirurgias fechadas.",
    teamGoal: {
      meta3: "R$ 2.134.513",
      meta3Individual: "R$ 1.067.256",
      members: ["Larissa", "Bianca"]
    },
    kpis: [
      "Taxa de Comparecimento à Consulta",
      "Taxa de Conversão (Consulta → Cirurgia Fechada) - Meta: ≥ 50%",
      "Ticket Médio por Cirurgia",
      "Valor Total Vendido (R$)",
      "Uso correto da política de descontos"
    ],
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
