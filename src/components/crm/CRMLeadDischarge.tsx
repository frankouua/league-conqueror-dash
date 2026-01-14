import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Heart, Camera, PenLine, Star, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';

interface DischargeData {
  future_letter_written?: boolean;
  before_after_photo_delivered?: boolean;
  unique_necklace_delivered?: boolean;
  testimonial_collected?: boolean;
  google_review_requested?: boolean;
  discharge_completed?: boolean;
  discharge_completed_at?: string;
}

interface CRMLeadDischargeProps {
  leadId: string;
  leadName: string;
  dischargeData: DischargeData;
}

export function CRMLeadDischarge({ leadId, leadName, dischargeData }: CRMLeadDischargeProps) {
  const queryClient = useQueryClient();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  const [checklist, setChecklist] = useState({
    future_letter_written: dischargeData.future_letter_written || false,
    before_after_photo_delivered: dischargeData.before_after_photo_delivered || false,
    unique_necklace_delivered: dischargeData.unique_necklace_delivered || false,
    testimonial_collected: dischargeData.testimonial_collected || false,
    google_review_requested: dischargeData.google_review_requested || false,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<DischargeData>) => {
      const { error } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', leadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + (error as Error).message);
    },
  });

  const handleCheckChange = (field: keyof typeof checklist, checked: boolean) => {
    setChecklist(prev => ({ ...prev, [field]: checked }));
    updateMutation.mutate({ [field]: checked });
  };

  const handleCompleteDischarge = () => {
    updateMutation.mutate({
      ...checklist,
      discharge_completed: true,
      discharge_completed_at: new Date().toISOString(),
    });
    setShowCompleteDialog(false);
    toast.success('Alta concluída com sucesso!');
  };

  const allChecked = Object.values(checklist).every(Boolean);
  const checkedCount = Object.values(checklist).filter(Boolean).length;

  const checklistItems = [
    {
      key: 'future_letter_written',
      label: 'Carta "Eu do Futuro" escrita (no SPA)',
      icon: PenLine,
      description: 'A paciente escreveu a carta durante o SPA',
    },
    {
      key: 'before_after_photo_delivered',
      label: 'Foto Antes/Depois entregue',
      icon: Camera,
      description: 'Foto comparativa impressa e entregue à paciente',
    },
    {
      key: 'unique_necklace_delivered',
      label: 'Colar Unique entregue',
      icon: Heart,
      description: 'Colar exclusivo Unique entregue como presente',
    },
    {
      key: 'testimonial_collected',
      label: 'Depoimento coletado',
      icon: MessageSquare,
      description: 'Vídeo ou texto de depoimento da paciente',
    },
    {
      key: 'google_review_requested',
      label: 'Avaliação Google solicitada',
      icon: Star,
      description: 'Pedido para avaliação no Google feito',
    },
  ] as const;

  return (
    <Card className={dischargeData.discharge_completed ? 'border-green-500' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Experiência de Alta
          </CardTitle>
          {dischargeData.discharge_completed ? (
            <Badge className="gap-1 bg-green-500">
              <CheckCircle2 className="h-3 w-3" />
              Concluída
            </Badge>
          ) : (
            <Badge variant="outline">{checkedCount}/5</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checklist */}
        <div className="space-y-3">
          {checklistItems.map(item => {
            const Icon = item.icon;
            return (
              <div 
                key={item.key}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={checklist[item.key]}
                  onCheckedChange={(checked) => handleCheckChange(item.key, !!checked)}
                  disabled={dischargeData.discharge_completed}
                />
                <div className="flex-1">
                  <Label className="cursor-pointer flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete Button */}
        {!dischargeData.discharge_completed && (
          <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
            <DialogTrigger asChild>
              <Button 
                className="w-full gap-2"
                disabled={!allChecked}
              >
                <CheckCircle2 className="h-4 w-4" />
                Concluir Alta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Conclusão de Alta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Você está prestes a concluir a alta de <strong>{leadName}</strong>.
                </p>
                
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <p className="font-medium text-sm">Checklist completo:</p>
                  <ul className="text-sm space-y-1">
                    {checklistItems.map(item => (
                      <li key={item.key} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-sm text-muted-foreground">
                  Ao concluir, a paciente será movida para a etapa de pós-operatório.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCompleteDischarge}
                  disabled={updateMutation.isPending}
                  className="gap-2"
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar Alta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {dischargeData.discharge_completed && dischargeData.discharge_completed_at && (
          <div className="text-center text-sm text-muted-foreground">
            Alta concluída em {new Date(dischargeData.discharge_completed_at).toLocaleDateString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
