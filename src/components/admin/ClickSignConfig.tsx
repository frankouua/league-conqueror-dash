import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileSignature, Settings, TestTube, CheckCircle2, XCircle, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ClickSignConfigData {
  id: string;
  api_key: string;
  api_url: string;
  is_active: boolean;
}

interface ContractTemplate {
  id: string;
  name: string;
  template_key: string;
  contract_type: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
}

export function ClickSignConfig() {
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    api_key: '',
    api_url: 'https://app.clicksign.com',
    is_active: false,
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    template_key: '',
    contract_type: 'surgery',
    description: '',
    is_required: true,
    is_active: true,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['clicksign-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setFormData({
          api_key: data.api_key || '',
          api_url: data.api_url || 'https://app.clicksign.com',
          is_active: data.is_active || false,
        });
      }
      
      return data as ClickSignConfigData | null;
    },
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ContractTemplate[];
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      if (config?.id) {
        const { error } = await supabase
          .from('contract_config')
          .update({
            api_key: formData.api_key,
            api_url: formData.api_url,
            is_active: formData.is_active,
          })
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contract_config')
          .insert({
            api_key: formData.api_key,
            api_url: formData.api_url,
            is_active: formData.is_active,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clicksign-config'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + (error as Error).message);
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        const { error } = await supabase
          .from('contract_templates')
          .update({
            name: templateForm.name,
            template_key: templateForm.template_key,
            contract_type: templateForm.contract_type,
            description: templateForm.description || null,
            is_required: templateForm.is_required,
            is_active: templateForm.is_active,
          })
          .eq('id', editingTemplate.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contract_templates')
          .insert({
            name: templateForm.name,
            template_key: templateForm.template_key,
            contract_type: templateForm.contract_type,
            description: templateForm.description || null,
            is_required: templateForm.is_required,
            is_active: templateForm.is_active,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        template_key: '',
        contract_type: 'surgery',
        description: '',
        is_required: true,
        is_active: true,
      });
      toast.success('Template salvo com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + (error as Error).message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('Template excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + (error as Error).message);
    },
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('clicksign-integration', {
        body: { action: 'check_status', document_key: 'test' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Conexão com ClickSign estabelecida!');
      } else {
        toast.error('Falha na conexão: ' + data.error);
      }
    } catch (error) {
      toast.error('Erro ao testar conexão: ' + (error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const openEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      template_key: template.template_key,
      contract_type: template.contract_type,
      description: template.description || '',
      is_required: template.is_required || false,
      is_active: template.is_active || false,
    });
    setShowTemplateDialog(true);
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
            <FileSignature className="h-5 w-5" />
            Configuração ClickSign (Contratos)
          </CardTitle>
          <CardDescription>
            Configure a integração com ClickSign para assinatura digital de contratos
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

          {/* API URL */}
          <div className="space-y-2">
            <Label>URL da API</Label>
            <Input
              value={formData.api_url}
              onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
              placeholder="https://app.clicksign.com"
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              placeholder="Sua chave de API ClickSign"
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
                Quando ativo, os contratos serão enviados via ClickSign
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
              className="gap-2"
            >
              {saveConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              Salvar Configuração
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !formData.api_key}
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

      {/* Contract Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates de Contratos</CardTitle>
              <CardDescription>
                Gerencie os modelos de contratos disponíveis para envio
              </CardDescription>
            </div>
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({
                    name: '',
                    template_key: '',
                    contract_type: 'surgery',
                    description: '',
                    is_required: true,
                    is_active: true,
                  });
                }}>
                  <Plus className="h-4 w-4" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Editar Template' : 'Novo Template de Contrato'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Contrato</Label>
                    <Input
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="Contrato de Prestação de Serviço"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chave do Template (ClickSign)</Label>
                    <Input
                      value={templateForm.template_key}
                      onChange={(e) => setTemplateForm({ ...templateForm, template_key: e.target.value })}
                      placeholder="abc123-template-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Input
                      value={templateForm.contract_type}
                      onChange={(e) => setTemplateForm({ ...templateForm, contract_type: e.target.value })}
                      placeholder="surgery, consent, image, etc"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      placeholder="Descrição do contrato..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={templateForm.is_required}
                      onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_required: checked })}
                    />
                    <Label>Obrigatório para cirurgia</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={templateForm.is_active}
                      onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_active: checked })}
                    />
                    <Label>Ativo</Label>
                  </div>
                  <Button
                    onClick={() => saveTemplateMutation.mutate()}
                    disabled={saveTemplateMutation.isPending || !templateForm.name || !templateForm.template_key}
                    className="w-full"
                  >
                    {saveTemplateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.contract_type}</TableCell>
                    <TableCell>
                      {template.is_required ? (
                        <Badge variant="default">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.is_active ? (
                        <Badge className="bg-green-500">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditTemplate(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Excluir este template?')) {
                              deleteTemplateMutation.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
