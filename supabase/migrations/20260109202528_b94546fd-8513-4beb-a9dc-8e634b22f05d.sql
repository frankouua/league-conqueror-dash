-- Table to track knowledge base article/manual readings
CREATE TABLE public.knowledge_base_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  article_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_spent_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  CONSTRAINT fk_article FOREIGN KEY (article_id) REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_article UNIQUE(user_id, article_id)
);

-- Enable RLS
ALTER TABLE public.knowledge_base_reads ENABLE ROW LEVEL SECURITY;

-- Users can view their own reads
CREATE POLICY "Users can view their own reads"
ON public.knowledge_base_reads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own reads
CREATE POLICY "Users can insert their own reads"
ON public.knowledge_base_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reads
CREATE POLICY "Users can update their own reads"
ON public.knowledge_base_reads
FOR UPDATE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_kb_reads_user_id ON public.knowledge_base_reads(user_id);
CREATE INDEX idx_kb_reads_article_id ON public.knowledge_base_reads(article_id);