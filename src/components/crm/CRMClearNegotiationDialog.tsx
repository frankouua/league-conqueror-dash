import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, DollarSign, Trash2 } from 'lucide-react';

interface CRMClearNegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValue: number;
  onConfirmClear: () => void;
  onKeepValue: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function CRMClearNegotiationDialog({
  open,
  onOpenChange,
  currentValue,
  onConfirmClear,
  onKeepValue,
}: CRMClearNegotiationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <AlertDialogTitle>Todos os procedimentos foram removidos</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                O que você deseja fazer com o valor da negociação?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Valor atual da negociação:</span>
            </div>
            <span className="text-xl font-bold text-primary">{formatCurrency(currentValue)}</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Você removeu todos os procedimentos da negociação. Escolha se deseja zerar o valor ou manter o valor atual para uma negociação manual.
          </p>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onKeepValue}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Manter Valor
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onConfirmClear}
            className="bg-destructive hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Zerar Valor
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
