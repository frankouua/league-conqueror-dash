
-- Remove a constraint antiga que não permite múltiplos departamentos por vendedora
ALTER TABLE public.predefined_goals 
DROP CONSTRAINT predefined_goals_first_name_month_year_key;

-- Adiciona nova constraint que permite múltiplos departamentos
ALTER TABLE public.predefined_goals 
ADD CONSTRAINT predefined_goals_first_name_department_month_year_key 
UNIQUE (first_name, department, month, year);
