import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type InstanceRole = 'owner' | 'coordinator' | 'member' | 'viewer';

export interface MyWhatsAppInstance {
  instance_id: string;
  instance_name: string;
  status: string;
  phone_number: string | null;
  role: InstanceRole;
  last_activity: string | null;
}

interface UseMyWhatsAppInstancesReturn {
  instances: MyWhatsAppInstance[];
  loading: boolean;
  error: string | null;
  hasAccess: (instanceId: string) => boolean;
  getRole: (instanceId: string) => InstanceRole | null;
  canManageChats: (instanceId: string) => boolean;
  canAdminister: (instanceId: string) => boolean;
  refetch: () => Promise<void>;
}

export function useMyWhatsAppInstances(): UseMyWhatsAppInstancesReturn {
  const { user } = useAuth();
  const [instances, setInstances] = useState<MyWhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstances = async () => {
    if (!user?.id) {
      setInstances([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Query whatsapp_instance_members joined with whatsapp_instances
      const { data, error: fetchError } = await supabase
        .from('whatsapp_instance_members')
        .select(`
          role,
          instance_id,
          whatsapp_instances!inner (
            id,
            instance_name,
            status,
            phone_number
          )
        `)
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('[WhatsApp Security] Error fetching user instances:', fetchError);
        setError(fetchError.message);
        setInstances([]);
        return;
      }

      // Get last activity for each instance (max last_message_timestamp from chats)
      const instanceIds = (data || []).map((item: any) => item.whatsapp_instances.id);
      
      let activityMap: Record<string, string | null> = {};
      
      if (instanceIds.length > 0) {
        // Fetch latest activity for each instance
        const { data: activityData } = await supabase
          .from('whatsapp_chats')
          .select('instance_id, last_message_timestamp')
          .in('instance_id', instanceIds)
          .order('last_message_timestamp', { ascending: false });
        
        if (activityData) {
          // Group by instance and get max timestamp
          activityData.forEach((chat) => {
            if (!activityMap[chat.instance_id] || 
                (chat.last_message_timestamp && 
                 new Date(chat.last_message_timestamp) > new Date(activityMap[chat.instance_id] || 0))) {
              activityMap[chat.instance_id] = chat.last_message_timestamp;
            }
          });
        }
      }

      // Transform the data to a flat structure
      const transformedInstances: MyWhatsAppInstance[] = (data || []).map((item: any) => ({
        instance_id: item.whatsapp_instances.id,
        instance_name: item.whatsapp_instances.instance_name,
        status: item.whatsapp_instances.status,
        phone_number: item.whatsapp_instances.phone_number,
        role: item.role as InstanceRole,
        last_activity: activityMap[item.whatsapp_instances.id] || null,
      }));

      // Sort by last_activity (most recent first), null values at the end
      transformedInstances.sort((a, b) => {
        if (!a.last_activity && !b.last_activity) return 0;
        if (!a.last_activity) return 1;
        if (!b.last_activity) return -1;
        return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
      });

      // Security log: instances loaded
      console.log('[WhatsApp Security] User instances loaded:', {
        user_id: user.id,
        instance_count: transformedInstances.length,
        instances: transformedInstances.map(i => ({
          name: i.instance_name,
          role: i.role,
          last_activity: i.last_activity
        }))
      });

      setInstances(transformedInstances);
    } catch (err) {
      console.error('[WhatsApp Security] Unexpected error:', err);
      setError('Erro ao carregar instâncias');
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, [user?.id]);

  // Subscribe to realtime updates for chat changes to reorder instances
  useEffect(() => {
    if (!user?.id || instances.length === 0) return;

    const instanceIds = instances.map(i => i.instance_id);
    
    const channel = supabase
      .channel('instances_activity_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_chats',
        },
        (payload) => {
          const updatedChat = payload.new as any;
          if (instanceIds.includes(updatedChat.instance_id)) {
            // Update the instance's last_activity and re-sort
            setInstances(prev => {
              const updated = prev.map(inst => 
                inst.instance_id === updatedChat.instance_id
                  ? { ...inst, last_activity: updatedChat.last_message_timestamp }
                  : inst
              );
              
              // Re-sort by last_activity
              return updated.sort((a, b) => {
                if (!a.last_activity && !b.last_activity) return 0;
                if (!a.last_activity) return 1;
                if (!b.last_activity) return -1;
                return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, instances.length]);

  // Check if user has access to a specific instance
  const hasAccess = (instanceId: string): boolean => {
    const hasInstanceAccess = instances.some(i => i.instance_id === instanceId);
    
    if (!hasInstanceAccess) {
      console.warn('[WhatsApp Security] Unauthorized access attempt:', {
        user_id: user?.id,
        attempted_instance_id: instanceId,
        timestamp: new Date().toISOString()
      });
    }
    
    return hasInstanceAccess;
  };

  // Get user's role for a specific instance
  const getRole = (instanceId: string): InstanceRole | null => {
    const instance = instances.find(i => i.instance_id === instanceId);
    return instance?.role ?? null;
  };

  // Check if user can manage chats (coordinator or owner)
  const canManageChats = (instanceId: string): boolean => {
    const role = getRole(instanceId);
    return role === 'coordinator' || role === 'owner';
  };

  // Check if user can administer the instance (owner only)
  const canAdminister = (instanceId: string): boolean => {
    const role = getRole(instanceId);
    return role === 'owner';
  };

  return {
    instances,
    loading,
    error,
    hasAccess,
    getRole,
    canManageChats,
    canAdminister,
    refetch: fetchInstances,
  };
}
