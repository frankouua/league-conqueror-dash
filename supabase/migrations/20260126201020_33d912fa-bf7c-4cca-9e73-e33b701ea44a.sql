-- =====================================================
-- WHATSAPP CRM PROFESSIONAL - NASA LEVEL IMPLEMENTATION
-- =====================================================

-- 1. Tabela de chamadas WhatsApp
CREATE TABLE public.whatsapp_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.whatsapp_chats(id) ON DELETE SET NULL,
  remote_jid TEXT NOT NULL,
  call_id TEXT,
  call_type TEXT NOT NULL DEFAULT 'voice', -- voice, video
  call_status TEXT NOT NULL DEFAULT 'incoming', -- incoming, outgoing, missed, rejected
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  is_group BOOLEAN DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de labels/etiquetas UAZAPI
CREATE TABLE public.whatsapp_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_id, label_id)
);

-- 3. Tabela de associação chat-label
CREATE TABLE public.whatsapp_chat_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.whatsapp_labels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, label_id)
);

-- 4. Tabela de contatos sincronizados
CREATE TABLE public.whatsapp_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  phone_number TEXT,
  push_name TEXT,
  business_name TEXT,
  profile_picture_url TEXT,
  is_business BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMP WITH TIME ZONE,
  verified_name TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_id, remote_jid)
);

-- 5. Tabela de grupos
CREATE TABLE public.whatsapp_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  group_jid TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  owner_jid TEXT,
  creation_timestamp TIMESTAMP WITH TIME ZONE,
  participant_count INTEGER DEFAULT 0,
  is_announce BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_ephemeral BOOLEAN DEFAULT false,
  ephemeral_duration INTEGER,
  invite_link TEXT,
  picture_url TEXT,
  participants JSONB, -- array of {jid, admin, superAdmin}
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_id, group_jid)
);

-- 6. Tabela de leads UAZAPI (integração com CRM externo)
CREATE TABLE public.whatsapp_uazapi_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.whatsapp_chats(id) ON DELETE SET NULL,
  remote_jid TEXT NOT NULL,
  lead_id TEXT, -- ID do lead no UAZAPI
  status TEXT,
  funnel_stage TEXT,
  assigned_attendant TEXT,
  custom_fields JSONB,
  tags TEXT[],
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Adicionar colunas extras ao whatsapp_chats para presence e metadata
ALTER TABLE public.whatsapp_chats 
ADD COLUMN IF NOT EXISTS is_typing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS typing_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_recording BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- 8. Tabela de histórico de sincronização
CREATE TABLE public.whatsapp_sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- messages, contacts, groups, chats
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_whatsapp_calls_instance ON public.whatsapp_calls(instance_id);
CREATE INDEX idx_whatsapp_calls_chat ON public.whatsapp_calls(chat_id);
CREATE INDEX idx_whatsapp_calls_created ON public.whatsapp_calls(created_at DESC);

CREATE INDEX idx_whatsapp_labels_instance ON public.whatsapp_labels(instance_id);

CREATE INDEX idx_whatsapp_chat_labels_chat ON public.whatsapp_chat_labels(chat_id);
CREATE INDEX idx_whatsapp_chat_labels_label ON public.whatsapp_chat_labels(label_id);

CREATE INDEX idx_whatsapp_contacts_instance ON public.whatsapp_contacts(instance_id);
CREATE INDEX idx_whatsapp_contacts_jid ON public.whatsapp_contacts(remote_jid);
CREATE INDEX idx_whatsapp_contacts_blocked ON public.whatsapp_contacts(is_blocked) WHERE is_blocked = true;

CREATE INDEX idx_whatsapp_groups_instance ON public.whatsapp_groups(instance_id);
CREATE INDEX idx_whatsapp_groups_jid ON public.whatsapp_groups(group_jid);

CREATE INDEX idx_whatsapp_uazapi_leads_instance ON public.whatsapp_uazapi_leads(instance_id);
CREATE INDEX idx_whatsapp_uazapi_leads_chat ON public.whatsapp_uazapi_leads(chat_id);

CREATE INDEX idx_whatsapp_chats_typing ON public.whatsapp_chats(is_typing) WHERE is_typing = true;

CREATE INDEX idx_whatsapp_sync_history_instance ON public.whatsapp_sync_history(instance_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.whatsapp_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chat_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_uazapi_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sync_history ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_calls
CREATE POLICY "Users can view calls from their instances" ON public.whatsapp_calls
FOR SELECT USING (public.has_instance_access(instance_id) OR public.is_admin());

CREATE POLICY "Service role can manage calls" ON public.whatsapp_calls
FOR ALL USING (auth.role() = 'service_role');

-- Políticas para whatsapp_labels
CREATE POLICY "Users can view labels from their instances" ON public.whatsapp_labels
FOR SELECT USING (public.has_instance_access(instance_id) OR public.is_admin());

CREATE POLICY "Service role can manage labels" ON public.whatsapp_labels
FOR ALL USING (auth.role() = 'service_role');

-- Políticas para whatsapp_chat_labels
CREATE POLICY "Users can view chat labels from accessible chats" ON public.whatsapp_chat_labels
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_chats c
    WHERE c.id = chat_id AND public.has_instance_access(c.instance_id)
  ) OR public.is_admin()
);

CREATE POLICY "Service role can manage chat labels" ON public.whatsapp_chat_labels
FOR ALL USING (auth.role() = 'service_role');

-- Políticas para whatsapp_contacts
CREATE POLICY "Users can view contacts from their instances" ON public.whatsapp_contacts
FOR SELECT USING (public.has_instance_access(instance_id) OR public.is_admin());

CREATE POLICY "Service role can manage contacts" ON public.whatsapp_contacts
FOR ALL USING (auth.role() = 'service_role');

-- Políticas para whatsapp_groups
CREATE POLICY "Users can view groups from their instances" ON public.whatsapp_groups
FOR SELECT USING (public.has_instance_access(instance_id) OR public.is_admin());

CREATE POLICY "Service role can manage groups" ON public.whatsapp_groups
FOR ALL USING (auth.role() = 'service_role');

-- Políticas para whatsapp_uazapi_leads
CREATE POLICY "Users can view uazapi leads from their instances" ON public.whatsapp_uazapi_leads
FOR SELECT USING (public.has_instance_access(instance_id) OR public.is_admin());

CREATE POLICY "Service role can manage uazapi leads" ON public.whatsapp_uazapi_leads
FOR ALL USING (auth.role() = 'service_role');

-- Políticas para whatsapp_sync_history
CREATE POLICY "Users can view sync history from their instances" ON public.whatsapp_sync_history
FOR SELECT USING (public.has_instance_access(instance_id) OR public.is_admin());

CREATE POLICY "Service role can manage sync history" ON public.whatsapp_sync_history
FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- REALTIME PARA PRESENCE E TYPING
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_labels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chat_labels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_groups;