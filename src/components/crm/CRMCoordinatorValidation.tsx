import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardCheck, AlertTriangle, CheckCircle2, Loader2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface ValidationChecklist {
  id: string;
  lead_id: string;
  contracts_signed: boolean;
  entry_payment_received: boolean;
  payment_plan_confirmed: boolean;
  surgery_date_confirmed: boolean;
  patient_data_complete: boolean;
  validated: boolean;
  validated_at: string | null;
  validated_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CRMCoordinatorValidationProps {
  leadId: string;
  surgeryDate?: string | null;
  leadName: string;
}

export function CRMCoordinatorValidation({ leadId, surgeryDate, leadName }: CRMCoordinatorValidationProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [checklist, setChecklist] = useState({
    contracts_signed: false,
    entry_payment_received: false,
    payment_plan_confirmed: false,
    surgery_date_confirmed: false,
    patient_data_complete: false,
  });

  const { data: validation, isLoading } = useQuery({
    queryKey: ['coordinator-validation', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coordinator_validation_checklist')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ValidationChecklist | null;
    },
  });

  useEffect(() => {
    if (validation) {
      setChecklist({
        contracts_signed: validation.contracts_signed || false,
        entry_payment_received: validation.entry_payment_received || false,
        payment_plan_confirmed: validation.payment_plan_confirmed || false,
        surgery_date_confirmed: validation.surgery_date_confirmed || false,
        patient_data_complete: validation.patient_data_complete || false,
      });
      setNotes(validation.notes || '');
    }
  }, [validation]);

  const saveMutation = useMutation({
    mutationFn: async (shouldValidate: boolean = false) => {
      const updateData = {
        ...checklist,
        notes: notes || null,
        validated: shouldValidate,
        validated_at: shouldValidate ? new Date().toISOString() : null,
        validated_by: shouldValidate ? user?.id : null,
        updated_at: new Date().toISOString(),
      };

      if (validation?.id) {
        const { error } = await supabase
          .from('coordinator_validation_checklist')
          .update(updateData)
          .eq('id', validation.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coordinator_validation_checklist')
          .insert({
            lead_id: leadId,
            ...updateData,
          });
        
        if (error) throw error;
      }

      // If validating, also update the lead
      if (shouldValidate) {
        await supabase
          .from('crm_leads')
          .update({
            coordinator_validated: true,
            coordinator_validated_at: new Date().toISOString(),
            coordinator_validated_by: user?.id,
          })
          .eq('id', leadId);
      }
    },
    onSuccess: (_, shouldValidate) => {
      queryClient.invalidateQueries({ queryKey: ['coordinator-validation', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      setShowValidateDialog(false);
      toast.success(shouldValidate ? 'Lead validado pelo Coordenador!' : 'Checklist salvo!');
    },
    onError: (error) => {
      toast.error('Erro: ' + (error as Error).message);
    },
  });

  const allChecked = Object.values(checklist).every(Boolean);
  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.values(checklist).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className={validation?.validated ? 'border-green-500' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Dupla Conferência (Coordenador)
          </CardTitle>
          {validation?.validated ? (
            <Badge className="gap-1 bg-green-500">
              <CheckCircle2 className="h-3 w-3" />
              Validado
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {checkedCount}/{totalCount}
            </Badge>
          )}
        </div>
        {surgeryDate && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" />
            Cirurgia: {format(new Date(surgeryDate), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Info */}
        {validation?.validated && validation.validated_at && (
          <div className="p-3 rounded-lg bg-green-500/10 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>
                Validado em {format(new Date(validation.validated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
            <Checkbox
              checked={checklist.contracts_signed}
              onCheckedChange={(checked) => setChecklist({ ...checklist, contracts_signed: !!checked })}
              disabled={validation?.validated}
            />
            <Label className="cursor-pointer">Contratos assinados</Label>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
            <Checkbox
              checked={checklist.entry_payment_received}
              onCheckedChange={(checked) => setChecklist({ ...checklist, entry_payment_received: !!checked })}
              disabled={validation?.validated}
            />
            <Label className="cursor-pointer">Entrada recebida</Label>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
            <Checkbox
              checked={checklist.payment_plan_confirmed}
              onCheckedChange={(checked) => setChecklist({ ...checklist, payment_plan_confirmed: !!checked })}
              disabled={validation?.validated}
            />
            <Label className="cursor-pointer">Forma de pagamento confirmada</Label>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
            <Checkbox
              checked={checklist.surgery_date_confirmed}
              onCheckedChange={(checked) => setChecklist({ ...checklist, surgery_date_confirmed: !!checked })}
              disabled={validation?.validated}
            />
            <Label className="cursor-pointer">Data da cirurgia confirmada</Label>
          </div>
          
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
            <Checkbox
              checked={checklist.patient_data_complete}
              onCheckedChange={(checked) => setChecklist({ ...checklist, patient_data_complete: !!checked })}
              disabled={validation?.validated}
            />
            <Label className="cursor-pointer">Dados do paciente completos</Label>
          </div>
        </div>

        {/* Notes */}
        {!validation?.validated && (
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre a validação..."
              rows={2}
            />
          </div>
        )}

        {validation?.notes && validation.validated && (
          <div className="p-3 rounded-lg bg-muted/30 text-sm">
            <p className="font-medium text-xs text-muted-foreground mb-1">Observações:</p>
            {validation.notes}
          </div>
        )}

        {/* Actions */}
        {!validation?.validated && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
              className="flex-1"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
            
            <Dialog open={showValidateDialog} onOpenChange={setShowValidateDialog}>
              <DialogTrigger asChild>
                <Button
                  disabled={!allChecked}
                  className="flex-1 gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Validar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Validação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Você está prestes a validar o lead <strong>{leadName}</strong> para cirurgia.
                  </p>
                  
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                    <p className="font-medium text-sm">Checklist completo:</p>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Contratos assinados
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Entrada recebida
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Pagamento confirmado
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Data confirmada
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Dados completos
                      </li>
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowValidateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate(true)}
                    disabled={saveMutation.isPending}
                    className="gap-2"
                  >
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirmar Validação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
