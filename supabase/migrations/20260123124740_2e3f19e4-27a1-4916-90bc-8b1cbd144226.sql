-- =====================================================
-- INTEGRAÇÃO WHATSAPP VIA UAZAPI - ETAPA 1
-- Criação das tabelas, realtime e políticas RLS
-- =====================================================

-- ==================== TABELAS ====================

-- Tabela de Instâncias WhatsApp (UAZAPI)
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  instance_name TEXT NOT NULL UNIQUE,
  instance_id TEXT,
  api_key TEXT,
  status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Chats WhatsApp
CREATE TABLE whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  contact_name TEXT,
  contact_number TEXT,
  contact_photo_url TEXT,
  unread_count INTEGER DEFAULT 0,
  last_message_timestamp TIMESTAMPTZ,
  is_group BOOLEAN DEFAULT FALSE,
  group_metadata JSONB,
  deal_id BIGINT,
  contact_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Mensagens WhatsApp
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  from_me BOOLEAN DEFAULT FALSE,
  sender_name TEXT,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  message_timestamp TIMESTAMPTZ NOT NULL,
  status TEXT,
  raw_data JSONB,
  transcription TEXT,
  transcription_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, message_id)
);

-- ==================== REALTIME ====================
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_chats;

-- ==================== RLS ====================

-- Habilitar RLS nas tabelas
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Política para instâncias
CREATE POLICY "Users can view own instances" 
ON whatsapp_instances FOR SELECT 
USING (organization_id = auth.uid());

CREATE POLICY "Users can insert own instances" 
ON whatsapp_instances FOR INSERT 
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Users can update own instances" 
ON whatsapp_instances FOR UPDATE 
USING (organization_id = auth.uid());

CREATE POLICY "Users can delete own instances" 
ON whatsapp_instances FOR DELETE 
USING (organization_id = auth.uid());

-- Política para chats
CREATE POLICY "Users can view own chats" 
ON whatsapp_chats FOR SELECT 
USING (instance_id IN (
  SELECT id FROM whatsapp_instances WHERE organization_id = auth.uid()
));

CREATE POLICY "Users can insert own chats" 
ON whatsapp_chats FOR INSERT 
WITH CHECK (instance_id IN (
  SELECT id FROM whatsapp_instances WHERE organization_id = auth.uid()
));

CREATE POLICY "Users can update own chats" 
ON whatsapp_chats FOR UPDATE 
USING (instance_id IN (
  SELECT id FROM whatsapp_instances WHERE organization_id = auth.uid()
));

-- Política para mensagens
CREATE POLICY "Users can view own messages" 
ON whatsapp_messages FOR SELECT 
USING (chat_id IN (
  SELECT id FROM whatsapp_chats 
  WHERE instance_id IN (
    SELECT id FROM whatsapp_instances WHERE organization_id = auth.uid()
  )
));

CREATE POLICY "Users can insert own messages" 
ON whatsapp_messages FOR INSERT 
WITH CHECK (chat_id IN (
  SELECT id FROM whatsapp_chats 
  WHERE instance_id IN (
    SELECT id FROM whatsapp_instances WHERE organization_id = auth.uid()
  )
));

-- ==================== ÍNDICES ====================
CREATE INDEX idx_whatsapp_chats_instance ON whatsapp_chats(instance_id);
CREATE INDEX idx_whatsapp_chats_remote_jid ON whatsapp_chats(remote_jid);
CREATE INDEX idx_whatsapp_messages_chat ON whatsapp_messages(chat_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON whatsapp_messages(message_timestamp DESC);
CREATE INDEX idx_whatsapp_instances_org ON whatsapp_instances(organization_id);