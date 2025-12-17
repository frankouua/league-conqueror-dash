
-- Create enum for departments
CREATE TYPE public.department_type AS ENUM (
  'comercial',
  'atendimento',
  'marketing',
  'administrativo',
  'clinico'
);

-- Create enum for positions/roles within departments
CREATE TYPE public.position_type AS ENUM (
  'comercial_1_captacao',
  'comercial_2_closer',
  'comercial_3_experiencia',
  'comercial_4_farmer',
  'sdr',
  'coordenador',
  'gerente',
  'assistente',
  'outro'
);

-- Add department and position columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN department department_type,
ADD COLUMN position position_type;

-- Update the handle_new_user function to include department and position
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, email, team_id, department, position)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    (NEW.raw_user_meta_data ->> 'team_id')::UUID,
    (NEW.raw_user_meta_data ->> 'department')::department_type,
    (NEW.raw_user_meta_data ->> 'position')::position_type
  );
  
  -- Insert default role (member)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'member')
  );
  
  RETURN NEW;
END;
$$;
