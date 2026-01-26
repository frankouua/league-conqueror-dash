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

      // Transform the data to a flat structure
      const transformedInstances: MyWhatsAppInstance[] = (data || []).map((item: any) => ({
        instance_id: item.whatsapp_instances.id,
        instance_name: item.whatsapp_instances.instance_name,
        status: item.whatsapp_instances.status,
        phone_number: item.whatsapp_instances.phone_number,
        role: item.role as InstanceRole,
      }));

      // Security log: instances loaded
      console.log('[WhatsApp Security] User instances loaded:', {
        user_id: user.id,
        instance_count: transformedInstances.length,
        instances: transformedInstances.map(i => ({
          name: i.instance_name,
          role: i.role
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
