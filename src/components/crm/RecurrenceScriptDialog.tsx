import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  Send,
  Sparkles,
  RefreshCw,
  Clock,
  Calendar,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface RecurrenceLead {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf?: string | null;
  last_procedure_name: string | null;
  last_procedure_date: string | null;
  recurrence_due_date: string | null;
  recurrence_days_overdue: number;
  recurrence_group: string | null;
  temperature?: string | null;
  assigned_to?: string | null;
  stage?: {
    name: string;
    color: string;
  } | null;
}

interface RecurrenceScriptDialogProps {
  lead: RecurrenceLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SCRIPT_TEMPLATES = {
  reativacao_gentil: {
    name: 'Reativação Gentil',
    icon: '💛',
    template: `Olá {nome}! 💛

Tudo bem com você? Aqui é da Unique, espero que esteja tudo maravilhoso!

Estou entrando em contato porque vi que já se passaram {dias_desde} desde o seu último {procedimento}. Como foi sua experiência?

Gostaria de saber se está sentindo alguma diferença e se podemos ajudar com algo. Que tal agendarmos uma renovação para manter seus resultados sempre em dia? 

Estamos com horários especiais essa semana! 📅`
  },
  urgencia_beneficios: {
    name: 'Urgência + Benefícios',
    icon: '⏰',
    template: `Olá {nome}! 

Aqui é da Unique! Vi aqui que seu {procedimento} está vencido há {dias_vencido} dias.

⚠️ Importante: para manter os resultados que você conquistou, é essencial fazer a manutenção no tempo certo!

Benefícios da renovação:
✅ Mantém os resultados duradouros
✅ Potencializa os efeitos do tratamento
✅ Evita recomeçar do zero

Tenho horários disponíveis ainda essa semana. Qual dia fica melhor pra você? 📆`
  },
  exclusividade: {
    name: 'Oferta Exclusiva',
    icon: '🎁',
    template: `Olá {nome}! 💎

{saudacao} da Unique!

Tenho uma novidade especial pra você! Como paciente fiel, preparamos uma condição exclusiva para a renovação do seu {procedimento}.

🎁 Condição especial válida apenas para clientes de recorrência

Posso te contar mais? Quando seria um bom momento para conversarmos? 

Um abraço! 💛`
  },
  lembrete_simples: {
    name: 'Lembrete Simples',
    icon: '📌',
    template: `Oi {nome}! 

Aqui é da Unique! 💛

Passando pra lembrar que seu {procedimento} pode ser renovado.

Quando fica bom pra você agendar? 

Estamos à disposição! 🙂`
  },
  reconquista: {
    name: 'Reconquista',
    icon: '💪',
    template: `{nome}, {saudacao}! 💛

Senti sua falta aqui na Unique! Já faz um tempinho desde o seu último {procedimento} e queria saber como você está.

Sei que a rotina é corrida, mas que tal reservar um momento para cuidar de você? Nosso time está pronto para te receber!

Temos novidades incríveis que tenho certeza que você vai amar. Posso te contar? 

Aguardo seu retorno! 🤗`
  }
};

const getSaudacao = () => {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

export function RecurrenceScriptDialog({
  lead,
  open,
  onOpenChange
}: RecurrenceScriptDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('reativacao_gentil');
  const [customScript, setCustomScript] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedScript, setSavedScript] = useState<string | null>(null);

  // Fetch saved script from recurrent_procedures
  useEffect(() => {
    if (!lead?.last_procedure_name) return;
    
    const fetchScript = async () => {
      const procedureCode = lead.last_procedure_name?.split(' - ')[0]?.toLowerCase();
      
      const { data } = await supabase
        .from('recurrent_procedures')
        .select('script_whatsapp')
        .ilike('procedure_name', `${procedureCode}%`)
        .single();
      
      if (data?.script_whatsapp) {
        setSavedScript(data.script_whatsapp);
      }
    };
    
    fetchScript();
  }, [lead?.last_procedure_name]);

  // Generate script with variables
  const generateScript = (templateKey: string) => {
    if (!lead) return '';
    
    const template = SCRIPT_TEMPLATES[templateKey as keyof typeof SCRIPT_TEMPLATES]?.template || '';
    
    const diasDesde = lead.last_procedure_date 
      ? Math.floor((Date.now() - new Date(lead.last_procedure_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const diasVencido = lead.recurrence_days_overdue || 0;
    
    return template
      .replace(/{nome}/g, lead.name?.split(' ')[0] || 'Cliente')
      .replace(/{procedimento}/g, lead.last_procedure_name?.split(' - ').slice(1).join(' - ') || 'procedimento')
      .replace(/{dias_desde}/g, `${diasDesde} dias`)
      .replace(/{dias_vencido}/g, `${diasVencido}`)
      .replace(/{saudacao}/g, getSaudacao())
      .replace(/{data_vencimento}/g, lead.recurrence_due_date 
        ? format(new Date(lead.recurrence_due_date), 'dd/MM/yyyy', { locale: ptBR })
        : '-');
  };

  useEffect(() => {
    if (lead) {
      setCustomScript(generateScript(selectedTemplate));
    }
  }, [lead, selectedTemplate]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(customScript);
    setCopied(true);
    toast.success('Script copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!lead) return;
    const phone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(customScript);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    onOpenChange(false);
  };

  const handleCall = () => {
    if (!lead?.phone) return;
    window.open(`tel:${lead.phone}`, '_blank');
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Scripts de Reativação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.last_procedure_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {lead.recurrence_days_overdue > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <Clock className="w-3 h-3" />
                      +{lead.recurrence_days_overdue} dias vencido
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-700">
                      <Calendar className="w-3 h-3" />
                      Faltam {Math.abs(lead.recurrence_days_overdue)} dias
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Script Templates */}
          <Tabs value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <TabsList className="grid grid-cols-5 w-full">
              {Object.entries(SCRIPT_TEMPLATES).map(([key, { name, icon }]) => (
                <TabsTrigger key={key} value={key} className="text-xs gap-1">
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{name.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(SCRIPT_TEMPLATES).map(([key, { name }]) => (
              <TabsContent key={key} value={key} className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{name}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCustomScript(generateScript(key))}
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Resetar
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Saved Script from DB */}
          {savedScript && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Script Personalizado do Procedimento
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    const script = savedScript
                      .replace(/{nome}/g, lead.name?.split(' ')[0] || 'Cliente');
                    setCustomScript(script);
                  }}
                >
                  Usar Script Personalizado
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Editable Script */}
          <div className="space-y-2">
            <Textarea
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              className="min-h-[180px] font-mono text-sm"
              placeholder="Personalize o script aqui..."
            />
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: {'{nome}'}, {'{procedimento}'}, {'{dias_desde}'}, {'{dias_vencido}'}, {'{saudacao}'}, {'{data_vencimento}'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
              {lead.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCall}
                  className="gap-1"
                >
                  <Phone className="w-4 h-4" />
                  Ligar
                </Button>
              )}
            </div>
            
            <Button
              onClick={handleSendWhatsApp}
              className="gap-2 bg-green-600 hover:bg-green-700"
              disabled={!lead.phone && !lead.whatsapp}
            >
              <MessageSquare className="w-4 h-4" />
              Enviar WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
