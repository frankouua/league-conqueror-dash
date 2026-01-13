-- ===========================================================
-- MIGRATION: Criar tabela procedures e atualizar protocols
-- ===========================================================

-- 1. Criar tabela de procedimentos individuais
CREATE TABLE IF NOT EXISTS public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  price NUMERIC(10,2),
  promotional_price NUMERIC(10,2),
  description TEXT,
  duration_minutes INTEGER,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  imported_from TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar colunas de jornada na tabela protocols
ALTER TABLE public.protocols 
  ADD COLUMN IF NOT EXISTS journey_stage TEXT,
  ADD COLUMN IF NOT EXISTS responsible_role TEXT,
  ADD COLUMN IF NOT EXISTS offer_trigger TEXT,
  ADD COLUMN IF NOT EXISTS procedure_ids UUID[] DEFAULT '{}';

-- 3. Adicionar comentários para documentação
COMMENT ON COLUMN public.protocols.journey_stage IS 'Etapa da jornada: first_contact, medical_evaluation, pre_op, intra_op, post_op_recent, post_op_late';
COMMENT ON COLUMN public.protocols.responsible_role IS 'Responsável: sdr, social_selling, closer, cs, farmer';
COMMENT ON COLUMN public.protocols.offer_trigger IS 'Gatilho para ofertar o protocolo';
COMMENT ON COLUMN public.protocols.procedure_ids IS 'IDs dos procedimentos inclusos neste protocolo';

-- 4. Habilitar RLS para procedures
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para procedures (usando is_admin)
-- Todos podem visualizar
CREATE POLICY "Procedures são visíveis para todos autenticados"
ON public.procedures FOR SELECT
TO authenticated
USING (true);

-- Apenas admins podem inserir
CREATE POLICY "Admins podem inserir procedures"
ON public.procedures FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Apenas admins podem atualizar
CREATE POLICY "Admins podem atualizar procedures"
ON public.procedures FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Apenas admins podem deletar
CREATE POLICY "Admins podem deletar procedures"
ON public.procedures FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_procedures_category ON public.procedures(category);
CREATE INDEX IF NOT EXISTS idx_procedures_is_active ON public.procedures(is_active);
CREATE INDEX IF NOT EXISTS idx_protocols_journey_stage ON public.protocols(journey_stage);

-- 7. Trigger para updated_at em procedures
CREATE TRIGGER update_procedures_updated_at
BEFORE UPDATE ON public.procedures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Migrar dados: procedimentos da tabela protocols para procedures
INSERT INTO public.procedures (name, price, promotional_price, description, category, imported_from)
SELECT 
  name, 
  price, 
  promotional_price, 
  description,
  CASE 
    WHEN name ILIKE '%spa%' THEN 'spa'
    WHEN name ILIKE '%soro%' THEN 'soroterapia'
    WHEN name ILIKE '%botox%' OR name ILIKE '%toxina%' THEN 'injetaveis'
    WHEN name ILIKE '%laser%' THEN 'laser'
    WHEN name ILIKE '%peel%' THEN 'peeling'
    WHEN name ILIKE '%implante%' THEN 'implantes'
    WHEN name ILIKE '%cirurgia%' OR name ILIKE '%lipo%' OR name ILIKE '%abdomino%' OR name ILIKE '%mastopexia%' OR name ILIKE '%protese%' OR name ILIKE '%rino%' THEN 'cirurgia'
    WHEN name ILIKE '%morpheus%' OR name ILIKE '%endolift%' THEN 'tecnologia'
    WHEN name ILIKE '%consulta%' THEN 'consulta'
    WHEN name ILIKE '%microagulha%' THEN 'microagulhamento'
    WHEN name ILIKE '%drenagem%' THEN 'pos_operatorio'
    WHEN name ILIKE '%exossom%' THEN 'regenerativo'
    WHEN name ILIKE '%genetic%' OR name ILIKE '%breastcheck%' THEN 'genetica'
    ELSE 'outros'
  END,
  'protocols_migration'
FROM public.protocols 
WHERE protocol_type = 'procedimento'
ON CONFLICT DO NOTHING;

-- 9. Deletar procedimentos individuais da tabela protocols
DELETE FROM public.protocols WHERE protocol_type = 'procedimento';

-- 10. Atualizar RLS de protocols para permitir todos vendedores criarem
DROP POLICY IF EXISTS "Vendedores podem criar protocolos" ON public.protocols;
CREATE POLICY "Vendedores podem criar protocolos"
ON public.protocols FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Vendedores podem editar protocolos" ON public.protocols;
CREATE POLICY "Vendedores podem editar protocolos"
ON public.protocols FOR UPDATE
TO authenticated
USING (true);

-- Apenas admin pode deletar
DROP POLICY IF EXISTS "Apenas admins podem deletar protocolos" ON public.protocols;
CREATE POLICY "Apenas admins podem deletar protocolos"
ON public.protocols FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);