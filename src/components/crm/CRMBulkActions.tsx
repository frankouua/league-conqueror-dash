import { useState } from 'react';
import { 
  CheckSquare, Trash2, UserPlus, Tag, Star, 
  ArrowRight, Loader2, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { CRMLead, CRMStage } from '@/hooks/useCRM';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CRMBulkActionsProps {
  selectedLeads: string[];
  leads: CRMLead[];
  stages: CRMStage[];
  pipelineId: string;
  onClearSelection: () => void;
  teamMembers?: { user_id: string; full_name: string }[];
}

export function CRMBulkActions({
  selectedLeads,
  leads,
  stages,
  pipelineId,
  onClearSelection,
  teamMembers = [],
}: CRMBulkActionsProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState('');

  const selectedCount = selectedLeads.length;

  if (selectedCount === 0) return null;

  const handleBulkMove = async (stageId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ 
          stage_id: stageId,
          last_activity_at: new Date().toISOString(),
        })
        .in('id', selectedLeads);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['crm-leads', pipelineId] });
      toast.success(`${selectedCount} leads movidos`);
      onClearSelection();
    } catch (error) {
      toast.error('Erro ao mover leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAssign = async (userId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ 
          assigned_to: userId,
          last_activity_at: new Date().toISOString(),
        })
        .in('id', selectedLeads);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['crm-leads', pipelineId] });
      toast.success(`${selectedCount} leads atribuídos`);
      onClearSelection();
    } catch (error) {
      toast.error('Erro ao atribuir leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkPriority = async (isPriority: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ is_priority: isPriority })
        .in('id', selectedLeads);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['crm-leads', pipelineId] });
      toast.success(`${selectedCount} leads ${isPriority ? 'priorizados' : 'despriorizado'}`);
      onClearSelection();
    } catch (error) {
      toast.error('Erro ao atualizar prioridade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkTag = async () => {
    if (!newTag.trim()) return;
    
    setIsLoading(true);
    try {
      // Get current leads to append tag
      const selectedLeadData = leads.filter(l => selectedLeads.includes(l.id));
      
      for (const lead of selectedLeadData) {
        const currentTags = lead.tags || [];
        if (!currentTags.includes(newTag.trim())) {
          await supabase
            .from('crm_leads')
            .update({ tags: [...currentTags, newTag.trim()] })
            .eq('id', lead.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['crm-leads', pipelineId] });
      toast.success(`Tag adicionada em ${selectedCount} leads`);
      setNewTag('');
      onClearSelection();
    } catch (error) {
      toast.error('Erro ao adicionar tag');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedCount} leads?`)) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .in('id', selectedLeads);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['crm-leads', pipelineId] });
      toast.success(`${selectedCount} leads excluídos`);
      onClearSelection();
    } catch (error) {
      toast.error('Erro ao excluir leads');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border shadow-lg">
        {/* Selected Count */}
        <Badge variant="secondary" className="gap-1">
          <CheckSquare className="h-3 w-3" />
          {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
        </Badge>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Move to Stage */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <ArrowRight className="h-4 w-4 mr-1" />
              Mover
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="space-y-1">
              {stages.map(stage => (
                <Button
                  key={stage.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => handleBulkMove(stage.id)}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: stage.color }}
                  />
                  {stage.name}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Assign */}
        {teamMembers.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <UserPlus className="h-4 w-4 mr-1" />
                Atribuir
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {teamMembers.map(member => (
                  <Button
                    key={member.user_id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleBulkAssign(member.user_id)}
                  >
                    {member.full_name}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Priority */}
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => handleBulkPriority(true)}
        >
          <Star className="h-4 w-4 mr-1" />
          Priorizar
        </Button>

        {/* Add Tag */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <Tag className="h-4 w-4 mr-1" />
              Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nome da tag"
                className="h-8"
              />
              <Button size="sm" onClick={handleBulkTag}>
                +
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete */}
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={handleBulkDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>

        {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
      </div>
    </div>
  );
}
