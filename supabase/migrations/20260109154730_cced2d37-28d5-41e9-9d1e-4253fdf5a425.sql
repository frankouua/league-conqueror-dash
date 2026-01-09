-- Adicionar coluna target_role às tabelas de treinamento que não têm
ALTER TABLE training_materials ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'sdr';
ALTER TABLE training_quizzes ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'sdr';
ALTER TABLE training_simulations ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'sdr';

-- Criar índices para melhorar performance nas consultas por role
CREATE INDEX IF NOT EXISTS idx_training_materials_target_role ON training_materials(target_role);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_target_role ON training_quizzes(target_role);
CREATE INDEX IF NOT EXISTS idx_training_simulations_target_role ON training_simulations(target_role);