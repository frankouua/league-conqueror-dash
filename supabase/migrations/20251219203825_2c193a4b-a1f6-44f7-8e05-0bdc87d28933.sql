
-- Add department_name column to individual_goals to allow per-department goals
ALTER TABLE public.individual_goals 
ADD COLUMN IF NOT EXISTS department_name text;

-- Create unique constraint to prevent duplicate goals for same user/department/month/year
CREATE UNIQUE INDEX IF NOT EXISTS idx_individual_goals_unique 
ON public.individual_goals(user_id, department_name, month, year) 
WHERE department_name IS NOT NULL;
