import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCRMCadences(pipelineId?: string) {
  const queryClient = useQueryClient();

  const cadences = useQuery({
    queryKey: ['crm-cadences', pipelineId],
    queryFn: async () => {
      let query = supabase
        .from('crm_cadences')
        .select(`
          *,
          pipeline:crm_pipelines(id, name, pipeline_type),
          stage:crm_stages(id, name)
        `)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const cadenceExecutions = useQuery({
    queryKey: ['crm-cadence-executions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_cadence_executions')
        .select(`
          *,
          cadence:crm_cadences(id, name, action_type),
          lead:crm_leads(id, name, phone)
        `)
        .order('scheduled_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  const pendingExecutions = useQuery({
    queryKey: ['crm-cadence-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_cadence_executions')
        .select(`
          *,
          cadence:crm_cadences(id, name, action_type, message_template),
          lead:crm_leads(id, name, phone, email, assigned_to)
        `)
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const createCadence = useMutation({
    mutationFn: async (cadence: {
      name: string;
      pipeline_id: string;
      stage_id?: string;
      action_type: string;
      delay_hours: number;
      message_template?: string;
      order_index?: number;
    }) => {
      const { data, error } = await supabase
        .from('crm_cadences')
        .insert(cadence)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadences'] });
    },
  });

  const updateCadence = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase
        .from('crm_cadences')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadences'] });
    },
  });

  const executeCadences = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('execute-cadences');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadence-executions'] });
      queryClient.invalidateQueries({ queryKey: ['crm-cadence-pending'] });
    },
  });

  const markExecutionComplete = useMutation({
    mutationFn: async ({ id, result }: { id: string; result?: Record<string, string | number | boolean | null> }) => {
      const { data, error } = await supabase
        .from('crm_cadence_executions')
        .update({
          status: 'completed',
          executed_at: new Date().toISOString(),
          result: result as unknown as null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadence-executions'] });
      queryClient.invalidateQueries({ queryKey: ['crm-cadence-pending'] });
    },
  });

  return {
    cadences,
    cadenceExecutions,
    pendingExecutions,
    createCadence,
    updateCadence,
    executeCadences,
    markExecutionComplete,
  };
}
