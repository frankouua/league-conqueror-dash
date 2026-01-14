import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCRMSLA() {
  const queryClient = useQueryClient();

  const slaConfigs = useQuery({
    queryKey: ['crm-sla-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_sla_config')
        .select(`
          *,
          stage:crm_stages(id, name, pipeline_id)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const alertConfigs = useQuery({
    queryKey: ['crm-alert-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_alert_config')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
  });

  const leadsWithSLABreach = useQuery({
    queryKey: ['crm-sla-breaches'],
    queryFn: async () => {
      // Get all SLA configs
      const { data: slaData } = await supabase
        .from('crm_sla_config')
        .select('*')
        .eq('is_active', true);
      
      if (!slaData?.length) return [];
      
      // Get active leads
      const { data: leads, error } = await supabase
        .from('crm_leads')
        .select(`
          *,
          stage:crm_stages(id, name, pipeline_id),
          assigned_user:profiles!crm_leads_assigned_to_fkey(full_name, avatar_url)
        `)
        .is('won_at', null)
        .is('lost_at', null);
      
      if (error) throw error;
      
      // Check SLA breaches
      const now = new Date();
      return leads?.filter(lead => {
        const stageConfig = slaData.find(s => s.stage_id === lead.stage_id);
        if (!stageConfig) return false;
        
        const lastActivity = lead.last_activity_at ? new Date(lead.last_activity_at) : new Date(lead.created_at);
        const hoursInStage = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        return hoursInStage > stageConfig.max_hours;
      }).map(lead => {
        const stageConfig = slaData.find(s => s.stage_id === lead.stage_id);
        const lastActivity = lead.last_activity_at ? new Date(lead.last_activity_at) : new Date(lead.created_at);
        const hoursInStage = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        return {
          ...lead,
          slaConfig: stageConfig,
          hoursOverdue: hoursInStage - (stageConfig?.max_hours || 0),
        };
      }) || [];
    },
  });

  const updateSLAConfig = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; max_hours?: number; warning_hours?: number; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('crm_sla_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-sla-configs'] });
      queryClient.invalidateQueries({ queryKey: ['crm-sla-breaches'] });
    },
  });

  const checkSLAAlerts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-sla-alerts');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-sla-breaches'] });
    },
  });

  return {
    slaConfigs,
    alertConfigs,
    leadsWithSLABreach,
    updateSLAConfig,
    checkSLAAlerts,
  };
}
