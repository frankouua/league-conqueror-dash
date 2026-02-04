import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { useUploadJobs, UploadJob } from '@/hooks/useUploadJobs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UploadJobsMonitorProps {
  onJobComplete?: () => void;
}

export default function UploadJobsMonitor({ onJobComplete }: UploadJobsMonitorProps) {
  const { jobs, activeJob, isLoading, fetchJobs } = useUploadJobs();
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);

  // Trigger callback when a job completes
  useEffect(() => {
    if (activeJob === null && jobs.length > 0) {
      const latestJob = jobs[0];
      if (
        latestJob.status === 'completed' &&
        latestJob.id !== lastCompletedId
      ) {
        setLastCompletedId(latestJob.id);
        onJobComplete?.();
      }
    }
  }, [activeJob, jobs, lastCompletedId, onJobComplete]);

  if (isLoading) {
    return null;
  }

  // Only show if there are recent jobs (last 24h) or active job
  const recentJobs = jobs.filter(j => {
    const createdAt = new Date(j.created_at);
    const now = new Date();
    const hoursSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSince < 24 || j.status === 'processing' || j.status === 'queued';
  });

  if (recentJobs.length === 0) {
    return null;
  }

  const getStatusIcon = (status: UploadJob['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusLabel = (status: UploadJob['status']) => {
    switch (status) {
      case 'queued':
        return 'Na fila';
      case 'processing':
        return 'Processando';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
    }
  };

  const getStatusColor = (status: UploadJob['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-muted text-muted-foreground';
      case 'processing':
        return 'bg-primary/20 text-primary';
      case 'completed':
        return 'bg-green-500/20 text-green-700';
      case 'failed':
        return 'bg-destructive/20 text-destructive';
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Uploads em Processamento
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchJobs}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentJobs.slice(0, 3).map((job) => (
          <div
            key={job.id}
            className={cn(
              'p-3 rounded-lg border transition-all',
              job.status === 'processing' && 'border-primary/50 bg-primary/5',
              job.status === 'completed' && 'border-green-500/30 bg-green-500/5',
              job.status === 'failed' && 'border-destructive/30 bg-destructive/5',
              job.status === 'queued' && 'border-muted bg-muted/50'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                <span className="text-sm font-medium">
                  {job.upload_type === 'vendas' ? 'Vendas' : 'Executado'}
                </span>
                <Badge variant="outline" className={cn('text-[10px]', getStatusColor(job.status))}>
                  {getStatusLabel(job.status)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(job.created_at), "HH:mm", { locale: ptBR })}
              </span>
            </div>

            {(job.status === 'processing' || job.status === 'queued') && (
              <div className="space-y-1">
                <Progress value={job.progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{job.progress}% concluído</span>
                  <span>
                    {job.imported_rows}/{job.total_rows} registros
                  </span>
                </div>
              </div>
            )}

            {job.status === 'completed' && (
              <div className="text-xs text-muted-foreground">
                ✅ {job.imported_rows} importados
                {job.skipped_rows > 0 && ` • ${job.skipped_rows} ignorados`}
                {job.failed_rows > 0 && ` • ${job.failed_rows} erros`}
              </div>
            )}

            {job.status === 'failed' && job.error_message && (
              <div className="text-xs text-destructive">
                {job.error_message}
              </div>
            )}

            {job.file_name && (
              <div className="text-xs text-muted-foreground mt-1 truncate">
                📄 {job.file_name}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
