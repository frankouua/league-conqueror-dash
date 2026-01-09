-- Adicionar coluna de conteúdo aos materiais de treinamento
ALTER TABLE public.training_materials 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Adicionar coluna de seções (JSON) para conteúdo estruturado
ALTER TABLE public.training_materials
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.training_materials.content IS 'Conteúdo em texto/markdown do material';
COMMENT ON COLUMN public.training_materials.sections IS 'Seções estruturadas do conteúdo em formato JSON';