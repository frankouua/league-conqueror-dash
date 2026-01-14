import { useState } from 'react';
import { Trophy, Loader2, DollarSign, Calendar, FileText, PartyPopper } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CRMWonDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  currentValue: number;
  procedures: string[];
  onConfirm: (data: {
    contractValue: number;
    surgeryDate?: string;
    notes: string;
  }) => Promise<void>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function CRMWonDialog({
  open,
  onClose,
  leadId,
  leadName,
  currentValue,
  procedures,
  onConfirm,
}: CRMWonDialogProps) {
  const { toast } = useToast();
  const [contractValue, setContractValue] = useState(currentValue.toString());
  const [surgeryDate, setSurgeryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const value = parseFloat(contractValue) || 0;
    
    if (value <= 0) {
      toast({
        title: 'Valor obrigatório',
        description: 'Por favor, informe o valor do contrato.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        contractValue: value,
        surgeryDate: surgeryDate || undefined,
        notes,
      });
      
      // Reset form
      setContractValue('');
      setSurgeryDate('');
      setNotes('');
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao finalizar venda',
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
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Trophy className="h-5 w-5" />
            Finalizar Venda 🎉
          </DialogTitle>
          <DialogDescription>
            Parabéns! Confirme os dados da venda de <strong>{leadName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success Animation */}
          <Card className="bg-gradient-to-r from-green-500/20 via-emerald-500/15 to-green-500/20 border-green-500/30">
            <CardContent className="p-4 text-center">
              <PartyPopper className="h-10 w-10 mx-auto text-green-500 mb-2" />
              <p className="text-lg font-bold text-green-600">Venda Fechada!</p>
              <p className="text-sm text-muted-foreground">
                {procedures.length > 0 
                  ? `${procedures.length} procedimento(s)` 
                  : 'Confirme os detalhes abaixo'}
              </p>
            </CardContent>
          </Card>

          {/* Procedures summary */}
          {procedures.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Procedimentos</Label>
              <div className="flex flex-wrap gap-1">
                {procedures.map((proc, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {proc}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contract Value */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Valor do Contrato *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="number"
                placeholder="0,00"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className="pl-10"
              />
            </div>
            {currentValue > 0 && parseFloat(contractValue) !== currentValue && (
              <p className="text-xs text-muted-foreground">
                Valor original da negociação: {formatCurrency(currentValue)}
              </p>
            )}
          </div>

          {/* Surgery Date (optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Data da Cirurgia (opcional)
            </Label>
            <Input
              type="date"
              value={surgeryDate}
              onChange={(e) => setSurgeryDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Observações (opcional)
            </Label>
            <Textarea
              placeholder="Alguma observação sobre esta venda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Confirmar Venda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
