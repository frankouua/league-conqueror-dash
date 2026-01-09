import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Webhook, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Settings,
  ExternalLink,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface CRMWebhook {
  id: string;
  name: string;
  description: string | null;
  webhook_key: string;
  form_source: string | null;
  default_pipeline_id: string | null;
  default_stage_id: string | null;
  default_assigned_to: string | null;
  field_mapping: Record<string, string>;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

const FORM_SOURCES = [
  { value: 'landing_page', label: 'Landing Page', scoreBonus: 15 },
  { value: 'google_ads', label: 'Google Ads', scoreBonus: 20 },
  { value: 'google_forms', label: 'Google Forms', scoreBonus: 12 },
  { value: 'typeform', label: 'Typeform', scoreBonus: 15 },
  { value: 'facebook_lead_ads', label: 'Facebook Lead Ads', scoreBonus: 15 },
  { value: 'instagram', label: 'Instagram', scoreBonus: 12 },
  { value: 'tiktok', label: 'TikTok', scoreBonus: 10 },
  { value: 'trafego_pago', label: 'Tráfego Pago (Geral)', scoreBonus: 18 },
  { value: 'isca_gratuita', label: 'Isca Gratuita / Lead Magnet', scoreBonus: 10 },
  { value: 'whatsapp', label: 'WhatsApp', scoreBonus: 25 },
  { value: 'indicacao', label: 'Indicação', scoreBonus: 30 },
  { value: 'organico', label: 'Orgânico', scoreBonus: 12 },
  { value: 'lovable_form', label: 'Formulário Lovable', scoreBonus: 15 },
  { value: 'other', label: 'Outro', scoreBonus: 8 },
];

export function CRMWebhooksManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    description: '',
    form_source: '',
    default_pipeline_id: '',
    default_stage_id: '',
  });

  // Buscar webhooks
  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['crm-webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CRMWebhook[];
    },
  });

  // Buscar pipelines e stages
  const { data: pipelines = [] } = useQuery({
    queryKey: ['crm-pipelines-for-webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('id, name')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      return data;
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['crm-stages-for-webhooks', newWebhook.default_pipeline_id],
    queryFn: async () => {
      if (!newWebhook.default_pipeline_id) return [];
      
      const { data, error } = await supabase
        .from('crm_stages')
        .select('id, name')
        .eq('pipeline_id', newWebhook.default_pipeline_id)
        .order('order_index');

      if (error) throw error;
      return data;
    },
    enabled: !!newWebhook.default_pipeline_id,
  });

  // Criar webhook
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('crm_webhooks')
        .insert({
          name: newWebhook.name,
          description: newWebhook.description || null,
          form_source: newWebhook.form_source || null,
          default_pipeline_id: newWebhook.default_pipeline_id || null,
          default_stage_id: newWebhook.default_stage_id || null,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-webhooks'] });
      setIsDialogOpen(false);
      setNewWebhook({
        name: '',
        description: '',
        form_source: '',
        default_pipeline_id: '',
        default_stage_id: '',
      });
      toast.success('Webhook criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar webhook: ' + error.message);
    },
  });

  // Toggle ativo/inativo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('crm_webhooks')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-webhooks'] });
    },
  });

  // Deletar webhook
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-webhooks'] });
      toast.success('Webhook removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  const getWebhookUrl = (webhookKey: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'mbnjjwatnqjjqxogmaju';
    return `https://${projectId}.supabase.co/functions/v1/crm-webhook?key=${webhookKey}`;
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('URL copiada!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks de Formulários
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure endpoints para receber leads de formulários externos
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Webhook</DialogTitle>
              <DialogDescription>
                Configure um endpoint para receber leads de formulários externos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Webhook *</Label>
                <Input
                  placeholder="Ex: Landing Page - Harmonização"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descrição opcional..."
                  value={newWebhook.description}
                  onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Origem</Label>
                <Select
                  value={newWebhook.form_source}
                  onValueChange={(value) => setNewWebhook({ ...newWebhook, form_source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pipeline Padrão</Label>
                <Select
                  value={newWebhook.default_pipeline_id}
                  onValueChange={(value) => setNewWebhook({ 
                    ...newWebhook, 
                    default_pipeline_id: value,
                    default_stage_id: '' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newWebhook.default_pipeline_id && (
                <div className="space-y-2">
                  <Label>Etapa Inicial</Label>
                  <Select
                    value={newWebhook.default_stage_id}
                    onValueChange={(value) => setNewWebhook({ ...newWebhook, default_stage_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={!newWebhook.name || createMutation.isPending}
              >
                Criar Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum webhook configurado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie um webhook para começar a receber leads de formulários externos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {webhook.name}
                      <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                        {webhook.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </CardTitle>
                    {webhook.description && (
                      <CardDescription>{webhook.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActiveMutation.mutate({ 
                        id: webhook.id, 
                        isActive: webhook.is_active 
                      })}
                    >
                      {webhook.is_active ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja remover este webhook?')) {
                          deleteMutation.mutate(webhook.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {webhook.form_source && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Origem:</span>
                      <Badge variant="outline">
                        {FORM_SOURCES.find(s => s.value === webhook.form_source)?.label || webhook.form_source}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">URL do Webhook (POST)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={getWebhookUrl(webhook.webhook_key)}
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(getWebhookUrl(webhook.webhook_key), webhook.id)}
                      >
                        {copiedKey === webhook.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded space-y-2">
                    <div>
                      <strong>📋 Campos aceitos:</strong>
                      <p className="mt-1">name/nome, email, phone/telefone, whatsapp, procedure/procedimento, budget/orcamento, timeline/prazo, tags</p>
                    </div>
                    <div>
                      <strong>📊 UTM Parameters:</strong>
                      <p className="mt-1">utm_source, utm_medium, utm_campaign, utm_content, utm_term (via query string ou body)</p>
                    </div>
                    <div>
                      <strong>⚡ Lead Score automático:</strong>
                      <p className="mt-1">
                        Score calculado com base na origem ({FORM_SOURCES.find(s => s.value === webhook.form_source)?.scoreBonus || 8} pts), 
                        completude dos dados e indicadores de intenção
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
