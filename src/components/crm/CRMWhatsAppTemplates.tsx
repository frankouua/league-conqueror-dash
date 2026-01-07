import { useState } from 'react';
import { 
  MessageSquare, Copy, Send, Sparkles, Check,
  User, Clock, Calendar, Zap, Heart, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CRMWhatsAppTemplatesProps {
  leadName?: string;
  leadPhone?: string;
  procedures?: string[];
  stage?: string;
  onClose?: () => void;
}

interface Template {
  id: string;
  category: string;
  name: string;
  icon: React.ElementType;
  message: string;
  tags: string[];
}

const TEMPLATES: Template[] = [
  // Primeiro Contato
  {
    id: 'first_contact_1',
    category: 'first_contact',
    name: 'Boas-vindas Calorosa',
    icon: User,
    message: `Olá {nome}! 👋

Sou da equipe Unique e vi seu interesse em nossos procedimentos. 

Estou aqui para te ajudar a conhecer as melhores opções para você alcançar seus objetivos. 

Quando seria um bom momento para conversarmos? 💬`,
    tags: ['primeiro contato', 'apresentação'],
  },
  {
    id: 'first_contact_2',
    category: 'first_contact',
    name: 'Resposta Rápida',
    icon: Zap,
    message: `Oi {nome}! 😊

Obrigado pelo seu contato! Recebi sua mensagem e já estou analisando as melhores opções para você.

Em qual procedimento você tem mais interesse no momento?`,
    tags: ['resposta rápida', 'qualificação'],
  },

  // Follow-up
  {
    id: 'followup_1',
    category: 'followup',
    name: 'Retomada Gentil',
    icon: Clock,
    message: `Oi {nome}! 💫

Passando para saber como você está! 

Vi que conversamos há alguns dias sobre {procedimento} e gostaria de saber se surgiu alguma dúvida.

Estou à disposição para ajudar! 🤝`,
    tags: ['follow-up', 'retomada'],
  },
  {
    id: 'followup_2',
    category: 'followup',
    name: 'Oportunidade Especial',
    icon: Gift,
    message: `Olá {nome}! 🌟

Tenho uma novidade para você! 

Estamos com condições especiais para {procedimento} que podem ser perfeitas para o seu caso.

Posso te contar mais detalhes? 💫`,
    tags: ['oferta', 'oportunidade'],
  },

  // Agendamento
  {
    id: 'schedule_1',
    category: 'schedule',
    name: 'Confirmação de Agenda',
    icon: Calendar,
    message: `Olá {nome}! 📅

Confirmando nossa avaliação:
📍 Unique Clínica
🗓 {data}
⏰ {horario}

Por favor, chegue 10 minutos antes. Qualquer imprevisto, me avise com antecedência!

Te esperamos! ✨`,
    tags: ['agendamento', 'confirmação'],
  },
  {
    id: 'schedule_2',
    category: 'schedule',
    name: 'Lembrete de Consulta',
    icon: Clock,
    message: `Oi {nome}! 👋

Lembrete: sua avaliação é amanhã!
📍 Unique Clínica
🗓 {data}
⏰ {horario}

Está confirmado? Aguardo sua resposta! 😊`,
    tags: ['lembrete', 'confirmação'],
  },

  // Pós-venda
  {
    id: 'postsale_1',
    category: 'postsale',
    name: 'Acompanhamento',
    icon: Heart,
    message: `Olá {nome}! 💕

Como você está se sentindo após o procedimento?

Estou aqui caso precise de algo ou tenha alguma dúvida. Sua satisfação é nossa prioridade!

Me conte como está! 🌟`,
    tags: ['pós-venda', 'acompanhamento'],
  },
  {
    id: 'postsale_2',
    category: 'postsale',
    name: 'Indicação',
    icon: Gift,
    message: `Oi {nome}! 🌟

Que bom que seu resultado ficou incrível!

Sabia que temos um programa especial de indicações? Para cada amiga que você indicar, vocês duas ganham benefícios exclusivos!

Quer saber mais? 💝`,
    tags: ['indicação', 'benefício'],
  },
];

export function CRMWhatsAppTemplates({
  leadName = '',
  leadPhone = '',
  procedures,
  stage,
  onClose,
}: CRMWhatsAppTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatMessage = (template: string): string => {
    const name = leadName ? leadName.split(' ')[0] : '[NOME]';
    let formatted = template
      .replace(/{nome}/g, name)
      .replace(/{procedimento}/g, procedures?.[0] || 'procedimento de interesse')
      .replace(/{data}/g, '[DATA]')
      .replace(/{horario}/g, '[HORÁRIO]');
    
    return formatted;
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCustomMessage(formatMessage(template.message));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Mensagem copiada!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!leadPhone || !customMessage) return;
    
    const phone = leadPhone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(customMessage);
    window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank');
  };

  const categories = [
    { id: 'first_contact', label: 'Primeiro Contato', icon: User },
    { id: 'followup', label: 'Follow-up', icon: Clock },
    { id: 'schedule', label: 'Agendamento', icon: Calendar },
    { id: 'postsale', label: 'Pós-venda', icon: Heart },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-500" />
          Templates WhatsApp
        </h3>
        {leadPhone && (
          <Badge variant="outline" className="text-green-600 border-green-500/50">
            {leadPhone}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="first_contact" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
              <cat.icon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="mt-4">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {TEMPLATES.filter(t => t.category === cat.id).map(template => (
                  <Card 
                    key={template.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      selectedTemplate?.id === template.id && "border-primary ring-1 ring-primary"
                    )}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <template.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{template.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(formatMessage(template.message), template.id);
                          }}
                        >
                          {copiedId === template.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {formatMessage(template.message).substring(0, 100)}...
                      </p>
                      <div className="flex gap-1 mt-2">
                        {template.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {/* Message Editor */}
      {selectedTemplate && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Personalizar Mensagem</span>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {selectedTemplate.name}
            </Badge>
          </div>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="min-h-[150px] text-sm"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleCopy(customMessage, 'custom')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleSendWhatsApp}
              disabled={!leadPhone}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
