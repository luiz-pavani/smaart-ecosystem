-- =====================================================
-- Storage RLS Policies para bucket academias-logos
-- =====================================================

-- Permitir que usuários autenticados façam upload
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'academias-logos');

-- Permitir que qualquer um visualize as logos (público)
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'academias-logos');

-- Permitir que usuários autenticados atualizem suas logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'academias-logos')
WITH CHECK (bucket_id = 'academias-logos');

-- Permitir que usuários autenticados deletem logos
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'academias-logos');
