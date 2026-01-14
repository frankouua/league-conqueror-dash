-- Adicionar campo de evidência (print WhatsApp) na tabela referral_leads
ALTER TABLE public.referral_leads 
ADD COLUMN IF NOT EXISTS evidence_url TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.referral_leads.evidence_url IS 'URL da imagem de evidência (print WhatsApp) que prova que o vendedor estimulou a indicação ativamente';

-- Criar bucket para armazenar as evidências de indicação
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('referral-evidence', 'referral-evidence', true, 5242880) -- 5MB limit
ON CONFLICT (id) DO NOTHING;

-- Permitir que usuários autenticados façam upload de evidências
CREATE POLICY "Users can upload referral evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'referral-evidence' 
  AND auth.role() = 'authenticated'
);

-- Permitir que qualquer pessoa visualize as evidências (bucket público)
CREATE POLICY "Public can view referral evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'referral-evidence');

-- Permitir que usuários autenticados deletem suas próprias evidências
CREATE POLICY "Users can delete own referral evidence"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'referral-evidence' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);