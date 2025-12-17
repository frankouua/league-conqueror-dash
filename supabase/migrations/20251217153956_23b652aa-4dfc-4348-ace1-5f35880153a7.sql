-- Cards table for bonuses and penalties
CREATE TYPE public.card_type AS ENUM ('blue', 'white', 'yellow', 'red');

CREATE TABLE public.cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  applied_by UUID NOT NULL REFERENCES auth.users(id),
  type card_type NOT NULL,
  reason TEXT NOT NULL,
  points INT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Everyone can view cards
CREATE POLICY "Cards are viewable by authenticated users"
ON public.cards FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert cards
CREATE POLICY "Admins can insert cards"
ON public.cards FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete cards
CREATE POLICY "Admins can delete cards"
ON public.cards FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any profile
CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update user roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));