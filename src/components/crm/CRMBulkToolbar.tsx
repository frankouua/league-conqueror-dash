import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  Send,
  Trash2,
  X,
  Loader2,
  Users,
  MoveRight,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCRM, CRMPipeline, CRMStage } from '@/hooks/useCRM';
import CRMBulkActionsPanel from './CRMBulkActionsPanel';

interface CRMBulkToolbarProps {
  selectedLeads: string[];
  onClearSelection: () => void;
  currentPipelineId: string;
}

export function CRMBulkToolbar({ selectedLeads, onClearSelection, currentPipelineId }: CRMBulkToolbarProps) {
  const queryClient = useQueryClient();
  const { pipelines, stages } = useCRM();
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [targetPipeline, setTargetPipeline] = useState<string>('');
  const [targetStage, setTargetStage] = useState<string>('');

  const targetStages = stages.filter(s => s.pipeline_id === targetPipeline);

  // Mutation to move leads
  const moveLeads = useMutation({
    mutationFn: async ({ stageId, pipelineId }: { stageId: string; pipelineId: string }) => {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          stage_id: stageId,
          pipeline_id: pipelineId,
          stage_changed_at: new Date().toISOString(),
        })
        .in('id', selectedLeads);

      if (error) throw error;
      return { count: selectedLeads.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.count} leads movidos com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      onClearSelection();
      setShowMoveDialog(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao mover leads', { description: error.message });
    },
  });

  // Mutation to delete leads
  const deleteLeads = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .in('id', selectedLeads);

      if (error) throw error;
      return { count: selectedLeads.length };
    },
    onSuccess: (data) => {
      toast.success(`${data.count} leads excluídos!`);
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      onClearSelection();
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir leads', { description: error.message });
    },
  });

  const handleMove = () => {
    if (!targetStage || !targetPipeline) {
      toast.error('Selecione o pipeline e a etapa de destino');
      return;
    }
    moveLeads.mutate({ stageId: targetStage, pipelineId: targetPipeline });
  };

  if (selectedLeads.length === 0) return null;

  return (
    <>
      {/* Floating Toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <Badge variant="secondary" className="bg-white/20 text-white font-bold">
            {selectedLeads.length}
          </Badge>
          <span className="text-sm font-medium">selecionados</span>
        </div>

        <div className="h-6 w-px bg-white/30" />

        {/* Move Button */}
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setTargetPipeline(currentPipelineId);
            setShowMoveDialog(true);
          }}
        >
          <MoveRight className="h-4 w-4" />
          Mover
        </Button>

        {/* Bulk Actions Button */}
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowBulkActions(true)}
        >
          <Send className="h-4 w-4" />
          Disparo
        </Button>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-white hover:bg-destructive hover:text-white"
          onClick={() => {
            if (confirm(`Excluir ${selectedLeads.length} leads permanentemente?`)) {
              deleteLeads.mutate();
            }
          }}
          disabled={deleteLeads.isPending}
        >
          {deleteLeads.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>

        <div className="h-6 w-px bg-white/30" />

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-white/80 hover:text-white hover:bg-white/10"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              Mover {selectedLeads.length} leads
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pipeline de destino</label>
              <Select value={targetPipeline} onValueChange={(v) => {
                setTargetPipeline(v);
                setTargetStage('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pipeline..." />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {targetPipeline && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Etapa de destino</label>
                <Select value={targetStage} onValueChange={setTargetStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {targetStages.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: s.color }} 
                          />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleMove} 
              disabled={!targetStage || moveLeads.isPending}
              className="gap-2"
            >
              {moveLeads.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Panel */}
      <CRMBulkActionsPanel
        selectedLeads={selectedLeads}
        onClose={() => setShowBulkActions(false)}
        open={showBulkActions}
      />
    </>
  );
}
