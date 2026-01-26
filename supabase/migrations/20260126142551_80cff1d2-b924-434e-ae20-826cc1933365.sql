
-- =====================================================
-- CORREÇÃO DE RLS PARA TABELAS WHATSAPP
-- Isolamento por organization_id (que mapeia para team_id)
-- =====================================================

-- 1. Adicionar coluna organization_id em whatsapp_chats (se não existir)
ALTER TABLE public.whatsapp_chats 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 2. Popular organization_id para chats existentes baseado na instância
UPDATE public.whatsapp_chats c
SET organization_id = i.organization_id
FROM public.whatsapp_instances i
WHERE c.instance_id = i.id AND c.organization_id IS NULL;

-- 3. Criar função SECURITY DEFINER para obter organization do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- =====================================================
-- WHATSAPP_INSTANCES - Corrigir RLS
-- =====================================================

-- Remover políticas antigas incorretas
DROP POLICY IF EXISTS "Users can view own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can insert own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can update own instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can delete own instances" ON public.whatsapp_instances;

-- Criar novas políticas usando a função correta
CREATE POLICY "Users can view org instances"
ON public.whatsapp_instances FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert org instances"
ON public.whatsapp_instances FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update org instances"
ON public.whatsapp_instances FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete org instances"
ON public.whatsapp_instances FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Permitir service_role (webhook) acesso total
CREATE POLICY "Service role full access to instances"
ON public.whatsapp_instances FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- WHATSAPP_CHATS - Corrigir RLS
-- =====================================================

-- Remover políticas antigas incorretas
DROP POLICY IF EXISTS "Users can view own chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Users can update own chats" ON public.whatsapp_chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON public.whatsapp_chats;

-- Criar novas políticas usando organization_id direto (mais performático para Realtime)
CREATE POLICY "Users can view org chats"
ON public.whatsapp_chats FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert org chats"
ON public.whatsapp_chats FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update org chats"
ON public.whatsapp_chats FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete org chats"
ON public.whatsapp_chats FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id());

-- Permitir service_role (webhook) acesso total
CREATE POLICY "Service role full access to chats"
ON public.whatsapp_chats FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- WHATSAPP_MESSAGES - Corrigir RLS
-- =====================================================

-- Remover políticas antigas incorretas
DROP POLICY IF EXISTS "Users can view own messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.whatsapp_messages;

-- Criar novas políticas usando join com chats (organization_id está em chats)
CREATE POLICY "Users can view org messages"
ON public.whatsapp_messages FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT id FROM public.whatsapp_chats 
    WHERE organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Users can insert org messages"
ON public.whatsapp_messages FOR INSERT
TO authenticated
WITH CHECK (
  chat_id IN (
    SELECT id FROM public.whatsapp_chats 
    WHERE organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Users can update org messages"
ON public.whatsapp_messages FOR UPDATE
TO authenticated
USING (
  chat_id IN (
    SELECT id FROM public.whatsapp_chats 
    WHERE organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Users can delete org messages"
ON public.whatsapp_messages FOR DELETE
TO authenticated
USING (
  chat_id IN (
    SELECT id FROM public.whatsapp_chats 
    WHERE organization_id = public.get_user_organization_id()
  )
);

-- Permitir service_role (webhook) acesso total
CREATE POLICY "Service role full access to messages"
ON public.whatsapp_messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
