-- Create table for quantity goals by department (number of procedures/consultations)
CREATE TABLE public.department_quantity_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  quantity_goal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_name, month, year)
);

-- Enable RLS
ALTER TABLE public.department_quantity_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view quantity goals"
ON public.department_quantity_goals FOR SELECT
USING (true);

CREATE POLICY "Admins can manage quantity goals"
ON public.department_quantity_goals FOR ALL
USING (public.is_admin());

-- Insert initial quantity goals for January 2025 based on typical volumes
INSERT INTO public.department_quantity_goals (department_name, month, year, quantity_goal) VALUES
  ('Cirurgia Plástica', 1, 2025, 40),
  ('Consulta Cirurgia Plástica', 1, 2025, 70),
  ('Pós Operatório', 1, 2025, 60),
  ('Soroterapia / Protocolos Nutricionais', 1, 2025, 80),
  ('Harmonização Facial e Corporal', 1, 2025, 100),
  ('Spa e Estética', 1, 2025, 20),
  ('Unique Travel Experience', 1, 2025, 10);