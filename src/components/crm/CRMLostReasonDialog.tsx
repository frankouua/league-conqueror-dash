import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2, X, ThumbsDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CRMLostReasonDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onConfirm: (reasonId: string, reasonText: string, notes: string) => Promise<void>;
}

interface LostReason {
  id: string;
  name: string;
}

export function CRMLostReasonDialog({
  open,
  onClose,
  leadId,
  leadName,
  onConfirm,
}: CRMLostReasonDialogProps) {
  const { toast } = useToast();
  const [selectedReasonId, setSelectedReasonId] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch lost reasons from database
  const { data: lostReasons = [], isLoading } = useQuery({
    queryKey: ['crm-lost-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lost_reasons')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      // Remove duplicates by name
      const uniqueReasons = data?.reduce((acc: LostReason[], curr) => {
        if (!acc.find(r => r.name === curr.name)) {
          acc.push(curr);
        }
        return acc;
      }, []) || [];
      
      return uniqueReasons;
    },
  });

  const handleSubmit = async () => {
    if (!selectedReasonId && selectedReasonId !== 'other') {
      toast({
        title: 'Selecione um motivo',
        description: 'Por favor, selecione o motivo da perda antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedReasonId === 'other' && !customReason.trim()) {
      toast({
        title: 'Informe o motivo',
        description: 'Por favor, descreva o motivo da perda.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const reasonText = selectedReasonId === 'other' 
        ? customReason 
        : lostReasons.find(r => r.id === selectedReasonId)?.name || '';

      await onConfirm(
        selectedReasonId === 'other' ? '' : selectedReasonId,
        reasonText,
        additionalNotes
      );
      
      // Reset form
      setSelectedReasonId('');
      setCustomReason('');
      setAdditionalNotes('');
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao marcar como perdido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ThumbsDown className="h-5 w-5" />
            Marcar como Perdido
          </DialogTitle>
          <DialogDescription>
            Por favor, selecione o motivo pelo qual o lead <strong>{leadName}</strong> não converteu.
            Isso ajuda a melhorar nossas estratégias.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo da Perda *</Label>
              <ScrollArea className="h-[200px] border rounded-md p-3">
                <RadioGroup
                  value={selectedReasonId}
                  onValueChange={setSelectedReasonId}
                  className="space-y-2"
                >
                  {lostReasons.map((reason) => (
                    <div
                      key={reason.id}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors",
                        selectedReasonId === reason.id 
                          ? "bg-destructive/10 border border-destructive/30" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => setSelectedReasonId(reason.id)}
                    >
                      <RadioGroupItem value={reason.id} id={reason.id} />
                      <Label 
                        htmlFor={reason.id} 
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {reason.name}
                      </Label>
                    </div>
                  ))}
                  
                  {/* Other option */}
                  <div
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors",
                      selectedReasonId === 'other' 
                        ? "bg-destructive/10 border border-destructive/30" 
                        : "hover:bg-muted"
                    )}
                    onClick={() => setSelectedReasonId('other')}
                  >
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="flex-1 cursor-pointer text-sm">
                      Outro motivo...
                    </Label>
                  </div>
                </RadioGroup>
              </ScrollArea>
            </div>

            {selectedReasonId === 'other' && (
              <div className="space-y-2">
                <Label>Descreva o motivo *</Label>
                <Textarea
                  placeholder="Explique o motivo da perda..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações adicionais (opcional)</Label>
              <Textarea
                placeholder="Alguma observação adicional sobre este lead..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <ThumbsDown className="h-4 w-4 mr-2" />
                Confirmar Perda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
