-- Adicionar campo para script de grupo nos protocolos
ALTER TABLE protocols 
ADD COLUMN IF NOT EXISTS group_script TEXT;