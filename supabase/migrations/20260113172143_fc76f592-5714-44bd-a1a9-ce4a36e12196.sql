-- Add category field to protocols table
ALTER TABLE public.protocols 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'avulsos';

-- Add comment for clarity
COMMENT ON COLUMN public.protocols.category IS 'Protocol category: jornada_cirurgica, genetica, neuro_wellness, spa_day, avulsos';