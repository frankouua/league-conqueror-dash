-- Add meta2_goal and meta3_goal columns to individual_goals
ALTER TABLE public.individual_goals 
ADD COLUMN IF NOT EXISTS meta2_goal numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta3_goal numeric DEFAULT NULL;

-- Rename revenue_goal to meta1_goal for clarity (keeping revenue_goal as alias)
COMMENT ON COLUMN public.individual_goals.revenue_goal IS 'Meta 1 - Meta base de faturamento';