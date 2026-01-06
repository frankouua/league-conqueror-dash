-- Add last access tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_access_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0;

-- Create a function to update last access
CREATE OR REPLACE FUNCTION public.update_last_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    last_access_at = now(),
    access_count = COALESCE(access_count, 0) + 1
  WHERE user_id = auth.uid();
END;
$$;