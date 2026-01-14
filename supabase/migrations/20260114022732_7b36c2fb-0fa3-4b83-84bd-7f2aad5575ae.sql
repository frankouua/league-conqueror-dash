
-- Tabela de Conquistas/Achievements (criar se não existir)
CREATE TABLE IF NOT EXISTS public.crm_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT DEFAULT '🏆',
  color TEXT DEFAULT '#FFD700',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  requirement_period TEXT,
  points_reward INTEGER DEFAULT 0,
  badge_level TEXT DEFAULT 'bronze',
  is_hidden BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS se ainda não estiver
ALTER TABLE public.crm_achievements ENABLE ROW LEVEL SECURITY;

-- Policies (drop if exists e recria)
DROP POLICY IF EXISTS "crm_achievements_select" ON public.crm_achievements;
DROP POLICY IF EXISTS "crm_achievements_insert" ON public.crm_achievements;
DROP POLICY IF EXISTS "crm_achievements_update" ON public.crm_achievements;

CREATE POLICY "crm_achievements_select" ON public.crm_achievements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "crm_achievements_insert" ON public.crm_achievements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "crm_achievements_update" ON public.crm_achievements
  FOR UPDATE TO authenticated USING (public.is_admin());
