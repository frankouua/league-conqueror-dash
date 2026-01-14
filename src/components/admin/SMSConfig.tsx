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
import { Smartphone, Settings, TestTube, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface SMSConfigData {
  id: string;
  provider: string;
  api_key: string;
  api_secret: string | null;
  sender_id: string | null;
  is_active: boolean;
}

export function SMSConfig() {
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  
  const [formData, setFormData] = useState({
    provider: 'zenvia',
    api_key: '',
    api_secret: '',
    sender_id: '',
    is_active: false,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['sms-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setFormData({
          provider: data.provider || 'zenvia',
          api_key: data.api_key || '',
          api_secret: data.api_secret || '',
          sender_id: data.sender_id || '',
          is_active: data.is_active || false,
        });
      }
      
      return data as SMSConfigData | null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config?.id) {
        const { error } = await supabase
          .from('sms_config')
          .update({
            provider: formData.provider,
            api_key: formData.api_key,
            api_secret: formData.api_secret || null,
            sender_id: formData.sender_id || null,
            is_active: formData.is_active,
          })
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sms_config')
          .insert({
            provider: formData.provider,
            api_key: formData.api_key,
            api_secret: formData.api_secret || null,
            sender_id: formData.sender_id || null,
            is_active: formData.is_active,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-config'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + (error as Error).message);
    },
  });

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Digite um telefone para teste');
      return;
    }
    
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-real', {
        body: {
          action: 'send',
          to: testPhone,
          message: 'Teste de SMS - CRM Unique. Se você recebeu esta mensagem, a integração está funcionando!',
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('SMS de teste enviado com sucesso!');
      } else {
        toast.error('Falha no envio: ' + data.error);
      }
    } catch (error) {
      toast.error('Erro ao enviar SMS: ' + (error as Error).message);
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
            <Smartphone className="h-5 w-5" />
            Configuração SMS
          </CardTitle>
          <CardDescription>
            Configure a integração de SMS para notificações e lembretes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {config?.is_active ? (
                <Badge className="gap-1 bg-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  Ativo
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Inativo
                </Badge>
              )}
            </div>
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
                <SelectItem value="zenvia">Zenvia</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
                <SelectItem value="infobip">Infobip</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key / Account SID</Label>
            <Input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="Sua chave de API"
            />
          </div>

          {/* API Secret */}
          <div className="space-y-2">
            <Label>API Secret / Auth Token (opcional)</Label>
            <Input
              type="password"
              value={formData.api_secret}
              onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
              placeholder="Seu token de autenticação"
            />
          </div>

          {/* Sender ID */}
          <div className="space-y-2">
            <Label>Sender ID / Número de Origem</Label>
            <Input
              value={formData.sender_id}
              onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })}
              placeholder="+5534999999999 ou nome da empresa"
            />
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
                Quando ativo, os SMS serão enviados automaticamente
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
          </div>

          {/* Test SMS */}
          <div className="p-4 rounded-lg border space-y-3">
            <Label>Testar Envio de SMS</Label>
            <div className="flex gap-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+5534999999999"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleTestSMS}
                disabled={isTesting || !formData.api_key}
                className="gap-2"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Enviar Teste
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
