-- Adicionar campos extras para materiais e scripts de follow-up
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS followup_script TEXT;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS followup_script_2 TEXT;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS followup_script_3 TEXT;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS objection_scripts JSONB DEFAULT '{}';
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS closing_script TEXT;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS reactivation_script TEXT;
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS materials_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS material_descriptions JSONB DEFAULT '[]';

-- Comentários para documentação
COMMENT ON COLUMN public.protocols.image_url IS 'URL da imagem principal do protocolo';
COMMENT ON COLUMN public.protocols.video_url IS 'URL do vídeo explicativo do protocolo';
COMMENT ON COLUMN public.protocols.followup_script IS 'Script de follow-up 1 (após primeiro contato)';
COMMENT ON COLUMN public.protocols.followup_script_2 IS 'Script de follow-up 2 (após segundo contato)';
COMMENT ON COLUMN public.protocols.followup_script_3 IS 'Script de follow-up 3 (insistência)';
COMMENT ON COLUMN public.protocols.objection_scripts IS 'Scripts para contorno de objeções {"preco": "...", "tempo": "..."}';
COMMENT ON COLUMN public.protocols.closing_script IS 'Script de fechamento de venda';
COMMENT ON COLUMN public.protocols.reactivation_script IS 'Script para reativação de cliente inativo';
COMMENT ON COLUMN public.protocols.materials_urls IS 'URLs de materiais adicionais (PDFs, imagens)';
COMMENT ON COLUMN public.protocols.material_descriptions IS 'Descrições dos materiais [{"url": "...", "name": "...", "type": "..."}]';