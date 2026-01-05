// Informações detalhadas sobre cada cargo comercial

export interface PositionInfo {
  label: string;
  description: string;
  mission: string;
  focus: string[];
  kpis: { metric: string; target: string }[];
  dailySchedule: { time: string; activity: string }[];
  bestPractices: string[];
  scripts: { title: string; content: string }[];
  values: string[];
}

export const POSITION_DETAILS: Record<string, PositionInfo> = {
  sdr: {
    label: "SDR - Captação de Leads",
    description: "Sales Development Representative - Responsável por qualificar leads e agendar consultas.",
    mission: "Transformar leads em consultas agendadas e qualificadas. Você NÃO vende a cirurgia, você vende a CONSULTA (Unique Day).",
    focus: [
      "Tempo de primeira resposta (< 5 minutos)",
      "Leads qualificados por dia",
      "Consultas agendadas",
      "Atualização do CRM"
    ],
    kpis: [
      { metric: "Tentativas de contato/dia", target: "50+" },
      { metric: "Conversas iniciadas/dia", target: "15+" },
      { metric: "Consultas agendadas/dia", target: "3+" },
      { metric: "Taxa de resposta", target: ">40%" },
      { metric: "Tempo primeira resposta", target: "< 5 min" }
    ],
    dailySchedule: [
      { time: "08:00 - 08:30", activity: "Check-in: Verificar novos leads da noite" },
      { time: "08:30 - 09:00", activity: "Ligações urgentes: Leads das últimas 12h" },
      { time: "09:00 - 10:30", activity: "Bloco de prospecção: Ligações e WhatsApp" },
      { time: "10:30 - 11:00", activity: "Follow-up D+1: Leads sem resposta de ontem" },
      { time: "11:00 - 12:00", activity: "Qualificação: Aprofundar conversas" },
      { time: "13:00 - 13:30", activity: "Atualização CRM: Registrar interações" },
      { time: "13:30 - 15:00", activity: "Bloco de ligações: Horário nobre" },
      { time: "15:00 - 16:00", activity: "Follow-up D+3 e D+5: Cadência de nutrição" },
      { time: "16:00 - 17:00", activity: "Agendamentos: Confirmar consultas" },
      { time: "17:00 - 18:00", activity: "Check-out: Preparar próximo dia" }
    ],
    bestPractices: [
      "Leads respondidos em até 5 minutos têm 9x mais chances de conversão",
      "LIGUE PRIMEIRO, depois mande WhatsApp",
      "Antes de ligar, pesquise o lead (Instagram, formulário)",
      "Use gatilhos emocionais e provas sociais",
      "Sempre atualize o CRM após cada interação",
      "Follow-up é a chave: D+1, D+3, D+5, D+7"
    ],
    scripts: [
      {
        title: "Primeiro Contato",
        content: "Oi, [Nome]! Tudo bem?\n\nQuem está falando aqui é [Seu Nome], da Unique Plástica Avançada.\n\nPrimeiro, quero te agradecer por confiar em nós nesse momento tão especial da sua jornada.\n\nFique tranquila, é um bate papo rápido para entender um pouquinho melhor sobre você, para podermos te direcionar para o profissional e o plano que mais combinam com seus sonhos, combinado?"
      },
      {
        title: "Lead Não Atendeu (WhatsApp)",
        content: "Oi, [Nome]! 💛\n\nTentei te ligar mas não consegui falar com você.\n\nVi que você demonstrou interesse em [Procedimento].\n\nMe conta: o que te motivou a buscar essa transformação? Algum incômodo ou sonho antigo?\n\nEstou aqui para te ajudar! 😊"
      },
      {
        title: "Apresentar Unique Day",
        content: "Pelo que você me contou, você tem uma história linda e um sonho verdadeiro.\n\nAqui na Unique, somos referência nacional em Cirurgia Plástica Integrativa.\n\nPor isso criamos o UNIQUE DAY – nossa consulta completa onde você vai:\n✅ Passar por uma análise estética e funcional\n✅ Receber orientações personalizadas\n✅ Conhecer os caminhos para alcançar seu resultado\n✅ Receber um diagnóstico completo\n\nFaz sentido para você viver essa jornada de transformação?"
      },
      {
        title: "Fechamento de Agendamento",
        content: "Nossa agenda é bastante disputada e temos uma fila de espera ativa.\n\nPosso verificar um horário exclusivo para você agora?\n\nVocê prefere presencial na clínica ou online?\n\n[APÓS ESCOLHA]\nPerfeito! Tenho horário [DATA] às [HORA]. Fica bom para você?"
      }
    ],
    values: [
      "⚡ Proatividade: Não dê desculpas, faça acontecer",
      "🤝 Conexão: Trate cada cliente como família",
      "😊 Energia: Sorrir com a voz é pré-requisito",
      "📂 Organização: Boa gestão = mais conversões",
      "🎯 Resolutividade: Para cada desafio, apresente soluções"
    ]
  },
  comercial_1_captacao: {
    label: "Comercial 1 - Captação",
    description: "Responsável por trazer novos leads e oportunidades para a clínica através de diversos canais.",
    mission: "Gerar oportunidades qualificadas e garantir o primeiro encantamento do paciente com a Unique.",
    focus: [
      "Indicações coletadas",
      "Leads convertidos em consultas",
      "Primeira impressão do paciente",
      "Nutrição de leads frios"
    ],
    kpis: [
      { metric: "Indicações coletadas/mês", target: "10+" },
      { metric: "Taxa de conversão indicação", target: ">50%" },
      { metric: "Novos leads gerados/semana", target: "20+" },
      { metric: "Consultas agendadas/semana", target: "15+" }
    ],
    dailySchedule: [
      { time: "08:00 - 09:00", activity: "Revisar leads novos e priorizar" },
      { time: "09:00 - 11:00", activity: "Prospecção ativa e ligações" },
      { time: "11:00 - 12:00", activity: "Follow-up de indicações pendentes" },
      { time: "13:00 - 15:00", activity: "Contato com leads quentes" },
      { time: "15:00 - 17:00", activity: "Nutrição de leads mornos" },
      { time: "17:00 - 18:00", activity: "Atualização de CRM e planejamento" }
    ],
    bestPractices: [
      "Sempre peça indicação após um atendimento positivo",
      "Mantenha relacionamento com pacientes antigos",
      "Use cases de sucesso como prova social",
      "Personalize cada abordagem ao perfil do lead",
      "Documente tudo no CRM imediatamente",
      "Responda leads novos em até 5 minutos"
    ],
    scripts: [
      {
        title: "Pedido de Indicação",
        content: "[Nome], que alegria saber que você está satisfeita com seu resultado!\n\nVocê conhece alguém que também sonha com uma transformação como a sua?\n\nQuando você indica alguém, além de ajudar uma amiga, vocês duas ganham benefícios especiais! 💝"
      },
      {
        title: "Follow-up Indicação",
        content: "Oi, [Nome]! A [Indicadora] me falou muito bem de você! 😊\n\nEla passou por uma transformação incrível aqui na Unique e disse que você também tem esse sonho.\n\nPosso te contar como funciona?"
      },
      {
        title: "Primeiro Contato - Lead Novo",
        content: "Oi, [Nome]! Tudo bem? 💛\n\nAqui é a [Seu Nome] da Unique Plástica Avançada!\n\nVi que você demonstrou interesse em [Procedimento].\n\nMe conta: o que te motivou a buscar essa transformação?"
      }
    ],
    values: [
      "🎯 Foco em relacionamento genuíno",
      "💡 Criatividade na abordagem",
      "🔄 Persistência com elegância",
      "📊 Organização impecável",
      "❤️ Empatia em cada contato"
    ]
  },
  comercial_2_closer: {
    label: "Comercial 2 - Closer",
    description: "Especialista em fechar vendas e converter consultas em procedimentos realizados.",
    mission: "Transformar pacientes qualificados em clientes realizados, garantindo a melhor experiência de compra.",
    focus: [
      "Taxa de conversão consulta → venda",
      "Valor médio de ticket",
      "Follow-up de propostas",
      "Negociação e fechamento"
    ],
    kpis: [
      { metric: "Taxa de conversão", target: ">40%" },
      { metric: "Ticket médio", target: "R$ 25.000+" },
      { metric: "Propostas enviadas/dia", target: "5+" },
      { metric: "Follow-up em aberto", target: "<48h" }
    ],
    dailySchedule: [
      { time: "08:00 - 09:00", activity: "Revisar propostas pendentes" },
      { time: "09:00 - 12:00", activity: "Atendimento de consultas" },
      { time: "13:00 - 14:00", activity: "Follow-up de propostas D+1" },
      { time: "14:00 - 17:00", activity: "Apresentações e negociações" },
      { time: "17:00 - 18:00", activity: "Fechamentos e contratos" }
    ],
    bestPractices: [
      "Entenda profundamente a dor do paciente antes de apresentar soluções",
      "Apresente o valor antes do preço",
      "Use urgência com ética (agenda limitada, condições especiais)",
      "Sempre tenha uma proposta pronta em mãos",
      "Follow-up agressivo nas primeiras 48h",
      "Nunca deixe o cliente sair sem próximo passo definido"
    ],
    scripts: [
      {
        title: "Apresentação de Proposta",
        content: "[Nome], com base em tudo que conversamos, preparei uma proposta especial para você.\n\nO investimento para realizar seu sonho de [Procedimento] é de R$ [Valor].\n\nIsso inclui:\n✅ Procedimento completo\n✅ Acompanhamento pós\n✅ Garantia de satisfação\n\nE tenho uma condição especial se fecharmos hoje..."
      },
      {
        title: "Quebra de Objeção - Preço",
        content: "Entendo sua preocupação com o valor.\n\nMas pense comigo: quanto vale para você olhar no espelho todos os dias e amar o que vê?\n\nAlém disso, parcelamos em até 24x, o que dá menos de R$ [Valor/24] por mês.\n\nÉ um investimento em você mesma, [Nome]. Você merece isso!"
      },
      {
        title: "Quebra de Objeção - Vou Pensar",
        content: "Claro, respeito seu tempo.\n\nMas preciso te avisar com carinho: nossa agenda é rotativa e temos filas em algumas agendas.\n\nPosso segurar seu horário por 24h sem compromisso, apenas para você não perder essa chance. Te reservo?"
      },
      {
        title: "Fechamento Final",
        content: "[Nome], pelo que conversamos, esse procedimento vai transformar sua vida.\n\nVocê está pronta para dar esse passo?\n\nPosso já fazer sua reserva e garantir as condições especiais de hoje?"
      }
    ],
    values: [
      "💪 Foco em resultado",
      "🎯 Persistência estratégica",
      "🤝 Negociação ganha-ganha",
      "📈 Mentalidade de crescimento",
      "✨ Excelência no atendimento"
    ]
  },
  comercial_3_experiencia: {
    label: "Comercial 3 - Experiência",
    description: "Garante a melhor experiência do paciente durante toda a jornada, do pré ao pós-procedimento.",
    mission: "Encantar o paciente em cada ponto de contato, gerando satisfação, indicações e depoimentos.",
    focus: [
      "NPS do paciente",
      "Depoimentos coletados",
      "Satisfação pós-procedimento",
      "Resolução de problemas"
    ],
    kpis: [
      { metric: "NPS médio", target: ">9" },
      { metric: "Depoimentos/mês", target: "10+" },
      { metric: "Taxa de resolução D+1", target: ">90%" },
      { metric: "Indicações geradas", target: "5+/mês" }
    ],
    dailySchedule: [
      { time: "08:00 - 09:00", activity: "Check pacientes em pós-operatório" },
      { time: "09:00 - 11:00", activity: "Ligações de acompanhamento" },
      { time: "11:00 - 12:00", activity: "Coleta de depoimentos" },
      { time: "13:00 - 15:00", activity: "Resolução de pendências" },
      { time: "15:00 - 17:00", activity: "Pesquisa NPS e feedback" },
      { time: "17:00 - 18:00", activity: "Planejamento de melhorias" }
    ],
    bestPractices: [
      "Ligue no D+1 e D+7 após procedimento",
      "Peça depoimento no momento de maior satisfação",
      "Transforme reclamações em oportunidades",
      "Surpreenda com pequenos gestos de carinho",
      "Documente toda interação no CRM",
      "Antecipe problemas antes que o paciente reclame"
    ],
    scripts: [
      {
        title: "Acompanhamento Pós-Procedimento D+1",
        content: "Oi, [Nome]! 💛\n\nAqui é a [Seu Nome] da Unique!\n\nPassando para saber como você está se sentindo após o procedimento.\n\nEstá tudo bem? Tem alguma dúvida ou precisa de algo?\n\nEstamos aqui para você! 🤗"
      },
      {
        title: "Acompanhamento D+7",
        content: "[Nome]! Como você está? 💛\n\nJá faz uma semana do seu procedimento!\n\nComo está se sentindo? Já está vendo diferença?\n\nQualquer coisa que precisar, estou aqui!"
      },
      {
        title: "Solicitação de Depoimento",
        content: "[Nome], estou tão feliz em ver sua evolução! 😍\n\nSeu resultado está incrível!\n\nVocê toparia gravar um depoimento curtinho contando sua experiência? Isso ajuda outras mulheres que têm o mesmo sonho que você tinha!\n\nPode ser pelo celular mesmo, bem natural! 📱"
      },
      {
        title: "Pesquisa NPS",
        content: "[Nome]! 💛\n\nDe 0 a 10, qual a chance de você recomendar a Unique para uma amiga?\n\nE o que mais te marcou na sua experiência conosco?"
      }
    ],
    values: [
      "❤️ Cuidado genuíno",
      "👂 Escuta ativa",
      "⚡ Agilidade na resolução",
      "✨ Atenção aos detalhes",
      "🌟 Superação de expectativas"
    ]
  },
  comercial_4_farmer: {
    label: "Comercial 4 - Farmer",
    description: "Cuida do relacionamento de longo prazo, gerando recompras e indicações de pacientes satisfeitos.",
    mission: "Nutrir e expandir o relacionamento com a base de pacientes, maximizando o lifetime value.",
    focus: [
      "Retenção de pacientes",
      "Taxa de recompra",
      "Indicações de clientes antigos",
      "Upsell e cross-sell"
    ],
    kpis: [
      { metric: "Recompras/mês", target: "5+" },
      { metric: "Indicações de antigos/mês", target: "10+" },
      { metric: "Contatos realizados/dia", target: "20+" },
      { metric: "Taxa de reativação", target: ">15%" }
    ],
    dailySchedule: [
      { time: "08:00 - 09:00", activity: "Revisar aniversariantes e datas especiais" },
      { time: "09:00 - 11:00", activity: "Contato com pacientes inativos" },
      { time: "11:00 - 12:00", activity: "Apresentação de novos procedimentos" },
      { time: "13:00 - 15:00", activity: "Follow-up de propostas de recompra" },
      { time: "15:00 - 17:00", activity: "Campanhas de relacionamento" },
      { time: "17:00 - 18:00", activity: "Atualização de base e CRM" }
    ],
    bestPractices: [
      "Lembre-se de datas importantes (aniversário, data do procedimento)",
      "Apresente novidades que fazem sentido para o perfil do paciente",
      "Crie exclusividade para clientes antigos",
      "Mantenha contato regular (mínimo trimestral)",
      "Peça indicações de forma natural e genuína",
      "Conheça o histórico completo antes de abordar"
    ],
    scripts: [
      {
        title: "Reativação de Paciente",
        content: "Oi, [Nome]! 💛\n\nAqui é a [Seu Nome] da Unique!\n\nFaz um tempo que não conversamos e lembrei de você!\n\nComo está o resultado do seu [Procedimento Anterior]?\n\nTemos algumas novidades que podem te interessar... posso te contar?"
      },
      {
        title: "Aniversário do Procedimento",
        content: "[Nome]! 🎉\n\nHoje faz 1 ano do seu procedimento!\n\nQue orgulho fazer parte dessa sua história de transformação!\n\nComo você está se sentindo? Conta pra gente! 💛"
      },
      {
        title: "Feliz Aniversário",
        content: "[Nome]! 🎂🎉\n\nFeliz aniversário!\n\nQue seu dia seja tão especial quanto você!\n\nComo presente, preparamos uma condição especial pra você. Quer saber mais? 💝"
      },
      {
        title: "Lançamento de Novo Procedimento",
        content: "[Nome]! 🌟\n\nLembrei de você porque lançamos um procedimento que é a sua cara!\n\n[Descrever brevemente o procedimento]\n\nE para pacientes especiais como você, temos condições exclusivas!\n\nPosso te contar mais?"
      }
    ],
    values: [
      "🌱 Cultivo de relacionamentos",
      "📅 Consistência no contato",
      "💡 Proatividade",
      "🎁 Criação de valor",
      "🔄 Foco no longo prazo"
    ]
  },
  coordenador: {
    label: "Coordenador",
    description: "Lidera e desenvolve a equipe comercial, garantindo o atingimento das metas coletivas.",
    mission: "Desenvolver pessoas e processos para maximizar os resultados da equipe.",
    focus: [
      "Performance da equipe",
      "Desenvolvimento de pessoas",
      "Metas coletivas",
      "Processos e qualidade"
    ],
    kpis: [
      { metric: "Meta da equipe", target: "100%" },
      { metric: "Feedbacks semanais", target: "1 por pessoa" },
      { metric: "Reuniões de equipe", target: "2/semana" },
      { metric: "Atingimento individual", target: ">80% time" }
    ],
    dailySchedule: [
      { time: "08:00 - 08:30", activity: "Check-in com equipe" },
      { time: "08:30 - 10:00", activity: "Acompanhamento de pipeline" },
      { time: "10:00 - 12:00", activity: "Suporte e coaching individual" },
      { time: "13:00 - 14:00", activity: "Reunião de alinhamento" },
      { time: "14:00 - 16:00", activity: "Análise de métricas e indicadores" },
      { time: "16:00 - 18:00", activity: "Planejamento e estratégia" }
    ],
    bestPractices: [
      "Lidere pelo exemplo sempre",
      "Dê feedback contínuo e construtivo",
      "Celebre as conquistas do time publicamente",
      "Identifique e desenvolva talentos",
      "Mantenha a equipe motivada e engajada",
      "Resolva conflitos rapidamente"
    ],
    scripts: [],
    values: [
      "👥 Liderança servidora",
      "📊 Foco em resultados",
      "🎯 Desenvolvimento de pessoas",
      "💪 Resiliência",
      "🌟 Inspiração"
    ]
  },
  gerente: {
    label: "Gerente",
    description: "Gestão estratégica da área comercial com foco em resultados e crescimento.",
    mission: "Definir estratégia, garantir execução e entregar resultados excepcionais.",
    focus: [
      "Resultados gerais da clínica",
      "Estratégia comercial",
      "Indicadores de negócio",
      "Crescimento sustentável"
    ],
    kpis: [
      { metric: "Faturamento mensal", target: "Meta definida" },
      { metric: "Margem de contribuição", target: ">60%" },
      { metric: "Crescimento YoY", target: ">20%" },
      { metric: "NPS geral", target: ">9" }
    ],
    dailySchedule: [
      { time: "08:00 - 09:00", activity: "Análise de resultados D-1" },
      { time: "09:00 - 11:00", activity: "Reuniões estratégicas" },
      { time: "11:00 - 12:00", activity: "Alinhamento com coordenação" },
      { time: "13:00 - 15:00", activity: "Planejamento e projetos" },
      { time: "15:00 - 17:00", activity: "Acompanhamento de indicadores" },
      { time: "17:00 - 18:00", activity: "Decisões e próximos passos" }
    ],
    bestPractices: [
      "Mantenha visão estratégica sempre",
      "Desenvolva a liderança intermediária",
      "Tome decisões baseadas em dados",
      "Comunique com clareza e transparência",
      "Celebre e reconheça resultados",
      "Antecipe problemas e oportunidades"
    ],
    scripts: [],
    values: [
      "🎯 Visão estratégica",
      "📈 Foco em crescimento",
      "👥 Desenvolvimento de líderes",
      "💡 Inovação",
      "🏆 Excelência"
    ]
  },
  assistente: {
    label: "Assistente",
    description: "Suporte operacional ao time comercial, garantindo organização e eficiência.",
    mission: "Dar suporte impecável para que a equipe comercial possa focar em vender.",
    focus: [
      "Organização de processos",
      "Suporte ao time",
      "Gestão de informações",
      "Eficiência operacional"
    ],
    kpis: [
      { metric: "Tarefas concluídas/dia", target: "20+" },
      { metric: "Tempo de resposta interna", target: "<1h" },
      { metric: "Erros operacionais", target: "0" },
      { metric: "Satisfação do time", target: ">9" }
    ],
    dailySchedule: [
      { time: "08:00 - 09:00", activity: "Organização do dia e prioridades" },
      { time: "09:00 - 12:00", activity: "Suporte às demandas do time" },
      { time: "13:00 - 15:00", activity: "Gestão de documentos e processos" },
      { time: "15:00 - 17:00", activity: "Acompanhamento de pendências" },
      { time: "17:00 - 18:00", activity: "Preparação para próximo dia" }
    ],
    bestPractices: [
      "Antecipe as necessidades do time",
      "Mantenha tudo organizado e acessível",
      "Seja proativo na comunicação",
      "Documente todos os processos",
      "Busque sempre melhorar a eficiência",
      "Priorize tarefas por urgência e impacto"
    ],
    scripts: [],
    values: [
      "📂 Organização impecável",
      "⚡ Agilidade",
      "🤝 Colaboração",
      "👁️ Atenção aos detalhes",
      "💪 Proatividade"
    ]
  },
  outro: {
    label: "Outro",
    description: "Função diversa na equipe comercial.",
    mission: "Contribuir para o sucesso da equipe dentro das suas responsabilidades.",
    focus: ["Objetivos específicos do cargo"],
    kpis: [{ metric: "Metas definidas", target: "100%" }],
    dailySchedule: [],
    bestPractices: [
      "Foque nas suas responsabilidades",
      "Colabore com o time",
      "Busque aprendizado contínuo"
    ],
    scripts: [],
    values: ["🎯 Foco", "🤝 Colaboração"]
  }
};
