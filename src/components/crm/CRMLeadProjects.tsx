import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Percent, Gift, Plus, Loader2, CheckCircle2, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiscountProject {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number;
  is_active: boolean;
}

interface LeadProject {
  id: string;
  lead_id: string;
  project_id: string;
  status: string;
  committed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  discount_projects?: DiscountProject;
}

interface CRMLeadProjectsProps {
  leadId: string;
  totalDiscount?: number | null;
  projectCount?: number | null;
}

export function CRMLeadProjects({ leadId, totalDiscount, projectCount }: CRMLeadProjectsProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

  const { data: availableProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['discount-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_projects')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as DiscountProject[];
    },
  });

  const { data: leadProjects, isLoading: leadProjectsLoading } = useQuery({
    queryKey: ['lead-projects', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_projects')
        .select('*, discount_projects(*)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeadProject[];
    },
  });

  const addProjectMutation = useMutation({
    mutationFn: async () => {
      // Check if already at max (2 projects)
      if (leadProjects && leadProjects.length >= 2) {
        throw new Error('Máximo de 2 projetos por paciente');
      }

      const { error } = await supabase
        .from('lead_projects')
        .insert({
          lead_id: leadId,
          project_id: selectedProject,
          status: 'committed',
          committed_at: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-projects', leadId] });
      setShowAddDialog(false);
      setSelectedProject('');
      toast.success('Projeto adicionado!');
    },
    onError: (error) => {
      toast.error('Erro: ' + (error as Error).message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, string | null> = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('lead_projects')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-projects', leadId] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error('Erro: ' + (error as Error).message);
    },
  });

  const removeProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-projects', leadId] });
      toast.success('Projeto removido!');
    },
    onError: (error) => {
      toast.error('Erro: ' + (error as Error).message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" />Concluído</Badge>;
      case 'in_progress':
        return <Badge className="gap-1 bg-blue-500"><Clock className="h-3 w-3" />Em Andamento</Badge>;
      case 'committed':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Comprometido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const assignedProjectIds = leadProjects?.map(lp => lp.project_id) || [];
  const availableToAdd = availableProjects?.filter(p => !assignedProjectIds.includes(p.id)) || [];
  const canAddMore = (leadProjects?.length || 0) < 2;

  const isLoading = projectsLoading || leadProjectsLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Projetos (Desconto)
            </CardTitle>
            {(totalDiscount || 0) > 0 && (
              <Badge className="gap-1 bg-green-500">
                <Percent className="h-3 w-3" />
                {totalDiscount}% desconto
              </Badge>
            )}
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="gap-1"
                disabled={!canAddMore || availableToAdd.length === 0}
              >
                <Plus className="h-3 w-3" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Projeto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cada projeto dá direito a 5% de desconto. Máximo de 2 projetos (10% desconto).
                </p>
                
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.discount_percentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedProject && (
                  <div className="p-3 rounded-lg bg-muted/30 text-sm">
                    {availableProjects?.find(p => p.id === selectedProject)?.description || 'Sem descrição'}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => addProjectMutation.mutate()}
                  disabled={!selectedProject || addProjectMutation.isPending}
                >
                  {addProjectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : leadProjects && leadProjects.length > 0 ? (
          <div className="space-y-3">
            {leadProjects.map((lp) => (
              <div
                key={lp.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {lp.discount_projects?.name || 'Projeto'}
                    </span>
                    {getStatusBadge(lp.status)}
                    <Badge variant="outline" className="text-xs">
                      {lp.discount_projects?.discount_percentage || 5}%
                    </Badge>
                  </div>
                  {lp.committed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Comprometido em {format(new Date(lp.committed_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={lp.status}
                    onValueChange={(value) => updateStatusMutation.mutate({ id: lp.id, status: value })}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="committed">Comprometido</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (confirm('Remover este projeto?')) {
                        removeProjectMutation.mutate(lp.id);
                      }
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum projeto vinculado</p>
            <p className="text-xs mt-1">Adicione projetos para oferecer desconto</p>
          </div>
        )}

        {!canAddMore && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Máximo de 2 projetos atingido
          </p>
        )}
      </CardContent>
    </Card>
  );
}
