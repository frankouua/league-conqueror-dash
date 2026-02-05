
-- 1. PROFILES: Atualizar políticas para verificar is_approved
DROP POLICY IF EXISTS "Users can view profiles from their team" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can view team profiles" ON public.profiles;

-- Criar política que exige aprovação para ver perfis do time
CREATE POLICY "Approved users can view team profiles"
ON public.profiles
FOR SELECT
USING (
  -- Usuário pode ver seu próprio perfil sempre
  auth.uid() = user_id
  OR
  -- Ou pode ver perfis do time SE estiver aprovado
  (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.is_approved = true
      AND p.team_id = profiles.team_id
    )
  )
);

-- 2. FORM_RESPONSES: Restringir acesso a usuários aprovados e admins
DROP POLICY IF EXISTS "Auth users view form responses" ON public.form_responses;
DROP POLICY IF EXISTS "Approved users can view form responses" ON public.form_responses;

-- Apenas usuários aprovados podem ver respostas de formulário
CREATE POLICY "Approved users can view form responses"
ON public.form_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_approved = true
  )
);

-- Política para inserção de respostas (qualquer um pode submeter formulário)
DROP POLICY IF EXISTS "Anyone can submit form responses" ON public.form_responses;
CREATE POLICY "Anyone can submit form responses"
ON public.form_responses
FOR INSERT
WITH CHECK (true);
