-- Corrigir política INSERT muito permissiva em contacts
DROP POLICY IF EXISTS "authenticated_users_can_insert_contacts" ON public.contacts;
DROP POLICY IF EXISTS "Usuarios aprovados podem criar contatos" ON public.contacts;

-- Recriar com verificação adequada (apenas usuários aprovados podem inserir)
CREATE POLICY "approved_users_can_insert_contacts" 
ON public.contacts FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_approved = true
  )
);