import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageSquare, Settings, TestTube, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface WhatsAppConfigData {
  id: string;
  provider: string;
  api_url: string;
  api_key: string;
  instance_id: string | null;
  webhook_url: string | null;
  is_active: boolean;
  connection_status: string | null;
  last_connection_check: string | null;
}

export function WhatsAppConfig() {
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);
  
  const [formData, setFormData] = useState({
    provider: 'evolution',
    api_url: '',
    api_key: '',
    instance_id: '',
    webhook_url: '',
    is_active: false,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setFormData({
          provider: data.provider || 'evolution',
          api_url: data.api_url || '',
          api_key: data.api_key || '',
          instance_id: data.instance_id || '',
          webhook_url: data.webhook_url || '',
          is_active: data.is_active || false,
        });
      }
      
      return data as WhatsAppConfigData | null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config?.id) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update({
            provider: formData.provider,
            api_url: formData.api_url,
            api_key: formData.api_key,
            instance_id: formData.instance_id || null,
            webhook_url: formData.webhook_url || null,
            is_active: formData.is_active,
          })
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_config')
          .insert({
            provider: formData.provider,
            api_url: formData.api_url,
            api_key: formData.api_key,
            instance_id: formData.instance_id || null,
            webhook_url: formData.webhook_url || null,
            is_active: formData.is_active,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + (error as Error).message);
    },
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-real', {
        body: { action: 'test_connection' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Conexão estabelecida com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      } else {
        toast.error('Falha na conexão: ' + data.error);
      }
    } catch (error) {
      toast.error('Erro ao testar conexão: ' + (error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Configuração WhatsApp API
          </CardTitle>
          <CardDescription>
            Configure a integração com WhatsApp para envio e recebimento de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {config?.connection_status === 'connected' ? (
                <Badge className="gap-1 bg-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Desconectado
                </Badge>
              )}
            </div>
            {config?.last_connection_check && (
              <span className="text-xs text-muted-foreground">
                Última verificação: {new Date(config.last_connection_check).toLocaleString('pt-BR')}
              </span>
            )}
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Provedor</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => setFormData({ ...formData, provider: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evolution">Evolution API</SelectItem>
                <SelectItem value="z-api">Z-API</SelectItem>
                <SelectItem value="wppconnect">WPPConnect</SelectItem>
                <SelectItem value="baileys">Baileys</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API URL */}
          <div className="space-y-2">
            <Label>URL da API</Label>
            <Input
              value={formData.api_url}
              onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
              placeholder="https://api.whatsapp.com/v1"
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key / Token</Label>
            <Input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="Sua chave de API"
            />
          </div>

          {/* Instance ID */}
          <div className="space-y-2">
            <Label>Instance ID (opcional)</Label>
            <Input
              value={formData.instance_id}
              onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
              placeholder="ID da instância"
            />
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label>Webhook URL (para receber mensagens)</Label>
            <div className="flex gap-2">
              <Input
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://seu-dominio.com/webhook"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const url = `${window.location.origin}/api/whatsapp-webhook`;
                  setFormData({ ...formData, webhook_url: url });
                  navigator.clipboard.writeText(url);
                  toast.success('URL copiada!');
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3 p-4 rounded-lg border">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <div>
              <Label>Integração Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, as mensagens serão enviadas automaticamente
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              Salvar Configuração
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !formData.api_url || !formData.api_key}
              className="gap-2"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
