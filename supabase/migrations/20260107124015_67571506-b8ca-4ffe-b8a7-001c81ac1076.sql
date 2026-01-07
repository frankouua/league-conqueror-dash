-- ========================================
-- CORREÇÃO: Adicionar search_path às funções
-- ========================================

-- 1. update_crm_updated_at
CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. update_conversation_timestamp (já tem search_path)
-- Já corrigido no schema

-- 3. match_user_to_predefined_goals (já tem search_path)
-- Já corrigido no schema

-- 4. rematch_user_to_predefined_goals (já tem search_path)
-- Já corrigido no schema

-- 5. notify_suggestion_status_change (já tem search_path)
-- Já corrigido no schema

-- 6. create_approval_request (já tem search_path)
-- Já corrigido no schema

-- 7. approve_user (já tem search_path)
-- Já corrigido no schema

-- 8. reject_user (já tem search_path)
-- Já corrigido no schema

-- 9. update_last_access (já tem search_path)
-- Já corrigido no schema

-- 10. update_updated_at_column (já tem search_path)
-- Já corrigido no schema

-- 11. has_role (já tem search_path)
-- Já corrigido no schema

-- 12. get_user_role (já tem search_path)
-- Já corrigido no schema

-- 13. handle_new_user (já tem search_path)
-- Já corrigido no schema

-- 14. get_my_team_id (já tem search_path)
-- Já corrigido no schema