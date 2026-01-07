import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Link2, Globe, Database, Webhook, Send, Mail,
  MessageSquare, Phone, Calendar, CreditCard, Settings,
  CheckCircle2, XCircle, Loader2, ExternalLink, Zap,
  FileText, Users, BarChart3, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'disconnected' | 'pending';
  category: 'communication' | 'calendar' | 'payment' | 'analytics' | 'automation';
  features: string[];
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business API',
    description: 'Envio automático de mensagens e notificações',
    icon: MessageSquare,
    status: 'disconnected',
    category: 'communication',
    features: ['Templates de mensagens', 'Respostas automáticas', 'Notificações em tempo real'],
  },
  {
    id: 'email-smtp',
    name: 'E-mail SMTP',
    description: 'Envio de e-mails transacionais e marketing',
    icon: Mail,
    status: 'disconnected',
    category: 'communication',
    features: ['Templates personalizados', 'Rastreamento de aberturas', 'Campanhas de nutrição'],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sincronização de agendamentos e reuniões',
    icon: Calendar,
    status: 'disconnected',
    category: 'calendar',
    features: ['Agendamento automático', 'Lembretes', 'Disponibilidade em tempo real'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Pagamentos e gestão de assinaturas',
    icon: CreditCard,
    status: 'disconnected',
    category: 'payment',
    features: ['Cobranças recorrentes', 'Links de pagamento', 'Relatórios financeiros'],
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Rastreamento de conversões e funil',
    icon: BarChart3,
    status: 'disconnected',
    category: 'analytics',
    features: ['UTM tracking', 'Conversões', 'Atribuição de leads'],
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Integração com sistemas externos',
    icon: Webhook,
    status: 'connected',
    category: 'automation',
    features: ['Eventos em tempo real', 'Payload customizado', 'Retry automático'],
  },
  {
    id: 'feegow',
    name: 'Feegow',
    description: 'Sistema de gestão médica',
    icon: Database,
    status: 'connected',
    category: 'automation',
    features: ['Sincronização de pacientes', 'Histórico de atendimentos', 'Agendamentos'],
  },
  {
    id: 'rdstation',
    name: 'RD Station',
    description: 'Automação de marketing',
    icon: Zap,
    status: 'disconnected',
    category: 'automation',
    features: ['Lead scoring', 'Fluxos de nutrição', 'Segmentação'],
  },
];

export function CRMIntegrations() {
  const { user, profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIntegrations = AVAILABLE_INTEGRATIONS.filter(integration => {
    const matchesCategory = activeCategory === 'all' || integration.category === activeCategory;
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = AVAILABLE_INTEGRATIONS.filter(i => i.status === 'connected').length;

  const handleConnect = (integration: Integration) => {
    toast.success(`Iniciando configuração de ${integration.name}...`);
    // In a real implementation, this would open OAuth flow or configuration modal
  };

  const handleDisconnect = (integration: Integration) => {
    toast.info(`Desconectando ${integration.name}...`);
    // In a real implementation, this would disconnect the integration
  };

  const categoryIcons: Record<string, React.ElementType> = {
    communication: MessageSquare,
    calendar: Calendar,
    payment: CreditCard,
    analytics: BarChart3,
    automation: Zap,
  };

  const categoryLabels: Record<string, string> = {
    communication: 'Comunicação',
    calendar: 'Calendário',
    payment: 'Pagamentos',
    analytics: 'Analytics',
    automation: 'Automação',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Integrações CRM
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecte seu CRM com outras ferramentas e sistemas
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          {connectedCount} conectadas
        </Badge>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar integrações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('all')}
          >
            Todas
          </Button>
          {Object.entries(categoryLabels).map(([key, label]) => {
            const Icon = categoryIcons[key];
            return (
              <Button
                key={key}
                variant={activeCategory === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(key)}
                className="gap-1"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => {
          const Icon = integration.icon;
          const isConnected = integration.status === 'connected';
          
          return (
            <Card 
              key={integration.id}
              className={cn(
                "transition-all hover:shadow-md",
                isConnected && "border-green-500/30 bg-green-500/5"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isConnected ? "bg-green-500/20" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isConnected ? "text-green-600" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "mt-1 text-xs",
                          isConnected 
                            ? "border-green-500/50 text-green-600" 
                            : "border-muted text-muted-foreground"
                        )}
                      >
                        {isConnected ? 'Conectada' : 'Não conectada'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {integration.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {integration.features.map((feature, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant={isConnected ? 'outline' : 'default'}
                    size="sm"
                    className="w-full"
                    onClick={() => isConnected ? handleDisconnect(integration) : handleConnect(integration)}
                  >
                    {isConnected ? (
                      <>
                        <Settings className="w-4 h-4 mr-1" />
                        Configurar
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 mr-1" />
                        Conectar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            Webhooks Configurados
          </CardTitle>
          <CardDescription>
            Endpoints que recebem notificações em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input 
              placeholder="https://seu-sistema.com/webhook" 
              className="flex-1"
            />
            <Button>
              <Send className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
          
          <div className="space-y-2">
            {[
              { url: 'https://n8n.unique.com/webhook/crm-leads', events: ['lead.created', 'lead.won'], active: true },
              { url: 'https://api.feegow.com/callback', events: ['lead.won'], active: true },
            ].map((webhook, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Switch checked={webhook.active} />
                  <div>
                    <div className="font-mono text-sm">{webhook.url}</div>
                    <div className="flex gap-1 mt-1">
                      {webhook.events.map((event, j) => (
                        <Badge key={j} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Acesso à API
          </CardTitle>
          <CardDescription>
            Credenciais para integração programática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">API Key</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value="sk_live_****************************" 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm">
                  Copiar
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Endpoint Base</Label>
              <Input 
                value="https://api.unique-crm.com/v1" 
                readOnly 
                className="font-mono text-sm"
              />
            </div>
          </div>
          <Button variant="outline" className="gap-1">
            <FileText className="w-4 h-4" />
            Ver Documentação da API
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
