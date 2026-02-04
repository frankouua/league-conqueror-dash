import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UploadJob {
  id: string;
  user_id: string;
  upload_type: 'vendas' | 'executado';
  import_mode: 'replace' | 'add_new';
  file_name: string | null;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  skipped_rows: number;
  deleted_rows: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  upload_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface UseUploadJobsOptions {
  autoRefresh?: boolean;
}

export function useUploadJobs(options: UseUploadJobsOptions = {}) {
  const { autoRefresh = true } = options;
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [activeJob, setActiveJob] = useState<UploadJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('upload_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const typedJobs = (data || []) as UploadJob[];
      setJobs(typedJobs);

      // Find active job (queued or processing)
      const active = typedJobs.find(j => j.status === 'queued' || j.status === 'processing');
      setActiveJob(active || null);
    } catch (error) {
      console.error('[useUploadJobs] Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!autoRefresh) return;

    fetchJobs();

    const channel = supabase
      .channel('upload_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'upload_jobs',
        },
        (payload) => {
          console.log('[useUploadJobs] Realtime update:', payload);

          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as UploadJob;
            setJobs(prev => [newJob, ...prev.slice(0, 9)]);
            setActiveJob(newJob);
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as UploadJob;
            setJobs(prev =>
              prev.map(j => (j.id === updatedJob.id ? updatedJob : j))
            );

            // Update active job if it's the one being updated
            setActiveJob(prev => (prev?.id === updatedJob.id ? updatedJob : prev));

            // Show toast when completed
            if (updatedJob.status === 'completed') {
              toast({
                title: updatedJob.upload_type === 'vendas' ? '🎉 Vendas Importadas!' : '✅ Executado Importado!',
                description: `${updatedJob.imported_rows} registros importados com sucesso!`,
                duration: 10000,
              });
              setActiveJob(null);
            } else if (updatedJob.status === 'failed') {
              toast({
                title: '❌ Erro na Importação',
                description: updatedJob.error_message || 'Ocorreu um erro durante o processamento.',
                variant: 'destructive',
                duration: 10000,
              });
              setActiveJob(null);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setJobs(prev => prev.filter(j => j.id !== deletedId));
            setActiveJob(prev => (prev?.id === deletedId ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autoRefresh, fetchJobs, toast]);

  const startBackgroundUpload = useCallback(
    async (params: {
      uploadType: 'vendas' | 'executado';
      importMode: 'replace' | 'add_new';
      sales: unknown[];
      fileName: string;
      sheetName: string;
      uploadedByName: string;
    }) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Não autenticado');
        }

        const response = await supabase.functions.invoke('process-sales-upload', {
          body: params,
        });

        if (response.error) {
          throw new Error(response.error.message || 'Erro ao iniciar upload');
        }

        const result = response.data as { success: boolean; jobId: string; message: string };

        toast({
          title: '🚀 Upload Iniciado',
          description: 'O processamento está rodando em background. Você pode acompanhar o progresso aqui.',
        });

        return result;
      } catch (error) {
        console.error('[useUploadJobs] Error starting upload:', error);
        toast({
          title: 'Erro ao iniciar upload',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [toast]
  );

  return {
    jobs,
    activeJob,
    isLoading,
    fetchJobs,
    startBackgroundUpload,
  };
}
