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
import { Heart, Camera, PenLine, Star, MessageSquare, CheckCircle2, Loader2, Clock, Calendar } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  surgeryDate?: string | null;
  dischargeData: DischargeData;
}

export function CRMLeadDischarge({ leadId, leadName, surgeryDate, dischargeData }: CRMLeadDischargeProps) {
  const queryClient = useQueryClient();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  const [checklist, setChecklist] = useState({
    future_letter_written: dischargeData.future_letter_written || false,
    before_after_photo_delivered: dischargeData.before_after_photo_delivered || false,
    unique_necklace_delivered: dischargeData.unique_necklace_delivered || false,
    testimonial_collected: dischargeData.testimonial_collected || false,
    google_review_requested: dischargeData.google_review_requested || false,
  });

  // Calcular dias desde a cirurgia
  const daysSinceSurgery = surgeryDate 
    ? differenceInDays(new Date(), new Date(surgeryDate))
    : null;
  
  // A experiência de alta só aparece a partir de D+80 (10 dias antes) até D+120 (30 dias depois do D+90)
  const isInDischargeWindow = daysSinceSurgery !== null && daysSinceSurgery >= 80 && daysSinceSurgery <= 120;
  const isExactlyD90 = daysSinceSurgery === 90;
  const daysUntilD90 = daysSinceSurgery !== null ? 90 - daysSinceSurgery : null;

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
    toast.success('Alta de 90 dias concluída com sucesso!');
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

  // Se já concluiu, mostrar sempre
  if (dischargeData.discharge_completed) {
    return (
      <Card className="border-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-green-500" />
              Experiência de Alta (D+90)
            </CardTitle>
            <Badge className="gap-1 bg-green-500">
              <CheckCircle2 className="h-3 w-3" />
              Concluída
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {checklistItems.map(item => (
              <Badge key={item.key} variant="outline" className="gap-1 text-green-600 border-green-500/50">
                <CheckCircle2 className="h-3 w-3" />
                {item.label.split(' ')[0]}
              </Badge>
            ))}
          </div>
          {dischargeData.discharge_completed_at && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Alta concluída em {format(new Date(dischargeData.discharge_completed_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Se não tem data de cirurgia, mostrar aviso
  if (!surgeryDate) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Experiência de Alta (D+90)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Defina a data da cirurgia para habilitar o checklist de alta.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Se não está na janela de alta (D+80 a D+120), mostrar quando vai ativar
  if (!isInDischargeWindow) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Experiência de Alta (D+90)</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {daysUntilD90 !== null && daysUntilD90 > 0 
                ? `Em ${daysUntilD90} dias`
                : daysSinceSurgery !== null && daysSinceSurgery > 120 
                  ? 'Período encerrado'
                  : `D+${daysSinceSurgery}`
              }
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {daysUntilD90 !== null && daysUntilD90 > 0 
              ? `O checklist de alta será liberado em D+80 (faltam ${daysUntilD90 - 10} dias).`
              : 'O período de alta (D+80 a D+120) já passou.'
            }
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cirurgia: {format(new Date(surgeryDate), "dd/MM/yyyy", { locale: ptBR })} • Hoje: D+{daysSinceSurgery}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Está na janela de alta! Mostrar checklist completo
  return (
    <Card className={isExactlyD90 ? 'border-2 border-primary animate-pulse' : 'border-primary/50'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Experiência de Alta (D+90)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isExactlyD90 ? 'bg-primary text-primary-foreground' : ''}>
              D+{daysSinceSurgery}
            </Badge>
            <Badge variant="outline">{checkedCount}/5</Badge>
          </div>
        </div>
        {isExactlyD90 && (
          <p className="text-xs text-primary font-medium mt-1">
            🎉 Hoje é o dia da alta! Complete o checklist.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info da cirurgia */}
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded p-2">
          <span>Cirurgia: {format(new Date(surgeryDate), "dd/MM/yyyy", { locale: ptBR })}</span>
          <span>CS Comercial 3</span>
        </div>

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
              <DialogTitle>Confirmar Conclusão de Alta (D+90)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Você está prestes a concluir a alta de 90 dias de <strong>{leadName}</strong>.
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
                A paciente será registrada como alta completa no sistema.
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
                Confirmar Alta D+90
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
