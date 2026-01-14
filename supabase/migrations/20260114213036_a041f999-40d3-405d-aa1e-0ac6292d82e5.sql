-- 1. Adicionar colunas de aprovação na tabela referral_leads
ALTER TABLE referral_leads 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Adicionar coluna referral_lead_id na tabela cards para rastrear pontos de indicações
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS referral_lead_id UUID REFERENCES referral_leads(id) ON DELETE CASCADE;

-- 3. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_cards_referral_lead_id ON cards(referral_lead_id);

-- 4. Migrar dados existentes: criar cards para indicações que ainda não têm
-- Usando referred_name (nome correto da coluna)

-- Leads com status 'operou' ou 'ganho' = 30 pontos
INSERT INTO cards (team_id, type, reason, points, referral_lead_id, applied_by, date)
SELECT 
  rl.team_id,
  'bonus'::card_type,
  'Indicação operou: ' || rl.referred_name,
  30,
  rl.id,
  rl.registered_by,
  COALESCE(rl.updated_at, rl.created_at)::date
FROM referral_leads rl
WHERE rl.status IN ('operou', 'ganho')
AND NOT EXISTS (SELECT 1 FROM cards c WHERE c.referral_lead_id = rl.id);

-- Leads com status 'agendou' ou 'consultou' = 15 pontos
INSERT INTO cards (team_id, type, reason, points, referral_lead_id, applied_by, date)
SELECT 
  rl.team_id,
  'bonus'::card_type,
  'Indicação consultou: ' || rl.referred_name,
  15,
  rl.id,
  rl.registered_by,
  COALESCE(rl.updated_at, rl.created_at)::date
FROM referral_leads rl
WHERE rl.status IN ('agendou', 'consultou')
AND NOT EXISTS (SELECT 1 FROM cards c WHERE c.referral_lead_id = rl.id);

-- Leads com status 'nova' ou 'em_contato' = 5 pontos
INSERT INTO cards (team_id, type, reason, points, referral_lead_id, applied_by, date)
SELECT 
  rl.team_id,
  'bonus'::card_type,
  'Indicação captada: ' || rl.referred_name,
  5,
  rl.id,
  rl.registered_by,
  COALESCE(rl.updated_at, rl.created_at)::date
FROM referral_leads rl
WHERE rl.status IN ('nova', 'em_contato')
AND NOT EXISTS (SELECT 1 FROM cards c WHERE c.referral_lead_id = rl.id);

-- 5. Marcar indicações existentes como aprovadas (para não quebrar fluxo atual)
UPDATE referral_leads SET approved = true WHERE approved IS NULL OR approved = false;