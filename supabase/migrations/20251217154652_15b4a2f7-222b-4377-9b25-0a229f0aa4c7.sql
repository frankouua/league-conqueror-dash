-- Fix policies for public access
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;

CREATE POLICY "Teams are viewable by everyone"
ON public.teams FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Cards are viewable by everyone" ON public.cards;

CREATE POLICY "Cards are viewable by everyone"
ON public.cards FOR SELECT
USING (true);