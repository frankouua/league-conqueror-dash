-- Adicionar coluna para URL da evidência/print
ALTER TABLE public.testimonial_records 
ADD COLUMN evidence_url TEXT;

-- Criar bucket para evidências de depoimentos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('testimonial-evidence', 'testimonial-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Política para visualização pública
CREATE POLICY "Testimonial evidence is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'testimonial-evidence');

-- Política para upload autenticado
CREATE POLICY "Authenticated users can upload testimonial evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'testimonial-evidence' AND auth.uid() IS NOT NULL);

-- Política para atualização pelo próprio usuário
CREATE POLICY "Users can update their own testimonial evidence"
ON storage.objects FOR UPDATE
USING (bucket_id = 'testimonial-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para deleção pelo próprio usuário
CREATE POLICY "Users can delete their own testimonial evidence"
ON storage.objects FOR DELETE
USING (bucket_id = 'testimonial-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);