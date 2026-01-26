-- =====================================================
-- WHATSAPP INSTANCE MEMBERS - Controle de Acesso
-- =====================================================

-- 1️⃣ Criar tabela de vínculo usuário-instância
CREATE TABLE public.whatsapp_instance_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'coordinator', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: um usuário só pode ter um papel por instância
  CONSTRAINT unique_instance_user UNIQUE (instance_id, user_id)
);

-- 2️⃣ Criar índices para performance
CREATE INDEX idx_whatsapp_instance_members_instance_id ON public.whatsapp_instance_members(instance_id);
CREATE INDEX idx_whatsapp_instance_members_user_id ON public.whatsapp_instance_members(user_id);

-- 3️⃣ Habilitar RLS
ALTER TABLE public.whatsapp_instance_members ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Função SECURITY DEFINER para verificar papel do usuário na instância
CREATE OR REPLACE FUNCTION public.get_user_instance_role(p_instance_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.whatsapp_instance_members
  WHERE instance_id = p_instance_id
    AND user_id = p_user_id
  LIMIT 1;
$$;

-- Função para verificar se usuário tem acesso à instância
CREATE OR REPLACE FUNCTION public.has_instance_access(p_instance_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whatsapp_instance_members
    WHERE instance_id = p_instance_id
      AND user_id = auth.uid()
  );
$$;

-- Função para verificar se usuário pode gerenciar membros da instância
CREATE OR REPLACE FUNCTION public.can_manage_instance_members(p_instance_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whatsapp_instance_members
    WHERE instance_id = p_instance_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'coordinator')
  );
$$;

-- 5️⃣ Políticas RLS para whatsapp_instance_members

-- SELECT: usuário vê apenas seus próprios vínculos
CREATE POLICY "Users can view their own instance memberships"
  ON public.whatsapp_instance_members
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: apenas owners/coordinators podem adicionar membros
CREATE POLICY "Owners and coordinators can add members"
  ON public.whatsapp_instance_members
  FOR INSERT
  WITH CHECK (
    public.can_manage_instance_members(instance_id)
    OR NOT EXISTS (
      SELECT 1 FROM public.whatsapp_instance_members WHERE instance_id = whatsapp_instance_members.instance_id
    ) -- Permite criar primeiro membro (owner)
  );

-- UPDATE: apenas owners/coordinators podem atualizar
CREATE POLICY "Owners and coordinators can update members"
  ON public.whatsapp_instance_members
  FOR UPDATE
  USING (public.can_manage_instance_members(instance_id));

-- DELETE: apenas owners/coordinators podem remover (exceto a si mesmo se for o único owner)
CREATE POLICY "Owners and coordinators can delete members"
  ON public.whatsapp_instance_members
  FOR DELETE
  USING (public.can_manage_instance_members(instance_id));

-- 6️⃣ Ajustar políticas de whatsapp_instances

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view instances from their organization" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can view their organization instances" ON public.whatsapp_instances;

-- Nova política: SELECT apenas se tiver membership
CREATE POLICY "Users can view instances they are members of"
  ON public.whatsapp_instances
  FOR SELECT
  USING (
    public.has_instance_access(id)
    OR public.is_admin()
  );

-- 7️⃣ Ajustar políticas de whatsapp_chats para herdar da instância

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view chats from their organization" ON public.whatsapp_chats;

-- Nova política: SELECT apenas se tiver acesso à instância
CREATE POLICY "Users can view chats from accessible instances"
  ON public.whatsapp_chats
  FOR SELECT
  USING (
    public.has_instance_access(instance_id)
    OR public.is_admin()
  );

-- 8️⃣ Ajustar políticas de whatsapp_messages para herdar do chat

-- Remover políticas antigas se existirem  
DROP POLICY IF EXISTS "Users can view messages from their organization" ON public.whatsapp_messages;

-- Nova política: SELECT apenas se tiver acesso à instância do chat
CREATE POLICY "Users can view messages from accessible chats"
  ON public.whatsapp_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_chats c
      WHERE c.id = whatsapp_messages.chat_id
      AND public.has_instance_access(c.instance_id)
    )
    OR public.is_admin()
  );

-- Comentário para documentação
COMMENT ON TABLE public.whatsapp_instance_members IS 'Tabela de vínculo entre usuários e instâncias WhatsApp para controle de acesso granular';
COMMENT ON COLUMN public.whatsapp_instance_members.role IS 'Papel do usuário: owner (dono), coordinator (pode gerenciar membros), member (acesso normal), viewer (somente leitura)';