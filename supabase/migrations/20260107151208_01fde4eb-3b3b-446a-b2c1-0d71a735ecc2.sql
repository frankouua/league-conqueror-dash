-- Adicionar campo de temperatura do lead
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'warm' 
CHECK (temperature IN ('hot', 'warm', 'cold'));

-- Comentário descritivo
COMMENT ON COLUMN public.crm_leads.temperature IS 'Temperatura do lead: hot (quente), warm (morno), cold (frio)';

-- Criar tabela para chat interno do CRM
CREATE TABLE IF NOT EXISTS public.crm_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'note', 'system', 'file')),
  is_internal BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_chat_messages_lead_id ON public.crm_chat_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_chat_messages_created_at ON public.crm_chat_messages(created_at DESC);

-- RLS
ALTER TABLE public.crm_chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem ver mensagens" 
ON public.crm_chat_messages 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem enviar mensagens" 
ON public.crm_chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem deletar próprias mensagens" 
ON public.crm_chat_messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Habilitar realtime para o chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_chat_messages;