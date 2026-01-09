import { useState, useEffect } from 'react';
import { 
  MessageSquare, Copy, Check, Sparkles, ChevronDown, ChevronUp,
  Phone, Target, Clock, Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { CRMLead } from '@/hooks/useCRM';
import { useToast } from '@/hooks/use-toast';

// Scripts do knowledge-base organizados por etapa
const SCRIPTS_BY_STAGE: Record<string, Array<{
  id: string;
  title: string;
  message: string;
  tips: string[];
}>> = {
  'Novo Lead': [
    {
      id: 'first_contact_general',
      title: 'Primeiro Contato Geral',
      message: 'Olá! 💫 Sou [NOME] da Unique Plástica Avançada! Vi que você tem interesse em conhecer nossos procedimentos. Posso te ajudar! Qual procedimento você gostaria de saber mais?',
      tips: ['Responder em até 5 minutos', 'Usar nome da pessoa se disponível', 'Ser caloroso mas profissional']
    },
    {
      id: 'first_contact_cirurgia',
      title: 'Interesse em Cirurgia',
      message: 'Olá! 🌟 Que bom receber você! Vi que tem interesse em cirurgia plástica. Aqui na Unique trabalhamos com o Método CPI - Cirurgia Plástica Integrativa, que prepara seu corpo antes, durante e depois do procedimento. Qual cirurgia você está considerando?',
      tips: ['Explicar diferencial do Método CPI', 'Criar senso de exclusividade']
    }
  ],
  'Qualificação': [
    {
      id: 'qualificacao_bant',
      title: 'Descoberta BANT',
      message: 'Para eu te ajudar melhor, posso te fazer algumas perguntas rápidas? 📋\n\n1️⃣ Há quanto tempo você pensa nesse procedimento?\n2️⃣ Você decide sozinha ou precisa consultar alguém?\n3️⃣ Para quando você gostaria de realizar?\n4️⃣ Já pesquisou valores em outras clínicas?',
      tips: ['Fazer uma pergunta por vez se necessário', 'Ouvir atentamente', 'Anotar respostas']
    }
  ],
  'Agendamento': [
    {
      id: 'agendamento_unique_day',
      title: 'Agendar Unique Day',
      message: 'Perfeito! 📅 Vou te agendar para o Unique Day - nossa consulta exclusiva onde você terá uma avaliação completa com nosso cirurgião. O investimento é de R$ 750 e esse valor é abatido do procedimento! Tenho horários disponíveis [DATAS]. Qual fica melhor para você?',
      tips: ['Sempre dar opções de datas', 'Destacar que valor é abatido', 'Criar urgência com agenda']
    }
  ],
  'Proposta': [
    {
      id: 'objecao_vou_pensar',
      title: 'Objeção: Vou Pensar',
      message: 'Claro, respeito seu tempo! 💭 Mas preciso te avisar com carinho: o Unique Day tem agenda rotativa e filas. Posso segurar seu horário por 1 hora sem compromisso? Assim você pensa com calma e não perde a vaga.',
      tips: ['Criar urgência sutil', 'Mostrar empatia', 'Oferecer alternativa']
    },
    {
      id: 'objecao_caro',
      title: 'Objeção: Está Caro',
      message: 'Entendo que é um investimento significativo! 💰 Mas pense assim: essa é a avaliação mais completa do mercado, com diagnóstico exclusivo pelo Método CPI. E o melhor: o valor da consulta é abatido do procedimento final! É praticamente uma consulta premium gratuita quando você realiza o procedimento.',
      tips: ['Destacar valor agregado', 'Mencionar abatimento', 'Falar de retorno do investimento']
    },
    {
      id: 'objecao_medo',
      title: 'Objeção: Medo de Cirurgia',
      message: 'É completamente normal ter receio! 🤗 Por isso nosso Método CPI é diferente: preparamos seu corpo antes, durante e depois da cirurgia. Nossa taxa de complicações é mínima! Posso te enviar alguns depoimentos de pacientes que tinham o mesmo medo e hoje estão realizadas?',
      tips: ['Validar o medo', 'Apresentar diferencial de segurança', 'Usar prova social']
    }
  ],
  'Negociação': [
    {
      id: 'objecao_pesquisar',
      title: 'Preciso Pesquisar Mais',
      message: 'Claro, informação é importante! 🔍 Você sabia que muitas pacientes que pesquisam bastante acabam se perdendo em tantas opções? No Unique Day você recebe um diagnóstico claro e honesto - sem compromisso de fazer o procedimento. Que tal viver essa experiência e decidir com mais clareza?',
      tips: ['Validar a pesquisa', 'Oferecer clareza', 'Sem pressão']
    },
    {
      id: 'objecao_outro_medico',
      title: 'Vou Fazer com Outro Médico',
      message: 'Ótimo que você está decidida a realizar! 👏 Só uma reflexão: você já conheceu o Método CPI? É exclusivo da Unique e faz toda diferença no resultado e recuperação. Vale conhecer antes de decidir. O Unique Day te dá essa clareza para tomar a melhor decisão!',
      tips: ['Não criticar concorrência', 'Destacar exclusividade', 'Focar em informação']
    }
  ],
  'Follow-up': [
    {
      id: 'followup_d1',
      title: 'Follow-up Dia 1',
      message: 'Oi [NOME]! 👋 Lembrei de você! Conseguiu pensar sobre o Unique Day? Estou aqui para tirar qualquer dúvida que tenha surgido. 💫',
      tips: ['Ser leve', 'Não pressionar', 'Mostrar disponibilidade']
    },
    {
      id: 'followup_d3',
      title: 'Follow-up Dia 3 (Prova Social)',
      message: 'Oi [NOME]! 🌟 Olha só esse resultado incrível de uma paciente nossa que fez [PROCEDIMENTO]! [ENVIAR ANTES/DEPOIS]. Ela tinha as mesmas dúvidas que você. Quer saber mais sobre a experiência dela?',
      tips: ['Usar caso similar', 'Enviar foto antes/depois', 'Criar conexão emocional']
    },
    {
      id: 'followup_d7',
      title: 'Follow-up Dia 7 (Última)',
      message: 'Oi [NOME]! 💫 Vou arquivar sua ficha por aqui, mas fico à disposição quando você estiver pronta! Se mudar de ideia, é só me chamar. Desejo tudo de bom! 🙏',
      tips: ['Encerrar sem pressão', 'Deixar porta aberta', 'Ser educado']
    }
  ],
  'Reativação': [
    {
      id: 'reativacao_30dias',
      title: 'Lead Inativo 30+ dias',
      message: 'Oi [NOME]! 🌟 Lembrei de você! Conversamos há um tempo sobre [PROCEDIMENTO]. Temos uma condição especial essa semana para pacientes que estavam em nossa lista. Posso te contar os detalhes?',
      tips: ['Criar exclusividade', 'Mencionar condição especial', 'Limitar tempo']
    },
    {
      id: 'reativacao_perdido',
      title: 'Lead Perdido',
      message: 'Oi [NOME]! 👋 Sei que optou por outro caminho na época. Sem problemas! Posso te perguntar sinceramente o que pesou na sua decisão? Queremos sempre melhorar nosso atendimento. 🙏',
      tips: ['Ser humilde', 'Pedir feedback genuíno', 'Aprender com a perda']
    }
  ],
  'Pós-Venda': [
    {
      id: 'pos_venda_d1',
      title: 'Dia 1 Pós-Procedimento',
      message: 'Oi [NOME]! 💫 Passando para saber como você está após o procedimento. Algum desconforto? Está seguindo todas as orientações? Estamos aqui para qualquer dúvida! 🤗',
      tips: ['Mostrar cuidado genuíno', 'Verificar orientações', 'Estar disponível']
    },
    {
      id: 'pos_venda_nps',
      title: 'Coleta de NPS',
      message: 'Oi [NOME]! 🌟 Como foi sua experiência na Unique? De 0 a 10, quanto você recomendaria nossos serviços para uma amiga? Seu feedback é muito importante para nós! 💫',
      tips: ['Ser breve', 'Facilitar resposta', 'Agradecer independente da nota']
    },
    {
      id: 'indicacao',
      title: 'Solicitar Indicação',
      message: 'Oi [NOME]! 💫 Que bom que você está feliz com seu resultado! Você conhece alguma amiga que também sonha com uma transformação? Temos um programa especial: você ganha [BENEFÍCIO] quando indica uma amiga que realiza procedimento! 🎁',
      tips: ['Só pedir após satisfação confirmada', 'Destacar benefício', 'Facilitar indicação']
    }
  ]
};

// Mapeamento de etapas do CRM para etapas dos scripts
const STAGE_MAPPING: Record<string, string> = {
  'Novo Lead': 'Novo Lead',
  'Qualificação': 'Qualificação',
  'Agendamento': 'Agendamento',
  'Proposta': 'Proposta',
  'Proposta Enviada': 'Proposta',
  'Negociação': 'Negociação',
  'Fechamento': 'Pós-Venda',
  'Ganho': 'Pós-Venda',
  'Perdido': 'Reativação',
  // Default stages
  'Primeiro Contato': 'Novo Lead',
  'Em Análise': 'Qualificação',
  'Consulta Agendada': 'Agendamento',
  'Pós-Consulta': 'Proposta',
  'Pré-Cirurgia': 'Negociação',
  'Pós-Cirurgia': 'Pós-Venda',
  'Acompanhamento': 'Pós-Venda'
};

interface CRMLeadScriptSuggestionsProps {
  lead: CRMLead;
  compact?: boolean;
}

export function CRMLeadScriptSuggestions({ lead, compact = false }: CRMLeadScriptSuggestionsProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Determinar etapa mapeada
  const stageName = lead.stage?.name || 'Novo Lead';
  const mappedStage = STAGE_MAPPING[stageName] || 'Novo Lead';
  
  // Obter scripts para a etapa
  const stageScripts = SCRIPTS_BY_STAGE[mappedStage] || SCRIPTS_BY_STAGE['Novo Lead'];

  // Adicionar scripts de follow-up se lead está parado
  const scripts = lead.is_stale 
    ? [...stageScripts, ...(SCRIPTS_BY_STAGE['Follow-up'] || [])]
    : stageScripts;

  const parseTemplate = (template: string): string => {
    const firstName = lead.name.split(' ')[0];
    return template
      .replace(/\[NOME\]/g, firstName)
      .replace(/{nome}/g, firstName)
      .replace(/\[PROCEDIMENTO\]/g, lead.interested_procedures?.[0] || 'o procedimento')
      .replace(/{procedimento}/g, lead.interested_procedures?.[0] || 'o procedimento');
  };

  const handleCopy = (id: string, message: string) => {
    const parsed = parseTemplate(message);
    navigator.clipboard.writeText(parsed);
    setCopiedId(id);
    toast({ 
      title: '📋 Copiado!', 
      description: 'Script copiado para área de transferência' 
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="border-dashed">
          <CollapsibleTrigger asChild>
            <CardHeader className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Scripts Sugeridos</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {scripts.length} scripts para "{mappedStage}"
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3 pt-0 space-y-2">
              {scripts.slice(0, 3).map((script) => (
                <div 
                  key={script.id}
                  className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{script.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                        {parseTemplate(script.message)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleCopy(script.id, script.message)}
                    >
                      {copiedId === script.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Scripts para "{mappedStage}"</CardTitle>
              <p className="text-xs text-muted-foreground">
                {scripts.length} scripts disponíveis
                {lead.is_stale && (
                  <Badge variant="outline" className="ml-2 text-orange-500 border-orange-500">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    Lead Parado
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3 pr-3">
            {scripts.map((script) => (
              <div 
                key={script.id}
                className="p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary shrink-0" />
                    <h4 className="text-sm font-medium">{script.title}</h4>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => handleCopy(script.id, script.message)}
                  >
                    {copiedId === script.id ? (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {parseTemplate(script.message)}
                </p>
                
                {script.tips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {script.tips.map((tip, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-[10px] py-0"
                      >
                        💡 {tip}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default CRMLeadScriptSuggestions;
