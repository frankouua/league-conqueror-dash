-- Allow public to view teams for public dashboard
DROP POLICY IF EXISTS "Teams are viewable by authenticated users" ON public.teams;

CREATE POLICY "Teams are viewable by everyone"
ON public.teams FOR SELECT
TO public
USING (true);

-- Also allow public to view cards for public dashboard
DROP POLICY IF EXISTS "Cards are viewable by authenticated users" ON public.cards;

CREATE POLICY "Cards are viewable by everyone"
ON public.cards FOR SELECT
TO public
USING (true);