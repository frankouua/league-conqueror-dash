-- Adicionar campo para script de recomendação médica
ALTER TABLE protocols 
ADD COLUMN IF NOT EXISTS doctor_recommended_script TEXT;