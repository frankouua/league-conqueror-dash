import { useState, useEffect } from 'react';
import { 
  MessageSquare, Sparkles, ChevronRight, Copy, Send, 
  Zap, Clock, Heart, Star, Target, Check, Loader2,
  Lightbulb, TrendingUp, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CRMChatScriptsPanelProps {
  lead: CRMLead;
  onSelectTemplate: (message: string) => void;
  onClose?: () => void;
}

interface Template {
  id: string;
  title: string;
  message: string;
  stage?: string;
  tags?: string[];
}

interface AIScript {
  title: string;
  content: string;
  reasoning: string;
}

// Templates organizados por etapa do funil
const STAGE_TEMPLATES: Record<string, Template[]> = {
  'Novo Lead': [
    {
      id: 'nl1',
      title: 'Primeiro Contato',
      message: 'Olá {nome}! 👋 Vi que você demonstrou interesse em nossos procedimentos. Sou {vendedor} da Unique e estou aqui para te ajudar. Posso saber um pouco mais sobre o que você procura?',
      tags: ['primeiro contato', 'apresentação']
    },
    {
      id: 'nl2',
      title: 'Resposta Rápida',
      message: 'Olá {nome}! Obrigado pelo contato! 😊 Recebi sua mensagem e vou te ajudar com todas as informações. Me conta, qual procedimento você tem mais interesse?',
      tags: ['rápido', 'acolhimento']
    },
    {
      id: 'nl3',
      title: 'Campanha/Indicação',
      message: 'Oi {nome}! Que bom ter você aqui! 🎉 Vi que você veio através da nossa {origem}. Temos condições especiais para você! Posso te explicar mais?',
      tags: ['campanha', 'indicação']
    }
  ],
  'Qualificação': [
    {
      id: 'q1',
      title: 'Descoberta de Necessidades',
      message: '{nome}, para te ajudar melhor, me conta: Você já realizou algum procedimento estético antes? O que mais te incomoda hoje que gostaria de melhorar?',
      tags: ['descoberta', 'necessidades']
    },
    {
      id: 'q2',
      title: 'Verificar Urgência',
      message: 'Entendi seu interesse, {nome}! 💫 E quando você imagina realizar o procedimento? Tem alguma data especial em mente? Assim consigo te orientar melhor sobre o planejamento.',
      tags: ['urgência', 'timing']
    },
    {
      id: 'q3',
      title: 'Verificar Budget',
      message: '{nome}, nossos procedimentos têm várias opções de pagamento. Trabalhamos com parcelamento em até 12x. Você prefere à vista com desconto ou parcelado?',
      tags: ['orçamento', 'pagamento']
    }
  ],
  'Agendamento': [
    {
      id: 'a1',
      title: 'Oferecer Avaliação',
      message: '{nome}, que tal agendarmos uma avaliação gratuita? 📋 Assim você conhece nossa clínica, conversa com nosso especialista e tira todas as dúvidas pessoalmente. Qual dia fica melhor para você?',
      tags: ['avaliação', 'agenda']
    },
    {
      id: 'a2',
      title: 'Confirmar Horário',
      message: 'Perfeito, {nome}! Tenho disponibilidade para {data}. Posso confirmar seu horário? 📅 Vou te enviar o endereço e todas as orientações.',
      tags: ['confirmação', 'horário']
    },
    {
      id: 'a3',
      title: 'Lembrete de Consulta',
      message: 'Oi {nome}! 😊 Passando para lembrar da sua consulta amanhã às {horario}. Estamos te esperando! Qualquer dúvida, estou à disposição.',
      tags: ['lembrete', 'consulta']
    }
  ],
  'Proposta': [
    {
      id: 'p1',
      title: 'Enviar Proposta',
      message: '{nome}, preparei uma proposta personalizada para você! 📄 O investimento para {procedimento} fica em R$ {valor}, que pode ser parcelado em até 12x. Posso te enviar os detalhes?',
      tags: ['proposta', 'valor']
    },
    {
      id: 'p2',
      title: 'Condição Especial',
      message: '{nome}, tenho uma condição especial para você fechar ainda essa semana! 🔥 Desconto de 10% para pagamento à vista ou entrada + parcelamento facilitado. O que acha?',
      tags: ['urgência', 'desconto']
    },
    {
      id: 'p3',
      title: 'Esclarecer Dúvidas',
      message: 'Oi {nome}! Vi que você recebeu nossa proposta. Ficou alguma dúvida? Estou aqui para esclarecer tudo e ajudar na sua decisão! 💬',
      tags: ['follow-up', 'dúvidas']
    }
  ],
  'Negociação': [
    {
      id: 'n1',
      title: 'Flexibilizar Pagamento',
      message: '{nome}, entendo sua preocupação com o investimento. Posso verificar uma condição especial para você. Qual seria o valor de entrada que você consegue?',
      tags: ['negociação', 'pagamento']
    },
    {
      id: 'n2',
      title: 'Gatilho de Escassez',
      message: '{nome}, preciso te avisar que temos poucas vagas disponíveis para esse mês com essa condição especial. Se tiver interesse, me avisa que seguro para você! ⏰',
      tags: ['urgência', 'escassez']
    },
    {
      id: 'n3',
      title: 'Superar Objeção Preço',
      message: '{nome}, entendo que é um investimento. Mas pensa comigo: qual o valor de se sentir bem consigo mesma todos os dias? 💎 E nosso parcelamento cabe no bolso!',
      tags: ['objeção', 'valor percebido']
    }
  ],
  'Fechamento': [
    {
      id: 'f1',
      title: 'Confirmar Fechamento',
      message: 'Que notícia maravilhosa, {nome}! 🎉 Estou muito feliz em te ajudar nessa transformação! Vou te enviar o contrato e as orientações de pagamento.',
      tags: ['fechamento', 'contrato']
    },
    {
      id: 'f2',
      title: 'Próximos Passos',
      message: '{nome}, com o fechamento confirmado, os próximos passos são: 1️⃣ Assinatura do contrato 2️⃣ Exames pré-operatórios 3️⃣ Consulta pré-cirúrgica. Vou te acompanhar em cada etapa!',
      tags: ['orientação', 'próximos passos']
    }
  ],
  'Pós-Venda': [
    {
      id: 'pv1',
      title: 'Satisfação Pós-Procedimento',
      message: 'Oi {nome}! 💜 Como você está se sentindo após o procedimento? Espero que esteja tudo bem! Qualquer dúvida sobre os cuidados, estou aqui.',
      tags: ['pós-venda', 'satisfação']
    },
    {
      id: 'pv2',
      title: 'Pedir Indicação',
      message: '{nome}, fico muito feliz que você esteja satisfeita! 😊 Conhece alguém que também gostaria de fazer uma transformação? Temos condições especiais para indicações!',
      tags: ['indicação', 'referral']
    },
    {
      id: 'pv3',
      title: 'Solicitar Depoimento',
      message: '{nome}, sua opinião é muito importante para nós! 🌟 Você poderia compartilhar sua experiência em um depoimento? Ajuda muito outras pessoas que estão em dúvida!',
      tags: ['depoimento', 'prova social']
    }
  ]
};

// Templates gerais (não relacionados a etapas)
const GENERAL_TEMPLATES: Template[] = [
  {
    id: 'g1',
    title: '⏰ Horário de Funcionamento',
    message: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h, e sábados das 8h às 12h. Posso te ajudar a agendar um horário?',
    tags: ['informação', 'horário']
  },
  {
    id: 'g2',
    title: '📍 Endereço',
    message: 'Nossa clínica fica na {endereco}. Temos estacionamento próprio para sua comodidade. Posso te enviar a localização no mapa?',
    tags: ['informação', 'localização']
  },
  {
    id: 'g3',
    title: '💳 Formas de Pagamento',
    message: 'Trabalhamos com: ✅ PIX (5% de desconto) ✅ Cartão de crédito em até 12x ✅ Boleto bancário ✅ Financiamento próprio. Qual opção te interessa mais?',
    tags: ['pagamento', 'financeiro']
  },
  {
    id: 'g4',
    title: '👋 Retomada de Contato',
    message: 'Oi {nome}! Tudo bem? Faz um tempinho que conversamos... Ainda tem interesse no procedimento? Posso te atualizar sobre nossas novidades! 😊',
    tags: ['reativação', 'follow-up']
  }
];

export function CRMChatScriptsPanel({ lead, onSelectTemplate, onClose }: CRMChatScriptsPanelProps) {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('templates');
  const [aiScripts, setAiScripts] = useState<AIScript[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Determinar etapa atual do lead
  const currentStage = lead.stage?.name || 'Novo Lead';

  // Filtrar templates relevantes para a etapa atual
  const stageTemplates = STAGE_TEMPLATES[currentStage] || STAGE_TEMPLATES['Novo Lead'];

  // Gerar scripts com IA baseados no contexto do lead
  const generateAIScripts = async () => {
    setIsLoadingAI(true);
    try {
      const context = {
        leadName: lead.name,
        stage: currentStage,
        procedures: lead.interested_procedures?.join(', ') || 'Não especificado',
        sentiment: lead.ai_sentiment || 'neutral',
        daysInStage: lead.days_in_stage,
        isStale: lead.is_stale,
        source: lead.source,
        estimatedValue: lead.estimated_value,
        lastActivity: lead.last_activity_at
      };

      const { data, error } = await supabase.functions.invoke('crm-generate-scripts', {
        body: { context }
      });

      if (error) throw error;

      if (data?.scripts) {
        setAiScripts(data.scripts);
      }
    } catch (error: any) {
      console.error('Error generating AI scripts:', error);
      // Fallback para scripts estáticos caso a IA falhe
      setAiScripts([
        {
          title: 'Abordagem Personalizada',
          content: `Olá ${lead.name}! Notei que você está interessada em ${lead.interested_procedures?.[0] || 'nossos procedimentos'}. Posso te ajudar com mais informações?`,
          reasoning: 'Baseado nos procedimentos de interesse do lead'
        },
        {
          title: 'Reengajamento',
          content: `${lead.name}, ainda está pensando na transformação? Estou aqui para tirar qualquer dúvida! 😊`,
          reasoning: lead.is_stale ? 'Lead parado há alguns dias' : 'Manter engajamento'
        },
        {
          title: 'Próximo Passo',
          content: `${lead.name}, que tal darmos o próximo passo? Posso agendar uma avaliação para você conhecer melhor nosso trabalho!`,
          reasoning: 'Movimentar lead para próxima etapa'
        }
      ]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Gerar scripts de IA quando o painel abrir
  useEffect(() => {
    if (selectedTab === 'ai') {
      generateAIScripts();
    }
  }, [selectedTab]);

  // Substituir variáveis no template
  const parseTemplate = (template: string): string => {
    return template
      .replace(/{nome}/g, lead.name.split(' ')[0])
      .replace(/{vendedor}/g, 'Consultor')
      .replace(/{procedimento}/g, lead.interested_procedures?.[0] || 'o procedimento')
      .replace(/{valor}/g, lead.estimated_value?.toLocaleString('pt-BR') || 'a definir')
      .replace(/{origem}/g, lead.source_detail || lead.source || 'nosso site')
      .replace(/{data}/g, 'amanhã')
      .replace(/{horario}/g, '14h')
      .replace(/{endereco}/g, 'Rua das Flores, 123 - Centro');
  };

  const handleCopy = (id: string, message: string) => {
    const parsed = parseTemplate(message);
    navigator.clipboard.writeText(parsed);
    setCopiedId(id);
    toast({ title: 'Copiado!', description: 'Mensagem copiada para área de transferência' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelect = (message: string) => {
    const parsed = parseTemplate(message);
    onSelectTemplate(parsed);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Scripts & Templates</h3>
              <p className="text-xs text-muted-foreground">
                Etapa atual: <Badge variant="outline" className="ml-1 text-xs">{currentStage}</Badge>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="templates" className="text-xs gap-1">
            <MessageSquare className="h-3 w-3" />
            Etapa
          </TabsTrigger>
          <TabsTrigger value="general" className="text-xs gap-1">
            <Zap className="h-3 w-3" />
            Gerais
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs gap-1">
            <Sparkles className="h-3 w-3" />
            IA
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-4 py-3">
          {/* Templates da Etapa Atual */}
          <TabsContent value="templates" className="m-0 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Templates para "{currentStage}"</span>
            </div>
            
            {stageTemplates.map((template) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm">{template.title}</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(template.id, template.message)}
                      >
                        {copiedId === template.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleSelect(template.message)}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {parseTemplate(template.message)}
                  </p>
                  {template.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Separator className="my-4" />

            {/* Outras etapas */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-medium">Outras Etapas</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(STAGE_TEMPLATES)
                  .filter((stage) => stage !== currentStage)
                  .map((stage) => (
                    <Button
                      key={stage}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-8"
                      onClick={() => {
                        // Mostrar templates dessa etapa
                        toast({ 
                          title: stage, 
                          description: `${STAGE_TEMPLATES[stage].length} templates disponíveis` 
                        });
                      }}
                    >
                      <ChevronRight className="h-3 w-3 mr-1" />
                      {stage}
                    </Button>
                  ))}
              </div>
            </div>
          </TabsContent>

          {/* Templates Gerais */}
          <TabsContent value="general" className="m-0 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Templates Gerais</span>
            </div>

            {GENERAL_TEMPLATES.map((template) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm">{template.title}</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(template.id, template.message)}
                      >
                        {copiedId === template.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleSelect(template.message)}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {parseTemplate(template.message)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Scripts de IA */}
          <TabsContent value="ai" className="m-0 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Sugestões Inteligentes</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateAIScripts}
                disabled={isLoadingAI}
                className="h-7 text-xs"
              >
                {isLoadingAI ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Regenerar
              </Button>
            </div>

            {/* Contexto do Lead */}
            <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Contexto Analisado</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <span>Etapa: {currentStage}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{lead.days_in_stage} dias na etapa</span>
                  </div>
                  {lead.interested_procedures?.[0] && (
                    <div className="flex items-center gap-1 col-span-2">
                      <Heart className="h-3 w-3 text-muted-foreground" />
                      <span>Interesse: {lead.interested_procedures[0]}</span>
                    </div>
                  )}
                  {lead.is_stale && (
                    <div className="col-span-2">
                      <Badge variant="outline" className="border-orange-500 text-orange-600 text-[10px]">
                        ⚠️ Lead parado - priorizar reengajamento
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Scripts Gerados */}
            {isLoadingAI ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-2" />
                <p className="text-sm text-muted-foreground">Gerando scripts personalizados...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {aiScripts.map((script, index) => (
                  <Card key={index} className="border-purple-200 dark:border-purple-800 hover:border-purple-400 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                            <Sparkles className="h-3 w-3 text-purple-600" />
                          </div>
                          <h4 className="font-medium text-sm">{script.title}</h4>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopy(`ai-${index}`, script.content)}
                          >
                            {copiedId === `ai-${index}` ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleSelect(script.content)}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs mb-2">{script.content}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {script.reasoning}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
