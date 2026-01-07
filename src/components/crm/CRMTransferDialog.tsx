import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCRM, CRMLead, useCRMLeads } from '@/hooks/useCRM';
import { toast } from 'sonner';

interface CRMTransferDialogProps {
  lead: CRMLead | null;
  open: boolean;
  onClose: () => void;
}

export function CRMTransferDialog({ lead, open, onClose }: CRMTransferDialogProps) {
  const { pipelines, stages } = useCRM();
  const { moveLead } = useCRMLeads(lead?.pipeline_id);
  
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Get stages for selected pipeline
  const availableStages = stages.filter(s => s.pipeline_id === selectedPipeline);

  // Get current pipeline info
  const currentPipeline = pipelines.find(p => p.id === lead?.pipeline_id);
  const currentStage = stages.find(s => s.id === lead?.stage_id);

  const handleTransfer = async () => {
    if (!lead || !selectedPipeline || !selectedStage) return;

    setIsTransferring(true);
    try {
      await moveLead.mutateAsync({
        leadId: lead.id,
        toStageId: selectedStage,
        toPipelineId: selectedPipeline,
        note: transferNote || `Transferido para outro pipeline`,
      });
      
      toast.success('Lead transferido com sucesso!');
      onClose();
      setSelectedPipeline('');
      setSelectedStage('');
      setTransferNote('');
    } catch (error) {
      toast.error('Erro ao transferir lead');
    } finally {
      setIsTransferring(false);
    }
  };

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    setSelectedStage(''); // Reset stage when pipeline changes
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Lead</DialogTitle>
          <DialogDescription>
            Mova este lead para outro pipeline do CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Location */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-2">Localização Atual:</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" style={{ borderColor: currentPipeline?.color }}>
                {currentPipeline?.name}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge style={{ backgroundColor: currentStage?.color, color: 'white' }}>
                {currentStage?.name}
              </Badge>
            </div>
          </div>

          {/* Target Pipeline */}
          <div className="space-y-2">
            <Label>Pipeline de Destino</Label>
            <Select value={selectedPipeline} onValueChange={handlePipelineChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines
                  .filter(p => p.id !== lead.pipeline_id)
                  .map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: pipeline.color }}
                        />
                        {pipeline.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Stage */}
          {selectedPipeline && (
            <div className="space-y-2">
              <Label>Estágio de Destino</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Transfer Note */}
          <div className="space-y-2">
            <Label>Motivo da Transferência (opcional)</Label>
            <Textarea
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Descreva o motivo da transferência..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedPipeline || !selectedStage || isTransferring}
          >
            {isTransferring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
