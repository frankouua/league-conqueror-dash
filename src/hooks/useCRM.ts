import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CRMPipeline {
  id: string;
  name: string;
  description: string | null;
  pipeline_type: string;
  icon: string;
  color: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CRMStage {
  id: string;
  pipeline_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  order_index: number;
  is_win_stage: boolean;
  is_lost_stage: boolean;
  auto_actions: any[];
  required_fields: any[];
  sla_hours: number | null;
  created_at: string;
  updated_at: string;
}

export type LeadTemperature = 'hot' | 'warm' | 'cold';

export interface CRMLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  prontuario: string | null;
  pipeline_id: string;
  stage_id: string;
  assigned_to: string | null;
  team_id: string | null;
  source: string | null;
  source_detail: string | null;
  referral_lead_id: string | null;
  patient_data_id: string | null;
  rfv_customer_id: string | null;
  budget_score: number | null;
  authority_score: number | null;
  need_score: number | null;
  timing_score: number | null;
  lead_score: number | null;
  interested_procedures: string[] | null;
  estimated_value: number | null;
  notes: string | null;
  tags: string[] | null;
  custom_fields: Record<string, any>;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  contract_value: number | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  ai_intent: string | null;
  ai_next_action: string | null;
  ai_analyzed_at: string | null;
  first_contact_at: string | null;
  last_activity_at: string | null;
  days_in_stage: number;
  total_interactions: number;
  is_priority: boolean;
  is_stale: boolean;
  stale_since: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Temperature field
  temperature: LeadTemperature;
  // Surgery fields
  surgery_date: string | null;
  surgery_location: string | null;
  surgery_notes: string | null;
  pre_surgery_checklist_completed: boolean | null;
  post_surgery_checklist_completed: boolean | null;
  // Checklist counts
  checklist_total: number | null;
  checklist_completed: number | null;
  checklist_overdue: number | null;
  // New enhanced card fields
  discount_percentage: number | null;
  discount_amount: number | null;
  original_value: number | null;
  payment_method: string | null;
  payment_installments: number | null;
  ai_score: number | null;
  ai_conversion_probability: number | null;
  next_action: string | null;
  next_action_date: string | null;
  // Joined data
  assigned_profile?: { full_name: string } | null;
  stage?: CRMStage | null;
  pipeline?: CRMPipeline | null;
}

export interface CRMLeadHistory {
  id: string;
  lead_id: string;
  action_type: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  from_pipeline_id: string | null;
  to_pipeline_id: string | null;
  title: string | null;
  description: string | null;
  metadata: Record<string, any>;
  ai_analysis: Record<string, any> | null;
  performed_by: string;
  created_at: string;
  performed_by_profile?: { full_name: string } | null;
  from_stage?: { name: string } | null;
  to_stage?: { name: string } | null;
}

export interface CRMTask {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  task_type: string;
  due_date: string;
  reminder_at: string | null;
  assigned_to: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  is_overdue: boolean;
  priority: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_profile?: { full_name: string } | null;
}

export function useCRM() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all pipelines with longer cache
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ['crm-pipelines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      return data as CRMPipeline[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes - pipelines rarely change
    gcTime: 1000 * 60 * 30,   // 30 minutes cache
  });

  // Fetch all stages with longer cache
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ['crm-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_stages')
        .select('*')
        .order('order_index');
      
      if (error) throw error;
      return data as CRMStage[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes - stages rarely change
    gcTime: 1000 * 60 * 30,   // 30 minutes cache
  });

  // Get stages for a specific pipeline
  const getStagesForPipeline = useCallback((pipelineId: string) => {
    return stages.filter(s => s.pipeline_id === pipelineId);
  }, [stages]);

  return {
    pipelines,
    stages,
    pipelinesLoading,
    stagesLoading,
    getStagesForPipeline,
  };
}

export function useCRMLeads(pipelineId?: string) {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leads for a pipeline with optimized caching
  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-leads', pipelineId],
    queryFn: async () => {
      let query = supabase
        .from('crm_leads')
        .select('*')
        .order('last_activity_at', { ascending: false });

      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Fetch assigned profiles in batch
      const userIds = [...new Set((data || []).map(l => l.assigned_to).filter(Boolean))];
      let profileMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      return (data || []).map(lead => ({
        ...lead,
        assigned_profile: lead.assigned_to ? profileMap.get(lead.assigned_to) || null : null,
      })) as CRMLead[];
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds - leads change more frequently
    gcTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Real-time subscription for leads
  useEffect(() => {
    if (!user || !pipelineId) return;

    const channel = supabase
      .channel(`crm-leads-${pipelineId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads',
          filter: `pipeline_id=eq.${pipelineId}`,
        },
        () => {
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ['crm-leads', pipelineId] });
          queryClient.invalidateQueries({ queryKey: ['crm-stats', pipelineId] });
          queryClient.invalidateQueries({ queryKey: ['crm-lead-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pipelineId, queryClient]);

  // Create lead mutation
  const createLead = useMutation({
    mutationFn: async (leadData: Partial<CRMLead>) => {
      const { data, error } = await supabase
        .from('crm_leads')
        .insert({
          name: leadData.name!,
          pipeline_id: leadData.pipeline_id!,
          stage_id: leadData.stage_id!,
          created_by: user!.id,
          email: leadData.email,
          phone: leadData.phone,
          whatsapp: leadData.whatsapp,
          source: leadData.source,
          source_detail: leadData.source_detail,
          assigned_to: leadData.assigned_to,
          team_id: leadData.team_id,
          estimated_value: leadData.estimated_value,
          notes: leadData.notes,
          tags: leadData.tags,
          interested_procedures: leadData.interested_procedures,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Log history
      await supabase.from('crm_lead_history').insert({
        lead_id: data.id,
        action_type: 'created',
        to_pipeline_id: data.pipeline_id,
        to_stage_id: data.stage_id,
        title: 'Lead criado',
        performed_by: user!.id,
      });

      // ===== CRIAR TAREFAS DO CHECKLIST PARA O ESTÁGIO INICIAL =====
      try {
        await supabase.functions.invoke('create-stage-tasks', {
          body: {
            lead_id: data.id,
            stage_id: data.stage_id,
            pipeline_id: data.pipeline_id,
            surgery_date: leadData.surgery_date,
            assigned_to: leadData.assigned_to,
          }
        });
        console.log('✅ Tarefas do checklist criadas para o novo lead', data.id);
      } catch (taskError) {
        console.error('Erro ao criar tarefas do checklist:', taskError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-checklist'] });
      toast({ title: 'Lead criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar lead', description: error.message, variant: 'destructive' });
    },
  });

  // Update lead mutation
  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMLead> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_leads')
        .update({
          ...updates,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar lead', description: error.message, variant: 'destructive' });
    },
  });

  // Move lead to different stage
  const moveLead = useMutation({
    mutationFn: async ({ 
      leadId, 
      toStageId, 
      toPipelineId,
      note 
    }: { 
      leadId: string; 
      toStageId: string; 
      toPipelineId?: string;
      note?: string;
    }) => {
      // Get current lead data including surgery_date
      const { data: currentLead } = await supabase
        .from('crm_leads')
        .select('stage_id, pipeline_id, assigned_to, surgery_date')
        .eq('id', leadId)
        .single();

      const updates: any = {
        stage_id: toStageId,
        last_activity_at: new Date().toISOString(),
        days_in_stage: 0,
      };

      if (toPipelineId) {
        updates.pipeline_id = toPipelineId;
      }

      const { data, error } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();
      
      if (error) throw error;

      // Log stage change
      await supabase.from('crm_lead_history').insert({
        lead_id: leadId,
        action_type: 'stage_change',
        from_stage_id: currentLead?.stage_id,
        to_stage_id: toStageId,
        from_pipeline_id: currentLead?.pipeline_id,
        to_pipeline_id: toPipelineId || currentLead?.pipeline_id,
        title: 'Movido para novo estágio',
        description: note,
        performed_by: user!.id,
      });

      // ===== AUTOMAÇÕES DE MUDANÇA DE ESTÁGIO =====
      
      // 1. Criar tarefas automáticas do checklist para o novo estágio
      try {
        await supabase.functions.invoke('create-stage-tasks', {
          body: {
            lead_id: leadId,
            stage_id: toStageId,
            pipeline_id: toPipelineId || currentLead?.pipeline_id,
            surgery_date: currentLead?.surgery_date,
            assigned_to: currentLead?.assigned_to,
          }
        });
        console.log('✅ Tarefas do checklist criadas para o lead', leadId);
      } catch (taskError) {
        console.error('Erro ao criar tarefas do checklist:', taskError);
      }

      // 2. Executar automações de mudança de estágio (tags, notificações, etc.)
      try {
        await supabase.functions.invoke('stage-change-automation', {
          body: {
            lead_id: leadId,
            old_stage_id: currentLead?.stage_id,
            new_stage_id: toStageId,
            performed_by: user!.id,
          }
        });
        console.log('✅ Automações de estágio executadas para o lead', leadId);
      } catch (automationError) {
        console.error('Erro nas automações de estágio:', automationError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lead-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['daily-routine-tasks'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao mover lead', description: error.message, variant: 'destructive' });
    },
  });

  // Delete lead
  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('id', leadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast({ title: 'Lead removido' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover lead', description: error.message, variant: 'destructive' });
    },
  });

  return {
    leads,
    isLoading,
    refetch,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
  };
}

export function useCRMLeadDetail(leadId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch single lead with full details
  const { data: lead, isLoading: leadLoading, refetch } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (error) throw error;

      // Get assigned profile
      let assigned_profile = null;
      if (data.assigned_to) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('user_id', data.assigned_to)
          .single();
        assigned_profile = profile;
      }

      return { ...data, assigned_profile } as CRMLead;
    },
    enabled: !!leadId && !!user,
  });

  // Fetch lead history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['crm-lead-history', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('crm_lead_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get performer profiles and stage names
      const userIds = [...new Set((data || []).map(h => h.performed_by))];
      const stageIds = [...new Set([
        ...(data || []).map(h => h.from_stage_id).filter(Boolean),
        ...(data || []).map(h => h.to_stage_id).filter(Boolean),
      ])];

      let profileMap = new Map();
      let stageMap = new Map();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      if (stageIds.length > 0) {
        const { data: stages } = await supabase
          .from('crm_stages')
          .select('id, name')
          .in('id', stageIds);
        stageMap = new Map(stages?.map(s => [s.id, s]) || []);
      }

      return (data || []).map(h => ({
        ...h,
        performed_by_profile: profileMap.get(h.performed_by) || null,
        from_stage: h.from_stage_id ? stageMap.get(h.from_stage_id) : null,
        to_stage: h.to_stage_id ? stageMap.get(h.to_stage_id) : null,
      })) as CRMLeadHistory[];
    },
    enabled: !!leadId && !!user,
  });

  // Fetch lead tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['crm-lead-tasks', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*')
        .eq('lead_id', leadId)
        .order('due_date');
      
      if (error) throw error;

      // Get assigned profiles
      const userIds = [...new Set((data || []).map(t => t.assigned_to))];
      let profileMap = new Map();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      return (data || []).map(t => ({
        ...t,
        assigned_profile: profileMap.get(t.assigned_to) || null,
      })) as CRMTask[];
    },
    enabled: !!leadId && !!user,
  });

  // Add note to lead
  const addNote = useMutation({
    mutationFn: async ({ leadId, note }: { leadId: string; note: string }) => {
      // Update lead notes
      const { data: currentLead } = await supabase
        .from('crm_leads')
        .select('notes')
        .eq('id', leadId)
        .single();

      const timestamp = new Date().toLocaleString('pt-BR');
      const newNote = `[${timestamp}] ${note}`;
      const updatedNotes = currentLead?.notes 
        ? `${newNote}\n\n${currentLead.notes}`
        : newNote;

      await supabase
        .from('crm_leads')
        .update({ 
          notes: updatedNotes,
          last_activity_at: new Date().toISOString(),
          total_interactions: (currentLead as any)?.total_interactions + 1 || 1,
        })
        .eq('id', leadId);

      // Log history
      await supabase.from('crm_lead_history').insert({
        lead_id: leadId,
        action_type: 'note',
        title: 'Nota adicionada',
        description: note,
        performed_by: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-history', leadId] });
      toast({ title: 'Nota adicionada!' });
    },
  });

  // Create task
  const createTask = useMutation({
    mutationFn: async (taskData: Partial<CRMTask>) => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .insert({
          title: taskData.title!,
          due_date: taskData.due_date!,
          lead_id: leadId!,
          created_by: user!.id,
          task_type: taskData.task_type || 'follow_up',
          priority: taskData.priority || 'medium',
          description: taskData.description,
          reminder_at: taskData.reminder_at,
          assigned_to: taskData.assigned_to || user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Log history
      await supabase.from('crm_lead_history').insert({
        lead_id: leadId,
        action_type: 'task',
        title: 'Tarefa criada',
        description: taskData.title,
        performed_by: user!.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-tasks', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-history', leadId] });
      toast({ title: 'Tarefa criada!' });
    },
  });

  // Complete task
  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('crm_tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user!.id,
        })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-tasks', leadId] });
      toast({ title: 'Tarefa concluída!' });
    },
  });

  // Analyze lead with AI
  const analyzeLead = useMutation({
    mutationFn: async () => {
      if (!leadId || !lead) throw new Error('Lead not found');

      const { data, error } = await supabase.functions.invoke('crm-ai-analyze', {
        body: { leadId, leadData: lead },
      });

      if (error) throw error;
      if (!data) throw new Error('Resposta vazia da IA');

      // Update lead with AI analysis
      await supabase
        .from('crm_leads')
        .update({
          ai_summary: data.summary,
          ai_sentiment: data.sentiment,
          ai_intent: data.intent,
          ai_next_action: data.nextAction,
          ai_analyzed_at: new Date().toISOString(),
          budget_score: data.bant?.budget,
          authority_score: data.bant?.authority,
          need_score: data.bant?.need,
          timing_score: data.bant?.timing,
        })
        .eq('id', leadId);

      // Log history
      await supabase.from('crm_lead_history').insert({
        lead_id: leadId,
        action_type: 'ai_analysis',
        title: 'Análise de IA',
        description: data.summary,
        metadata: data,
        ai_analysis: data,
        performed_by: user!.id,
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-history', leadId] });
      
      // Show detailed success toast with AI summary
      toast({ 
        title: '✨ Lead analisado pela IA!',
        description: data?.summary || 'Análise concluída com sucesso',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Erro na análise', description: error.message, variant: 'destructive' });
    },
  });

  return {
    lead,
    history,
    tasks,
    leadLoading,
    historyLoading,
    tasksLoading,
    refetch,
    addNote,
    createTask,
    completeTask,
    analyzeLead,
  };
}

export function useCRMStats(pipelineId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crm-stats', pipelineId],
    queryFn: async () => {
      let query = supabase
        .from('crm_leads')
        .select('id, stage_id, estimated_value, contract_value, won_at, lost_at, created_at, is_stale');

      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const leads = data || [];
      const totalLeads = leads.length;
      const wonLeads = leads.filter(l => l.won_at).length;
      const lostLeads = leads.filter(l => l.lost_at).length;
      const staleLeads = leads.filter(l => l.is_stale).length;
      const totalValue = leads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);
      const wonValue = leads.filter(l => l.won_at).reduce((acc, l) => acc + (l.contract_value || 0), 0);
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      // Group by stage
      const byStage = leads.reduce((acc, l) => {
        acc[l.stage_id] = (acc[l.stage_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalLeads,
        wonLeads,
        lostLeads,
        staleLeads,
        totalValue,
        wonValue,
        conversionRate,
        byStage,
      };
    },
    enabled: !!user,
  });
}
