-- Corrigir políticas com true em seller_department_goals
-- Estas devem ser restritas apenas para admins autenticados

DROP POLICY IF EXISTS "Admins can delete seller department goals" ON seller_department_goals;
DROP POLICY IF EXISTS "Admins can insert seller department goals" ON seller_department_goals;
DROP POLICY IF EXISTS "Admins can update seller department goals" ON seller_department_goals;

-- Criar políticas corretas que verificam se o usuário é admin
CREATE POLICY "Admins can insert seller department goals"
ON seller_department_goals FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND public.is_admin()
);

CREATE POLICY "Admins can update seller department goals"
ON seller_department_goals FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND public.is_admin()
);

CREATE POLICY "Admins can delete seller department goals"
ON seller_department_goals FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND public.is_admin()
);