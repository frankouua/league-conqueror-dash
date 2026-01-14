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
import { Mail, Settings, TestTube, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface EmailConfigData {
  id: string;
  provider: string;
  api_key: string;
  from_email: string;
  from_name: string | null;
  is_active: boolean;
}

export function EmailConfig() {
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  const [formData, setFormData] = useState({
    provider: 'sendgrid',
    api_key: '',
    from_email: '',
    from_name: '',
    is_active: false,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['email-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setFormData({
          provider: data.provider || 'sendgrid',
          api_key: data.api_key || '',
          from_email: data.from_email || '',
          from_name: data.from_name || '',
          is_active: data.is_active || false,
        });
      }
      
      return data as EmailConfigData | null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config?.id) {
        const { error } = await supabase
          .from('email_config')
          .update({
            provider: formData.provider,
            api_key: formData.api_key,
            from_email: formData.from_email,
            from_name: formData.from_name || null,
            is_active: formData.is_active,
          })
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_config')
          .insert({
            provider: formData.provider,
            api_key: formData.api_key,
            from_email: formData.from_email,
            from_name: formData.from_name || null,
            is_active: formData.is_active,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + (error as Error).message);
    },
  });

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Digite um email para teste');
      return;
    }
    
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-real', {
        body: {
          action: 'send',
          to: testEmail,
          subject: 'Teste de Email - CRM Unique',
          html: '<h1>Teste de Email</h1><p>Se você recebeu este email, a integração está funcionando!</p>',
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Email de teste enviado com sucesso!');
      } else {
        toast.error('Falha no envio: ' + data.error);
      }
    } catch (error) {
      toast.error('Erro ao enviar email: ' + (error as Error).message);
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
            <Mail className="h-5 w-5" />
            Configuração Email Marketing
          </CardTitle>
          <CardDescription>
            Configure a integração de email para campanhas e notificações
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
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="mailgun">Mailgun</SelectItem>
                <SelectItem value="ses">Amazon SES</SelectItem>
                <SelectItem value="smtp">SMTP Customizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="Sua chave de API"
            />
          </div>

          {/* From Email */}
          <div className="space-y-2">
            <Label>Email de Origem</Label>
            <Input
              type="email"
              value={formData.from_email}
              onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              placeholder="noreply@clinicaunique.com.br"
            />
          </div>

          {/* From Name */}
          <div className="space-y-2">
            <Label>Nome de Origem</Label>
            <Input
              value={formData.from_name}
              onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
              placeholder="Clínica Unique"
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
                Quando ativo, os emails serão enviados automaticamente
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

          {/* Test Email */}
          <div className="p-4 rounded-lg border space-y-3">
            <Label>Testar Envio de Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleTestEmail}
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
