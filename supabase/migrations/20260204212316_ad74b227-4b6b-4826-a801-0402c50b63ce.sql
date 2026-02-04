-- Create upload_jobs table for background processing
CREATE TABLE IF NOT EXISTS public.upload_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('vendas', 'executado')),
  import_mode TEXT NOT NULL DEFAULT 'replace' CHECK (import_mode IN ('replace', 'add_new')),
  file_name TEXT,
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  deleted_rows INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  upload_id UUID REFERENCES public.sales_upload_logs(id),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.upload_jobs ENABLE ROW LEVEL SECURITY;

-- Users can see their own jobs
CREATE POLICY "Users can view their own upload jobs"
ON public.upload_jobs
FOR SELECT
USING (auth.uid() = user_id);

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_jobs;

-- Create index for user lookups
CREATE INDEX idx_upload_jobs_user_id ON public.upload_jobs(user_id);
CREATE INDEX idx_upload_jobs_status ON public.upload_jobs(status);
CREATE INDEX idx_upload_jobs_created_at ON public.upload_jobs(created_at DESC);