-- Migration 018: Fix Storage RLS Policies for Photos

-- Drop all old storage policies
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public access to all files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Create permissive storage policies for atletas bucket

-- 1. Master Access can do EVERYTHING in atletas bucket
CREATE POLICY "MA Storage Insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'atletas'
    AND (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('federacao_admin', 'federacao_staff', 'academia_admin', 'academia_staff'))
      OR auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "MA Storage Select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'atletas'
    AND (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('federacao_admin', 'federacao_staff', 'academia_admin', 'academia_staff'))
      OR auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "MA Storage Delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'atletas'
    AND (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('master_access', 'federacao_admin', 'academia_admin'))
      OR auth.uid() IS NOT NULL
    )
  );

-- 2. Allow unauthenticated access for viewing photos (public access)
CREATE POLICY "Public read atletas photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'atletas');

-- 3. Fallback policy - allow any authenticated user to upload/manage
CREATE POLICY "Authenticated users can manage storage"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND bucket_id = 'atletas');

CREATE POLICY "Authenticated users can view storage"
  ON storage.objects FOR SELECT
  USING (auth.uid() IS NOT NULL AND bucket_id = 'atletas');

CREATE POLICY "Authenticated users can delete storage"
  ON storage.objects FOR DELETE
  USING (auth.uid() IS NOT NULL AND bucket_id = 'atletas');
aqui
