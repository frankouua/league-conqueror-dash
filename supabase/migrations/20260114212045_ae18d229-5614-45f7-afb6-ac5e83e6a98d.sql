-- Adicionar 'bonus' e 'green' ao enum card_type para pontuação da Copa
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'bonus';
ALTER TYPE card_type ADD VALUE IF NOT EXISTS 'green';