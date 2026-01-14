import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileSignature, Send, CheckCircle2, Clock, XCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContractTemplate {
  id: string;
  name: string;
  template_key: string;
  contract_type: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
}

interface LeadContract {
  id: string;
  lead_id: string;
  template_id: string;
  clicksign_document_key: string | null;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signed_document_url: string | null;
  created_at: string;
  contract_templates?: ContractTemplate;
}

interface CRMLeadContractsProps {
  leadId: string;
  leadName: string;
  leadEmail?: string | null;
  leadPhone?: string | null;
}

export function CRMLeadContracts({ leadId, leadName, leadEmail, leadPhone }: CRMLeadContractsProps) {
  const queryClient = useQueryClient();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['contract-templates-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as ContractTemplate[];
    },
  });

  const { data: contracts, isLoading: contractsLoading, refetch: refetchContracts } = useQuery({
    queryKey: ['lead-contracts', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_contracts')
        .select('*, contract_templates(*)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeadContract[];
    },
  });

  const sendContractsMutation = useMutation({
    mutationFn: async () => {
      setIsSending(true);
      const { data, error } = await supabase.functions.invoke('clicksign-integration', {
        body: {
          action: 'send_contract',
          lead_id: leadId,
          template_ids: selectedTemplates,
          signer: {
            name: leadName,
            email: leadEmail,
            phone: leadPhone,
          },
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-contracts', leadId] });
      setShowSendDialog(false);
      setSelectedTemplates([]);
      toast.success('Contratos enviados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar contratos: ' + (error as Error).message);
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: async (documentKey: string) => {
      const { data, error } = await supabase.functions.invoke('clicksign-integration', {
        body: {
          action: 'check_status',
          document_key: documentKey,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchContracts();
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao verificar status: ' + (error as Error).message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" />Assinado</Badge>;
      case 'sent':
        return <Badge className="gap-1 bg-blue-500"><Clock className="h-3 w-3" />Aguardando</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const selectRequiredTemplates = () => {
    const requiredIds = templates?.filter(t => t.is_required).map(t => t.id) || [];
    setSelectedTemplates(requiredIds);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Contratos
          </CardTitle>
          <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Send className="h-3 w-3" />
                Enviar Contratos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Contratos para Assinatura</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Selecione os contratos a enviar
                  </span>
                  <Button variant="link" size="sm" onClick={selectRequiredTemplates}>
                    Selecionar Obrigatórios
                  </Button>
                </div>
                
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {templatesLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      templates?.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                        >
                          <Checkbox
                            checked={selectedTemplates.includes(template.id)}
                            onCheckedChange={() => toggleTemplate(template.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{template.name}</span>
                              {template.is_required && (
                                <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 rounded-lg bg-muted/30 text-sm">
                  <p><strong>Signatário:</strong> {leadName}</p>
                  {leadEmail && <p><strong>Email:</strong> {leadEmail}</p>}
                  {leadPhone && <p><strong>Telefone:</strong> {leadPhone}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => sendContractsMutation.mutate()}
                  disabled={selectedTemplates.length === 0 || isSending}
                  className="gap-2"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar {selectedTemplates.length} Contrato(s)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {contractsLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : contracts && contracts.length > 0 ? (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {contract.contract_templates?.name || 'Contrato'}
                    </span>
                    {getStatusBadge(contract.status)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {contract.sent_at && (
                      <span>
                        Enviado em {format(new Date(contract.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                    {contract.signed_at && (
                      <span className="ml-2">
                        • Assinado em {format(new Date(contract.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {contract.clicksign_document_key && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => checkStatusMutation.mutate(contract.clicksign_document_key!)}
                      disabled={checkStatusMutation.isPending}
                    >
                      {checkStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {contract.signed_document_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(contract.signed_document_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum contrato enviado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
